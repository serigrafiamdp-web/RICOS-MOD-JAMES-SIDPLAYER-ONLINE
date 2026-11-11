# TEST170 — NO HVSC: artist subgroups (2026-11-10)

## User request

Display NO HVSC tracks in **artist subgroups**, using the existing visual treatment of **TOP 100 CSDb DEMOS** (one heading per subgroup, track rows beneath, SID count on the right). Preserve SpotySid minimalism, playback, archived data and existing controls.

## Implementation

- The active script remains `js/customPlaylist.test101.js` (historical filename); the cache query in `index.html` is `?v=test170nohvsartists`.
- Reuses `.rico-csdb-live-heading` and `.rico-csdb-live-status` from the existing DEMOS UI. **No CSS file changes**, new buttons, tabs or windows.
- Applied **only** when the loaded public collection ID is `00000000-0000-4000-8000-000000000001` (NO HVSC). Other collections and ranked CSDb lists stay on their existing renderer.
- Reads the existing read-only `GET /no-hvsc` endpoint and joins original `sidId` references to archived header metadata (`author`/`title`). This supports groups for a large archive even before all SID binaries load progressively. If metadata is missing, the SID header provides a fallback.
- Artist labels are displayed as text (not HTML). Matching is case-insensitive; groups are shown alphabetically with **Unknown** last. Each heading includes its SID count, and the original track index remains attached to each row.
- **Important:** sorting applies to the **display only**, not to the persisted collection, D1, SID bytes, playlists or playback order. Existing **+**, arrows, SAVE and playback callbacks retain their original track references.
- For NO HVSC, single/double-click reorder arrows move to the preceding/following track *within the visible artist group* (±1/±10 when available); normal playlists keep their previous arrow behavior.
- Large progressive playlists retain fast selection-paint using a map from **original track index → rendered wrapper**, accounting for the inserted heading rows.

## Validation completed in repository

- JavaScript compiled successfully using a syntax check in the tool runtime.
- Pure-function tests passed for: grouping case variants of the same artist; separate Unknown subgroup; original SID indices preserved; no grouping in non-NO HVSC collections; fail-closed when references and loaded tracks differ.
- `index.html` changed only its script cache parameter. The installed Cloudflare Web Analytics beacon was not altered.
- Cloudflare Worker, D1 schema, HVSC packs, audio engine, CSS, remote playlist IDs, asset storage and public playlist content remain untouched.

## LIVE TEST170 — awaiting user PASS

1. Open [SpotySid](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/) after GitHub Pages publishes the new main branch; reload with Ctrl+F5 if needed.
2. Select **OUR COLLECTION → NO HVSC → PLAY**.
3. Confirm headings `#1 Artist — N SID` with tracks underneath, matching the existing DEMOS style; Unknown appears last where applicable.
4. Confirm **+** still adds the intended SID to `ADD + TO`, and that clicking a grouped track plays the correct SID.
5. Check single/double-click arrow ordering within an artist group without losing original references; save only when intentionally changing public order.
6. Reopen another playlist (including TOP 100 CSDb DEMOS) and verify its layout and controls remain unchanged.

**Status: code committed and syntax/grouping checks PASS; browser/live user PASS pending.**

## Scope exclusions

- No new comparison algorithm against HVSC was added. The current importer still deduplicates by file SHA-256 against NO HVSC and archives only after beta-key authorization.
- Group headings do not create physical directories or new D1 objects. An unverified SID in NO HVSC is not proof of its absence from HVSC.
- No automatic upload, no changes to Cloudflare worker deployment.

[README](../README.md) · [Architecture](ARCHITECTURE.md) · [NO HVSC baseline](NO_HVSC_ARCHIVE_TEST165.md)

## FIX1 — Uctumi (user correction, 2026-11-10)

The user tested the original TEST170 and reported **FAIL**: two artist headings were generated even though **all three newly archived SID belong to Uctumi**. The original approach grouped the raw `author` strings, which are not a reliable canonical artist identity.

GitHub's dedicated asset repository shows **exactly three SID binaries archived together on 2026-11-10 at 22:33 UTC**. Their immutable SHA-256 IDs are:

- `72036d4c4426f9284b9e8052c5db916b7a5fb8ea842e0e1b824addb326466899`
- `0d1bab81f0371a13fab1fbff83adf56485f0a985914a313791f61a5041b982ae`
- `a6d5e428666d2fab00ad408d02facc9b938c1bab5f148d79653d168f39519860`

**Fix:** assign `Uctumi` as the virtual grouping label for these **three IDs only**, taking precedence over inconsistent PSID header author credits. Preserve original track titles, authors, bytes, SID IDs, playback indices, published playlists, and D1 metadata. Future artists must remain separate, including `Unknown`. No Worker deployment is necessary.

**Code checks passed:** all 3 hashes form **one Uctumi group** despite divergent author strings; another SID with a different author stays in its own group; unrelated collection rendering remains unchanged. The `index.html` cache token is updated to `test170fix1uctumi`.

**TEST170 FIX1 status:** GitHub commit and static tests PASS; **live visual PASS pending user confirmation**. To test: OUR COLLECTION → NO HVSC → PLAY; expect **one heading Uctumi · 3 SID**, not two groups. Reload the page after GitHub Pages publishes the update.
