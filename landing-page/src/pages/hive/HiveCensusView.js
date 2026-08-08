/* eslint-disable */
// Presentational half of the hive census. Takes data, renders it. No fetching,
// no polling, no derivation of its own beyond formatting — so it can be mounted
// in a test with any census shape and asserted on directly.
//
// The honesty rules this component enforces, because a dashboard is where the
// temptation to flatter lives:
//
//   1. A number with no reading renders as a dash. Zero is a measurement;
//      "nobody reported" is not, and rendering them the same turns a quiet
//      network into a dead one.
//   2. Anything derived rather than measured is labelled a projection, in the
//      UI, next to the figure. The convergence ladder it draws from is marked
//      unmeasured in its own source.
//   3. A projection with no basis is not shown at all. Growth at or below 1.0
//      never doubles, and a countdown to an event that will not happen is the
//      one thing that would make this page worthless.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { LADDER, position, joinsToDouble } from './thresholds';

const card = {
  background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(15,15,26,0.95) 100%)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 3,
  height: '100%',
};
const dim = { color: 'rgba(255,255,255,0.55)' };
const faint = { color: 'rgba(255,255,255,0.4)' };

export function Stat({ label, value, suffix, note, testid }) {
  const empty = value === null || value === undefined || Number.isNaN(value);
  return (
    <Card sx={card} data-testid={testid}>
      <CardContent>
        <Typography variant="caption" sx={dim}>{label}</Typography>
        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600, mt: 0.5 }}>
          {empty ? '--' : value}
          {!empty && suffix ? (
            <Typography component="span" variant="h6" sx={dim}>{suffix}</Typography>
          ) : null}
        </Typography>
        {note ? <Typography variant="caption" sx={faint}>{note}</Typography> : null}
      </CardContent>
    </Card>
  );
}

// The countdown. Real because the target is the project's own documented
// threshold, not a number chosen to look close.
export function NextThreshold({ nodes }) {
  const { current, next, remaining } = position(nodes);
  if (!next) {
    return (
      <Card sx={card} data-testid="next-threshold">
        <CardContent>
          <Typography variant="caption" sx={dim}>Ladder</Typography>
          <Typography variant="h5" sx={{ color: '#66bb6a', mt: 0.5 }}>
            Past every documented stage.
          </Typography>
        </CardContent>
      </Card>
    );
  }
  const pct = Math.min(100, (Number(nodes) / next.nodes) * 100);
  return (
    <Card sx={card} data-testid="next-threshold">
      <CardContent>
        <Typography variant="caption" sx={dim}>Next threshold</Typography>
        <Typography variant="h4" sx={{ color: '#fff', fontWeight: 600, mt: 0.5 }}>
          {remaining}
          <Typography component="span" variant="h6" sx={dim}>
            {remaining === 1 ? ' node to go' : ' nodes to go'}
          </Typography>
        </Typography>
        <Typography variant="body2" sx={{ color: '#fff', mt: 1 }}>
          {next.label}: {next.claim}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)' }}
        />
        {next.note ? (
          <Typography variant="caption" sx={{ ...faint, display: 'block', mt: 1 }}>
            {next.note}
          </Typography>
        ) : null}
        <Typography variant="caption" sx={{ ...faint, display: 'block', mt: 1 }}>
          Stages are a hypothesis from hive_benchmark_prover.py, unmeasured. The
          node count is measured.
        </Typography>
      </CardContent>
    </Card>
  );
}

