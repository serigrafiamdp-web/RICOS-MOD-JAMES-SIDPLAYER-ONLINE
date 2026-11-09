# RICOS MOD – JAMES SIDPLAYER ONLINE

## TEST119 — Unified REMIX PLAYLIST entry points and numbered palettes (published; browser PASS pending)

- The bottom toolbar now contains **REMIX PLAYLIST** alongside CHOOSE A SID. It opens the *same* existing **REMIX PLAYLIST CREATOR** window as the button in the floating playlist; no second window and no automatic extra draft. To create a new list inside the editor use **NEW REMIX**.
- Retained the existing REMIX names and editor layout at user request (do not rename to PLAYLIST CREATOR).
- The color cycle button now displays **COLOR 1–8** instead of palette names. It still cycles the same eight original palette configurations; only its visible label and accessible text changed. Updated both JavaScript cache versions in `index.html`.
- Source JS syntax PASS. Manual browser test: click both REMIX PLAYLIST entry points, confirm same editor, create a draft using NEW REMIX, check COLOR numbering while palette changes.
- [Open TEST119](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=119remixcolors)
- **Status:** GitHub source updated; user visual PASS pending.

## TEST118 — Edit existing published playlists while listening to another list (staged)

**What changed:** The **ADD + TO** destination selector in the floating playlist now offers existing REMIX drafts **and D1 PUBLISHED PLAYLISTS**. Selecting a published list starts or resumes a persistent private editing draft that keeps the same original D1 ID. While playing any other playlist, + adds the selected SID's verified original HVSC `pack/file` reference into that draft, without changing the source playback or the public list.

In the REMIX editor, linked drafts show **PUBLISH CHANGES**, **PREVIEW CHANGES** and **DISCARD CHANGES**. The public catalog has an **EDIT CONTENT** shortcut. Upon authorized publication, the app checks that the original remote list is unchanged, PUTs additions/removals/order back to the **same ID**, and verifies the resulting full list from the server. Never POST a duplicate.

- [Open TEST118](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=118publishedediting)
- [TEST118 workflow, safety rules, deployment and test checklist](docs/TEST118_EDIT_PUBLISHED_PLAYLIST_CONTENT.md)
- **Status:** Frontend and `community/api/worker.js` source committed; code syntax checks passed. **Cloudflare Worker must be manually deployed** to enable `playlistTrackAdditions:true` for new-song publication; browser end-to-end PASS pending. Until then, editing drafts work locally and publication is blocked safely. No live Cloudflare worker deployment is claimed.

## TEST117 — Restore theme-colored hints for + and × (code published; browser PASS pending)

TEST115 removed the browser's default white HTML `title` tooltips from the floating playlist's **+** and **×** buttons, but inadvertently left them with no visual help. TEST117 restores their instructions via the existing theme-colored `#ricoReorderHint` tooltip (same palette as the ↑/↓ reorder arrows), using pointer hover and without any native `title`.

- **+** hint: "Add to selected REMIX PLAYLIST without changing playback".
- **×** hint: "Remove song temporarily" (unavailable on fixed/disabled ranked lists).
- Existing click behavior, `aria-label`, scroll/arrow controls, playlist SAVE, audio/HVSC data and TEST116 catalog ordering are unchanged.
- [Open TEST117](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=117themedtips)
- Code syntax PASS, actual browser hover and playback regression checks awaiting user PASS.

## TEST116 — Community playlist manual ranking before voting (code published; browser PASS pending)

- COMMUNITY PLAYLISTS displays **three empty sample stars (☆☆☆)** per public/curated playlist, as placeholders until an actual vote system exists.
- Each public/curated catalog row has **↑/↓ arrows**: single click moves 1 position, double click moves 10 positions, matching the existing playlist reorder controls and palette-aware green hint. Moving rows does **not play** or modify any SID.
- A **SAVE** button sits at the top-right of the Community Playlists section. It writes the order of catalog entries to **this browser's localStorage** (`rico-community-catalog-order-v1`); the chosen order is restored on reload or tab reopen. It does not change the Cloudflare D1 server's shared order or rankings on other browsers; server-side shared ordering would require a separate authenticated API.
- Existing PLAY/EDIT/DELETE/PUBLISH flows, local drafts, ranked TOP 100 tabs, SID data and HVSC references remain unchanged.
- [Open TEST116](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=116communityorder)
- Validation: JS syntax PASS; browser test pending. Check visible 3 stars, arrows ±1 and ±10, SAVE/reload persistence, and PLAY unaffected.

