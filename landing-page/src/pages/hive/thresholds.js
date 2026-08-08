// The convergence ladder, as it exists in HART OS.
//
// These stages are NOT invented for this page. They are the seven stages written
// in integrations/agent_engine/hive_benchmark_prover.py, where the source marks
// every figure as a projection that has never been measured. That marking is
// carried through to the UI: anything derived from these numbers is labelled a
// hypothesis, because that is what it is.
//
// Single source for both the countdown and the ladder view, so the two can never
// disagree about where the hive stands.
export const LADDER = [
  { stage: 1, nodes: 1, label: 'One node', claim: 'A single model, running locally.' },
  {
    stage: 2,
    nodes: 3,
    label: 'Three nodes',
    claim: 'The first threshold: does the sum beat the single?',
    note: 'A floor test. Three models voting reduce error; it says nothing yet about capability.',
  },
  { stage: 3, nodes: 10, label: 'Ten nodes', claim: 'Expert routing across models with different blind spots.' },
  { stage: 4, nodes: 100, label: 'A hundred', claim: 'Network mixture-of-experts.' },
  { stage: 5, nodes: 1000, label: 'A thousand', claim: 'Generate, review, test as separable roles.' },
  { stage: 6, nodes: 10000, label: 'Ten thousand', claim: 'Hive learning compounds across the population.' },
  { stage: 7, nodes: 100000, label: 'A hundred thousand', claim: 'Beyond what one model does.' },
];

/** The stage a given node count currently sits in, and the next one up. */
export function position(nodes) {
  const n = Number(nodes) || 0;
  let current = null;
  let next = null;
  for (const s of LADDER) {
    if (n >= s.nodes) current = s;
    else if (!next) next = s;
  }
  return { current, next, remaining: next ? next.nodes - n : 0 };
}

/**
 * Joins needed to double the collective index, derived from a MEASURED growth
 * rate. Returns null when there is no basis for the number.
 *
 * Honest by construction: a growth rate at or below 1.0 does not double, ever,
 * and saying "soon" would be a lie. A rate measured from fewer than two joins is
 * not a rate at all, so the caller must not pass one.
 */
export function joinsToDouble(growthRate) {
  const g = Number(growthRate);
  if (!Number.isFinite(g) || g <= 1) return null;
  return Math.ceil(Math.log(2) / Math.log(g));
}
