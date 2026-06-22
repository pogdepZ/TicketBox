export const RESERVATION_TTL_MINUTES = 10;
export const PAYMENT_PROCESSING_GRACE_SECONDS = 120;

export function getPaymentGraceUntil(expiresAt: Date): Date {
  return new Date(
    expiresAt.getTime() + PAYMENT_PROCESSING_GRACE_SECONDS * 1000,
  );
}
