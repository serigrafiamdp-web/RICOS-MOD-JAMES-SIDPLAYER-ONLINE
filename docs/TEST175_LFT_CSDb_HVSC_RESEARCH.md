# TEST175 — LFT (Linus Åkesson): CSDb, HVSC, blog research + SpotySid integration fix

Date: 2026-11-11. **Only the isolated /lft-test/ preview changed.** The public
SpotySid homepage /index.html and its stable TinySID implementation were not
modified. Live user audio confirmation remains **PENDING**.

## The demonstrable SpotySid problem

User reported that nearly all tracks in the newly published `LFT` playlist
sounded wrong, even after preview `/lft-test/` was published.

**Root cause (now confirmed):** The published 66-track playlist goes through the
**non-progressive** branch of `loadStoredPlaylist()`. That code decodes each
HVSC ZIP file into `parseSID()` objects carrying `localBytes` but *no*
`_hvscRef`. The experimental bridge nevertheless required an
`_hvscRef` to call `RicoLftMode.approveTrustedReference`. The approval
returned false for the first SID, so `RicoLftMode.loadSIDData` deliberately
**deactivated reSIDfp and fell back to native TinySID**. The user was thus
mostly listening to the original engine rather than the new experimental one.

**Minimal TEST175 correction, exclusively in
`/lft-test/customPlaylist.js`:**

```js
if(window.RicoLftMode && window.RicoLftMode.active())
  window.RicoLftMode.approveTrustedReference(
    item._hvscRef || (activeReferenceTracks && activeReferenceTracks[index]) || null
  );
```

`activeReferenceTracks` is created directly from the validated, published
HVSC reference playlist and follows track rearrangements. The bridge still
accepts only the exactly scoped `Lft.zip`, one trusted reference per tune,
and prevents manual uploads from being processed by reSIDfp.

### Automated regression

- Native real WASM engine: all 66/66 original Lft.zip SIDs rendered non-silent
  PCM using reSIDfp; no load errors.
  - https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43056729062
- Browser integration (single source) using real Chromium and reSIDfp:
  successful audio + verified TinySID restoration.
  - https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43058131484
- **TEST175 browser end-to-end:** Stubbed the *published* D1 LFT playlist
  with all 66 real HVSC references and opened it through the actual PLAY
  button in SpotySid's UI. Verified engine remained **active:true**,
  playback **playing:true**, **songCount:66**, PCM `peak:0.245819091796875`.
  This regression caught the non-progressive reference-loss bug.
  - https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43062991872

**This does not amount to a user listening PASS** or demonstrate perfect
emulation of all unusual effects/filters.

## Full LFT HVSC corpus analysis

Examined the actual `library/packs/musicians/L/Lft.zip` archive in GitHub,
not merely index titles. All 66 SID archives decompress and have valid headers:

| Property | Count |
| --- | ---: |
| Total | 66 |
| PAL | 66 |
| PSID (62 v2 + 2 v3) | 64 |
| RSID | 2 |
| SID 8580 flag | 42 |
| SID 6581 flag | 18 |
| Either model | 5 |
| Unspecified model | 1 |
| Two-SID (v3) | 2 |
| $1000 INIT | 38 |
| $1003 PLAY | 38 |

**No single chip-model switch can repair all 66.**

## Primary and community references

1. Linus Åkesson **Sidreloc**: SID files contain executable 6510 code, with
   initialization and periodic play routines, sometimes extra interrupt sources,
   digis and self-modifying instructions. A competent player must actually
   emulate the code and timing.
   https://www.linusakesson.net/software/sidreloc/index.php
2. Linus **Blackbird** (his SID tracker and export system): designed for
   real hardware and emulators. A third-party commenter (not Linus) says
   the Blackbird player sources contain undocumented/illegal 6510 opcodes.
   https://www.linusakesson.net/software/blackbird/index.php
3. Linus **A 9-bit pitch technique**: documents specialized pitch
   calculations in Scene Spirit playroutine.
   https://www.linusakesson.net/programming/9bitpitch/index.php
