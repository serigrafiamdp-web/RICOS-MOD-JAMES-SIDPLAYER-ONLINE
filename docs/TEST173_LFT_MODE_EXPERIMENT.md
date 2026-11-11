# TEST173 — LFT MODE: compatibility experiment, branch only

Date: 2026-11-11. Branch: `test173-lft-mode-isolated`. **Status: real WASM PCM 66/66 PASS; actual Chromium adapter smoke PASS; user live-site PASS pending. NOT DEPLOYED TO MAIN.**

## Scope

The user requested experimental reSIDfp compatibility **only** for their newly published playlist `LFT`, not for every track by Linus, other playlists or TinySID globally.

`window.RicoLftMode.eligible(data, remoteId)` returns true only when:
- It is a published D1 playlist (a nonempty valid remote ID).
- Its title is exactly `LFT`.
- Its playlist format is v2.
- **Every** track is an HVSC `pack/file` reference to the unmodified file `library/packs/musicians/L/Lft.zip`.
- The user has not opted out with `?lftmode=off`.

The dynamic WebAssembly module loads *only* for this case. No new buttons, menus or UI.

## Actual full-corpus data inspection

Parsed ZIP central directory and decompressed all 66 `.sid` members of the verified `Lft.zip` in GitHub:

| Property | Count |
| --- | ---: |
| 66 SID, all PAL | 66 |
| PSID: 62 v2 and 2 v3 | 64 |
| RSID | 2 |
| MOS8580 model flags | 42 |
| MOS6581 model flags | 18 |
| Accept either model | 5 |
| Model unspecified | 1 |
| Two-SID recordings | 2 |
| Load address `$1000` | 42 |
| INIT `$1000` | 38 |
| PLAY `$1003` | 38 |

**Important:** PSID and RSID are valid formats. A file's model or opcode complexity
does not alone prove why the old player fails; actual audio tests are needed.
Nine and Rodents are valid PSID v2, PAL/8580, both INIT `$1000`, PLAY `$1003`.
Nine also contains undocumented 6510 opcodes in its PLAY routine.
Two RSID tunes may require user-supplied copyrighted C64 system ROMs.

## Prototype architecture

- Native `js/backend_tinysid.js` and `js/sidPlayer.js`: **identical to main**, untouched.
- `js/lft-mode.experimental.js`: lazy isolated engine, dynamically imports
  `js/lft-wasm/index.js` only for eligible published LFT; uses `SidAudioEngine`
  with `{engine:'residfp',sampleRate:player.sampleRate,stereo:false}`.
- Changes in `js/customPlaylist.test101.js`: on loading a published playlist pass the
  actual D1 `remoteId` into the existing loader; verify eligibility; otherwise
  disable the experimental engine, restoring TinySID.
- Existing `ScriptProcessor` and original audio fade/timer controls still consume
  4,096-frame Float32 PCM through a **temporary, reversible** SID sample facade.
  Blocks are pre-buffered and replenished outside the WebAudio callback.
- Stop, pause, NEXT, AUTO and original controls stay in SpotySid; current implementation
  routes them through the original player. Channel visualization is mixed-audio approximation,
  not separate LFT chip voices. Confirm in browser.
- `index.html` adds exactly one classic `js/lft-mode.experimental.js` after
  `js/customPlaylist.test101.js`. It does not modify the visible UI or add
  global replacements on page load.
- A failed import/engine load falls back to the original native TinySID routines.
  The documented `?lftmode=off` query acts as a reversible switch without added controls.

## Checks executed

- Code syntax check PASS.
- **Actual native Node 22 WASM test PASS:** 66/66 original HVSC LFT SIDs returned non-silent PCM using reSIDfp with no load errors. Run [43056729062](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43056729062). The audio was measured, not independently listened to or verified against VICE.
- Eligibility excludes all non-LFT titles, non-HVSC references and local lists.
- Original TinySID handles non-LFT files unchanged.
- LFT sample path selects reSIDfp; mock `renderFrames(4096)` yields expected normalized PCM.
- Deactivating destroys the mock WASM context and restores every overridden native
  SID method pointer.
- No Cloudflare Worker/D1 change, no SID binary or playlist rewrite.
- **Actual Chromium integration PASS:** [GitHub Actions run 43058131484](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43058131484) verified `ready:true`, `playing:true`, nonzero rendered PCM peak `0.1788330078125`, native TinySID methods restored on deactivation, and LFT mode inactive afterward. This is a real browser and actual WASM test of the integration, not a simulated renderer; it is not a live-site user PASS.
- The first browser CI run failed only because Playwright 1.55.1 was incompatible with the Ubuntu 26.04 runner. CI now pins Ubuntu 24.04 and installs Chromium only; this corrected workflow PASSed.

## Critical release blocker

**Do not deploy this branch to the public GitHub Pages main branch yet.**
The available libsidplayfp-wasm v1.1.1 binary embeds upstream libsidplayfp
**v3.1.1**, affected by [CVE-2026-111148](https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2026-111148).
Upstream corrected it in [libsidplayfp v3.1.2](https://github.com/libsidplayfp/libsidplayfp/releases).
The strict PSID data-offset validation in the prototype limits one known attack
vector, but does not replace an updated binary.
Before deploying:
1. Obtain a verified WebAssembly distribution built from patched libsidplayfp
   3.1.2 or later, with corresponding source/licensing.
2. Run real `Nine` and `Rodents` playback tests against that WASM binary in a browser.
3. Node PCM rendering of 66 SID has passed, but verify STOP/PLAY, fading, TIMER/AUTO, two-SID fidelity,
   and RSID behavior with legally supplied ROMs in a real browser.
4. Verify switching from LFT to every other playlist instantly restores TinySID.
5. If all checks PASS, promote the isolated branch to main; do not alter
   the community-published playlist ID or D1 data.

## Links

[Current stable live SpotySid](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/) (unchanged)
· [Vendor source bundle](https://github.com/chrisgleissner/libsidplayfp-wasm/releases/download/v1.1.1/libsidplayfp-wasm-1.1.1-complete-source.tar.gz)

## Final TEST173 branch checkpoint, 2026-11-11

- Isolated branch: `test173-lft-mode-isolated`.
- Test 66/66: [PASS](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43056729062).
- Real Chromium integration: [PASS](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43058131484) (Nine playback and TinySID restoration).
- **SECURITY HOLD:** do not deploy bundled libsidplayfp 3.1.1 to main until a patched WASM binary built from libsidplayfp 3.1.2+ is available and reviewed. The test suite validated known-good ZIP content only.
- Keep existing main branch and all user-published playlists unchanged. No D1 write or Cloudflare Worker deployment was performed.
