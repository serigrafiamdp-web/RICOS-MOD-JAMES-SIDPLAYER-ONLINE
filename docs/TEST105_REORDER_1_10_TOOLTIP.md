# TEST105 — Reorder ±1 / ±10 and pointer hints (2026-11-08)

**State:** Code published on `main`; **PENDING USER PASS**. The confirmed functional checkpoint remains TEST104 PASS, with TEST102 PASS retained as the earlier baseline.

## Requested behavior
- On the floating playlist's ↑ / ↓ controls: one click moves the selected song **one** slot. A double-click moves it **ten** slots in the same direction, not 1+1+10.
- The same semantics apply to ↑ / ↓ in the local REMIX editor.
- On mouse hover, a readable small tooltip follows the pointer and explains single/double click. Native `title` and accessible labels remain as fallback.
- At either edge, moves clamp to first/last position.
- Ranked TOP 100 playlists remain read-only; no reorder operation is permitted.
- For editable published lists, movement remains local until existing SAVE + beta-key workflow; public backend changes have NOT been deployed or retested in TEST105.

## Implementation
- `js/customPlaylist.test101.js`: `bindReorderArrows()` waits 420 ms on single click before mutating DOM so that the browser's `dblclick` event can reach the *same* button. A double click cancels the pending 1-step action and applies one 10-step relocation.
- `moveLiveSong()`: remove+insert instead of swapping with the distant item. The same relocation is applied to `embeddedHvscPaths` and active publication track references. Remap `player.sidListIndex`, `selectedLiveIndex`, and `queuedLiveIndex`, preserving actual playback and pending next SID.
- `moveDraft()`: same remove+insert logic for REMIX tracks, keeping existing local persistence.
- `css/style.css`: `#ricoReorderHint` a pointer-events-none fixed tooltip outside clipped scrolling playlist.
- `index.html`: new JS/CSS query versions `test105reorder` to avoid old browser caches. The SID engine, TIMER, silence detection, Uctumi track and ranked data remain untouched.

## Verification
Logic checks in code evaluation passed for up 10, down 10, no missing/duplicated entries, parallel reference reordering, playing/queued/selected cursor remaps, edge clamping, presence of dblclick/tooltip handlers and new asset version links.

**Browser PASS pending:** GitHub Pages could not be loaded from the diagnostic environment, so real user hover/double-click testing and Pages publication visibility are still to be confirmed.

## Test link
https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=105reorder

**User regression checklist:** Load an editable list (not TOP 100); double-click ↑ at slot 16 → song should land at slot 6, with intermediate songs shifted down one, not swapped. Double-click ↓ at slot 6 → slot 16. Single click moves exactly one. Hover displays help. Playback should continue and SAVE should still correctly persist an edited published list.