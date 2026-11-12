# TEST212 — Mujer Amante: source A/B from the original Chipdisk Nacional Vol. 1

**Date:** 2026-11-12. **Status:** code-level PASS; listening PASS pending.

## Discovery and provenance
Pungas de Villa Martelli published the complete code and musical sources for *Argentine Songbook Vol. 1 / Chipdisk Nacional Vol. 1*:
https://github.com/c64scene-ar/chipdisk-nac-vol.1 (Apache-2.0 project).

The original compiled musicdisk includes *Mujer Amante* by Uctumi. Its source tree contains:
- `res/sids/uc-mujer.sid` — 7667 bytes, PSID v2, CRC32 **493EB09A**, Git blob SHA `a17c9dbb6aa9d6cc9159a1f668204eae5c16c9fb`. Title "MUJER AMANTE COVER", author UCTUMI, init `$1000`, play `$1003`.
- `res/sids-source/Uc-M-amant-b.swm` — SID-Wizard 1.7 musical project. The `-b` suffix denotes its **BARE** player build (per source README).

**Current HVSC**: `library/packs/musicians/U/Uctumi.zip` -> `Mujer_Amante.sid`, 8003 bytes, CRC32 **D69AF18D**, title "Mujer Amante", author Esteban Palladino (Uctumi), init `$1000`, play `$1003`. The two files are genuinely different versions (336-byte size difference); do not assume they sound the same or that either is "fixed" until tested.

## Isolated playback test
- Normal URL: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=212
- Experimental compiled original: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=212&mujersource=compiled

Both continue to select the same **Mujer Amante** HVSC entry from any existing playlist so the TIMER and list order remain unchanged.

On the experimental URL only:
1. Verify that the selected HVSC entry belongs to the exact Uctumi.zip + Mujer_Amante.sid allowlist.
2. Validate the 8003-byte original before substituting a test source.
3. Decode `experimental/mujer-amante-chipdisk.test212.js` (embedded upstream 2017 original SID data); validate size, PSID header, title and CRC32.
4. Pass **the 7667-byte original Chipdisk version** to the existing reSIDfp MOS8580 backend, both for pre-staging during the outgoing fade and on direct load.
5. Keep the existing 1× output gain. The original 8003-byte HVSC entry is **not overwritten**, no published playlist or SID library is changed. If the alternate source is unavailable or invalid, retain the HVSC source.

When the URL flag is absent, normal playback is **identical to TEST211**. The filtered/diagnostic test remains optional, but this new source A/B defaults to filter ON.

**Never change** `Loco_un_Poco.sid` (separate 8580 + 2.6× gain), Linus/LFT, any other SID, the 5s outgoing fade, TEST208 opening PCM gate, or the TEST206 countdown.

## Tests run
- JS syntax PASS on 10-KB source fixture and updated bridge.
- 7667-byte fixture decoded correctly; PSID header and full original title PASS; expected CRC32 check PASS.
- URL opt-in function returns test bytes only with `mujersource=compiled`; without flag returns null; PASS.
- Exact Mujer, existing Loco, existing Linus and random other Uctumi route eligibility checked for both URL modes; PASS.
- No full browser-audio playback/long-duration listening performed; awaiting user.

## Listening acceptance
Listen to *Mujer Amante* with both URLs and compare:
- Fault reported at **2:25–2:00 remaining**, corresponding to **3:04–3:29 elapsed** based on HVSC duration 5:29.
- Does the bass/voice 1 continue correctly throughout in the original Chipdisk variant?
- Does the original kick still sound correct entering from another SID?
- Can playback continue into other tracks without alterations?

If the original Chipdisk source also exhibits the exact 25s low-note hang, use the original SWM and compiled SID to investigate the SID-Wizard BARE data tables and emulator, rather than guessing filter settings.
