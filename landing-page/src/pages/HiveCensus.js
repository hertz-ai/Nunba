/* eslint-disable */
// Hive census — what the network reports about itself, with its sample.
//
// This file does one thing: fetch, poll, hand the result to the view. Rendering
// lives in pages/hive/HiveCensusView.js, threshold arithmetic in
// pages/hive/thresholds.js. Split so each can be tested for what it does rather
// than how it is spelled.
//
// Reads /api/social/hive-census, which serves what receive_peer_delta already
// verified (version, freshness, guardrail hash, Ed25519, HMAC, origin
// attestation). Nothing is computed here that the network did not report.
import React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import HeaderNano from './Layouts/header';
import FooterLight from './Layouts/footer-light';
import Spacer from '../components/Agent/Spacer';
import { SOCIAL_API_URL } from '../config/apiBase';
import { Stat, NextThreshold, Projection, Ladder, PerNode } from './hive/HiveCensusView';
import PageMeta from '../components/shared/PageMeta';
import { readPrerenderData, publishPrerenderData } from '../utils/prerenderData';

// /api/hive/* is not routed by the gateway; /api/social is.
const CENSUS_URL = `${SOCIAL_API_URL}/hive-census`;
const POLL_MS = 30000;

const STATE_COPY = {
  not_federating: 'This node is not federating, so it has no peers to count.',
  no_peers: 'Federating, and no peer has reported yet.',
  unreachable: 'The census endpoint did not answer.',
  error: 'The census endpoint returned an error.',
};

export default function HiveCensus() {
  // Seeded from what the prerenderer got, so the first render here matches the
  // saved HTML instead of showing a spinner against it. Read in the initialiser,
  // not an effect: an effect arrives one render too late, which is the mismatch
  // this removes. See src/utils/prerenderData.js.
  const seed = readPrerenderData('hiveCensus');
  const [data, setData] = React.useState(seed ? seed.data : null);
  const [state, setState] = React.useState(seed ? seed.state : 'loading');

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(CENSUS_URL);
        const body = await res.json();
        if (!alive) return;
        const next = body && body.status ? body.status : 'error';
        setData(body);
        setState(next);
        publishPrerenderData('hiveCensus', { data: body, state: next });
      } catch (e) {
        if (alive) setState('unreachable');
        // Published on failure too. The prerenderer's fetch DID fail on
        // 2026-08-04 and the saved page showed "unreachable"; without this the
        // client would start at 'loading' and disagree with it all over again.
        publishPrerenderData('hiveCensus', { data: null, state: 'unreachable' });
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const d = data || {};
  const nodes = d.nodes_reporting ?? 0;
  const fmt = (v, p = 3) => (v === null || v === undefined ? null : Number(v).toFixed(p));

  return (
    <React.Fragment>
      <PageMeta
        title="Hive census: is the network getting better? | Hevolve"
        description="Live figures from the HART OS hive: nodes reporting, collective intelligence index, growth per join, and distance to the next documented threshold. Measured values and projections are labelled separately."
        path="/hive"
      />
      <HeaderNano />
      <Container maxWidth="lg" sx={{ pt: 6 }} data-testid="hive-census">
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700 }}>
          Is the network getting better?
        </Typography>
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.65)', mt: 1, maxWidth: 760 }}>
          Every node broadcasts a signed delta and every receiver verifies it
          before counting it. This shows what was counted and how many nodes it
          came from. Measured figures and projections are labelled separately,
          and a projection with no basis is not shown.
        </Typography>

        {state === 'loading' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }} data-testid="census-loading">
            <CircularProgress />
          </Box>
        ) : (
          <React.Fragment>
            {state !== 'ok' ? (
              <Card
                data-testid="census-state"
                sx={{
                  mt: 3, background: 'rgba(26,26,46,0.9)',
                  border: '1px solid rgba(255,183,77,0.3)', borderRadius: 3,
                }}
              >
                <CardContent>
                  <Chip
                    label={String(state).replace(/_/g, ' ')}
                    sx={{ color: '#ffb74d', border: '1px solid #ffb74d', mb: 1.5 }}
                  />
                  <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    {STATE_COPY[state] || 'No reading.'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', mt: 1.5 }}>
                    A state, not a zero. A hive with nobody in it and a hive that
                    is failing look different, and they read differently here.
                    The ladder below shows what is being waited for.
                  </Typography>
                </CardContent>
              </Card>
            ) : null}

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Stat
                  testid="stat-nodes"
                  label="Nodes reporting"
                  value={state === 'ok' ? nodes : null}
                  note={`verified within ${Math.round((d.window_seconds || 3600) / 60)} min`}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stat
                  testid="stat-counted"
                  label="Counted in the mean"
                  value={state === 'ok' ? d.nodes_with_intelligence : null}
                  note={d.nodes_stale ? `${d.nodes_stale} stale, excluded` : 'none stale'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stat
                  testid="stat-index"
                  label="Collective index"
                  value={fmt(d.mean_intelligence_index)}
                  note="knowledge capacity, not capability"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stat
                  testid="stat-growth"
                  label="Growth per join"
                  value={fmt(d.mean_growth_rate)}
                  suffix="x"
                  note="above 1.0 is compounding"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <NextThreshold nodes={nodes} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Projection
                  growthRate={d.mean_growth_rate}
                  nodesWithIndex={d.nodes_with_intelligence}
                />
              </Grid>

              <Grid item xs={12}>
                <Ladder nodes={nodes} />
              </Grid>

              {Object.keys(d.per_node || {}).length ? (
                <Grid item xs={12}>
                  <PerNode perNode={d.per_node} />
                </Grid>
              ) : null}
            </Grid>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 3 }}>
              The index is a knowledge-capacity figure from concept-graph
              topology: log2(paths + 1) x (1 + depth/10) x (learned/concepts). It
              measures what the graph can express, not how well a node answers.
              Nodes past the freshness window are listed and excluded from the
              means. Refreshes every {POLL_MS / 1000} seconds.
            </Typography>
          </React.Fragment>
        )}
      </Container>
      <Spacer h={120} />
      <FooterLight />
    </React.Fragment>
  );
}
