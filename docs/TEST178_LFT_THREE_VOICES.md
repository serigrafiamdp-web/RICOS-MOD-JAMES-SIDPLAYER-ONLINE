# TEST178 — LFT MODE: three-voice SID oscilloscope

Date: 2026-11-11. **TEST178 automated Chromium PASS; user visual PASS pending.**

## Request and scope

Correct the LFT experimental oscilloscope so it does not display the entire
reSIDfp **mono mixed audio** as only voice 1 while leaving voices 2 and 3 empty.

Only `/lft-test/lft-mode.experimental.js` and its cache-version reference in
`/lft-test/index.html` change. The **production SpotySid `/index.html`,
TinySID backend, SID files, user playlists and Cloudflare Worker remain
unchanged**. LFT still activates **per approved HVSC track**, even in mixed lists.
LFT playlist selection remains manual.

## Implementation

- Keep the exact existing `engine.renderFrames(4096)` call and the original
  mixed 16-bit PCM samples. Audible playback does not use the new visual traces.
- After rendering the same PCM, query `engine.getSidStatus(0)` (32 emulated
  SID registers) to read each voice's current frequency, 12-bit pulse width,
  waveform-control bits, ADSR and master volume.
- Render three **distinct Float32Array visual-only waveforms** using continuous
  oscillator phase and a simplified envelope model. Each array has its own
  signal source. Do not copy the mono mixed PCM into voice 1 or duplicate it
  in three channels.
- Keep the existing original SpotySid filled and line drawing code untouched:
  its `SID.getChannelBuffer(1/2/3)` returns three independent visual handles,
  while `SID.getResampleBuffer()` still returns the **unaltered reSIDfp PCM**.
- No artificial fourth-voice buffer; reset a stale fourth-channel indicator
  when starting a new LFT tune.
- Every visual buffer is paired with the PCM frame that generated it. Register
  reads and waveform generation run outside the realtime WebAudio callback.
- TinySID methods and original visualization are restored unchanged when an
  approved LFT song ends or the listener switches to another artist.

**Accuracy:** These are oscillator approximations driven by *real emulated SID
registers*, **not exact isolated audio outputs from reSIDfp**. Analog filtering,
ring modulation, combined waveforms and detailed ADSR behavior cannot be
recovered perfectly from a single set of registers after the PCM block.
Audio fidelity is unaffected. A single currently active voice should
display only one line, rather than faking activity in silent channels.

## Automated evidence

[TEST178 passing Chromium + PCM run](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43079558653):
- Original 4096-frame reSIDfp PCM flow remains in place.
- Reading SID status does not advance the emulated clock or modify PCM samples;
  tested on Nine, Rodents, A Chipful of Love for You and Cherry Waffle.
- A Chipful of Love for You and Cherry Waffle: all three visual buffers active,
  with bounded peaks (not exaggerated vertical clipping).
- Nine: voice 1 active, voices 2–3 gate-off at measured moment; Rodents: voice
  3 active at measured moment. The scope correctly does not invent sound.
- Mixed LFT -> non-LFT -> LFT playlist playback: PASS.
- Adding an LFT tune using `+` to another playlist: PASS.
- Initial startup does not automatically open LFT: PASS.
- No JS browser errors in these end-to-end tests.

## Status / user test

Open https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/lft-test/
after the GitHub Pages deploy. Test A Chipful of Love for You and Cherry Waffle
for three independent traces, and Nine/Rodents for the appropriate selective
activity. Verify audio still sounds correct, fade/next and both WAVE modes.

**Experimental scope only.** The upstream WASM still embeds an older
libsidplayfp release. Do not route arbitrary imported SID files through it
until the patched WASM has been built and validated.
