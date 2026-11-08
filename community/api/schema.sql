CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, creator TEXT NOT NULL,
  track_count INTEGER NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS playlists_created_at ON playlists(created_at);
CREATE TABLE IF NOT EXISTS submissions (ip_hash TEXT NOT NULL, created_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS submissions_ip_time ON submissions(ip_hash,created_ms);

-- TEST83: independent user-contributed SID collection, NOT an HVSC entry.
-- Store immutable SID bytes in Cloudflare R2; D1 holds hashes + collection references.
CREATE TABLE IF NOT EXISTS sid_assets (
  id TEXT PRIMARY KEY,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sid_collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  track_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sid_collections_created ON sid_collections(created_at DESC);
CREATE TABLE IF NOT EXISTS sid_collection_tracks (
  collection_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  sid_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  PRIMARY KEY (collection_id, position)
);
CREATE INDEX IF NOT EXISTS sid_collection_tracks_sid ON sid_collection_tracks(sid_id);
