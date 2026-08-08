/* eslint-disable */
// Vertical registry — thin code adapter over the canonical JSON manifest
// (verticalDefs.json). ALL vertical data lives in the JSON; this module only
// resolves each vertical's `source` descriptor to a fetcher. Every client
// (hevolve web, Nunba copy, RN screens, agentic Liquid UI, HARTOS agents via
// public/ai-news-feed.json) consumes the same manifest — one source of truth,
// no parallel paths. See docs/DISTRIBUTED_PLATFORM_PLAN.md §3.
//
// Data policy: verticals render LIVE data (marketplace API) or honest empty
// states — never fabricated listings.

import { marketplaceApi } from '../../services/socialApi';
import defs from './verticalDefs.json';

// source.type → fetcher factory. New backends (listings API in P2) register
// here without touching the manifest shape.
const SOURCE_ADAPTERS = {
  marketplace: ({ categoryPrefix }) => async () => {
    const res = await marketplaceApi.listings({ limit: 60 });
    const items = res?.data || res?.listings || [];
    if (!categoryPrefix) return items;
    return items.filter((l) =>
      (l.category || '').toLowerCase().startsWith(categoryPrefix)
    );
  },
};

function hydrate(def) {
  const v = {
    ...def,
    ctaLabel: def.cta?.label,
    ctaTo: def.cta?.to,
  };
  if (def.source && SOURCE_ADAPTERS[def.source.type]) {
    v.fetcher = SOURCE_ADAPTERS[def.source.type](def.source);
    v.detailPath = () => def.detailPath || '/social/marketplace';
  }
  return v;
}

export const REFRESH_POLICY = defs.refresh;
export const VERTICALS = Object.fromEntries(
  Object.entries(defs.verticals).map(([k, def]) => [k, hydrate(def)])
);
export const VERTICAL_KEYS = Object.keys(VERTICALS);