## TEST115 — No native white tips on + and × (published; browser PASS pending)

The floating playlist controls **+** (add to selected REMIX) and **×** (remove temporarily) were still assigning native HTML `title` text. Removed only these `title` attributes, keeping existing `aria-label`, click handlers, and behavior intact. The themed ↑/↓ hover hints from TEST113 remain unchanged, as do the song-title tooltip removals of TEST114.

- [Open TEST115](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=115notips)
- Verify hovering + and × displays no native white tooltip, and clicking both controls still performs the same action.
- **Status:** code committed, browser PASS pending.

## TEST114 — Remove redundant song-name hover tooltip (browser PASS confirmed)

The floating playlist song buttons displayed the full title/artist already, but also set native HTML `title` on the song row, causing an unnecessary white browser tooltip on hover. Both the standard and the scene-group row paths now use `aria-label` instead, preserving accessibility while suppressing the native tooltip. Playback handlers, reorder arrows, REMIX actions, and HVSC references are unchanged.

- [Open TEST114](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=114title)
- Test: hover song titles in the floating playlist: no tooltip. Verify clicking a title still starts the selected SID.
- **Status:** code committed, browser PASS pending.

## TEST113 — Keep only the themed reorder hint (published; browser PASS pending)

The reorder arrows (↑/↓) in the floating playlist and REMIX editor previously set the native HTML `title` **and** showed the themed `#ricoReorderHint` on pointer hover, causing two overlapping tooltips. Removed the arrow buttons' native `title`, retaining their existing accessible `aria-label` and the green themed hint. The one-click (±1) and double-click (±10) handlers are unchanged. The script cache query is bumped to TEST113 so Pages reloads the fix.

- [Open TEST113](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=113hint)
- Test: hover ↑ and ↓ in both playlist and REMIX, verify only themed hint; verify ±1/±10 still work.
- **Status:** code change committed, browser PASS pending.


## TEST112 — Faster first PLAY for OLD SID COLLECTION RICO (user PASS confirmed)

The original 298-song reference playlist loaded all **77 HVSC ZIP packs** and parsed all 298 files **sequentially before starting the first SID**. TEST112 prepares and plays **the first SID after downloading just its one ZIP**, then loads the remaining songs progressively in memory using two background workers and a shared per-ZIP promise cache. Selecting an unprepared track loads that specific SID before switching. **No extra SID files, server-side duplicates, or separate HVSC database** are created. Other playlists continue using the existing stable loader.

- [Open TEST112](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=112progressive)
- [TEST112 design, mock validation (1 ZIP to first SID, then 77/298), regression checks](docs/TEST112_OLD_SID_PROGRESSIVE_LOADING.md)
- **Status:** Browser playback PASS confirmed by project owner on 2026-11-09. Existing UCTUMI TEST108 PASS retained.

## TEST111 — Fix '+' on HVSC-backed playlists (published, browser PASS pending)

**Root cause identified from the owner's screenshot:** The warning `Cannot add SID: This SID has no verified HVSC #85 source yet` was emitted by the floating playlist **+ (Add to REMIX)** button, **not the SAVE button**. Although all 298 OLD SID COLLECTION RICO songs are already linked to HVSC ZIP archives, the + handler incorrectly checked only `activePublicPlaylist` (Cloudflare) and ignored validated `activeReferenceTracks` for static, reference-only v2 playlists.

