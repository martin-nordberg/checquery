# Downloaded Backup — Implementation Plan

## Original task (`tasks/todo/downloaded-backup.md`, deleted when this plan was filed)

> * On the File Info screen add a button between "File Info" and "Close This File" with title "Download Backup".
> * When clicked the new button downloads an exact copy of the open SQLite file, including its encryption.
> * It should be possible to round trip a file: download it here then later upload it to the File Open screen.

## Decisions (user, 2026-10-16)

All four open questions in §7 go with the recommendation. The user's framing: **the download is an emergency
backup for restoring from scratch.**

- **Q1 (a):** upload rules are unchanged. A download restores onto a fresh server or data directory, or onto
  this one after the original is gone, but not next to its own original.
- **Q2:** the stamped name `<name>-YYYY-MM-DD_hh-mm.checquery`.
- **Q3:** no extra server-side copy.
- **Q4:** any session that has unlocked the file can download it.

## Reading of the task

- **"The File Info screen"** is the file-open home hub (`HomePage.tsx` → `FileHub`). Its top row has the
  "File Info" and "Close This File" buttons, and "Download Backup" goes between them. The File Info *dialog*
  itself is unchanged.
- **"An exact copy … including its encryption"** means the `.checquery` file's bytes, as on disk. Encryption is
  application-level: action-log payloads are AES-GCM ciphertext, and `meta` holds the KDF salt and params. So a
  byte copy is still encrypted with the same file password. No re-encryption or export format is involved.
- **"Round trip"** means the downloaded file, uploaded through the Open File dialog's existing upload
  (`POST /api/files`), is accepted and then opens with its original password. §4 covers the catch: the current
  upload rules refuse a copy of a file that's still on the server. That's open question Q1.

## 1. Server: `GET /api/file/download`

Add the route to `fileRoutes` in `packages/server/src/routes/fileRoutes.ts`, next to `/info`:

```ts
.get("/download", requireUnlockedFile, async (c) => { ... })
```

- **Guard:** `requireUnlockedFile`, the same as `/info`. Only a session that has unlocked the open file, so has
  proved it knows the password, can download it. That's belt-and-braces, since the file is encrypted anyway.
  It also means the download counts as activity for idle-close, like any request.
- **Consistent snapshot:** read the bytes inside `state.mutex.run(...)`. The `serializeMutations` middleware
  only wraps non-GET requests, so this GET has to take the mutex itself. Inside it, no write, close, or
  idle-close can be in progress. The database uses SQLite's default rollback journal (no `journal_mode` pragma
  anywhere), and Checquery holds no transaction open between requests, so the main file on disk is complete and
  consistent at that point. That's the same precondition the close-time `backupFile` byte copy relies on.
- **Implementation:** a new `readCurrentFileBytes(): Promise<Uint8Array>` in `persistence/db.ts` returns
  `Bun.file(currentPath).bytes()`. It throws `no-file-open` if nothing is open, which can only happen in a race
  that the mutex rules out. The route calls it under the mutex and responds with:
  - `Content-Type: application/octet-stream`;
  - `Content-Disposition: attachment; filename="<download name>"` (see Q2);
  - `Cache-Control: no-store`, so the encrypted file isn't cached by the browser or any proxy;
  - the bytes as the body.

  Reading the whole file into memory is fine at the sizes involved: uploads are capped at
  `CHECQUERY_MAX_UPLOAD_MB` (200 MB), and real files are a few MB. Holding the mutex during the read blocks
  writes only for the read's duration.
