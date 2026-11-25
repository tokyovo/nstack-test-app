# Backlog
- e2e temp SQLite files (and -wal/-shm) are left in the OS temp dir after each run; add a globalTeardown to delete them.
- CI uses actions/checkout@v4, setup-node@v4, upload-artifact@v4; bump when newer majors are standard.