**Fixed:** + now reuses the exact already validated HVSC `pack/file` reference for the selected song; the legacy v1 fallback and Cloudflare path remain. An isolated function test accepted **298/298 references** from the old collection and rejected duplicate additions. Zero new SID bytes uploaded. The separate TEST110 beta-key **SAVE** flow is unchanged and must still be tested in the browser.

- [Try TEST111](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=111hvscplus)
- [TEST111 root cause and browser testing checklist](docs/TEST111_OLD_SID_HVSC_PLUS_FIX.md)
- **Status:** GitHub updated, browser owner PASS pending; public SAVE is not yet confirmed for OLD SID COLLECTION RICO.

## TEST110 — SAVE with beta key for OLD SID COLLECTION RICO (browser PASS pending)

**Root cause:** HVSC references do not automatically make a GitHub-curated static playlist editable in Cloudflare. OLD SID COLLECTION RICO previously had no Cloudflare D1 playlist ID, so SAVE could only store local edits.

**Now:** Loading the 298-track OLD SID COLLECTION RICO from COMMUNITY PLAYLISTS shows an enabled SAVE. The first SAVE requests the beta key and creates or reuses the matching Cloudflare D1 public playlist with its **298 HVSC references** (no uploaded SID files). The saved order is read back and verified before success is announced. Once adopted, all subsequent reorder/SAVE operations use the existing public verified-save path. A matching D1 playlist replaces the static entry in the visible catalog. Other static playlists, ranked TOP 100 and audio engine remain unchanged.

- [Try TEST110](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=110adoptold2)
- [TEST110 implementation, precautions and test checklist](docs/TEST110_OLD_SID_COLLECTION_CLOUD_ADOPTION.md)
- **Cloudflare migration is not yet performed/verified:** the owner must click SAVE and enter their beta key. No one has published/mutated this D1 record as part of the code-only change. Keep the historical GitHub JSON as backup until after the user confirms PASS.
- **Checkpoint retained:** TEST108 PASS (UCTUMI); TEST109 HELP UI pending its separate browser test.

## OLD SID COLLECTION RICO — archive migration (published, browser test pending)

Seven original ZIP archives were analyzed (**509 SID files**, **313 SHA-256 distinct**, **196 duplicate occurrences**). The new **OLD SID COLLECTION RICO** appears in **COMMUNITY PLAYLISTS** as a single **298-track version-2 reference playlist**, using **77 pre-existing HVSC #85 ZIP packs** and **zero uploaded SID binaries**. **300** old SID entries could be associated with HVSC metadata, but **two pairs** mapped to identical library paths. **13** SID files have no sufficiently reliable HVSC match and are intentionally excluded rather than replaced by a different tune.

- [Static playlist source: 298 HVSC pack/file references](community/playlists/old-sid-collection-rico.json)
- [Full audit: duplicates, version differences, unmatched originals, editing limitations](docs/OLD_SID_COLLECTION_RICO_REPORT.md)
- [Try player / COMMUNITY PLAYLISTS](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?collection=old-sid-rico)

**Important:** The owner confirmed playback of this 298-track list. TEST110 now supplies a beta-key SAVE action to adopt it into Cloudflare D1 and verifies the stored order. **Cloudflare adoption PASS pending**. The static JSON remains as a fallback until the D1 copy is verified.

## TEST109 — HELP beside ABOUT (published, browser PASS pending)

**New in-app HELP** opens a bilingual **ENGLISH / ESPAÑOL** guide describing player operation, source browsers, REMIX creation, adding songs with +, single/double-click playlist reordering (±1/±10), local vs public SAVE, beta-key publication, ranked TOP 100 protection, IMPORT SID, AUTO and TIMER.

The bottom player controls now read **ABOUT SID CHIP · ABOUT · HELP**: uppercase, compact, and each button sized to its text. HELP is immediately to the right of ABOUT, as requested.

- [Open TEST109](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=109help)
- [Full bilingual HELP / user guide](docs/HELP_USER_GUIDE.md)
- **Status:** code and docs published; awaiting owner verification of the button, window, language switch and closure. No audio engine or storage changes in TEST109.

## TEST108 PASS — UCTUMI public save order survives reload