- **Alternative, not chosen:** `Database.serialize()` (SQLite's `sqlite3_serialize`) also gives a consistent
  image without touching the filesystem. But the task says "exact copy", and the bytes on disk *are* the file.
  Note this choice in a comment.
- **Logging:** `console.log(`${user} downloaded ${name}`)`, matching sign-in, open, and close.
- No new shared Zod schema is needed: the route has no input, and its output is a binary body rather than JSON.
  The typed `hc` client still sees the route via `AppType`.

## 2. Client

### 2.1 `fileSession.ts`: `requestDownloadBackup()`

```ts
export async function requestDownloadBackup(): Promise<void>
```

1. Call `api.file.download.$get()`. If it isn't OK, pass the response through `unwrap()`'s error path, so the
   server's message becomes `ApiError` and `sessionRecovery` sees `file-locked` / `no-file-open` /
   `unauthenticated` as it does for every other call.
2. On success, read `await res.blob()` and take the file name from `Content-Disposition`, falling back to the
   name built on the client.
3. Create an object URL and click a temporary `<a download="...">`. Then revoke the URL and remove the element.
4. On failure, show `setErrorAlert({ title: "Cannot Download Backup", message })`, the same pattern as
   `requestFileInfo` and `requestCloseFile`.

**Why fetch → blob instead of a plain `<a href="/api/file/download" download>`:** a plain link can't report
errors. A locked session or expired login would download or display the JSON error body instead of showing the
usual alert. The cost is holding the file in the tab's memory once, which is fine at these sizes.

CSP: an anchor download from a `blob:` URL is a navigation/download, not a fetch, so `default-src 'self'` doesn't
block it. Confirm this in the end-to-end check (§5).

### 2.2 `HomePage.tsx`: the button

In `FileHub`'s top row, between the two existing buttons:

```tsx
<button type="button" class={buttonClass} onClick={() => void requestDownloadBackup()}>
	<NavIcon path={downloadBackupIconPath} /> Download Backup
</button>
```

Add `downloadBackupIconPath` to `nav/icons.ts`: a 24×24 stroke "arrow down into tray" path, in the existing
hand-rolled style.

While a download is in flight, disable the button with a small `downloading` signal so a double click doesn't
fetch twice. That's optional polish but cheap.

## 3. File name of the download

See Q2. Recommended: **`<name>-YYYY-MM-DD_hh-mm.checquery`**, the same stamp format as the close-time backups
in `<dataDir>/backups/`. It uses the server's local time, so reuse `timestampFor` from `persistence/backup.ts`
and export it.

- Repeated downloads don't overwrite or get renamed to `name (1).checquery` in the browser's Downloads folder.
- It's obvious which is the backup and when it was taken.
- The stamped name passes `fileNameSchema` (letters, digits, space, `_`, `.`, `-`; up to 100 characters), so
  it uploads as-is. A 100-character base name would exceed the limit once the 17-character stamp is added. In
  that case, truncate the base so the whole name fits.
- In test mode the extension is `.checquery-test`, as everywhere else (`fileExtensionFor`).

## 4. Round trip and the upload rules

`uploadFile` (`fileUpload.ts`) validates an upload and **refuses** in two relevant cases:

- **Same name already exists** → 409 `already-exists`. A timestamped download name (Q2) avoids this.
- **Same `file_id` as a file already on the server** → 409 `duplicate-file-id`, "That file is a copy of "X",
  which is already on the server." This is deliberate: two diverging copies of one file share a `node_id`, which
  makes their HLC timestamps ambiguous.

So a downloaded backup uploads cleanly to:

- a different Checquery server or data directory;
- the same server after the original is gone, such as a lost or recreated volume, or a file removed by hand.
  The app has no delete-file feature.

It does **not** upload back next to its own original. Whether it should is Q1.

The rest of upload validation already passes for a downloaded file: SQLite header, `meta.file_id` and `node_id`
present, a schema version no newer than this build, and the `encrypted` flag matching the server's mode.

## 5. Tests and verification

**Server** (`packages/server/test/file.http.test.ts`):

- `GET /api/file/download`:
  - is 401 signed out, and is added to the protected-routes table in `auth.http.test.ts`;
  - is 403 `file-locked` for a session that hasn't unlocked;
  - is 409 `no-file-open`, or whatever `/info` returns, when no file is open.
- Download after some writes:
  - the body is byte-identical to the file on disk read right afterward;
  - the headers are `Content-Disposition: attachment; filename="<name>-<stamp>.checquery-test"` and
    `Cache-Control: no-store`.
- **Round trip, in test mode:** download, close, delete the original from the data dir in the test, upload the
  downloaded bytes, then open the file. The entity counts match the original.
- **Round trip, encrypted** (`startTestServer({ encrypted: true })`): the same flow, plus opening with the
  original password succeeds and a wrong password fails.
- Uploading the download while the original is still present gives 409 `duplicate-file-id`, unless Q1 changes
  this.
- The download waits for an in-flight mutation. Hold the mutex with a deferred promise, start the download,
  check it hasn't resolved, release the mutex, and check it then completes.
- Unit test the name builder: the stamp, the test-mode extension, truncation to fit `fileNameSchema`, and that
  the result parses.

**Client:**

- `HomePage.test.tsx`: the file-open hub shows "Download Backup" between "File Info" and "Close This File", and
  clicking it calls `requestDownloadBackup`. Use the existing `mock.module` pattern.
- `fileSession` test, if the existing tests cover it: a non-OK response sets the "Cannot Download Backup"
  alert; an OK response creates and revokes an object URL. Stub `URL.createObjectURL` / `revokeObjectURL` under
  happy-dom.

**End-to-end** (headless Chrome with a download directory set via CDP `Browser.setDownloadBehavior`, against
`bun run start`, then against the Docker/Caddy stack):

- Click Download Backup, and confirm the downloaded file is byte-identical to `<dataDir>/<name>.checquery`.
- Confirm there are no CSP errors.
- Upload the file to a second, empty data directory, open it with the password, and check the balance sheet
  matches.

## 6. Phases (one commit each)

1. **Server:** the `/download` route, `readCurrentFileBytes`, the exported timestamp/name builder, and tests.
2. **Client:** `requestDownloadBackup`, the button and icon, and tests. Then the end-to-end check, update
   CLAUDE.md where it lists the file lifecycle (add "download"), and move this plan to `tasks/done/`.

If Q1 picks option (b) or (c), that's an added phase 2, and the client becomes phase 3.

## 7. Open questions

**Q1. Should the round trip work on the *same* server while the original is still there?**

Today the upload refuses a file whose `file_id` matches one already on the server, so the download can't be
uploaded back beside its original. Options:

- **(a) No change (recommended for this task).** The download is an off-server backup, restored to another
  server, or to this one after the original is lost. The "already on the server" message explains the refusal.
  This keeps the no-overwrite, no-diverging-copies guarantee intact.
- **(b) Restore-over.** When an upload's `file_id` matches an existing file, offer "Replace "X" with this
  backup?" On confirmation:
  - if X is open, close it, which also backs it up;
  - copy X into `backups/`;
  - replace it atomically with the upload.

  This is the most useful form of "restore" but the most code: a confirm step in the Open File dialog, plus a
  `replace` flag on `POST /api/files`. It overwrites a live file, which upload has deliberately never done.
- **(c) Import as an independent copy.** Accept the upload under its new name with a fresh `file_id` and
  `node_id` written into its `meta`. Upload would then write to the file, which it never has, and the copy's
  existing HLCs still carry the old node id. That's probably harmless, since files never merge, but it needs
  checking.

Which do you want? (a) can ship now, with (b) as its own follow-up task.

**Q2. Download file name?**

- **`<name>-YYYY-MM-DD_hh-mm.checquery` (recommended),** for the reasons in §3.
- **`<name>.checquery`.** The original name; uploading it elsewhere recreates the same name. Repeated downloads
  pile up as `name (1).checquery` and so on.

**Q3. Should downloading also write a copy to `<dataDir>/backups/`?**

Recommended: **no**. The close-time backups already cover the server side, and the point here is an off-server
copy.

**Q4. Should the button be offered to every session that has unlocked the file?**

Recommended: **yes**. Unlocking already requires the password, and both users are household members. The
alternative is limiting downloads to the user who opened the file.

## 8. Not in scope

- Downloading files that aren't open, or old backups from `<dataDir>/backups/`. A natural follow-up: a backups
  list in the Open File dialog with per-row download.
- Any export format other than the raw file. `tasks/todo/export-import.md` covers JSON export of
  accounts/vendors separately.
- Scheduled or automatic off-server backups.
