# TEST171 — Archive RICO SID into NO HVSC, then free CUSTOM

**Status:** source SID binaries checked and migration package prepared; **Cloudflare D1 registration NOT YET CONFIRMED**. The beta key is required to publish. Do not remove or repurpose CUSTOM or the existing RICO playlist until the user verifies this migration.

## Source

- Personal v1 playlist `RICO`, 13 embedded PSID files: `community/playlists/rico.json` (the original uploaded `RICO_playlist_13_sid.json` was used to prepare the migration ZIP).
- All 13 SID headers have author `RICO`, are unique by full-file SHA-256 and individually decode as PSID/RSID.
- These **13 same SHA-256 content IDs already exist** as binary files in `serigrafiamdp-web/ricos-sid-uploads/sid/`; do not duplicate or overwrite their bytes.
- SpotySid HVSC #85 index currently lists three RICO tracks under `library/packs/musicians/R/Rico.zip`: `El_12.sid`, `Halito.sid`, `Mar_del_Rico.sid`. These are separate from the 13 listed below. An exact HVSC fingerprint search is still a separate task; NO HVSC status remains `unverified` until checked.
- Archive access uses existing Worker `POST /no-hvsc`, with **X-Beta-Key** required. Do not store or transmit the key outside the existing SpotySid authorization dialog.

## Migration manifest (original order)

| Original filename | Full-file SHA-256 SID ID |
| --- | --- |
| `flecha bus.sid` | `85d6b1e1f80b3fca84e64579645db67652651fee5dc344d2f9561ee493fafa58` |
| `indio alien.sid` | `f9528b8576e011531286a9adfb52b570f23e78ddbac0fcf24c84e48e3ef68088` |
| `retiro.sid` | `95c3d9788d8ff3291d76ef1fa7b9a233ae36d45d833f8985d2383500e767c941` |
| `ricoton.sid` | `472a60851fc218e49d489ee9baca7fec491621f19fcf977a8ce0b46f08cd179f` |
| `riquisimo.sid` | `40379df77fbd72f82eb7f370deca1a88ce2d7d26d606539416be76c08bdb2a46` |
| `veloz delnorte.sid` | `f0015f99aefeceb081ecf56634f4f8416a1346c4816260caf31a8270df4f1efa` |
| `yonkie.sid` | `0e2978ec9229481495f829829ed6484eca38d9d4b743c3ae712ef087f59b306b` |
| `chocorico.sid` | `b7e1f50acb8ed948b801fcbbaae2ebb57e5d712db3000ec2046f8f517748fe17` |
| `larica.sid` | `5b57d84cfbc19326e856e7b7e63082fe7741a28ce5f60963802d26a8b19a33de` |
| `piposka.sid` | `f364bac4d588eb7357931280d166c389ffa0d08e35e4a97afdcc176357760542` |
| `riquito.sid` | `16a5218a7c96d68258d66b769cfd4cdaa4055f601eeeebf794c3e8116d37232b` |
| `sensibike.sid` | `36c4f644f02df11bb56de156210b3ac7ab93117b7ca6b51219e114c692e92d2e` |
| `skar.sid` | `164266e3afcc903533f0f65f23633c174b0ca8d39363315390d6f92738068e9d` |

## Existing safe one-batch workflow

1. Obtain the migration ZIP with the above 13 `.sid` files from the project conversation (or use the original RICO JSON as source). **Unzip it** locally.
2. On SpotySid choose **IMPORT SID → ADD SID FILES** and select all **13 SID files at once** (the app supports multi-file selection; it does not accept a ZIP directly).
3. The existing NO HVSC import workflow requests the beta key **once** for up to 15 new SID. Authorize archiving. The Worker reuses already present immutable GitHub assets and writes missing D1 provenance and collection references, avoiding duplicates.
4. Read `GET /no-hvsc`; all 13 exact SHA-256 IDs must appear. Compare the archived count before/after, do not assume 13 newly added if some were already present.
5. In **OUR COLLECTION → NO HVSC → PLAY**, confirm the **RICO** artist subgroup appears with these 13 SID and that playback and `+` work. The Uctumi subgroup and other assets must remain unchanged.
6. Only after full confirmation, discuss removing the previous `RICO` *entry* (not deleting the browser's import functions) and making CUSTOM reusable. Preserve a source backup and never delete the original 13 bin files as part of this change.

## Boundaries

- This checkpoint does **not** claim that the D1 migration was executed. GitHub cannot bypass beta authorization, and storing files in `ricos-sid-uploads` does not automatically add D1 catalog rows.
- Do not add interface controls, change the music engine, edit published community playlists, alter the Worker, or rename/delete the existing RICO source during migration.
- No public playlist IDs or SID bytes were modified by preparing this migration.
