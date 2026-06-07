# User FE Checklist

Scope: user-facing frontend only. Current implementation should continue using mock data, but the mock shape should stay close to backend concepts so API integration is easier later.

## Current FE Snapshot

- The user pages still use mock data from `lib/mock-data.ts`; no backend API calls are expected yet.
- The refreshed home page now has working hero links: featured concert and `#events`.
- `ThemeToggle` exists and persists the selected theme in `localStorage`.
- Checkout submit, ticket download/share, and footer links are still UI-only.
- Concert detail now uses mock ticket zones and seats scoped by concert id.
- Vietnamese UI strings were verified with UTF-8 reads; earlier mojibake was terminal output rendering, not source corruption.

## Checklist

- [x] Verify/fix mojibake Vietnamese display strings in user-facing FE files.
- [x] Standardize user mock data around backend-like concepts: concerts, ticket types, seat zones, reservations, orders, tickets.
- [x] Home page: hero CTAs link to featured show and event list.
- [x] Home page: support searching/filtering concerts from mock data.
- [x] Home page: implement newsletter/signup mock behavior.
- [x] Header: navbar search submits to the home event browser with `?q=...`.
- [x] Header: add clear mock behavior for account and notifications.
- [x] Auth pages: add mock login/register flows using localStorage and backend-like auth shape.
- [x] Header: theme toggle works with persisted `localStorage` theme.
- [x] Concert cards: make favorite action work without accidentally navigating to detail.
- [x] Concert detail page: load mock concert, zones, and seats by concert id.
- [x] Seat selection flow: create a mock draft reservation and carry it into checkout.
- [x] Checkout page: read selected reservation, choose payment method, and validate payment form basics.
- [x] Checkout submit: create a mock order and navigate to success by order id.
- [ ] Success/e-ticket page: render the selected mock order and tickets, including download/share mock behavior.
- [ ] Verify user flow end to end: home -> concert detail -> seat selection -> checkout -> success.
- [ ] Footer/static links: replace placeholder `#` links with real routes or intentional disabled/placeholder states.

## Backend Reference

Useful backend concepts already exist in the Prisma schema:

- `Concert`
- `SeatZone`
- `TicketType`
- `Reservation`
- `Order`
- `Ticket`
- `PaymentEvent`
- `Notification`

Backend routes currently exposed:

- `GET /concerts`
- `GET /concerts/:id`
- Auth routes under `/auth`

Reservation, order, ticket, payment, and notification modules are not exposed yet, so user FE work should remain mock-only for now.
