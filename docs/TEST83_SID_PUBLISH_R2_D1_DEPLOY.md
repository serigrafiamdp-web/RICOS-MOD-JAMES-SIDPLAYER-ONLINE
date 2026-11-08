# TEST83 — Publish imported SID files to OUR COLLECTION (staged, NOT deployed)

**Status (2026-11-08):** GitHub frontend and backend source committed. Cloudflare deployment and user PASS are **PENDING**. TEST82 is the last user-confirmed PASS.

## Architecture and permissions

- GitHub Pages displays **OUR COLLECTION** as one row per collection, using the existing floating PLAYLIST window on LOAD. There are no per-song PLAY controls in the browser.
- IMPORT SID and SAVE LIST store V1, embedded-byte playlists in the user's IndexedDB.
- Local saved playlists appear in COMMUNITY PLAYLISTS with LOAD / DELETE / PUBLISH. On PUBLISH, the browser first fetches `GET /capabilities` and requires `sidUploadsEnabled:true`. If not configured, it refuses and leaves local data safe.
- PUBLISH asks for collection uploader/creator if the original metadata is missing, confirms permission to share files, and requests the existing **beta key** via the established modal. The key is sent only in `X-Beta-Key` to Cloudflare Worker and is never saved locally or committed.
- `POST /collections`: validates V1 SID uploads (PSID/RSID header and sizes), enforces 1–40 SID, maximum 65,536 bytes per SID, 1.2 MB total SID bytes, 1.8 MB JSON body, rate limit, and beta-key authorization; files are stored in **Cloudflare R2** under immutable SHA-256 keys. D1 records collection title, author, SID IDs and per-collection order.
- `GET /collections`: returns summaries; `GET /collections/:id`: track asset references; `GET /sid-assets/:sha256`: serves immutable binary bytes via R2.
- OUR COLLECTION merges published shared collections with local IndexedDB collections and distinguishes LOCAL ONLY / PUBLISHED. Published collections use the same LOAD and floating playlist; their SID bytes are loaded on demand from the Worker. Existing HVSC library is unchanged.
- The original `POST /playlists` route remains limited to HVSC references. No arbitrary SID bytes are accepted by that older route.
- Uploaded collections remain visible after publication, but the local copy is not deleted automatically. This is intentional; do not delete user data on publish.

## Deployment needed in the existing Cloudflare account

1. Create a private R2 bucket for SID files, e.g. `ricos-sid-assets`. **Do not make the bucket publicly writable**, and don't expose account API tokens.
2. Open the Worker `ricos-sid-community`. Add an **R2 bucket binding** with variable name `SID_BUCKET`, pointing to the bucket. Preserve the existing D1 binding **DB** and secret **BETA_EDIT_KEY**. No key changes are required. If R2 billing isn't enabled, Cloudflare may require account setup first.
3. Run the **new CREATE TABLE statements** from [community/api/schema.sql](../community/api/schema.sql) on the **existing D1 database** `ricos-sid-community`. They are `IF NOT EXISTS` and do not delete older tables. Do not reset the database.
4. Deploy the **updated** [community/api/worker.js](../community/api/worker.js) to the SAME `ricos-sid-community` Worker. Do not create a duplicate service or overwrite bindings. Verify the deployment actually succeeded.
5. Check `GET https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities` returns `sidUploadsEnabled:true`, and `GET /collections` returns `{"format":"ricos-sid-collections","version":1,"collections":[]}` or existing rows. If capability is false, frontend must refuse publication.
6. In GitHub Pages TEST83, use the existing RICO NUEVA local 13-SID collection, click PUBLISH, enter name/creator and beta key, then verify it appears in OUR COLLECTION as PUBLISHED on another browser. Test LOAD and original SID audio.
7. Confirm all earlier published HVSC playlists, editor, REMIX, playback, and all UI themes still work. **Only after user confirmation mark TEST83 PASS.**

## Safety and limits

- Publishing means publicly distributing SID bytes. Require the uploader to have redistribution permission; a beta key does not establish copyright ownership.
- Authenticated beta publishing is admin-gated only, **not per-user login or per-uploader identity**. Proper user permissions and moderation remain future work.
- Uploaded asset IDs are SHA-256 of binary data; same bytes reuse a single object across collections. Identical songs saved twice in different collections don't duplicate R2 storage. The underlying R2 data is not removed automatically by deleting a playlist.
- New columns/tables do not change existing library / HVSC schema.
- Rate limit: 5 submissions/hour per IP hash, shared with existing public playlists.
- Maximum 40 SID per published collection in this beta. Publishing more needs a later batch/session design.
- Even though source JS is staged, until R2 / D1 / Worker are deployed it is **not functional publishing**. GitHub Pages alone cannot provision Cloudflare infrastructure.

## Repository checkpoint

- Stable: **TEST82 PASS**, source `js/customPlaylist.test82.js`.
- Pending TEST83: `js/customPlaylist.test83.js` + canonical `js/customPlaylist.js`; schema `community/api/schema.sql`; Worker `community/api/worker.js`; `index.html` points to test83 build.
