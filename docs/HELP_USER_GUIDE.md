# SpotySid — User guide

[Open player](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/) · [Architecture](ARCHITECTURE.md)

## Playing music

Open **CHOOSE A SID** to browse COMMUNITY PLAYLISTS, GAMES, TOP rankings, HVSC LIBRARY and available local collections. Press **PLAY** for a playlist. The floating **PLAYLIST** panel shows the songs and provides ordering controls where editing is supported.

**AUTO** and the **MM:SS TIMER** control track advancement; the player can also advance after sustained audio silence. Voice, filter, oscilloscope and palette controls affect the playing experience.

## Adding songs and creating lists

Use **ADD + TO** to choose which list receives songs. The dropdown displays **only the names** of the lists. Your selection stays in place when you switch the playing list and after a browser reload; it changes when you select a different destination or create a new list.

Click **+** next to a compatible SID in the playing list to add it to the destination. The currently playing music should not be interrupted. Choosing an existing destination must not open the editor.

Use **CREATE PLAYLIST / REMIX PLAYLIST** and **NEW REMIX** to create a list. The creation window is for playlist setup, not a duplicate track-ordering window. Order songs in their regular playlist using the existing ↑ / ↓ controls. A single click changes one position; double click is intended to move ten.

## Saving and publishing

- **Local drafts** remain in browser storage until published.
- **PUBLISH** creates a new public playlist with beta-key authorization.
- **REPUBLISH** is for changes to an already published playlist: it must update **the same public record**, not create a duplicate.
- Confirm successful publication by reopening the public playlist after a fresh reload. If a write fails, keep the private draft and don't delete the original list.
- The Cloudflare endpoint's capabilities only indicate supported features; REPUBLISH still needs a successful real-world end-to-end verification from both UI locations.
- Ranked TOP lists are read-only.

## Local files and assistance

**IMPORT SID** handles compatible locally supplied files and browser-saved collections. These are not automatically public. **HELP** and **ABOUT** provide in-app controls and attribution.

## Confirmed behavior

- User-confirmed: progressive initial playback for RICO'S BEST OF MUS (TEST148).
- User-confirmed: persistent ADD + TO destination (TEST150).
- Selector labels simplified in TEST151; browser verification pending.
- Full REPUBLISH persistence from both buttons remains pending verification.

Historical tests, experimental deployment notes and older UI terminology are preserved separately under `docs/` for development reference.
