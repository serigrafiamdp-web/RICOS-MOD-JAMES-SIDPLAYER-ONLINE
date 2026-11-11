# LFT MODE — vendored libsidplayfp-wasm (experimental)

**TEST173. NOT DEPLOYED TO SPOTYSID MAIN.**

This directory is a byte-for-byte copy of the following compiled files from
[chrisgleissner/libsidplayfp-wasm](https://github.com/chrisgleissner/libsidplayfp-wasm),
release **v1.1.1**, whose upstream commits are pinned in `UPSTREAM.json`.

The complete corresponding source code for this build is available as the upstream
[release source archive](https://github.com/chrisgleissner/libsidplayfp-wasm/releases/download/v1.1.1/libsidplayfp-wasm-1.1.1-complete-source.tar.gz).
This is an independently distributed build, not an official libsidplayfp release.

The package is **GPL-2.0-or-later**. See `LICENSE`,
`THIRD-PARTY-NOTICES.md`, and `MODIFICATIONS.md`. All original copyright
notices are retained. No original C64 ROM files are included.

**Security hold:** This binary embeds libsidplayfp **v3.1.1**; upstream v3.1.2
fixed CVE-2026-111148 (out-of-bounds read from a malformed PSID/RSID data
offset). Do **not** deploy this pinned binary to the public SpotySid site.
The prototype validates data offsets and is restricted to the read-only
HVSC Lft.zip; that limited input check is not a substitute for rebuilding
against patched upstream before public deployment.

The only intended consumer is `../lft-mode.experimental.js`, which lazily
initializes the `residfp` engine for the exact published LFT playlist.
Native TinySID remains the default and is restored when the experiment exits.
