# Backlog
- e2e temp SQLite files (and -wal/-shm) are left in the OS temp dir after each run; add a globalTeardown to delete them.
- CI uses actions/checkout@v4, setup-node@v4, upload-artifact@v4; bump when newer majors are standard.
- Login timing leaks whether an email exists (unknown email skips scrypt, ~58 ms faster). Fix: run scrypt against a dummy salt on unknown email. (T2 security review)
- Session cookie has no `secure` flag and sessions never expire; add expiry + `secure` in production. (T2 security review)
- A failed move (tampered/stale) reverts the card silently, no error shown. (T6)
