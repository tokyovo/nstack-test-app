# Backlog
- e2e temp SQLite files (and -wal/-shm) are left in the OS temp dir after each run; add a globalTeardown to delete them.
- CI uses actions/checkout@v4, setup-node@v4, upload-artifact@v4; bump when newer majors are standard.
- Login timing leaks whether an email exists (unknown email skips scrypt, ~58 ms faster). Fix: run scrypt against a dummy salt on unknown email. (T2 security review)
- Session cookie has no `secure` flag and sessions never expire; add expiry + `secure` in production. (T2 security review)
- Invite action has no non-member tamper test (projectId is a `.bind` arg, encrypted by Next; guard `getProject` in inviteMember exists, read-only proof). (T3/T4 review)
- Task create has no non-member tamper test (projectId is a `.bind` arg, encrypted by Next; createTask guards with getProject). (T5)
- `.bind` args on server actions are NOT encrypted in Next 16: T6 saw the move request body as plain `[projectId, taskId, status]`. The backlog notes for invite/task-create tamper tests are wrong about encryption; projectId is client-tamperable there too (guards exist; add tamper tests like e2e/move.spec.ts). (T6)
- A failed move (tampered/stale) reverts the card silently, no error shown. (T6)
