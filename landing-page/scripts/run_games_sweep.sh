#!/usr/bin/env bash
# Drive every game to completion, in small batches.
#
# A single 23-game run degrades: games that finish in 20-30 seconds on their own
# time out when they run late in the sweep, because browser state accumulates
# across the whole spec. Word Scramble completes in 32s alone and failed at 150s
# in the sweep; the same happened to the trivia set on other runs. Batching keeps
# each game's result honest, and the per-batch results are merged at the end.
set -u
cd "$(dirname "$0")/.."
BASE="${CYPRESS_BASE_URL:-http://localhost:4173}"
OUT=cypress/results
MERGED="$OUT/completion-merged.json"
BATCH="${BATCH:-5}"

mapfile -t IDS < <(grep -oE "\{ id: '[a-z0-9-]+'" cypress/e2e/games-to-completion.cy.js | sed "s/{ id: '//; s/'//")
mkdir -p "$OUT"
echo '{}' > "$MERGED"

for ((i = 0; i < ${#IDS[@]}; i += BATCH)); do
  group=$(IFS=,; echo "${IDS[*]:i:BATCH}")
  echo "=== batch $((i / BATCH + 1)): $group"
  CYPRESS_BASE_URL="$BASE" npx cypress run \
    --spec cypress/e2e/games-to-completion.cy.js \
    --browser chrome --env "{\"games\":\"$group\"}" >/dev/null 2>&1
  python - "$MERGED" "$OUT/completion.json" <<'PY'
import json, sys
merged, latest = sys.argv[1], sys.argv[2]
try:
    m = json.load(open(merged))
except Exception:
    m = {}
try:
    l = json.load(open(latest))
except Exception:
    l = {}
m.update(l)
json.dump(m, open(merged, 'w'), indent=2)
print('  merged ->', len(m), 'games recorded')
PY
done

python - "$MERGED" <<'PY'
import json, sys
from collections import Counter
d = json.load(open(sys.argv[1]))
c = Counter(v['outcome'] for v in d.values())
print('\nTOTAL:', dict(c))
for k, v in sorted(d.items(), key=lambda x: x[1]['outcome']):
    print(f"  {v['name']:22} {v['outcome']:14} {v.get('seconds','')}")
PY