**USER-CONFIRMED PASS:** The Cloudflare Worker was manually deployed with `playlistReorder:true`, `sidCollectionReorder:true` and `configured:true`. The owner then re-tested **UCTUMI (99)**: changed the order, entered the beta key in SAVE, reloaded the collection and confirmed that the changed order was retained (**PASS**).

- [TEST108 proof, capabilities, scope and regression limits](docs/TEST108_UCTUMI_SAVE_ORDER_PASS.md)
- [Open current player](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=108)
- TEST107's server-readback save path for contributed SID collections is now user-verified through TEST108. Separate public HVSC playlists and REMIX publishing have **not** received this specific reload test yet.

## Current test — TEST107 persisted order verification (published, pending user PASS)

**Problem:** After moving songs, using SAVE + beta key, and reloading a playlist, the old order could reappear. Two source issues were found: unpublished REMIX PUBLISH could submit an old draft order, and public SAVE did not read the saved order back from Cloudflare.

**TEST107 fix:** PUBLISH synchronizes the currently playing REMIX order before POST. Both publishing and public SAVE now verify the exact stored order by GET before reporting success. Failed verification keeps the order unsaved/dirty; a publication with an uncertain read-back retains its server ID so a retry does not create a duplicate. The beta-key requirement and immutable TOP 100 remain unchanged.

- [Test TEST107](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=107orderverify2)
- [TEST107 implementation, safeguards and reload test](docs/TEST107_SAVE_RELOAD_VERIFY.md)
- **Status: the public contributed-collection SAVE/reload path passed in TEST108 with UCTUMI (99); other public playlist paths remain to be verified separately.**

## Current test — TEST106 SAVE for non-ranked playlists (published, pending user PASS)

**TEST106:** SAVE is visible for every non-ranked editable playlist, including unpublished REMIX previews such as **RICO'S BEST OF MUSICIANS**. It activates when the track order changes. Unpublished REMIX order is saved to the existing local draft without publishing; public playlists/collections still require the beta key to save to Cloudflare. Other local playlists save to browser IndexedDB. TOP 100 ranked sources stay immutable and have no SAVE button.

- [Try TEST106](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=106save)
- [TEST106 source behavior and user test](docs/TEST106_SAVE_EDITABLE_PLAYLISTS.md)
- TEST105 arrow controls remain available (single click ±1, double click ±10) with hover tips.

## Current test — TEST105 REORDER (published, pending user PASS)

**TEST105:** Floating playlist and REMIX editor arrows now move **±1 position on a single click** or **±10 positions on double-click**, with on-hover pointer hints. A 420 ms single-click decision window prevents a double-click from being counted as multiple moves. Song/reference order and playing/queued cursor mapping stay synchronized; ranked TOP 100 lists remain immutable. Source and CSS are published on GitHub; **browser verification by the owner is still pending**.

- [Try TEST105](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=105reorder)
- [TEST105 change log, implementation, tests and regression checklist](docs/TEST105_REORDER_1_10_TOOLTIP.md)
- Last owner-confirmed playback fix: **TEST104 PASS**; earlier stable player baseline: **TEST102 PASS**.

## Latest playback fix — TEST104 PASS (2026-11-08)

**User-confirmed PASS:** After the uploaded original `Balloon_Country_Bursts.sid` replaced the incorrect embedded SID in `TOP GROUPS` rank **95** (**PVM / Uctumi**), and the playlist/JS cache version was refreshed, the owner reported **"listo ahi volvio"** (playback restored). Original 4500-byte file verified by FNV-1a32 `3768c894`. No audio-engine changes.

**Current TEST104 link:** [GitHub Pages — Uctumi fix](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=104uctumi).  
**Fix details and provenance:** [TEST104 Uctumi source correction](docs/TEST104_UCTUMI_SOURCE_FIX.md).  
**Stable functional baseline retained:** TEST102 PASS; TEST100 audio transition PASS. This PASS confirms return of Uctumi playback, not an exhaustive re-test of all songs or AUTO.

