# TEST94 — Reorder SID tracks (↑ ↓)
Status: Cloudflare Worker manually deployed; public UCTUMI (99) contributed SID collection SAVE/reload **user-confirmed PASS in TEST108**. Other public playlist routes require separate tests. See [TEST108](TEST108_UCTUMI_SAVE_ORDER_PASS.md).

## Scope
- Remix drafts: Up/Down arrows in REMIX PLAYLIST CREATOR, saved immediately in localStorage/sessionStorage.
- Playback playlist window: Up/Down arrows move songs one slot without restarting the current SID.
- D1 public HVSC reference playlists: click SAVE after changing order; Worker requires BETA_EDIT_KEY and accepts only permutations/subsets of existing pack/file references.
- D1 public contributed SID collections (OUR COLLECTION): click SAVE after reordering; Worker requires BETA_EDIT_KEY, validates a complete permutation of the prior track positions, and updates only D1 references. No Github SID file writes.
- GitHub static historical playlists: immutable originals; player session may reorder but cannot overwrite them.
- All controls use active CSS palette variables.

## Deployment
1. In Cloudflare Workers & Pages > ricos-sid-community > Edit code, back up the currently deployed Worker JS (do not copy secrets).
2. Copy the full source of community/api/worker.js from the player repository and replace Worker editor content.
3. Inspect for editor errors, then Deploy. Preserve DB binding, BETA_EDIT_KEY and GITHUB_SID_TOKEN. No D1 migration required.
4. GET https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities should include playlistReorder:true and sidCollectionReorder:true, while preserving sidUploadsEnabled:true and sidUploadProvider:github.
5. Test draft reorder locally, then on one small public v2 playlist move a song down, press SAVE, enter the beta key, and reload in a second browser.
6. Test an OUR COLLECTION published SID list similarly, and verify the SID bytes remain in ricos-sid-uploads and all files still play.

## Safety checks
- No request is sent while moving arrows; server changes occur only after SAVE and beta authorization.
- Bad key is rejected; invalid new/duplicated SID references are rejected.
- User-contributed collections accept only track permutations, preserving repeated SID positions and unchanged file hashes.
- If capabilities flags are absent, frontend refuses order saving without mutating the public database.
- Worker's current D1/Cloudflare deployment is independent of GitHub Pages: editing worker.js in GitHub alone does NOT deploy the Worker.
