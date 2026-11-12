# SpotySid — Features

**Commodore 64 SID music · Play · Discover · Curate · Share**

[Open SpotySid](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/) · [README](../README.md) · [User guide](HELP_USER_GUIDE.md) · [Latest checkpoint](CHECKPOINT_2026-11-11_SPOTYSID.md)

This is the **current public-facing feature list** as of **11 November 2026 (Argentina)**. It describes what is implemented in the main GitHub Pages player; outstanding verification and experimental audio behavior are labelled explicitly.

## Music playback

- Play Commodore 64 SID tracks from the HVSC library, curated playlists, and supported local imports.
- **AUTO**, adjustable **MM:SS timer**, silence detection and fade-out transitions.
- Real-time oscilloscope, voice controls, **FILTER** checkbox and selectable visual palette / fill display.
- **TinySID** is the normal playback path. **reSIDfp (WebAssembly)** is selectively used for individually approved **LINUS / LFT** tracks; the original playlist is **not** forced to start automatically.
- **LFT MODE ON** is shown while an approved LFT track plays. The same approved track can be placed in other playlists and still use LFT mode.
- LFT three-voice oscilloscope visualisation is driven by emulated SID registers. These are visual estimates, **not exact isolated analogue voice recordings**.
- One **Uctumi — Loco un Poco** HVSC reference currently has a dedicated MOS 8580 reSIDfp route. **The introduction/filter/voice balance remains under investigation, NOT a confirmed audio PASS.** Do not extrapolate that route to all Uctumi tracks.

## Discover music

- **COMMUNITY PLAYLISTS**, **GAMES**, ranked TOP collections, **HVSC LIBRARY** and locally imported collections.
- HVSC **MUSICIANS**, **DEMOS**, and **GROUPS** browsers, with alphabetical sections and matching source ZIP references.
- GROUPS is indexed from HVSC release credits cross-referenced against identified CSDb group names: **84 indexed groups / 10,385 SID references** in the current generated index. This is **not** a complete CSDb credits database or an assertion about every SID.
- **The Codeblasters** currently have **9 HVSC references in GROUPS** after six additional verified entries. This does **not** imply the owner's public COMMUNITY playlist has already been republished.

## Playlists & community

- Play, create, import, save locally and organise editable playlists; use available ↑ / ↓ ordering controls.
- **+** adds a SID to the list selected in **ADD + TO**; the chosen destination persists across playlist changes and page reloads.
- **PUBLISH** creates a new community playlist with beta-key authorisation.
- **EDIT / REPUBLISH** stages edits in a private local draft, then attempts to update the **same public D1 ID** with beta-key authorisation rather than deliberately creating a duplicate.
- Existing public playlists and original HVSC ZIPs are **not automatically modified** when browsing GROUPS or staging additions.
- Public playlist v2 may reference original HVSC tracks as `{pack,file}` or archived **NO HVSC** tracks as `{sidId,file}`.
- **NO HVSC** imports and contributed collection/archive support are present; the complete NO HVSC → published UCTUMI REPUBLISH flow is still awaiting end-to-end readback confirmation.

## Usage information & transparency

- **HELP**, **ABOUT**, original creator attribution (James / Jojati), maintenance credits (RICO), and optional donation link.
- **Cloudflare Web Analytics** beacon installed once in `index.html` (TEST169). It counts website activity only from installation onward; it is **not** a per-SID play counter.
- First observed 24-hour dashboard screenshot (11 Nov): **106 visits**, **133 page views**, for the displayed hostname filter. It does **not** establish 106 unique listeners or isolate SpotySid from other paths on the same GitHub Pages hostname.

## Technical architecture

- **GitHub Pages**: interface and original HVSC indexes / ZIP packs.
- **Cloudflare Worker + D1**: community playlist metadata, saved reference lists, authorised updates and NO HVSC records; Worker production deployment is independent of GitHub Pages.
- **GitHub `ricos-sid-uploads`**: contributed SID binary archive used by the configured backend.
- Browser local storage: drafts and selected destination. Public D1 records are not stored or backed up automatically by the frontend repository.

## Validation status

**Implemented / evidenced:** current library and GROUPS data, Codeblasters source references, selective LFT route, installed Analytics beacon and deployed main player.

**Previously user-confirmed:** LFT playback and three-voice visualisation (TEST185), earlier initial sound from Loco un Poco (TEST188) — subsequent reports showed an **intermittent/imbalanced** introduction.

**Not yet declared PASS:** Loco un Poco sustained three-voice audio balance; fully verified same-ID REPUBLISH of the expanded Codeblasters public playlist; all-Uctumi reSIDfp conversion. TEST189–192 audio experiments were **rolled back**; current main bridge is the **exact TEST188 file restored by TEST193**.

For reproducible engineering detail, see the [11 November checkpoint](CHECKPOINT_2026-11-11_SPOTYSID.md) and [architecture](ARCHITECTURE.md). Do not confuse an Actions deployment success with a listener's audio validation.