## Current development checkpoint — TEST102 PASS (2026-11-08)

**Latest user-confirmed visual PASS:** **TEST102**, compact floating playlist: **playlist title + Playlist by** on one line; editable **TIMER** on the **REMIX** controls line; no visible SILENCE DETECT label. The detector remains active.

**Latest user-confirmed audio PASS:** **TEST100**, smooth 5-second cosine fade-out to near zero, **no fade-in and no artificial gap**, volume restored at the first new SID audio buffer to prevent an audible spike from the previous SID.

**Current player:** [GitHub Pages — TEST102](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=102compact)  
**Published front-end:** `index.html` → `js/customPlaylist.test101.js?v=test102compact` and `css/style.css?v=test102compact`  
**AUTO / silence detection:** TEST101, initial `03:00` adjustable within the Playlist. AUTO begins the 5-second fade approximately five seconds before the selected maximum. When original SID audio stays very quiet for 2.5 s after the first 12 s, or when the SID engine ends, AUTO may advance earlier. **Preliminary positive testing reported; further SID coverage needed.**

**Detailed documentation:**
- [Complete TEST102 PASS checkpoint — architecture, features, tests, backend, limitations and next tasks](docs/CHECKPOINT_TEST102_PASS_2026-11-08.md).
- [Audio architecture — TEST100 fade/handoff + TEST101 AUTO timer/silence detection](docs/AUDIO_AUTO_TRANSITIONS_TEST102.md).
- [TEST94 remote playlist reordering — Cloudflare deployment/verification runbook](docs/TEST94_REORDER_DEPLOY.md).
- [TEST83 contributed-SID publishing — earlier deployment planning](docs/TEST83_SID_PUBLISH_R2_D1_DEPLOY.md).

**Important integration boundaries:** Editing GitHub Pages does not deploy the Cloudflare Worker. The current Worker source includes remote playlist/collection reorder operations, but the corresponding deployed Worker and end-to-end save confirmation have **not been verified in this checkpoint**. Public write operations require beta-key authorization. Rankings TOP 100 remain immutable in the UI. Double-click ±10 reorder and arrow tooltips were requested but **have not been implemented**.

### Earlier staging milestone — TEST82/83 (historical)

- TEST82 PASS: OUR COLLECTION listed imported collections with LOAD and local DELETE.
- TEST83 introduced the contributed SID publishing flow and Cloudflare capability checks. Read its original runbook before editing backend infrastructure. Historical staging notes do not establish present cloud deployment status.
- Legacy notes below preserve original research and test history. Where they say **current**, treat those statements as *historical*, superseded by TEST102 above.

**A Commodore 64 SID Music Player — Preservation, Maintenance & Continued Development**

RICOS MOD – JAMES SIDPLAYER ONLINE is a preservation and continued development project based on the original Jojati SID Player.
The goal is to preserve the original player, its interface, oscilloscope, SID music collection, source code and historical credits, while introducing new features and improvements for modern browsers.
This project continues the work of its previous developers and maintainers, respecting their contributions and preserving the original character of the software.

## In Memory of James (@uniquename654)
**Dedicated to James, the original creator and previous maintainer of the Jojati SID Player.**
His work made it possible to enjoy Commodore 64 SID music directly in a web browser, accompanied by an oscilloscope displaying the individual SID voices.
This project is a tribute to his contribution and an effort to keep his work accessible, preserved and alive.

Original links:
- James's Twitter: https://twitter.com/uniquename654
- Jojati website: http://level4.jojati.com/
- Original SID Player: http://level3.jojati.com/sidplayer/

## Development & Maintenance Credits
**SID Emulation Engine:** Juergen Wothke — WebSid, based on Tiny'R'Sid.
https://github.com/wothke/websid

**Original Web SID Player:** James / Jojati — Original player, web interface, oscilloscope visualizations, individual voice display, SID selection and original modifications to the emulation code.

**Preservation, Maintenance & New Features (2026):** Rico / RicoSerigrafia — Preservation of the original project, maintenance, interface improvements and development of additional playback and visualization features.

