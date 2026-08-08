const fs = require('fs');
const path = require('path');
const {declaredRoutes} = require('./testHelpers');
const SIDEBAR_LINKS = require('../pages/sidebarLinks').default;

const MAIN_ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'MainRoute.js'),
  'utf8'
);

describe('the agent sidebar menu', () => {
  /* The failure this exists for: React Router matches case-sensitively and
   * renders the catch-all for anything unmatched, so a destination that does
   * not exist behaves like a working link right up to the click. This app
   * shipped <Link to="/About"> in footer-light.js and served the bare CRA shell
   * from every page carrying the footer. */
  it.each(SIDEBAR_LINKS.map((l) => [l.label, l.to]))(
    '%s goes to a route that exists (%s)',
    (label, to) => {
      expect(declaredRoutes(MAIN_ROUTE).has(to)).toBe(true);
    }
  );

  it('sends no two entries to the same place', () => {
    const destinations = SIDEBAR_LINKS.map((l) => l.to);
    expect(destinations).toHaveLength(new Set(destinations).size);
  });

  /**
   * The two routes that must NOT be aligned with Hevolve web's copy of this
   * menu, asserted so a future convergence pass cannot quietly do it.
   *
   * /about does not exist in this app; only /AboutHevolve and /aboutus do, so
   * web's spelling would be a dead link.
   *
   * /pricing does exist, and that is the dangerous one. Here /Plan renders
   * Pricing, the consumer plans, while /pricing renders CommercialApiPricing,
   * the API rate card. Repointing /Plan at /pricing would send everyone asking
   * about plans to a developer price list, with no broken link to show for it.
   */
  it('keeps the destinations this app actually has, not web s', () => {
    const routes = declaredRoutes(MAIN_ROUTE);
    const destinations = SIDEBAR_LINKS.map((l) => l.to);

    expect(destinations).toContain('/AboutHevolve');
    expect(routes.has('/about')).toBe(false);

    expect(destinations).toContain('/Plan');
    expect(destinations).not.toContain('/pricing');
  });

  it('points Pricing at the consumer plans page, not the API rate card', () => {
    const pricing = SIDEBAR_LINKS.find((l) => l.label === 'Pricing');
    const planBlock = MAIN_ROUTE.slice(MAIN_ROUTE.indexOf('path="/Plan"'));

    expect(pricing.to).toBe('/Plan');
    expect(planBlock.slice(0, 600)).toContain('<Pricing />');
  });
});

describe('declaredRoutes', () => {
  it('resolves a nested child against its parent', () => {
    const routes = declaredRoutes(`
      <Route path="/social" element={<Home />}>
        <Route path="kids" element={<Kids />} />
      </Route>
    `);

    expect(routes.has('/social')).toBe(true);
    expect(routes.has('/social/kids')).toBe(true);
    expect(routes.has('/kids')).toBe(false);
  });

  it('ignores the catch-all', () => {
    expect(declaredRoutes('<Route path="*" element={<NotFound />} />').size).toBe(
      0
    );
  });
});
