-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "queue_name" VARCHAR(100) NOT NULL,
    "job_name" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_messages_status_idx" ON "outbox_messages"("status");

-- CreateIndex
CREATE INDEX "outbox_messages_created_at_idx" ON "outbox_messages"("created_at");
