# Playlist authorship — TEST14

A playlist has its own **creator/selector**, distinct from the **artist/composer** of each SID track. They can be the same person or different people.

For the first playlist:
- Playlist name: **LOS PAT MORITAS**
- Playlist creator/selector: **RICO**
- Tracks: **22** PSID files from the supplied `lpmfix(1).zip`
- Track artists/composers: preserve original SID header author metadata (in this collection, **LOS PAT MORITAS**).

Format v1 continues to use `name` and `tracks[].sidBase64`; optional `createdBy` identifies the playlist curator separately. The public catalog may use `author` for the curator, not for the SID composer. Existing imported playlists without `createdBy` remain compatible.

This is the first candidate for a permanent public playlist. The source ZIP gives files but no original playback order; initial generated JSON preserves ZIP entry order. Publishing the embedded music requires redistribution authorization. Do not list the playlist publicly until its complete JSON payload is uploaded and verified.