Project repository:
https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE

## New Features by Rico (2026)
- Preservation and restoration of the original online SID Player, including its resources, source archive, soundtracks and historical information.
- Switchable oscilloscope display with original line rendering and filled waveform visualization.
- Retro oscilloscope color palettes, including green phosphor, amber, orange, Commodore 64 BASIC colors and additional combinations.
- Automatic SID playback with optional AUTO ON/OFF control.
- Automatic progression between **SID files only** (not subtunes), initially driven by track metadata/fallback (TEST18), now by the user-editable maximum TIMER plus original-audio silence detection (TEST101).
- Background playback AUTO driven from the audio callback rather than `requestAnimationFrame`, so auto-switching continues when the browser tab is inactive; TEST19 PASS on user test.
- Manual subtune navigation remains available using its own controls.
- Custom SID playlists supporting multiple local files.
- Named playlists saved locally in IndexedDB, with portable self-contained JSON export/import (TEST09–TEST12).
- Read-only USER PLAYLISTS community catalog on GitHub Pages, with the first permanent collection **LOS PAT MORITAS**, playlist by **RICO**, containing 22 SIDs (TEST13–TEST15).
- Song title and SID artist/composer displayed on one compact line in the floating playlist (TEST17); playlist curator is an independent attribution.
- Folder selection and drag-and-drop loading of SID files.
- PSID/RSID metadata reading, including song title, author, release information and subtune count.
- Compact playlist display without thumbnails for managing larger music collections.
- Show/hide PLAYLIST panel with direct song selection and active-track highlighting.
- Movable PLAYLIST window with adjustable height and consistent bottom-aligned Wave, Color and playback controls (TEST08).
- Preservation of the original default SID collection, with the option to switch between DEFAULT and CUSTOM playlists.

The original SID emulation engine remains the foundation of the project.

## About SID Files
SID files contain both Commodore 64 machine code and musical data.
To reproduce them, a SID player emulates the Commodore 64 CPU and SID sound chip, executing the original music routines that control the SID registers and generate sound.

SID music can be found in the High Voltage SID Collection (HVSC):
http://www.hvsc.c64.org/

Additional Commodore 64 game and music information:
- Lemon64: http://www.lemon64.com/
- C64.com: http://www.c64.com/

## Original Source Code & Licensing
The original player uses WebSid (a web implementation of Tiny'R'Sid) by Juergen Wothke.

WebSid source code:
https://github.com/wothke/websid

Original WebSid demonstration:
http://www.wothke.ch/websid/

The original Jojati player included modifications to the SID emulation code, including:
- Extraction of individual SID voice data.
- The ability to disable the SID filter.
- Changes to SID filter behavior.

The original modified source archive remains preserved in the project repository at:
[src/sidplayersrc.zip](src/sidplayersrc.zip)

The original project identifies the modified code as distributed under the Creative Commons Attribution–NonCommercial–ShareAlike 4.0 license (CC BY-NC-SA 4.0).
https://creativecommons.org/licenses/by-nc-sa/4.0/

The original player's historical notes, licensing information and author attributions remain preserved.
Music files and other third-party resources remain the property of their respective creators and rights holders.

## Historical Versions
The original Jojati project also included an earlier oscilloscope-style SID player.
That previous version provides additional information about SID registers and allows music playback to be slowed down.

The historical version remains available in the repository under:
[old/index.html](old/index.html)

## Project Philosophy
**Preserve the past. Maintain the present. Improve the future.**
RICOS MOD – JAMES SIDPLAYER ONLINE is an effort to keep a piece of Commodore 64 music and software history accessible to future generations.
With respect and gratitude to James, Juergen Wothke, the SID composers and everyone who contributed to the Commodore 64 music scene.

**In Memory of James (@uniquename654)**

**Continued with respect by Rico / RicoSerigrafia — 2026.**

Project: https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE

Online Player: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/

## HISTORICAL STABLE CHECKPOINT — TEST64 PASS (2026-11-08)

