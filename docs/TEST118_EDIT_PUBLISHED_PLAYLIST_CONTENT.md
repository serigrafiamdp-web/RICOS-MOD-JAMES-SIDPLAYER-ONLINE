# TEST118 — Edit published playlists from ADD + TO

**Status:** GitHub frontend + Worker source committed; JavaScript syntax PASS; **Cloudflare Worker deployment and browser end-to-end PASS remain pending**. Do not claim that public additions are active until the Worker is deployed and a real end-to-end test is performed.

## User workflow

1. Start any playlist, such as UCTUMI, or play a SID sourced from a verified HVSC ZIP.
2. Open **ADD + TO** in the floating playlist. It now contains existing unpublished **REMIX** drafts and **PUBLISHED PLAYLISTS** retrieved from the Cloudflare D1 catalog.
3. Choose a published destination, for example **RICO'S BEST OF MUS**. The browser fetches its current reference list and creates a local *linked editing draft* without starting or changing playback.
4. Keep listening to the source playlist. Press **+** next to any SID to add its existing verified HVSC `pack/file` reference to the selected draft; the published version remains untouched.
5. Use REMIX PLAYLIST to review, reorder (↑/↓), or remove (×) tracks from the private draft. **PREVIEW CHANGES** allows listening to the draft deliberately.
6. Select **PUBLISH CHANGES**; the site checks that the public playlist still has the original title, creator and exact song list, then requests the beta key and updates **the same D1 playlist ID via PUT**. A full GET comparison confirms the entire saved order. Successful updates remove the local edit draft.
7. **DISCARD CHANGES** removes the local edit draft, not the published playlist.

The catalog also exposes **EDIT CONTENT** for public D1 playlists as a shortcut to start the same linked draft. The original metadata-only EDIT and DELETE actions are unchanged. Static GitHub curated/ranked playlists are not offered as in-place D1 edit targets.

## Persistent local edits

- Draft `remoteEditId`, `baseTracks` and changed `tracks` are stored using the existing REMIX localStorage/sessionStorage mechanism. They survive reload within the same browser profile.
- Unpublished linked editing drafts do not create additional public community rows.
- No SID binary is copied/uploaded. Track references continue pointing to HVSC ZIPs.
- Duplicate SID `pack/file` references are blocked; capacity remains 2000 entries.
- The beta key is requested at publication only, never persisted in the draft.
- Other user's public edits are protected by comparing a SHA-256 of the source tracks, and by the existing D1 `WHERE id=? AND payload=?` optimistic concurrency constraint.

## Worker source change and deployment (separate from GitHub Pages)

Code source: `community/api/worker.js`. The `/capabilities` response must include `playlistTrackAdditions: true` **on the live deployed Worker** before the frontend will attempt an additive update.

The existing `PUT /playlists/:id` is backwards-compatible:
- Legacy PUT: reorder/remove only; new tracks remain forbidden.
- TEST118 explicit `contentUpdate: true` plus valid 64-character lowercase `expectedBaseHash` permits additions/reorder/removals after beta authorization and matching source snapshot, with unchanged title/creator and full server-side duplicate/format checks.
- Stale source snapshots return HTTP 409, leaving the public playlist unchanged.

To deploy manually: open Cloudflare Workers & Pages, service `ricos-sid-community`, back up live code (not secrets), update with repository `community/api/worker.js`, and deploy. **Preserve** D1 binding DB, existing `BETA_EDIT_KEY`, SID uploads binding/provider and other environment settings. No D1 migration is required for this change. Confirm `GET /capabilities` includes the new flag. GitHub source commits do not deploy Cloudflare automatically.

## Test checklist

1. Open TEST118, verify **ADD + TO** shows both REMIX drafts and published D1 playlists.
2. While UCTUMI is playing, select RICO'S BEST OF MUS as the destination. Confirm current audio continues uninterrupted and its public D1 row remains unchanged.
3. Press + on a song from UCTUMI; verify it appears in the selected **EDITING** draft, not the public list.
4. Switch to a second playlist, add one different SID, verify source playback unaffected and additions still target the same published-list draft.
5. Reorder and remove a draft song; refresh the page to confirm the local draft is preserved.
6. After deploying the Worker, **PUBLISH CHANGES** with the beta key; verify the same public ID, expected count and exact order via fresh GET and a second browser.
7. Without deploying the Worker, verify publication is rejected clearly, keeping the private draft and original public list intact.
8. Verify stale-public-version detection and wrong beta key refuse updates without losing the draft.
9. Check unrelated new REMIX publishing, SAVE order/removals, PLAY, EDIT, DELETE, playlist selection, hints, three sample stars, and audio engine.

**Important:** PASS requires owner verification in the browser, including Worker deployment and a successful update to a test playlist. The currently committed change is a staged build, not a confirmed public-edit production deployment.
