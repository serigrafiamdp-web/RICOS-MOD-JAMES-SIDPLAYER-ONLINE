# TEST108 PASS — Public UCTUMI playlist order persists after SAVE and reload

**Status:** **USER-CONFIRMED PASS**. Tested against deployed Cloudflare Worker `ricos-sid-community`.

## Root cause and fix

The player previously displayed `Cloudflare Worker TEST94 is not deployed yet` when the owner attempted to save a changed order in **UCTUMI (99)**. The source code in GitHub already had the required reorder endpoints, but the live Cloudflare Worker did not yet expose the reorder capability flags. Updating GitHub Pages alone did not deploy the Worker.

The owner manually deployed the current `community/api/worker.js` using the Cloudflare dashboard, preserving the configured D1 binding and existing secret(s).

The owner then checked `https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities`, which returned:

```json
{"format":"ricos-community-capabilities","version":1,"betaKeyRequired":true,"editMode":"metadata-and-delete","sidUploadsEnabled":true,"playlistReorder":true,"sidCollectionReorder":true,"sidUploadProvider":"github","sidUploadLimit":15,"configured":true}
```

This confirms the deployed Worker reports both public playlist reorder support and contributed SID collection reorder support. The user then carried out the requested UCTUMI order SAVE/reload test and replied **"PASS"**.

## Confirmed behavior

- **UCTUMI (99), a public contributed SID collection:** reorder, enter beta key when pressing SAVE, and reload while retaining the saved order — **USER PASS**.
- **Client readback:** TEST107 only reports a verified SAVE after reading the order back from the Worker.
- Existing public SID upload capability remained enabled in the capabilities response.
- No changes to SID binary files, audio playback code, or backend database schema for this TEST108 checkpoint.
- **Not yet separately verified:** end-to-end public HVSC v2 playlists, REMIX draft publishing and its reload, and all other collections. Those remain subject to individual tests; TEST108 PASS does not imply that every playlist route has passed.

## Links

- [Player](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=108)
- [Worker source](../community/api/worker.js)
- [TEST107 order verification](TEST107_SAVE_RELOAD_VERIFY.md)
- [TEST94 deployment notes](TEST94_REORDER_DEPLOY.md)

**Checkpoint:** TEST108 PASS (public UCTUMI order persisted); TEST107's underlying public collection verification path confirmed through the TEST108 user test. Previous player/audio TEST104 PASS retained.
