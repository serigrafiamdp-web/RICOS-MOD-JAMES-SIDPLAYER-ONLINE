# TEST165 — NO HVSC preservation and mixed SID playlists

## Scope
- **No new UI controls.** Existing IMPORT SID, + / ADD + TO, EDIT SONGS, REPUBLISH and OUR COLLECTION remain.
- Archive independently contributed PSID/RSID files even when they do not belong to a CSDb release or HVSC.
- Preserve the original SID binary in the existing GitHub SID asset repository (or R2 when configured). No binary is embedded into the public D1 playlist payload.
- Use a persistent public collection **NO HVSC**, ID `00000000-0000-4000-8000-000000000001`.
- Public playlist records can contain either `{pack, file}` for HVSC or `{sidId, file}` for immutable contributed SIDs.
- Both kinds can be played and remixed in the same UCTUMI playlist and in other community playlists.
- Do not alter the HVSC #85 files, SID engine, autoplay state or unrelated playlists.

## How imports work
1. IMPORT SID keeps files in the browser for immediate playback, as before.
2. When the Worker advertises `noHvscArchive: true` and `sidUploadsEnabled: true`, the user can authorize publishing the imported files into the public NO HVSC archive with the existing beta-key dialog. Cancelling leaves files local.
3. SpotySid computes SHA-256 of the **original PSID/RSID file bytes**. If the identical asset is already archived, it reuses the same ID. When new, the Worker stores it through the existing SID asset provider and writes D1 metadata.
4. The browser only considers an upload successful after GET /no-hvsc confirms the stored ID. On errors, the local file is not deleted and no public playlist is edited.
5. Clicking + on an imported track selects the archived asset reference in the existing REMIX destination. If not yet archived, the same authorization workflow can be retried.
6. The UCTUMI user must still use REPUBLISH with the beta key. That updates the existing playlist ID, not a duplicate.

## Tracking
D1 table `sid_provenance` records full-file SHA-256 (`sid_id`), original filename, title, author, release credit from the SID header, a second SHA-256 of SID music data after the PSID header (`data_hash`), first-seen timestamp, and `hvsc_status='unverified'`.

An uploaded SID is **not automatically determined to be absent from HVSC**. Until research confirms a match, it remains in NO HVSC with unverified status. This provides a durable future comparison/submission queue for volunteer HVSC curation without making unsupported originality or copyright claims.

## Worker deployment
GitHub Pages and Cloudflare Workers deploy independently. After backing up the live Worker, update the code at `community/api/worker.js` through Cloudflare Workers & Pages → `ricos-sid-community` → Edit code → Deploy. The existing D1 and SID provider secrets/bindings must remain unchanged.

After deployment, confirm:
- GET `/capabilities` has `noHvscArchive: true` and `sidUploadsEnabled: true`.
- GET `/no-hvsc` returns `format: 'ricos-no-hvsc'` and a `tracks` array (initially empty).
- IMPORT 1 permitted SID, authorize archive, then repeat import to check that no duplicate asset is added.
- In OUR COLLECTION choose NO HVSC and confirm playback.
- Select UCTUMI as ADD + TO destination, use + on archived SID, REPUBLISH, and verify the original UCTUMI public ID still exists with its original tracks plus additions.

## Notes
- The public archive requires appropriate redistribution permission for the uploaded music.
- The uploader may change the display name later; the SHA-256 still identifies the original bytes.
- Cloudflare access and live browser playback must be confirmed after deployment; repository tests do not constitute a live PASS.

## Estado confirmado al 2026-11-10

- **TEST165 Worker deploy / endpoints — PASS:** `GET /capabilities` incluye `noHvscArchive:true`, `sidUploadsEnabled:true`, `sidUploadProvider:'github'`, `sidUploadLimit:15`; `GET /no-hvsc` devolvió `format:'ricos-no-hvsc'` y `tracks:[]` antes de las nuevas importaciones.
- **TEST166 — esquema documentado:** `sid_provenance` se incorporó al archivo `community/api/schema.sql` sin alterar el contenido de D1.
- **TEST167 — PASS reportado por el usuario:** se completó la prueba de importación/archivo propio. El inventario exacto de IDs e integridad de cada archivo no quedó registrado aquí.
- **TEST168 — PENDIENTE:** agregar un SID archivado a UCTUMI con `+`, verificarlo en EDIT SONGS y completar REPUBLISH conservando ID, canciones existentes y orden tras releer la lista.
- El despliegue de Cloudflare se hizo por separado del commit de GitHub; para futuras modificaciones de Worker, respaldar primero el Worker activo y D1.

**Cierre del día:** [Checkpoint 2026-11-10](CHECKPOINT_2026-11-10_SPOTYSID.md).
