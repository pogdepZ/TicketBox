import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const CONCERT_ID = __ENV.CONCERT_ID || '202dedd0-18dc-4d48-a652-d0ee8aa1f441';
const TICKET_TYPE_ID = __ENV.TICKET_TYPE_ID || 'da8e128c-682d-4fbb-bee4-5f26545cae11';
const EXPECTED_AVAILABLE = Number(__ENV.EXPECTED_AVAILABLE || 5);
const CONCURRENCY = Number(__ENV.CONCURRENCY || 50);
const SEAT_PREFIX = __ENV.SEAT_PREFIX || `RACE-${Date.now()}`;
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'admin@gmail.com';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || '123456';

const orderSuccesses = new Counter('order_successes');
const orderConflicts = new Counter('order_conflicts');
const orderRateLimits = new Counter('order_rate_limits');
const orderServerErrors = new Counter('order_server_errors');

export const options = {
  scenarios: {
    idempotency_retry_probe: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '20s',
      exec: 'idempotencyRetryProbe',
    },
    oversell_probe: {
      executor: 'shared-iterations',
      vus: CONCURRENCY,
      iterations: CONCURRENCY,
      startTime: '5s',
      maxDuration: '30s',
      exec: 'oversellProbe',
    },
  },
  thresholds: {
    checks: ['rate==1'],
    order_server_errors: ['count==0'],
    order_rate_limits: ['count==0'],
    order_successes: [`count<=${EXPECTED_AVAILABLE}`],
  },
};

export function setup() {
  const token = __ENV.ACCESS_TOKEN || login();

  return {
    commonHeaders: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

export function oversellProbe(data) {
  const sequence = exec.scenario.iterationInTest + 1;
  const idemKey = `${SEAT_PREFIX}-order-${String(sequence).padStart(3, '0')}`;
  const seatNumber = `${SEAT_PREFIX}-${String(sequence).padStart(3, '0')}`;
  const response = createOrder(data, idemKey, [seatNumber]);
  recordOrderStatus(response);

  const body = parseJson(response);
  const orderId = responseData(body)?.orderId;

  check(response, {
    'oversell response is success or expected 409': (res) =>
      [200, 201, 409].includes(res.status),
    'oversell probe has no rate-limit or server error': (res) =>
      res.status !== 429 && res.status < 500,
    'successful oversell response has orderId': (res) =>
      ![200, 201].includes(res.status) || Boolean(orderId),
  });
}

export function idempotencyRetryProbe(data) {
  const idemKey = `${SEAT_PREFIX}-retry-proof`;
  const seatNumber = `${SEAT_PREFIX}-RETRY`;

  group('same key + same body returns stored order', () => {
    const first = createOrder(data, idemKey, [seatNumber]);
    recordOrderStatus(first);
    const firstBody = parseJson(first);
    const firstOrderId = responseData(firstBody)?.orderId;

    check(first, {
      'first idempotency request succeeds': (res) => [200, 201].includes(res.status),
      'first idempotency response has orderId': () => Boolean(firstOrderId),
    });

    sleep(1);

    const retry = createOrder(data, idemKey, [seatNumber]);
    const retryBody = parseJson(retry);
    const retryOrderId = responseData(retryBody)?.orderId;

    check(retry, {
      'retry with same key succeeds': (res) => [200, 201].includes(res.status),
      'retry returns the same orderId': () =>
        Boolean(firstOrderId) && firstOrderId === retryOrderId,
    });
  });

  group('same key + different body is rejected', () => {
    const conflict = createOrder(data, idemKey, [`${seatNumber}-DIFFERENT`]);
    recordOrderStatus(conflict);

    check(conflict, {
      'same idempotency key with different body returns 409': (res) => res.status === 409,
    });
  });
}

export function handleSummary(summary) {
  const successCount = metricCount(summary, 'order_successes');
  const conflictCount = metricCount(summary, 'order_conflicts');
  const rateLimitCount = metricCount(summary, 'order_rate_limits');
  const serverErrorCount = metricCount(summary, 'order_server_errors');
  const oversellSafe = successCount <= EXPECTED_AVAILABLE;

  const lines = [
    '',
    'Orders race/idempotency evidence',
    `- Concurrent POST /orders: ${CONCURRENCY}`,
    `- Expected available seats before run: ${EXPECTED_AVAILABLE}`,
    `- Successful new order responses: ${successCount}`,
    `- Expected 409 business rejections: ${conflictCount}`,
    `- 429 rate-limit responses: ${rateLimitCount}`,
    `- 5xx responses: ${serverErrorCount}`,
    `- Oversell guard: ${oversellSafe ? 'PASS' : 'FAIL'} (success <= expected available)`,
    '',
  ];

  return {
    stdout: lines.join('\n'),
    'orders-race-idempotency-summary.json': JSON.stringify(summary, null, 2),
  };
}

function login() {
  const response = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const body = parseJson(response);
  const token = responseData(body)?.accessToken;

  if (!token) {
    throw new Error(
      `Login failed. Set ACCESS_TOKEN or check LOGIN_EMAIL/LOGIN_PASSWORD. Status=${response.status}`,
    );
  }

  return token;
}

function createOrder(data, idempotencyKey, seatNumbers) {
  return http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      concertId: CONCERT_ID,
      ticketTypeId: TICKET_TYPE_ID,
      seatNumbers,
    }),
    {
      headers: {
        ...data.commonHeaders,
        'Idempotency-Key': idempotencyKey,
      },
      tags: { name: 'POST /orders' },
    },
  );
}

function recordOrderStatus(response) {
  if ([200, 201].includes(response.status)) {
    orderSuccesses.add(1);
  } else if (response.status === 409) {
    orderConflicts.add(1);
  } else if (response.status === 429) {
    orderRateLimits.add(1);
  } else if (response.status >= 500) {
    orderServerErrors.add(1);
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
