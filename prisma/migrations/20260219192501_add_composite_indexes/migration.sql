-- CreateIndex
CREATE INDEX "CallLog_customerId_callDate_idx" ON "CallLog"("customerId", "callDate");

-- CreateIndex
CREATE INDEX "PromiseDate_customerId_status_idx" ON "PromiseDate"("customerId", "status");
