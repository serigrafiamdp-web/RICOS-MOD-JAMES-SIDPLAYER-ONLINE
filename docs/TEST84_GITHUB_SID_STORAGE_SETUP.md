# TEST84 — GitHub as SID storage (staged / NOT deployed)

**Status:** backend source prepared in GitHub on 2026-11-08, but not deployed to Cloudflare. No files have been published through this path. TEST82 is the confirmed functional baseline for OUR COLLECTION; TEST83 frontend is staged.

## Goal

Only invited people with the existing beta key can press PUBLISH on local imported collections. The Cloudflare Worker authenticates that key, writes SID binary files to a **different public GitHub repository**, and stores collection metadata in the existing D1 database. Users need **no GitHub account or repository permission**. HVSC and the player source repo remain unchanged.

## Repository setup (next step)

1. Log in to the GitHub account `serigrafiamdp-web` and create a public repository named **`ricos-sid-uploads`**, initialized with a README so that its main branch exists. We cannot create this repository with the current connector.
2. Keep the existing player repository separate: `serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE`.
3. Create a GitHub **fine-grained personal access token** restricted to the new repository only, with **Contents: Read and write**. Prefer a short expiration/rotation. Never paste the token in chat, put it in the website source, or commit it to GitHub.
4. In Cloudflare Worker `ricos-sid-community` → Settings → Variables and Secrets, add a **Secret** called exactly `GITHUB_SID_TOKEN` (value = the token). Keep the existing `BETA_EDIT_KEY` and `DB` unchanged. Do not add it as plaintext variable.

## Deploy backend after setup

5. Execute the **CREATE TABLE IF NOT EXISTS** additions in `community/api/schema.sql` on the existing Cloudflare D1 database `ricos-sid-community`. Do **not** reset or replace D1.
6. Deploy the updated `community/api/worker.js` to the **existing** Cloudflare Worker `ricos-sid-community` (not a new worker). This is not yet performed; GitHub changes alone do not update the Worker. Preserve the D1 binding and existing secret.
7. Check `GET /capabilities` at `https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities`: `sidUploadsEnabled:true`, `sidUploadProvider:"github"`, `sidUploadLimit:15`. If disabled, PUBLISH refuses without losing local data.

## First test

8. Load TEST83 frontend, use a saved local collection such as RICO NUEVA (13 SID), press PUBLISH in COMMUNITY PLAYLISTS, confirm redistributable rights, supply creator name and existing beta key.
9. Verify a series of files under `ricos-sid-uploads/sid/<sha256>.sid`, D1 stores a collection with track positions, and OUR COLLECTION shows one **PUBLISHED** collection row, with **LOAD** playing all 13 tracks in the normal floating player (no per-track PLAY buttons in the browsing panel).
10. Verify the same collection appears from a second browser and pre-existing community/HVSC playlists still work. Only mark the publication as PASS after checking.

## Security architecture

- Upload is beta-key gated by the Worker, which also enforces origin, payload and SID-header validation, 5 publications/hour per IP hash, and a maximum of 15 SID per publication for the GitHub backend. The frontend never sees the GitHub token.
- Files use server-computed SHA-256 names, not a user-controlled path. No repository code or GitHub workflow edits are exposed.
- Public asset GET is via the existing Worker `/sid-assets/:sha256`, verifying the binary hash. GitHub content access is server-side.
- File writes are sequential through GitHub Contents API (not a browser GitHub session). The new repo must be public so anyone can later fetch released SID binaries; publishing should only be offered for redistributable material.
- D1 collection records are created after the SID assets are successfully stored. Partial failed uploads can leave unreferenced asset files, but no visible half-published collection.
- Never deploy the GitHub backend without first configuring the dedicated repo, the D1 schema, and the Worker secret. If a GitHub token is compromised, revoke it at GitHub, then replace the Worker secret.
- Existing R2 support remains in the code as an alternative. If both R2 and GitHub are configured, R2 takes precedence.
- The D1 tables can be introduced safely with `CREATE TABLE IF NOT EXISTS`; this does not migrate old HVSC playlists.
- Future work: stronger per-uploader identity and revocation, moderation, license metadata, publication deletion, collision/concurrency tests, and potential Github API rate-limit fallbacks.
