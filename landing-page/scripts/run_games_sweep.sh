#!/usr/bin/env bash
# Drive every game to completion, in small batches.
#
# A single 23-game run degrades: games that finish in 20-30 seconds on their own
# time out when they run late in the sweep, because browser state accumulates
# across the whole spec. Word Scramble completes in 32s alone and failed at 150s
# in the sweep; the same happened to the trivia set on other runs.
#
# One game per invocation, because batches of five were not enough isolation:
# Checkers finishes in 33s on its own and hit the full 600s budget when it ran
# third in a group, twice. A cypress start costs about ten seconds, which is a
# small price for a number that means what it says. BATCH=5 still works for a
# quick pass.
set -u
cd "$(dirname "$0")/.."
BASE="${CYPRESS_BASE_URL:-http://localhost:4173}"
OUT=cypress/results
MERGED="$OUT/completion-merged.json"
BATCH="${BATCH:-1}"

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

# Give anything that did not finish exactly one more go.
#
# Checkers completes on 7 of 8 runs by itself; the failures are its endgame,
# where the driver's generated move can be rejected and the position stops
# moving. One retry takes that from ~88% to ~98% without pretending a failed
# run passed: a game only counts as completed if a run of it actually reached
# a terminal screen. Any game still failing after two independent attempts is
# a real finding and stays in the report.
mapfile -t RETRY < <(python - "$MERGED" <<'PYR'
import json, sys
d = json.load(open(sys.argv[1]))
for k, v in d.items():
    if v.get('outcome') == 'not-completed':
        print(k)
PYR
)

for gid in "${RETRY[@]:-}"; do
  [ -z "$gid" ] && continue
  echo "=== retry: $gid"
  CYPRESS_BASE_URL="$BASE" npx cypress run     --spec cypress/e2e/games-to-completion.cy.js     --browser chrome --env "{\"games\":\"$gid\"}" >/dev/null 2>&1
  python - "$MERGED" "$OUT/completion.json" "$gid" <<'PYM'
import json, sys
merged, latest, gid = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(merged))
try:
    l = json.load(open(latest))
except Exception:
    l = {}
# Only ever upgrade: a retry that also failed must not overwrite a pass.
if l.get(gid, {}).get('outcome') == 'completed':
    m[gid] = l[gid]
    print('  retry passed ->', gid)
else:
    print('  retry failed too ->', gid)
json.dump(m, open(merged, 'w'), indent=2)
PYM
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
