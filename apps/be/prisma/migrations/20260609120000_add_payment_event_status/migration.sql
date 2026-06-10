ALTER TABLE "payment_events"
ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSING';

UPDATE "payment_events"
SET "status" = CASE
  WHEN "processed_at" IS NOT NULL THEN 'PROCESSED'
  ELSE 'PROCESSING'
END;

CREATE INDEX "payment_events_status_idx" ON "payment_events"("status");
