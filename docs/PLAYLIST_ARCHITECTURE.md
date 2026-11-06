# RICOS MOD — Playlist Architecture (TEST09)

## Current implementation
TEST08 on main is the reference baseline. TEST09 is isolated in `test/playlist-local-json-09`; it has not passed browser acceptance tests.

- The original SID engine and default SID collection are unchanged.
- CUSTOM lists are still created with ADD SID FILES, ADD FOLDER or drag and drop.
- SAVE LIST writes a named, self-contained playlist into browser IndexedDB (database `ricos-sid-playlists`, store `playlists`).
- LOAD LIST retrieves a stored playlist and reconstructs its original SID bytes.
- DOWNLOAD JSON exports the currently assembled CUSTOM list, with complete SID bytes encoded as base64.
- IMPORT JSON restores complete tracks without requiring the source .sid files. Import does not automatically persist: click SAVE LIST.
- Saving a playlist with the same name updates that named record. Browser data is per origin/browser profile, subject to user clearing storage and browser quota. A downloaded JSON is the portable backup.
- No data are uploaded and no community feature is live.

## Portable JSON v1
```json
{
  "format": "ricos-sid-playlist",
  "version": 1,
  "name": "My SID Playlist",
  "createdAt": "2026-11-06T00:00:00.000Z",
  "tracks": [
    {
      "file": "example.sid",
      "sidBase64": "UFNJRA..."
    }
  ]
}
```
The base64 above is an abbreviated illustration only. In real exports it contains the entire PSID/RSID file. Versioned keys are intentional for future schema migration. The importer validates every SID before replacing the live list, enforces up to 2000 tracks and 64 MiB of decoded SID bytes, and rejects malformed formats. Local IndexedDB records add `id` and `updatedAt` fields.

## Future community architecture
Keep **local storage** and **community publication** separate:
1. User assembles a playlist, saves it privately, or exports JSON.
2. Explicit SHARE PLAYLIST prompts for playlist title, author/pseudonym, consent and confirmation of rights/permission to redistribute the embedded SID files.
3. An authenticated or rate-limited upload API validates data, applies file and size limits, scans/queues the submission, stores it in private staging, and issues a moderation ID.
4. Owner approves/rejects before publishing. Public catalog stores a server-generated playlist ID, version, title, pseudonym, track count, timestamp and published payload location.
5. USER PLAYLISTS tab lists approved items with sorting by NEWEST, TOP RATED, MOST PLAYED. Opening one loads it using the same portable format.
6. Ratings API prevents unlimited repeat votes (login/session or other appropriate abuse safeguards); track play counts with privacy-friendly aggregation.
7. GitHub Pages stays a static frontend. Never expose a GitHub write token in browser code. Initially a protected backend can write approved catalog metadata/artifacts to GitHub, or store them on dedicated object storage. Later move API/storage without changing the playlist JSON v1 contract.
8. Do not silently upload user files. Public distribution of SID binaries requires copyright/licensing review; consider an alternative metadata-only share mode for tracks whose redistribution is unauthorized.

## Acceptance checklist — TEST09
- Import multiple local .sid files; SAVE LIST under a chosen name; close/reopen the player in the same browser; LOAD LIST; confirm order and playback.
- DOWNLOAD JSON; load JSON in another browser/profile without original SID files; confirm playback and track ordering.
- Test invalid/corrupted JSON and oversized playlists; active playlist must not be replaced.
- Test duplicate names, empty CUSTOM list, and resetting CUSTOM without erasing saved playlists.
- Test DEFAULT/CUSTOM switching and auto-advance; verify original 22 SID and waveform controls still behave exactly as TEST08.
- Test movable/resizable floating playlist with the new chooser controls.
- Verify no network requests are caused by SAVE, LOAD, DOWNLOAD or IMPORT.

## Planned milestones
- TEST09: local save/load and portable JSON (current implementation, **UNVERIFIED**).
- TEST10: usability, backup/delete/rename for saved playlists.
- TEST11: community submission service and moderation queue.
- TEST12: USER PLAYLISTS listing and rating UI, after backend abuse control and rights safeguards.