4. Linus in **CSDb forum** on SID ADSR bug and hard restart: he discusses
   hardware-dependent note triggering and once reported a tune that played
   correctly in VICE but exhibited ADSR bugs on real hardware; this confirms
   his tuning sensitivity to envelope timing.
   https://csdb.dk/forums/?roomid=14&topicid=110119
5. Linus **15 Years of Scene Spirit**: real-hardware reference was PAL C64
   **8580**; album rendering involved patched global volume writes and
   mastering. Spotify/MP3 sound is *not* a bit-for-bit SID emulator reference.
   https://www.linusakesson.net/music/15-years-of-scene-spirit/index.php
6. Linus **Nine**: his page offers separate demo PRG, Nine.sid and MP3,
   and CSDb links Nine to `/MUSICIANS/L/Lft/Nine.sid`; high-end DEMO
   screen effects do not imply that a special non-SID format is required
   for the extracted music.
   https://linusakesson.net/scene/nine/index.php
   https://csdb.dk/release/index.php?id=249713
7. Linus **Rodents in the Attic**: CSDb links the actual music to the HVSC
   standard Lft path, while blog separately distributes the demo PRG.
   https://linusakesson.net/scene/rodents-in-the-attic/index.php
   https://csdb.dk/release/?id=262145
8. **Machine Yearning [2sid] and Overflow [2sid]**: in April 2023 CSDb
   noted that the music expects 6581 at `$D400` and 8580 at `$D500`;
   mixing different chip models differs materially from forcing a
   single 8580 for both. The CSDb warning about VICE was from 2023;
   don't generalize it to all current VICE versions.
   https://csdb.dk/release/?id=231320&show=summary
   https://csdb.dk/release/?id=231319&show=summary
9. **HVSC FAQ + Players:** Modern players should honor PSID/RSID, PAL,
   proper MOS6581/8580 and multi-SID metadata; RSID can demand accurate
   C64 interrupts/timing. HVSC recommends reSID-based modern players such
   as sidplayfp, JSidplay2, WebSid, or DeepSID.
   https://www.hvsc.c64.org/faq
   https://www.hvsc.c64.org/players

## Further checks only if bad sound remains after TEST175

- Verify the listener really gets `RicoLftMode.active()===true` on each
  requested LFT song, not a fallback to TinySID.
- Compare `Nine` and `Rodents` audio to official MP3 references and VICE
  in PAL/8580 mode. Do not confuse their graphical demo tricks with the
  extracted PSID playroutine.
- Measure live audio callback buffer starvation/underrun in reSIDfp's
  asynchronous 4096-sample PCM queue. Nonzero 3-second offline rendering
  alone does not prove zero-glitch real-time playback.
- Check filters/ADSR on 6581/8580 and test the two-SID tracks with distinct
  chip models. Validate RSIDs with legitimate C64 ROMs if needed.
- Keep the stable root engine untouched. No new UI or playlist controls.

## Security restriction

The vendored WASM still embeds libsidplayfp 3.1.1. The upstream
libsidplayfp 3.1.2 release fixed CVE-2026-111148 (out-of-bounds read from
a crafted SID data-offset). An attempt to rebuild patched WASM in GitHub CI
failed because Ubuntu's apt hosts could not be resolved inside Docker,
not because the compiler rejected patched source.

In the meantime the experiment remains limited to immutable Lft.zip
pack references and a PSID/RSID data-offset preflight. Do not extend it
to arbitrary imported SIDs or other public playlists before rebuilding
and testing patched 3.1.2-or-later binaries.

- https://github.com/libsidplayfp/libsidplayfp/releases
- https://bugzilla.redhat.com/show_bug.cgi?id=CVE-2026-111148

**TEST175 status:** source fix + automated Chromium end-to-end PASS;
GitHub Pages /lft-test/ deployment pending verification; user listening PASS
pending. Production root player remains unchanged.
