# Translate Sports — Premium Site

Website for Translate Sports, a sports goods dealer in Bariatu, Ranchi (cricket, strength/training, racquet, apparel), built in Claude Design.

Pages: `Translate Sports.dc.html` (home), `Products.dc.html` (30-item filterable catalog), `Reviews.dc.html` (`*.dc.html` component format rendered by `support.js`, the dc-runtime). `images/` holds store gallery shots and product photos.

Source: Claude Design project "Translate Sports Premium Site".

## Reservations + admin (added 2026-07-12)

Standalone vanilla-HTML pages (not dc-runtime), styled to match the site:

- **`basket.html`** — reservation basket (this is a *reservation*, not a paid order). Reads the
  basket from `localStorage` (`ts_basket`, written by the home/products "Add" buttons). "Reserve"
  collects name + phone, saves the reservation to Firebase, then shows the in-store pickup address.
- **`changes.html`** — the **store admin dashboard**, passcode-gated (`ADMIN_PASSCODE`, default
  `translate`, in the page — client-side only, not real security; stored per-tab in `sessionStorage`).
  Primary focus: **Reservations** — live list from Firebase (mark collected / delete). Secondary
  section: **Products & changes** — scrapes the live catalogue from `Products.dc.html` and emails
  edit/add/remove requests to `sthitpragyasoham@gmail.com` via FormSubmit.
- **`store.js`** — the backend: **Firebase Realtime Database over plain REST** (no SDK, no secret
  config), namespaced under **`/translatesports`** in `https://flashcards-3d896-default-rtdb.firebaseio.com`
  so it never touches other data in that shared DB. Handles reservation submit/fetch/subscribe/delete
  and change-request logging.

The RTDB has open read/write rules (anyone with the URL can read reservations). To harden for
production: lock down with Firebase Database rules + Auth (public `create` on `/translatesports/*`,
admin-only `read`) and switch `changes.html` to the Firebase Auth SDK. Change `ADMIN_PASSCODE` regardless.
