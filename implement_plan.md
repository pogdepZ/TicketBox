# Goal Description

Implement the core backend logic for the TicketBox mobile check-in application, including online/offline sync, check-in constraints, and integrations skeleton (Notifications, AI Artist Bio, Guest List). This covers tasks D1 to D10 from `task.md`.

## User Review Required

> [!IMPORTANT]
> - **D1 (Auth):** We will use the existing `/auth/login` endpoint for checkers. The mobile app will send email/password and store the JWT in `AsyncStorage`. Is this acceptable, or do we need a specialized `/auth/checker-login` endpoint?
> - **D4 (Offline Queue):** Instead of SQLite, we'll use `AsyncStorage` on mobile to store the pending queue since Expo supports it out-of-the-box and it's simpler for this scale.
> - **D7 (AI Bio Worker):** The worker will just be mocked using a `setTimeout` inside the NestJS service.

## Proposed Changes

---

### Phase 1: Auth & Online Check-in (D1, D2, D3)

#### [MODIFY] `apps/checkin-mobile/src/screens/LoginScreen.tsx`
- Integrate `apiService.post('/auth/login')`.
- Save `accessToken` to `AsyncStorage`.
- Reset navigation stack upon success.

#### [MODIFY] `apps/be/src/routes/checkin/checkin.service.ts`
- Implement real `scan(dto: ScanCheckinDto)` logic using Prisma.
- Check ticket validity based on `ticketCode`.
- Validate `concertId`.
- **Constraint:** If ticket `status === 'USED'`, return `DUPLICATE`.
- If valid, update `Ticket.status` to `USED` and create `CheckinEvent` with `result: 'ACCEPTED'`. 
- Everything runs inside a `$transaction` to prevent race conditions.

---

### Phase 2: Offline Queue & Sync (D4, D5)

#### [NEW] `apps/checkin-mobile/src/services/queue.ts`
- Functions to `enqueue`, `dequeue`, `getQueue` backed by `AsyncStorage`.

#### [MODIFY] `apps/checkin-mobile/src/screens/ScannerScreen.tsx`
- If the `scan` API call fails (network error), push the scan record into the local offline queue.

#### [MODIFY] `apps/be/src/routes/checkin/checkin.service.ts`
- Implement `sync(dto: SyncCheckinDto)` logic.
- Accept an array of scan records from mobile.
- Iterate through records and apply the same rules as `scan()`.
- Return an array of sync statuses (success, duplicate, rejected) so the mobile app can clear its local queue.

---

### Phase 3: Integration Skeletons (D6, D7, D8)

#### [NEW] `apps/be/src/routes/notifications/notifications.service.ts`
- Create a mock `recordNotification(userId, channel, template)` method.
- Insert a record into the `Notification` table with `status = PENDING`, then immediately update to `SENT` to mock success.

#### [NEW] `apps/be/src/routes/ai-bio/ai-bio.service.ts`
- Handle `POST /ai-bio/upload` file.
- Insert `ArtistAsset` with `status = PROCESSING`.
- Trigger a mock background job (`setTimeout`) that updates `ArtistAsset` to `DONE` and populates `generatedBio`.

#### [NEW] `apps/be/src/routes/guest-list/guest-list.service.ts`
- Handle `POST /guest-list/import` payload (CSV text or file).
- Parse CSV structure.
- Validate data, inserting a `GuestImportBatch` and updating `GuestImportRow` records with `VALID`/`INVALID`.
- Insert valid rows into `GuestList`.

---

### Phase 4: Specs & Demo Script (D9, D10)

#### [MODIFY] `specs/*.md`
- Update the documentation to reflect the API designs for the integrations and the expected mobile data flow for offline scenarios.

## Verification Plan

### Automated Tests
- N/A for this phase, backend manual verification.

### Manual Verification
- **D1:** Launch mobile Expo app, login with valid backend credentials.
- **D2/D3:** Scan a mock ticket code on mobile. Verify it returns ACCEPTED. Scan the exact same code again -> DUPLICATE.
- **D4:** Turn off network on Expo / disconnect. Scan a ticket -> It goes to Offline Queue.
- **D5:** Turn network back on -> Press "Sync". Verify backend processes batch and clears mobile queue.
- **D6/D7/D8:** Run Postman / `curl` requests against the endpoints to ensure DB records are created successfully.