**TEST64 PASS confirmed by the project owner:** beta-key publishing of public HVSC reference playlists, temporary removal of songs with ×, and permanent removal-only edits via a fixed **SAVE** button and password dialog in the floating player. Cloudflare Worker + D1 are deployed and working.

- [TEST64 PASS checkpoint and follow-up](docs/CHECKPOINT_TEST64_PASS_2026-11-08.md)
- [Technical architecture and D1 operations](docs/ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md)
- [Player TEST64](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=64save)

**Historical planning note:** the subsequent Remix/+/ranking work was implemented in later tests; see the TEST102 checkpoint for present status.

## PREVIOUS STABLE CHECKPOINT — TEST62 PASS (2026-11-08)

**User-confirmed working state: TEST62 PASS** — public community playlist publishing through Cloudflare Worker + D1 using only HVSC `pack/file` references. GitHub Pages hosts the fixed 59,626-SID library. Older checkpoints below remain historical.

- **Technical architecture and operations:** [docs/ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md](docs/ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md).
- **User-confirmed PASS and continuation:** [docs/CHECKPOINT_TEST62_PASS_2026-11-08.md](docs/CHECKPOINT_TEST62_PASS_2026-11-08.md).
- **Player:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=62public
- **Community API:** https://ricos-sid-community.serigrafiamdp.workers.dev/playlists
- **Backend source/schema:** [community/api/worker.js](community/api/worker.js) · [community/api/schema.sql](community/api/schema.sql).

**Historical design warning (still applicable):** editing published playlists requires authorization. Never allow anonymous visitors to overwrite/delete another author's list. A browser nickname is not an authenticated identity; the beta key is not per-user ownership.

## Stable checkpoint — 2026-11-06 (TEST19 PASS)

The 2026-11-06 tested baseline is **TEST19 PASS**: AUTO switches to the next SID file, including while the browser tab is in the background; it does not cycle through subtunes automatically. Details, reproduction checklist and continuation notes: [docs/CHECKPOINT_TEST19_PASS_2026-11-06.md](docs/CHECKPOINT_TEST19_PASS_2026-11-06.md).

## Stable checkpoint — 2026-11-07 (TEST54 PASS)

**Historical user-confirmed visual baseline: TEST54 PASS**. Stable reference: commit `fab528916eaf6e46465e2441845817a2ccd71edc` (the TEST54 stylesheet/index update), branch `main`.

- Browser tabs now include RICO'S PLAYLISTS, GAMES (22), TOP 100 HVSC GAMES, TOP GROUPS, TOP MUSICIANS and USER LOCAL.
- Two curated CSDb collections are published: 100 embedded SID files in each of `community/playlists/csdb-top-100-groups.json` and `community/playlists/csdb-top-100-musicians.json`. Editorial selections use CSDb rankings and HVSC tracks; artist/group credit matching may be corrected later.
- In the TOP GROUPS playlist, display rank, **group first**, composer/scene alias when available, and track/release title. Preserve original SID metadata.
- Floating playlist: user-approved compact minimal layout based on TEST49; adjustable horizontally and vertically; movable by its header; centered at launch.
- TEST50 unified interface sizing, TEST53 removed CSS `!important` dimension locks to allow dialog resizing, TEST54 lowered the foreground Choose A SID dialog; the user explicitly confirmed **PASS** for TEST54.
- AUTO startup must not open Choose A SID over the floating playlist. Closing the floating playlist reveals the library browser; opening Choose A SID remains possible via its button.
- Keep the oscilloscope visible, avoid multiple overlapping windows at startup, and retain the user's preferred window sizes/font scale.
- **TEST55 (2026-11-07): PVM #95 corrected in published TOP GROUPS JSON** to authentic **Uctumi — Balloon Country Bursts** from PVM's *¡Arriba las manos!* (`MUSICIANS/U/Uctumi/Balloon_Country_Bursts.sid`), with the SID binary embedded from `c64scene-ar/chipdisk/res/sids/uct-balloon_country.sid`. Commit `62a10764303e1d6e6b1c0f360f6c9db38db5afd3`. Playback/visual confirmation pending user PASS. Samar Productions (#94) still has an incorrect *Acid & Black* attribution and remains pending.
- User testing: TEST54 visual **PASS**; do not automatically mark the broader playback/playlist behavior as tested without user confirmation.

