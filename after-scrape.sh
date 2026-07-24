#!/usr/bin/env bash
# Post-scrape pipeline: run after importing new artworks with the scraper.
#   1. migrate-external-images  — pull externally-hosted images into Supabase storage
#   2. images:renditions        — generate the w800/w1400 WebP renditions (REQUIRED,
#                                 grid/detail views 404 without them)
#   3. rclone copy              — push new renditions + artist images to Cloudflare R2
#                                 (zero-egress serving; incremental, skips existing)
# Idempotent and resumable: safe to re-run at any point.
set -uo pipefail
cd "$(dirname "$0")"

SUPABASE_URL=$(grep -E '^(export )?NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'\''[:space:]')
KEY=$(grep -E '^(export )?SUPABASE_SERVICE_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '"'\''[:space:]')
if [ -z "$SUPABASE_URL" ] || [ -z "$KEY" ]; then
  echo "ERROR: missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local" >&2
  exit 1
fi

echo "── 1/3 migrate external images into Supabase ──"
prev=-1
for i in $(seq 1 40); do
  resp=$(curl -s -m 300 -X POST "${SUPABASE_URL%/}/functions/v1/migrate-external-images" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{}')
  remaining=$(printf '%s' "$resp" | grep -oE '"artworks_remaining":[0-9]+' | grep -oE '[0-9]+' | head -1)
  echo "  pass $i: remaining=${remaining:-?}  $(printf '%s' "$resp" | grep -oE '"message":"[^"]*"' | head -1)"
  if [ -z "${remaining:-}" ]; then echo "  ⚠️ unexpected response: $(printf '%s' "$resp" | head -c 200)"; break; fi
  [ "$remaining" -le 0 ] && { echo "  ✅ all images migrated"; break; }
  [ "$remaining" = "$prev" ] && { echo "  ⚠️ no progress (failing urls?) — moving on"; break; }
  prev=$remaining
done

echo "── 2/3 generate image renditions ──"
npm run --silent images:renditions

echo "── 3/3 copy new files to Cloudflare R2 ──"
# Renditions + artist portraits are content-addressed (named by sha256), so an
# existing R2 key never needs re-checking or re-uploading. --ignore-existing makes
# rclone decide purely from the bulk --fast-list listings and skip everything that's
# already there — so it stops doing the per-object HeadObject calls that R2 was
# throttling with 403s (which had ballooned the copy to hours of retry backoff).
# Only genuinely-new files transfer. Gentle concurrency + retries cover those.
# --s3-no-head: R2 also throttles the post-upload verification HeadObject; files
# are content-addressed so upload success is verification enough.
RCLONE_OPTS="--ignore-existing --s3-no-head --transfers 6 --checkers 6 --retries 10 --low-level-retries 20 --fast-list --stats-one-line --stats 30s"
rclone copy supabase:art-images/renditions r2:art-images/renditions $RCLONE_OPTS
rclone copy supabase:art-images/artists    r2:art-images/artists    $RCLONE_OPTS

echo "── final counts ──"
echo "Supabase renditions: $(rclone size supabase:art-images/renditions | grep 'Total objects')"
echo "R2 renditions:       $(rclone size r2:art-images/renditions | grep 'Total objects')"
echo "R2 artists:          $(rclone size r2:art-images/artists | grep 'Total objects')"
echo "✅ after-scrape pipeline complete"