// Extrapolation, shown only when there is something to extrapolate from.
export function Projection({ growthRate, nodesWithIndex }) {
  const joins = joinsToDouble(growthRate);
  const enough = Number(nodesWithIndex) >= 2;
  return (
    <Card sx={card} data-testid="projection">
      <CardContent>
        <Typography variant="caption" sx={dim}>Projection</Typography>
        {!enough ? (
          <React.Fragment>
            <Typography variant="h5" sx={{ color: '#fff', mt: 0.5 }}>
              Not enough nodes to project
            </Typography>
            <Typography variant="caption" sx={{ ...faint, display: 'block', mt: 1 }}>
              A growth rate needs at least two joins to exist. One node is a
              reading, not a trend, and drawing a line through it would be
              invention.
            </Typography>
          </React.Fragment>
        ) : joins === null ? (
          <React.Fragment>
            <Typography variant="h5" sx={{ color: '#ffb74d', mt: 0.5 }}>
              Not compounding
            </Typography>
            <Typography variant="caption" sx={{ ...faint, display: 'block', mt: 1 }}>
              Growth is at or below 1.0, so the collective is not doubling. That
              is the measurement, and the thesis says it should be above 1.
            </Typography>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Typography variant="h4" sx={{ color: '#66bb6a', fontWeight: 600, mt: 0.5 }}>
              {joins}
              <Typography component="span" variant="h6" sx={dim}> joins to double</Typography>
            </Typography>
            <Typography variant="caption" sx={{ ...faint, display: 'block', mt: 1 }}>
              Extrapolated from the measured growth rate, assuming it holds. It
              may not: the rate is an average over joins so far, and diminishing
              returns would show up here first.
            </Typography>
          </React.Fragment>
        )}
      </CardContent>
    </Card>
  );
}

export function Ladder({ nodes }) {
  const n = Number(nodes) || 0;
  return (
    <Card sx={card} data-testid="ladder">
      <CardContent>
        <Typography variant="h6" sx={{ color: '#fff' }}>The ladder</Typography>
        <Typography variant="caption" sx={faint}>
          Seven stages as written in the source, with where the hive actually is.
          Every score in the original is a projection; none has been measured.
        </Typography>
        <Box sx={{ mt: 2 }}>
          {LADDER.map((s) => {
            const reached = n >= s.nodes;
            return (
              <Box
                key={s.stage}
                data-testid={`ladder-stage-${s.stage}`}
                sx={{
                  display: 'flex', alignItems: 'baseline', gap: 2, py: 0.75,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: reached ? 1 : 0.45,
                }}
              >
                <Typography sx={{ color: reached ? '#66bb6a' : 'rgba(255,255,255,0.4)', minWidth: 76 }}>
                  {s.nodes.toLocaleString()}
                </Typography>
                <Typography sx={{ color: '#fff', minWidth: 150 }}>{s.label}</Typography>
                <Typography variant="body2" sx={dim}>{s.claim}</Typography>
                {reached ? (
                  <Chip size="small" label="here" sx={{ ml: 'auto', color: '#66bb6a', border: '1px solid #66bb6a' }} />
                ) : null}
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

export function PerNode({ perNode }) {
  const ids = Object.keys(perNode || {});
  const fmt = (v, d = 3) => (v === null || v === undefined ? '--' : Number(v).toFixed(d));
  return (
    <Card sx={card} data-testid="per-node">
      <CardContent>
        <Typography variant="h6" sx={{ color: '#fff' }}>Per node</Typography>
        <Typography variant="caption" sx={faint}>
          The rows the totals came from. Recompute them yourself if you hold the
          same deltas; that is why they are here.
        </Typography>
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              {['Node', 'Index', 'Growth', 'Agents', 'Last heard', ''].map((h) => (
                <TableCell key={h} sx={{ ...dim, borderColor: 'rgba(255,255,255,0.08)' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {ids.map((id) => {
              const n = perNode[id];
              const c = { color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.06)' };
              return (
                <TableRow key={id} data-testid={`node-row-${id}`}>
                  <TableCell sx={c}>{id.slice(0, 12)}{n.local ? ' (this node)' : ''}</TableCell>
                  <TableCell sx={c}>{fmt(n.intelligence_index)}</TableCell>
                  <TableCell sx={c}>{fmt(n.growth_rate)}</TableCell>
                  <TableCell sx={c}>{n.num_agents ?? '--'}</TableCell>
                  <TableCell sx={c}>{Math.round(n.age_seconds)}s ago</TableCell>
                  <TableCell sx={c}>
                    {n.stale ? (
                      <Chip size="small" label="stale" sx={{ color: '#ffb74d', border: '1px solid #ffb74d' }} />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
