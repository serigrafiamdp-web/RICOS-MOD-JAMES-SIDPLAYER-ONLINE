CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, creator TEXT NOT NULL,
  track_count INTEGER NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS playlists_created_at ON playlists(created_at);
CREATE TABLE IF NOT EXISTS submissions (ip_hash TEXT NOT NULL, created_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS submissions_ip_time ON submissions(ip_hash,created_ms);
