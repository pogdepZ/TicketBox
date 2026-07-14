import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const CONCERT_ID = __ENV.CONCERT_ID || '202dedd0-18dc-4d48-a652-d0ee8aa1f441';
const QUOTA_TICKET_TYPE_ID =
  __ENV.QUOTA_TICKET_TYPE_ID || 'f7c6c7ab-f989-40c8-b81b-8338fc30730e';
const RATE_TICKET_TYPE_ID =
  __ENV.RATE_TICKET_TYPE_ID || 'da8e128c-682d-4fbb-bee4-5f26545cae11';
const SEAT_PREFIX = __ENV.SEAT_PREFIX || `RULE-${Date.now()}`;
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || '123456';
const CUSTOMER_PASSWORD = __ENV.CUSTOMER_PASSWORD || '123456';
const RETURN_URL = __ENV.RETURN_URL || 'http://localhost:3000/checkout/result';

const rulePasses = new Counter('business_rule_passes');
const ruleFailures = new Counter('business_rule_failures');

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
    business_rule_failures: ['count==0'],
  },
};

export function setup() {
  return {
    admin: {
      token: login(ADMIN_EMAIL, ADMIN_PASSWORD),
    },
    quotaCustomer: createCustomer('quota'),
    rateCustomer: createCustomer('rate'),
  };
}

export default function (data) {
  group('per-user quota is enforced', () => {
    const response = createOrder(
      authHeaders(data.quotaCustomer.token),
      `${SEAT_PREFIX}-quota`,
      QUOTA_TICKET_TYPE_ID,
      buildSeats('QUOTA', 5),
    );

    recordRule(
      'quota request above maxPerUser returns 409',
      check(response, {
        'quota request above maxPerUser returns 409': (res) => res.status === 409,
      }),
    );
  });

  group('customer order rate limit is enforced', () => {
    const statuses = [];

    for (let index = 1; index <= 6; index += 1) {
      const response = createOrder(
        authHeaders(data.rateCustomer.token),
        `${SEAT_PREFIX}-rate-${index}`,
        RATE_TICKET_TYPE_ID,
        [`${SEAT_PREFIX}-RATE-${index}`],
      );
      statuses.push(response.status);
      sleep(0.1);
    }

    const successCount = statuses.filter((status) => [200, 201].includes(status)).length;
    const rateLimitCount = statuses.filter((status) => status === 429).length;

    recordRule(
      'first five customer order requests can pass',
      check(null, {
        'first five customer order requests can pass': () => successCount === 5,
      }),
    );
    recordRule(
      'sixth customer order request is rate-limited',
      check(null, {
        'sixth customer order request is rate-limited': () => rateLimitCount === 1,
      }),
    );
  });

  group('payment webhook duplicate is idempotent', () => {
    const order = mustCreateOrder(
      data.admin.token,
      `${SEAT_PREFIX}-webhook-order`,
      RATE_TICKET_TYPE_ID,
      [`${SEAT_PREFIX}-WEBHOOK-1`],
    );
    const payment = mustCreatePayment(
      data.admin.token,
      order.orderId,
      `${SEAT_PREFIX}-payment-create`,
    );
    const gatewayTransactionId = `${SEAT_PREFIX}-GW-DUPLICATE`;

    const first = mockWebhook(payment, gatewayTransactionId, 'SUCCESS');
    const second = mockWebhook(payment, gatewayTransactionId, 'SUCCESS');
    const status = getPaymentStatus(data.admin.token, payment.paymentRef);
    const statusData = responseData(parseJson(status));

    recordRule(
      'first SUCCESS webhook marks order PAID',
      check(first, {
        'first SUCCESS webhook marks order PAID': (res) =>
          res.status === 200 && responseData(parseJson(res))?.orderStatus === 'PAID',
      }),
    );
    recordRule(
      'duplicate SUCCESS webhook is idempotent',
      check(second, {
        'duplicate SUCCESS webhook is idempotent': (res) =>
          res.status === 200 && responseData(parseJson(res))?.processed === true,
      }),
    );
    recordRule(
      'duplicate SUCCESS webhook does not duplicate tickets',
      check(status, {
        'duplicate SUCCESS webhook does not duplicate tickets': () =>
          statusData?.orderStatus === 'PAID' && statusData?.tickets?.length === 1,
      }),
    );
  });

  group('payment TIMEOUT before expiry keeps order retryable', () => {
    const order = mustCreateOrder(
      data.admin.token,
      `${SEAT_PREFIX}-timeout-order`,
      RATE_TICKET_TYPE_ID,
      [`${SEAT_PREFIX}-TIMEOUT-1`],
    );
    const payment = mustCreatePayment(
      data.admin.token,
      order.orderId,
      `${SEAT_PREFIX}-timeout-payment-create`,
    );
    const timeout = mockWebhook(payment, `${SEAT_PREFIX}-GW-TIMEOUT`, 'TIMEOUT');
    const timeoutData = responseData(parseJson(timeout));

    recordRule(
      'TIMEOUT webhook before reservation expiry returns order to PENDING_PAYMENT',
      check(timeout, {
        'TIMEOUT webhook before reservation expiry returns order to PENDING_PAYMENT': () =>
          timeout.status === 200 &&
          timeoutData?.orderStatus === 'PENDING_PAYMENT' &&
          timeoutData?.paymentStatus === 'PENDING',
      }),
    );
  });
}

