# RICOS MOD – JAMES SIDPLAYER ONLINE
## TEST54 PASS — checkpoint of 2026-11-07

User-confirmed tested visual state: **TEST54 PASS**.

**Restore point (TEST54 commit):** `fab528916eaf6e46465e2441845817a2ccd71edc` on `main`.  
**Test link:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=54

### Completed today
1. Added `TOP GROUPS` and `TOP MUSICIANS` browser tabs with **100 SIDs each** (TEST45), while keeping the original game, HVSC and personal/community lists.
2. Implemented ranked listings and separated music playback from tab navigation.
3. TOP GROUPS displays **number — group — composer alias/name — track or demo/release title**, with scene alias preferred when available (TEST46–47).
4. Improved floating playlist spacing and typography, including a user-approved **16px music row / 18px heading** reference scale, and kept a minimal look (TEST49).
5. Added both **horizontal and vertical** resize grips to the floating playlist (TEST48). Retained header dragging.
6. Made the main library/Choose A SID and About windows more consistent and compact (TEST50), and re-enabled edge resizing after removing restrictive CSS `!important` dimensions (TEST53).
7. Centered the floating playlist in the available viewport at startup, with oscilloscope visible; AUTO loads without reopening the library over it. Closing the playlist brings the library up explicitly (TEST51–53).
8. Lowered Choose A SID to cover the protruding border of the underlying floating playlist (TEST54) — **USER PASS**.

### Important UX rules
- Preserve the visually approved compact window sizes, not full-screen panels.
- Keep user resizing functional and the oscilloscope visible.
- Avoid exposing an extra library dialog on startup through AUTO.
- Preserve original SID audio playback and header metadata.
- Correct group/release attribution progressively; the lists are an editorial CSDb/HVSC filter, not a claim of individual song voting.

### Pending factual playlist corrections
- **PVM #95:** published SID still assigns `Acid_and_Black_tune_2.sid` incorrectly. Planned replacement: **Uctumi – Balloon Country Bursts**, associated with PVM release *¡Arriba las manos!*. Local replacement JSON exists but was **not published to GitHub**. When resuming, commit this change only if still desired, keeping all 100 tracks.
- **Samar Productions #94:** `Acid_and_Black_tune_1.sid` also originates from an unrelated demo; find an appropriate track.
- Other approximate group-track matches may need later corrections, per user's preferred pragmatic curation.

### Historical PASS distinction
- TEST42 already confirmed PASS for an earlier four-tab layout.
- TEST54 is the latest **confirmed visual PASS**.
- No explicit full end-to-end playback PASS has been logged for every new TOP GROUPS / TOP MUSICIANS SID.

### Files of interest
- `index.html`
- `css/style.css`
- `js/customPlaylist.js`
- `community/playlists/csdb-top-100-groups.json`
- `community/playlists/csdb-top-100-musicians.json`
- `community/curation/`

No SID engine modifications are needed for the current visual checkpoint.
