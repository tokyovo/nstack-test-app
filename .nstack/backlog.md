# Backlog
Scored 2026-11-25 (value + risk + cost, cost 5 = cheapest). Bar for a ticket: 9.

- 8 (v2 r2 c4) Sessions never expire; add expiry (and `secure` cookie flag in production). Deployment is out of scope, so the `secure` part has no user today. (T2 security review)
- 7 (v2 r1 c4) A failed move (tampered/stale) reverts the card silently, no error shown. (T6)
- 7 (v2 r1 c4) Board search query is not in the URL, so a filtered board cannot be linked or survive reload. (T8)
- 7 (v1 r1 c5) e2e temp SQLite files (and -wal/-shm) are left in the OS temp dir after each run; add a globalTeardown to delete them.
- 6 (v1 r1 c4) CI uses actions/checkout@v4, setup-node@v4, upload-artifact@v4; bump when newer majors are standard.
- Rejected: login timing leaks whether an email exists. Signup ("already used") and invite ("No user with that email") reveal it by design (AC2, AC7), so closing the timing channel adds nothing.
