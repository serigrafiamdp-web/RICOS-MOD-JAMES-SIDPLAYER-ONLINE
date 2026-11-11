# SpotySid LFT experimental preview — TEST174

This directory is a **separate, restricted test page** for the publicly
published playlist named **LFT**, containing only the known HVSC archive
`library/packs/musicians/L/Lft.zip`.

- The main SpotySid homepage, main TinySID engine, other playlists, user
  playlists, audio assets and Cloudflare Worker are unchanged.
- The test page opens the published LFT playlist automatically, and uses
  experimental reSIDfp WebAssembly only for bytes obtained from a verified
  Lft.zip reference in that playlist.
- Uploads, other authors, copied playlists, non-LFT public playlists and
  source changes are routed to the original TinySID player.
- A separate browser tab can be used to compare test vs stable.
- Do not use this test page for unknown, arbitrary or untrusted SID files.
- A PSID offset preflight and one-shot trusted-source gate are enforced. These
  controls limit the experimental older libsidplayfp 3.1.1 backend to the known
  static HVSC archive. **This does not make the old library generally safe
  for arbitrary input.** Migration to patched upstream libsidplayfp v3.1.2 is
  still required before enabling this engine anywhere else.

The relevant file source, copyright and license are included beside the
experimental WASM under `lft-wasm/`. GPL-2.0-or-later:
https://github.com/chrisgleissner/libsidplayfp-wasm/releases/tag/v1.1.1

[Main stable SpotySid](../index.html) remains untouched.
