# RICOS MOD – JAMES SIDPLAYER ONLINE
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
- Automatic progression between **SID files only** (not subtunes) using documented track duration or a configurable fallback; TEST18 PASS.
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

## CURRENT STABLE CHECKPOINT — TEST62 PASS (2026-11-08)

**User-confirmed working state: TEST62 PASS** — public community playlist publishing through Cloudflare Worker + D1 using only HVSC `pack/file` references. GitHub Pages hosts the fixed 59,626-SID library. Older checkpoints below remain historical.

- **Technical architecture and operations:** [docs/ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md](docs/ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md).
- **User-confirmed PASS and continuation:** [docs/CHECKPOINT_TEST62_PASS_2026-11-08.md](docs/CHECKPOINT_TEST62_PASS_2026-11-08.md).
- **Player:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=62public
- **Community API:** https://ricos-sid-community.serigrafiamdp.workers.dev/playlists
- **Backend source/schema:** [community/api/worker.js](community/api/worker.js) · [community/api/schema.sql](community/api/schema.sql).

**Next development, not yet PASS:** editing published playlists requires verifying authorship. Never allow anonymous visitors to overwrite/delete another author's list. Do not claim that a browser nickname is an authenticated identity.

## Stable checkpoint — 2026-11-06 (TEST19 PASS)

The 2026-11-06 tested baseline is **TEST19 PASS**: AUTO switches to the next SID file, including while the browser tab is in the background; it does not cycle through subtunes automatically. Details, reproduction checklist and continuation notes: [docs/CHECKPOINT_TEST19_PASS_2026-11-06.md](docs/CHECKPOINT_TEST19_PASS_2026-11-06.md).

## Stable checkpoint — 2026-11-07 (TEST54 PASS)

**Current user-confirmed visual baseline: TEST54 PASS**. Stable reference: commit `fab528916eaf6e46465e2441845817a2ccd71edc` (the TEST54 stylesheet/index update), branch `main`.

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
