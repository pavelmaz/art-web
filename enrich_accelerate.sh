#!/usr/bin/env bash
# Drive the enrich-artworks + enrich-artists edge functions to completion.
# Both run at the same time (different tables = no row overlap). Each loop is
# SEQUENTIAL on its own function so no row is ever enriched twice (wasted $).
# Resumable: the functions only pick rows where description/bio IS NULL, so if
# this is killed, just run it again and it continues where it left off.
set -uo pipefail
cd "$(dirname "$0")"

# --- credentials (read locally from .env.local; never printed) ---
SUPABASE_URL=$(grep -E '^(export )?NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '"'\''[:space:]')
KEY=$(grep -E '^(export )?SUPABASE_SERVICE_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '"'\''[:space:]')
BASE="${SUPABASE_URL%/}/functions/v1"

if [ -z "$SUPABASE_URL" ] || [ -z "$KEY" ]; then
  echo "ERROR: could not read NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY from .env.local" >&2
  exit 1
fi

run_loop () {
  local slug="$1" label="$2" fails=0 done_count=0
  echo "[$label] starting…"
  while true; do
    resp=$(curl -s -m 240 -X POST "$BASE/$slug" \
      -H "Authorization: Bearer $KEY" \
      -H "apikey: $KEY" \
      -H "Content-Type: application/json" -d '{}')

    if printf '%s' "$resp" | grep -q 'need enrichment'; then
      echo "[$label] ✅ ALL DONE (total enriched this run: $done_count)"
      break
    fi

    remaining=$(printf '%s' "$resp" | grep -oE '"remaining":[0-9]+' | grep -oE '[0-9]+' | head -1)
    success=$(printf '%s' "$resp" | grep -oE '"success":[0-9]+' | grep -oE '[0-9]+' | head -1)

    if [ -z "${remaining:-}" ]; then
      fails=$((fails + 1))
      echo "[$label] ⚠️  bad response (#$fails): $(printf '%s' "$resp" | head -c 200)"
      # The edge function occasionally returns an empty body under OpenAI latency /
      # timeouts. Those come in streaks, so ride them out (30 in a row before giving
      # up) with a longer backoff instead of killing a multi-hour run over a blip.
      if [ "$fails" -ge 30 ]; then echo "[$label] ❌ too many errors, stopping."; break; fi
      sleep 20; continue
    fi

    fails=0
    done_count=$((done_count + ${success:-0}))
    echo "[$label] +${success:-0}  |  ${remaining} remaining  |  $(date +%H:%M:%S)"
    [ "$remaining" -le 0 ] && { echo "[$label] ✅ ALL DONE"; break; }
    sleep 1
  done
}

run_loop enrich-artworks artworks &
P1=$!
run_loop enrich-artists  artists  &
P2=$!
wait "$P1" "$P2"
echo "================ ENRICHMENT COMPLETE ================"
