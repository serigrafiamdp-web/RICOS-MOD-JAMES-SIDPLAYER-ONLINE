# TEST66 — REMIX PLAYLISTS (published for testing; not PASS)

**Stable checkpoints:** TEST64 PASS confirmed; TEST65 backend enabled with metadata-and-delete, its user PASS not recorded.  
**Live UI:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=66remix2

## Workflow

- Floating currently playing playlist includes **REMIX PLAYLIST** button and **ADD + TO** dropdown.
- **NEW REMIX** creates a separate draft with editable **name** and **Playlist by**.
- Multiple drafts can be prepared (up to 25); dropdown determines exactly which draft receives new songs.
- + beside a currently playing song adds an HVSC `pack/file` reference into the selected draft **without changing current playback**.
- Draft songs are visible in REMIX PLAYLIST editor. Remove from draft with ×. Duplicate pack/file entries prevented.
- **PLAY REMIX** fetches HVSC ZIP references and plays selected draft for review. This does change current playback, intentionally, but does not publish.
- **PUBLISH REMIX** asks beta key and sends new independent public v2 playlist to Cloudflare D1; published draft is removed from in-progress list after success.
- Drafts stored temporarily **in browser sessionStorage** and are not public. No SID bytes stored; only references, labels and destination. They survive reload in the same tab/session, not guaranteed across closed tabs/browsers. BETA KEY is never stored.
- Other playlists, rank positions, metadata and public D1 remain unchanged until explicit publication.
- User can return to originals and keep composing further drafts.

## Limitation / next milestone

- **Plus is fully operational for user-created v2 community lists with existing HVSC pack/file references**.
- Historical curated JSON playlists (v1, SID bytes embedded), and legacy built-in/ranked lists, do not currently provide an exact HVSC `pack/file` reference. The new + indicates that those SID need a validated HVSC mapping; no guessed references or duplicated SID content will be published. Implement exact lookup/mapping as next separate test before claiming support for all playlists.
- No changes required to Cloudflare Worker/D1 schema for the remix-draft publish flow: it uses existing `POST /playlists` with beta key.
- This test is **not marked PASS** until user confirms add, switch destination, preview and publish.

## Regression checks

1. Load a v2 public community playlist (e.g. one of the personal HVSC mixes).
2. Press REMIX PLAYLIST → NEW REMIX. Set name/creator.
3. Press + on several tracks; audio should continue unchanged, dropdown counter rises.
4. Create REMIX 2 and switch destination; + must add **only** to selected REMIX 2.
5. Switch to REMIX 1 and inspect its independent track list. PLAY REMIX should play exactly its selected tracks.
6. Publish with beta key; verify in COMMUNITY PLAYLISTS and ensure source playlist unchanged.
7. Verify no accidental changes to AUDIO, AUTO, SAVE, EDIT, DELETE, rankings, windows, and themes.