Continue from: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=54

Detailed record: [docs/CHECKPOINT_TEST54_PASS_2026-11-07.md](docs/CHECKPOINT_TEST54_PASS_2026-11-07.md).

## Historical research status (TEST44, 2026-11-07)

- **TEST42: PASS** — four browser tabs: RICO'S PLAYLISTS, GAMES (22), TOP 100 HVSC GAMES (100 SIDs), and USER LOCAL. Games, community playlists, and the HVSC ranking have matching visual text sizing.
- **TEST43: published, awaiting playback verification** — browsing tabs no longer changes the active SID, playlist or audio; choosing a track or using LOAD changes playback. Auto-play follows the loaded playlist.
- **TEST44: published, awaiting visual verification** — the original historical HVSC community poll from 2000 is labeled **TOP 100 HVSC GAMES**. This is a historical SID ranking, not a current DeepSID rating chart; all 100 original files are retained.
- RICO'S PLAYLISTS catalog currently includes **LOS PAT MORITAS (34 SID, including named variants 1 and 2)**, **RICO (13 SID)** and **SID MIX 1 (36 SID)**.
- **Planned, not published:** **TOP 100 CSDb MUSICIANS** (100 distinct composers, one non-game representative SID per composer) and **TOP 100 CSDb GROUPS** (100 distinct ranked scene groups, one composition documented in a demo/intro/music release from each group). CSDb rates musicians/groups, not automatically the chosen SID tracks; rankings and release/group credits require independent verification.
- Source archives supplied for research: HVSC MUSICIANS and HVSC DEMOS. The DEMOS ZIP contains **3,058 SID files** (2,545 PSID and 513 RSID); many have no known composer attribution, so do not infer group credits solely from SID headers.
- Official ranking references: https://csdb.dk/toplist.php?subtype=%287%29&type=scener and https://csdb.dk/toplist.php?type=group


## TEST56 — HVSC full-library browser (2026-11-07; source publication complete, playback pending PASS)
- Source archives previously supplied by project owner: MUSICIANS (56,568 .sid files), DEMOS (3,058 .sid files); the official current release is HVSC #85.
- The unchanged original ranked playlists (TOP 100 HVSC GAMES, TOP GROUPS, TOP MUSICIANS) remain read-only.
- A new HVSC LIBRARY browser tab was coded, with category/shelf/composer navigation, search within a selected shelf, and single-song playback on demand. It uses existing `--rico-theme-*` CSS palette variables and minimal layout.
- `tools/build_hvsc_library.py` generates a JSON index per shelf and ZIP packs per composer or DEMOS section; no bulk downloading on app startup.
- `.github/workflows/build-hvsc-library.yml` is configured to fetch HVSC #85 and publish generated `library/` files. **Do not claim the full library is online until `library/index.json` and packs exist on main and audio playback is tested.** GitHub Actions may need to be enabled or a workflow permission issue resolved.
- Personal playlists remain local/unchanged during this test. Cross-catalog adding and public community submission are future stages.
- Test entry point: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=56
- Static library mirrors original HVSC files; attribution and HVSC copyright notices must be respected.

### TEST56 publication verification
- Published commit: `caf8be941542293dffa5ce065418d96278f577a8` (GitHub Actions).
- Total indexed: **59,626 SID**, including **56,568 MUSICIANS** and **3,058 DEMOS**.
- Example: `library/packs/musicians/U/Uctumi.zip` includes `Balloon_Country_Bursts.sid` (credit: Esteban Palladino/Uctumi, 2016 PVM).
- The read-only CSDb/HVSC TOP 100 JSON lists are unchanged by the library import.
- **TEST56 browser audio / deployed Pages: awaiting user PASS**.
