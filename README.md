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

## Stable checkpoint — 2026-11-06 (TEST19 PASS)

The 2026-11-06 tested baseline is **TEST19 PASS**: AUTO switches to the next SID file, including while the browser tab is in the background; it does not cycle through subtunes automatically. Details, reproduction checklist and continuation notes: [docs/CHECKPOINT_TEST19_PASS_2026-11-06.md](docs/CHECKPOINT_TEST19_PASS_2026-11-06.md).

## Current playlist and browser status (TEST44, 2026-11-07)

- **TEST42: PASS** — four browser tabs: RICO'S PLAYLISTS, GAMES (22), TOP 100 HVSC GAMES (100 SIDs), and USER LOCAL. Games, community playlists, and the HVSC ranking have matching visual text sizing.
- **TEST43: published, awaiting playback verification** — browsing tabs no longer changes the active SID, playlist or audio; choosing a track or using LOAD changes playback. Auto-play follows the loaded playlist.
- **TEST44: published, awaiting visual verification** — the original historical HVSC community poll from 2000 is labeled **TOP 100 HVSC GAMES**. This is a historical SID ranking, not a current DeepSID rating chart; all 100 original files are retained.
- RICO'S PLAYLISTS catalog currently includes **LOS PAT MORITAS (34 SID, including named variants 1 and 2)**, **RICO (13 SID)** and **SID MIX 1 (36 SID)**.
- **Planned, not published:** **TOP 100 CSDb MUSICIANS** (100 distinct composers, one non-game representative SID per composer) and **TOP 100 CSDb GROUPS** (100 distinct ranked scene groups, one composition documented in a demo/intro/music release from each group). CSDb rates musicians/groups, not automatically the chosen SID tracks; rankings and release/group credits require independent verification.
- Source archives supplied for research: HVSC MUSICIANS and HVSC DEMOS. The DEMOS ZIP contains **3,058 SID files** (2,545 PSID and 513 RSID); many have no known composer attribution, so do not infer group credits solely from SID headers.
- Official ranking references: https://csdb.dk/toplist.php?subtype=%287%29&type=scener and https://csdb.dk/toplist.php?type=group

