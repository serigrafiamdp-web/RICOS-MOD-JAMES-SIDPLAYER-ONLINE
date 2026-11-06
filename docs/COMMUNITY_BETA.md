# Community Playlist Beta — TEST13

## Publication rule
Only Rico and explicitly approved friends participating in beta testing may publish shared playlists. Visitors may browse and play published playlists, but cannot submit or rate them. No automated uploads, anonymous submissions, tokens or login forms in this phase.

## GitHub Pages catalog
`community/playlists.json` is a static catalog (format `ricos-community-catalog`, version 1).
Each approved item has an `id`, `title`, `author`, `tracks` (count) and `file` (same-origin relative JSON path under `community/playlists/`). Example:
```json
{
 "format":"ricos-community-catalog",
 "version":1,
 "playlists":[
   {"id":"rico-test","title":"Rico's SID selection","author":"Rico","tracks":12,"file":"community/playlists/rico-test.json"}
 ]
}
```
This is an example, NOT an actual published playlist.

## Publication workflow during closed beta
1. Create a list in CUSTOM, use SAVE LIST and DOWNLOAD JSON.
2. The project owner verifies music redistribution permission and inspects the JSON.
3. Owner adds the JSON under `community/playlists/` and adds its catalog entry.
4. All visitors can open USER PLAYLISTS and load the listed selection. This does not replace their saved IndexedDB collection.
5. No public upload endpoint is implemented. Never put a GitHub token in frontend JavaScript.

## Future migration
A service can later handle authenticated contributions, moderated uploads, rights acknowledgements, ratings and abuse prevention. Keep catalog and portable playlist versions explicit so the static site can be migrated to object storage and an API.

## Capacity
GitHub Pages has a 1 GB published-site limit and a soft 100 GB monthly bandwidth limit. Use reasonable caps, monitor repository growth and migrate when needed. Base64 embedded SID files increase stored JSON size about 33%.
