# OLD SID COLLECTION RICO — Migration from seven ZIP archives

**Date:** 2026-11-08 (Argentina)  
**Status:** One GitHub-curated playlist has been added to COMMUNITY PLAYLISTS, **browser playback PASS pending**. No original SID bytes were uploaded to the site's community library or Worker.

## What was analyzed

Seven user-provided ZIP archives: `trank.zip`, `rico sids mix i.zip`, `mix 2019.zip`, `final.zip`, `mix 2019(1).zip`, `SIDMIX 1(1).zip`, `todos(1).zip`.

| Metric | Count |
| --- | ---: |
| SID files encountered across the 7 archives | 509 |
| Exact duplicate SID file occurrences (SHA-256) | 196 |
| Distinct original SID binaries | 313 |
| With same normalized SID title and byte length in HVSC #85 | 276 |
| Matched to same-title/author HVSC alternatives of a different byte length | 19 |
| Verified title aliases (matching author and byte length) | 5 |
| Source entries accounted for by an HVSC reference | 300 |
| Source entries with no sufficiently safe reference | 13 |
| Source references that collapse onto the same HVSC path | 2 pairs |
| **Distinct tracks in the new playlist** | **298** |
| Number of distinct pre-existing HVSC ZIP packs referenced | 77 |
| New SID binaries stored in GitHub or Cloudflare | 0 |

**Important matching limitation:** SHA-256 was used to deduplicate the **uploaded archives**. HVSC matching used the index's SID title/filename, artist attribution and byte length. The catalog does not expose a checksum for every SID, so an equal title and byte length does **not** prove binary identity. The 19 alternate matches expressly point to a different HVSC version of the same titled tune, not to the uploaded binary. The 13 unresolved files were **not silently substituted**.

## Where the list lives

- [Playlist JSON — 298 HVSC references](../community/playlists/old-sid-collection-rico.json)
- [Community catalog index](../community/playlists.json)
- [Source scan metadata](old-sid-collection-rico-source-index.json)
- [Complete route and status audit](old-sid-collection-rico-routes-final.json)
- [Musician/demos shelf batch 0](old-sid-routes-batch-0.json), [batch 1](old-sid-routes-batch-1.json), [batch 2](old-sid-routes-batch-2.json), [batch 3](old-sid-routes-batch-3.json)

Every entry in the playlist is of the form `{"pack":"library/packs/musicians/.../*.zip","file":"...sid"}` or the corresponding demos ZIP path; no `sidBase64` fields.

One playlist is supported by the application format (maximum 2,000 songs; these references occupy under 32 KB of JSON). First load may take longer than a small list because it resolves SID files from **77 HVSC archive packs**.

## Source tunes requiring further research — NOT in the playlist (13)

| Original title | Uploaded filename | Reason |
| --- | --- | --- |
| Kaos — Markus Schneider | `kaos.sid` | Catalog titles "Kaos" belong to other composers; do not substitute |
| Noisy Pillars — Jeroen Tel | `noisy_pillars.sid` | Catalog's Noisy Pillars is credited to Sean Connolly, a different tune |
| The Last Starfighter — Thomas E. Petersen | `03_last_starfighter.sid` | No safe matching HVSC #85 title |
| Synth Sample III — Rob Hubbard | `04_synth_sample_iii.sid` | Catalog contains different/remade SID titles; no safe one-to-one mapping |
| Rhaa Lovely II — Jeroen Kimmel | `10_rhaa_lovely_ii.sid` | HVSC has separate tune 1 / tune 2; one original file does not map safely to just one |
| Twistin'88 — Part 1 — Thomas E. Petersen | `16_twistin_88-part_1.sid` | No safe matching reference in the catalog |
| Task III — Frank Endler | `18_task_iii.sid` | No safe matching reference |
| Think Twice IV — Jeroen Kimmel | `22_think_twice_iv.sid` | Catalog lists different numbered releases, not this one |
| Asteroid War — Sven Tegethoff | `asteroid_war.sid` | No safe matching reference |
| Beyond Tellerrand — Cris (Xiny6581) | `beyond_tellerrand.sid` | No safe matching reference |
| Castle Intro — Cris (Xiny6581) | `castle_intro.sid` | No safe matching reference |
| Danse Maicabre — Cris (Xiny6581) | `danse_maicabre.sid` | No safe matching reference |
| TUNE-TITLE... / AUTHOR NAME | `pv leetit38580.sid` | Placeholder SID metadata; unknown identity |

Two pairs of different uploaded SID binaries converge on the same HVSC route and are included only once each: **Nefarious** and **Alloyrun**.

## Editing / publishing caveat

This first copy is a **GitHub static curated playlist**, like the historical static community playlists. It appears under COMMUNITY PLAYLISTS and can be played or copied with EDIT into a personal REMIX. Reordering it and pressing SAVE saves a **browser-local copy**, not the static GitHub original. It does not yet have a Cloudflare D1 public playlist ID; public in-place rename/reorder/delete with the beta key would require publishing/migrating the references into Cloudflare's editable playlist registry. Do **not** present static SAVE as a confirmed Cloudflare write.

The user intends that the collection eventually be editable, copyable and deletable publicly, without collecting the songs again. The GitHub JSON is a persistent authoritative reference list for that migration.

**No public SID files, existing ranked playlists, audio engine, or Cloudflare database were changed in this import.**

## Acceptance checklist

1. Open the player after GitHub Pages has the latest changes.
2. Choose A SID → COMMUNITY PLAYLISTS → **OLD SID COLLECTION RICO** → PLAY.
3. Confirm the 298-song playlist loads and its SID files play.
4. Test EDIT to create a private REMIX copy; do not assume it has been published to D1.
5. Mark import PASS only after the owner confirms actual browser playback.
