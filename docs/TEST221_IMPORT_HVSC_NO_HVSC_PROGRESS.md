# TEST221 — Import SID analysis, HVSC deduplication, NO HVSC archival

Date: 2026-11-12. Status: GitHub test build; live user acceptance pending.

## Interface

Single narrow progress bar in **IMPORT SID**. English only:
- `ANALYZING` — reads and validates local PSID/RSID bytes; computes SHA-256.
- `CHECKING HVSC` — reads the published HVSC #85 shelf catalog and compares candidate SID bytes, not names, against the user's hashes.
- `ARCHIVING` — after the **existing beta-key prompt** is approved, stores distinct unmatched SIDs using the existing Cloudflare /no-hvsc workflow and verifies D1 plus downloaded binary hashes.
- `DONE` — actual result counts: HVSC, NO HVSC, optional DUP/LOCAL/SKIPPED.
- `CHECK FAILED` — incomplete HVSC/NO HVSC comparison; files stay local. No speculative public upload.

Progress is visible for both metadata indexing and individual SHA comparisons, and for each verified asset upload. No extra buttons, windows, restrictions on import batch size, or audio changes.

## Matching

1. Parse and preserve the exact imported local bytes. All uploads start local; imported tracks can be played before cloud processing.
2. Fetch `library/index.json` and the official published musician and demo shelf manifests; index verified entries by original byte length.
3. For each candidate of equal byte length, load the published ZIP via JSZip and SHA-256 hash the **complete PSID/RSID file**. File name, SID title, artist or file size alone never confirm a match.
4. Reuse `{pack,file}` references for exact HVSC matches. The same binary imported under a different name still matches.
5. Compare remaining complete-file SHA-256 identifiers with the public `GET /no-hvsc` archive and reuse `{sidId,file}` if already there.
6. Preserve all unmatched variants separately. When authenticated, upload a unique asset **only once**; same-file duplicates within the batch share one stored ID. Check persisted D1 record and re-download the bytes for SHA-256 verification before assigning a verified `sidId`.
7. The locally saved user's **SAVE LIST** now uses version 2 mixed references to HVSC and NO HVSC when all entries were resolved, avoiding duplicated music bytes. Duplicate references are saved once. A partially unresolved import is kept as a version 1 local-binary playlist rather than assuming unverified archives are available.
8. Version 2 local lists appear in COMMUNITY PLAYLISTS as **private local rows** and can be **PUBLISH**ed using existing beta-key authorization. PUBLISH stores reference metadata in D1, not SID bytes. PUBLISH checks re-read the saved order and reuse pending remote IDs after a transient failure. Legacy V1 imported collection publishing is untouched.

## Uctumi FIX

The current SpotySid `library/packs/musicians/U/Uctumi.zip / Mujer_Amante.sid` binary is a **supplemental FIX**, not an original HVSC #85 SID. It is intentionally excluded from classifying imports as an *official* HVSC exact match. An imported `Mujer Amante` with the same **7667-byte binary and exact SHA-256** is labeled `_FIX.sid` when first archived in NO HVSC. The archive retains the unmodified original header and bytes; the FIX marker is displayed without changing the music.

No attempt has been made to bypass Cloudflare's beta key, overwrite official HVSC, update an existing archive's immutable identity, or claim a public FIX was archived without proof. If an identical ID was archived earlier under a different name, it is reused rather than overwritten.

## Data and privacy

- Public cloud writes always require the existing server-validated beta key; cancellation/failure retains the user's original SID locally. No automatic publication without authorization.
- The Worker `community/api/worker.js` and database schema are **unchanged**. D1 already stores SID fingerprints, metadata and provenances, and GitHub/R2 stores immutable binaries.
- There are no new restrictions on exported SID, audio, fade, LFT engine, timer, UI palettes, or scroll.
- Downloading many equal-size ZIP candidates can be slow on the first import. An in-memory cache reduces repeat downloads within the session. The progress bar indicates the real operations. A future precomputed SHA index would optimize large batch performance without altering the matching rules.

## Tests performed with mocked network, WebCrypto and ZIP payloads

- Exact SID binary with a different filename resolves to a real HVSC pack/file reference.
- Different binary with the same title and byte length does **not** match.
- Identical files appearing twice share a classification and only one uploaded NO HVSC asset.
- Previously archived SID reused without new upload.
- The verified current Uctumi repair remains a separate NO HVSC FIX candidate.
- Correct progress stage/count updates for analysis and HVSC matching.
- Wrong/cancelled beta key writes nothing and leaves original bytes intact.
- Archive POST failure does not assign false asset IDs.
- Successful archive requires verification of returned ID, catalog persistence and re-downloaded binary SHA.
- Client and new matching module pass JavaScript syntax checks.

## Live acceptance

Import a small batch containing an original HVSC SID, the same SID renamed, a different alternate, and (when permitted) the Uctumi FIX. Verify the progress stages, `SAVE LIST`, `NO HVSC` after beta authorization, and `PUBLISH` for the reference-only user playlist. **Only the listener may confirm the live PASS.**