export function handleSummary(summary) {
  const passes = metricCount(summary, 'business_rule_passes');
  const failures = metricCount(summary, 'business_rule_failures');

  return {
    stdout: [
      '',
      'Orders business-rules evidence',
      `- Passed rule checks: ${passes}`,
      `- Failed rule checks: ${failures}`,
      '',
    ].join('\n'),
    'orders-business-rules-summary.json': JSON.stringify(summary, null, 2),
  };
}

function createCustomer(label) {
  const suffix = `${label}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `k6-${suffix}@ticketbox.local`;
  const body = {
    email,
    password: CUSTOMER_PASSWORD,
    fullName: `k6 ${label} customer`,
    status: 'ACTIVE',
  };

  const register = http.post(`${BASE_URL}/auth/register`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (![200, 201, 409].includes(register.status)) {
    throw new Error(`Register customer failed: ${register.status} ${register.body}`);
  }

  return {
    email,
    token: login(email, CUSTOMER_PASSWORD),
  };
}

function login(email, password) {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const token = responseData(parseJson(response))?.accessToken;

  if (!token) {
    throw new Error(`Login failed for ${email}. Status=${response.status}`);
  }

  return token;
}

function mustCreateOrder(token, idempotencyKey, ticketTypeId, seatNumbers) {
  const response = createOrder(
    authHeaders(token),
    idempotencyKey,
    ticketTypeId,
    seatNumbers,
  );
  const data = responseData(parseJson(response));

  if (![200, 201].includes(response.status) || !data?.orderId) {
    throw new Error(`Create order failed: ${response.status} ${response.body}`);
  }

  return data;
}

function createOrder(headers, idempotencyKey, ticketTypeId, seatNumbers) {
  return http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      concertId: CONCERT_ID,
      ticketTypeId,
      seatNumbers,
    }),
    {
      headers: {
        ...headers,
        'Idempotency-Key': idempotencyKey,
      },
      tags: { name: 'POST /orders' },
    },
  );
}

function mustCreatePayment(token, orderId, idempotencyKey) {
  const response = http.post(
    `${BASE_URL}/payments/create`,
    JSON.stringify({
      orderId,
      provider: 'VNPAY',
      returnUrl: RETURN_URL,
    }),
    {
      headers: {
        ...authHeaders(token),
        'Idempotency-Key': idempotencyKey,
      },
      tags: { name: 'POST /payments/create' },
    },
  );
  const data = responseData(parseJson(response));

  if (response.status !== 200 || !data?.paymentRef) {
    throw new Error(`Create payment failed: ${response.status} ${response.body}`);
  }

  return data;
}

function mockWebhook(payment, gatewayTransactionId, eventType) {
  return http.post(
    `${BASE_URL}/payments/webhooks/mock-trigger`,
    JSON.stringify({
      provider: payment.provider || 'VNPAY',
      paymentRef: payment.paymentRef,
      gatewayTransactionId,
      eventType,
      amount: Number(payment.amount),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /payments/webhooks/mock-trigger' },
    },
  );
}

function getPaymentStatus(token, paymentRef) {
  return http.get(`${BASE_URL}/payments/${paymentRef}/status`, {
    headers: authHeaders(token),
    tags: { name: 'GET /payments/:paymentRef/status' },
  });
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function buildSeats(label, quantity) {
  return Array.from(
    { length: quantity },
    (_, index) => `${SEAT_PREFIX}-${label}-${index + 1}`,
  );
}

function recordRule(_name, passed) {
  if (passed) {
    rulePasses.add(1);
  } else {
    ruleFailures.add(1);
  }
}

function parseJson(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

function responseData(body) {
  return body?.data ?? body;
}

function metricCount(summary, metricName) {
  return summary.metrics[metricName]?.values?.count || 0;
}
