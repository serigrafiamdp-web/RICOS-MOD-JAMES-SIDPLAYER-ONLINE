CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, creator TEXT NOT NULL,
  track_count INTEGER NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS playlists_created_at ON playlists(created_at);
CREATE TABLE IF NOT EXISTS submissions (ip_hash TEXT NOT NULL, created_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS submissions_ip_time ON submissions(ip_hash,created_ms);

-- TEST83: independent user-contributed SID collection, NOT an HVSC entry.
-- SID bytes reside in the configured asset provider (GitHub or R2); D1 stores hashes, provenance and references.
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

-- TEST166: provenance for the permanent NO HVSC archive. This is metadata
-- only: the original PSID/RSID binary stays in the existing SID asset store.
-- A SID is unverified against HVSC until independently matched; SHA-256 IDs
-- are immutable and support safe deduplication across imported playlists.
CREATE TABLE IF NOT EXISTS sid_provenance (
  sid_id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  released TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  hvsc_status TEXT NOT NULL DEFAULT 'unverified',
  first_seen INTEGER NOT NULL
);


-- TEST228: SpotySid community artist profiles, including optional local STIL
-- presentation overrides. Does not change the official HVSC STIL database.
CREATE TABLE IF NOT EXISTS artist_profiles (
  profile_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
