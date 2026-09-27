#!/bin/bash
# Keeps the local reupgrade worker alive on the Mac.
#
# 26 Sep 2026: the worker died after 2.5 h when the Wi-Fi dropped
# (getaddrinfo ENOTFOUND supabase.co → its query retries gave up → exit),
# and nobody noticed until the next day. Progress is safe across restarts:
# every processed row is stamped reup_checked_at, so a restart resumes where
# it stopped instead of re-checking the popular works.
#
# Start:  nohup caffeinate -i -s bash scripts/reup-local-loop.sh >> ~/Desktop/reup-local.log 2>&1 &
# Stop:   pkill -f reup-local-loop; pkill -f reupgrade-commons-search
# Watch:  tail -f ~/Desktop/reup-local.log   (✓ lines = upgrades)
cd "$(dirname "$0")/.." || exit 1

while true; do
  REUP_MAX_SRC="${REUP_MAX_SRC:-3500}" REUP_CONCURRENCY="${REUP_CONCURRENCY:-2}" REUP_VERBOSE=1 \
    node --env-file=.env.local scripts/reupgrade-commons-search.mjs
  code=$?
  if [ "$code" -eq 0 ]; then
    # Walked everything that was unchecked. New imports arrive nightly, so look again later.
    echo "[reup-local-loop] $(date '+%F %T') walk complete; next pass in 6 h"
    sleep 21600
  else
    echo "[reup-local-loop] $(date '+%F %T') worker exited with code $code (network?); restarting in 2 min"
    sleep 120
  fi
done
