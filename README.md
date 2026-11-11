# SpotySid — Rico + James SID Player

**Commodore 64 SID music · Play · Discover · Curate · Share**

[Open SpotySid](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/) · [User guide](docs/HELP_USER_GUIDE.md) · [Architecture](docs/ARCHITECTURE.md) · [Checkpoint 2026-11-10](docs/CHECKPOINT_2026-11-10_SPOTYSID.md)

SpotySid preserves and extends the original James / Jojati SID Player. RICO maintains the project and develops the community, playlist and browsing tools. The project does not modify the underlying SID compositions.

## Current features

- SID music playback, oscilloscope and themed interface, AUTO, configurable TIMER and silence detection.
- COMMUNITY PLAYLISTS, GAMES, ranked TOP collections, HVSC LIBRARY, and personal/local collections.
- Playlist creation, ordering, playback, sharing and beta-authorized community publishing.
- **ADD + TO** selects the destination for **+** additions. Only playlist names are shown in the selector; the selection persists across playback changes and reloads. Selecting a list does not open an editor.
- Published list edits are stored as local drafts before **REPUBLISH** updates the same public playlist ID.
- Public v2 playlists combine existing HVSC ZIP references (`{pack,file}`) and archived NO HVSC references (`{sidId,file}`). D1 stores references and metadata, not SID binaries.
- Progressive first-track loading for selected large playlists; legacy embedded-SID lists remain supported.

## Current status — 2026-11-10

**Earlier user-confirmed:** TEST148 fast initial playback for RICO'S BEST OF MUS; TEST150 persistent ADD + TO destination.

**Today:** TEST165 NO HVSC Worker endpoints deployed and returning the expected capabilities; TEST166 provenance schema committed; TEST167 NO HVSC import **PASS reported by the user**; TEST169 Cloudflare Web Analytics installed and initial activity visible in its dashboard.

**Later user feedback:** the NO HVSC → UCTUMI flow was reported as working. A formal API readback / same-ID persistence log was not captured. **TEST170:** NO HVSC artist subgroups are implemented in the current frontend with the existing DEMOS heading design, and code checks passed; **live browser PASS is still pending**. See [TEST170 implementation and test plan](docs/TEST170_NO_HVSC_ARTIST_GROUPS.md). Web Analytics cannot recover visits from before installation.

See [checkpoint 2026-11-10](docs/CHECKPOINT_2026-11-10_SPOTYSID.md) for the verification record and exact next steps.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html`, `css/style.css` | Player and playlist UI |
| `js/sidPlayer.js`, `js/backend_tinysid.js` | SID playback engine |
| `js/customPlaylist.test101.js` | Current HVSC, playlist, community and ADD + TO logic |
| `js/help.test109.js`, `js/donate.test135.js` | Help and support dialogs |
| `library/` | HVSC indexes and original ZIP packs |
| `community/playlists.json`, `community/playlists/` | Static curated lists |
| `community/api/worker.js`, `community/api/schema.sql` | Cloudflare API reference source and D1 schema |
| `docs/` | Current architecture, user guide, and historical test reports |

## Hosting and maintenance

**GitHub Pages** serves the website and HVSC reference library. **Cloudflare Worker + D1** hosts shared playlist records, NO HVSC provenance and authorized writes. The separate [ricos-sid-uploads](https://github.com/serigrafiamdp-web/ricos-sid-uploads) repository holds contributed SID binaries through the configured GitHub provider. **Cloudflare Web Analytics** measures website activity from the installed beacon onward. Updating the repository does **not** automatically deploy the Worker or back up D1. Before a Worker deployment, preserve its production settings, secrets and bindings, and back up the live Worker and D1.

[Architecture and maintenance map](docs/ARCHITECTURE.md) · [API capabilities](https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities)

## Credits and preservation

**Original player:** James / Jojati (@uniquename654). **Continued development, playlist tools and community:** RICO / RicoSerigrafia.

All music and third-party components remain credited to their original creators; follow HVSC, upstream and component license notices. This README deliberately focuses on the current product. Older TEST-prefixed files and checkpoints in `docs/` are retained as engineering history rather than listed as failures or active instructions.
