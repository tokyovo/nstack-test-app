# Plan

## Slice: secure-access (branch nstack/secure-access)
Nothing changes on screen. Every page and download now tells the browser it may not be framed by another site and may not guess content types, and the Features map in verify.md records who may reach each feature and which test proves everyone else is refused. Found by Orient on main c1574a6: `check-security` failed (no Access/Deny columns, no CSP or X-Frame-Options, no nosniff).
Acceptance criteria:
1. Every response of `next start` (an HTML page logged out and logged in, a board, the export route, a 404, a static asset) carries `Content-Security-Policy: frame-ancestors 'none'` and `X-Content-Type-Options: nosniff`.
2. A create-project request sent after the session cookie is gone is answered with a redirect to /login and adds no project; logged out, GET /projects redirects to /login.
3. A create-label request whose bound project id is a project the user is not a member of adds no label there (A's labels unchanged) and none to the user's own project.
4. The Features table in `.nstack/verify.md` has Access and Deny proof columns; every row has an Access level (`public`, `signed-in` or `member`) and every non-public row names an existing deny-proof test.
5. Each deny proof is seen to fail with its check removed: with `getProject`'s membership condition removed every member deny proof run fails, with `requireUser` removed from `createProjectAction` the AC2 test fails, and both pass again restored.
6. `../secure/scripts/check-security . <drive url>` exits 0 and `scripts/check-features .nstack/verify.md` exits 0.
Out of scope: a script-src CSP (needs per-request nonces, which makes every page dynamic; backlog), X-Frame-Options (frame-ancestors covers every current browser), HSTS (no deployment).
Design: headers in `next.config.ts` `headers()` for `/:path*` (one place, applies to pages, route handlers and static files) rather than middleware (a new runtime file and a matcher to keep right). Decision: rows with no request path of their own (salted hashes, old-database migration, seed and drive tools, a11y/layout rows that span public and member screens) are `public`: no access rule applies to them beyond the screens' own rows.

Answers (plan check): AC1 tests logged-out `/` (its 307) and `/login`, logged-in `/projects`, a member's board, `/projects/<id>/export?format=csv` (200), logged-in `/nope` (404), and a `/_next/static/...` script src read from the /login HTML; CSP compared exactly. AC2: load /projects logged in, `context.clearCookies()`, submit New project, expect /login, log in again and see the name absent. AC3: reuse `tamperedLabelRequest` in `e2e/labels.spec.ts` with an act that submits the New label form; assert A has only ["Bug"], B only ["Mine"]. AC5 bite: drop `AND project_members.user_id = ?` and its parameter in `lib/projects.ts` `getProject`, and the `requireUser()` line in `createProjectAction`; run the Deny proof column's tests by `--grep`; restore with `git checkout`, never commit; record the result on the T48 line and in the PR body. Table header exactly `| Feature | Reach | Access | Proof | Deny proof |`, public rows `-`. "Log in and log out" and "Header title links" are `public`. `check-features` is `go/scripts/check-features` in the nstack skills folder.

- [ ] T47 Security headers on every response (AC1). Proof: new `e2e/headers.spec.ts` "AC1: pages, the export, a 404 and a static file carry frame-ancestors 'none' and nosniff", seen red before the config change; check-security header line ok. Needs: none
- [ ] T48 Access map and the missing deny proofs (AC2-AC5). Proof: new `e2e/access.spec.ts` "AC2: a create-project request without a session goes to /login and adds no project" and "AC2: logged out, /projects goes to /login"; `e2e/labels.spec.ts` "AC36: a create-label request naming a project the user is not a member of adds no label there"; the AC5 bite runs logged; check-security access-map line ok; check-features 0. Access: signed-in (create project), member (create label). Needs: none

## Done
- task-board v1: T1-T8, PR #1
- usable-board: T9-T12, PR #2
- slice3 (hardening + my tasks): T13-T16, PR #5
- drive harness: T17, PR #7
- forms-layout: T18, PR #8
- board-feedback: T19-T22, PR #10
- export: T23-T24, PR #11
- labels-checklist: T25-T28, PR #13
- board-fold: T29-T30, PR #14
- task-feedback: T31-T34, PR #15
- drive-tool: T35-T36, PR #17
- design: T37-T40, PR #20
- labels-dup-calendar: T41-T46, PR #22
