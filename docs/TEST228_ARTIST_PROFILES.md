# TEST228 — STIL / Artist Profiles (pending Worker deployment)

## Scope
- Main player link now reads **STIL** (click to toggle the original left panel).
- STIL remains complete and scrollable at the bottom of the existing sidebar.
- **EDIT STIL** changes the SpotySid display only. Official HVSC `library/stil/*.json` is untouched.
- Existing **ADD NEW LINK**, **ADD CSDb**, **ADD ARTWORK** remain local drafts until a verified public write.
- Sidebar shows **PUBLISH** for a new profile, **REPUBLISH** when the public profile already exists. All data is keyed to the artist, while STIL overrides are keyed to the specific HVSC song.
- Link deletion in a draft is supported; published links cannot be altered without a version-checked REPUBLISH.
- No SID engine, playback or playlist changes.

## Persistence
- Browser draft key: `spotysid:artist-drafts:v1:<artist key>`.
- Public API in `community/api/worker.js`: `GET/POST/PUT /artist-profiles`. A GET requires a `key` query parameter. Writes require `X-Beta-Key`, the existing server beta key and an `expectedRevision` optimistic-concurrency value.
- Public profile contains artistName, links, csdb, artwork (URL references), stilOverrides.
- D1 `artist_profiles` table is created on demand. `community/api/schema.sql` also contains the canonical schema.
- Official STIL entries remain the fallback. SpotySid overrides apply only to its display.
- On write, the browser rereads the record and verifies revision + content **before** saying PUBLISHED / REPUBLISHED · VERIFIED. On failure, drafts remain local.
- API capability `artistProfiles` prevents attempting writes before backend deployment.

## Deployment / verification
**GitHub Pages updates do not deploy the Cloudflare Worker.** Do not claim that PUBLISH is live because the UI is visible.

1. Back up the live Cloudflare Worker and D1 database, and compare deployed Worker source with `community/api/worker.js`. Preserve independent production fixes, secrets and bindings.
2. Deploy the reviewed Worker update to `ricos-sid-community` with D1 binding `DB` and secret `BETA_EDIT_KEY` intact. No destructive migration is required.
3. Confirm `GET /capabilities` includes `artistProfiles:true`; `GET /artist-profiles?key=hvsc%3A%2FMUSICIANS%2FU%2FUctumi` returns a version-1 response with revision 0 or an existing profile.
4. Edit a TEST SID's STIL text and add a test link. Confirm local draft survives page reload. Press PUBLISH with the beta key; verify saved public profile after reload in a separate browser.
5. Change the link or STIL override and REPUBLISH; confirm stable artist key and incrementing revision. Verify a stale revision returns HTTP 409 **without** discarding a local draft.
6. Confirm official STIL files, other artists' profiles, existing playlists, NO HVSC, playback and controls have not changed.

**Current status:** frontend and Worker reference source committed; backend deployment and end-to-end publication remain pending. TEST228 is **not** a verified public publishing PASS.
