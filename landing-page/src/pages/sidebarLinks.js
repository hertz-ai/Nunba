/**
 * The agent sidebar's menu, declared once.
 *
 * AgentSidebar.js listed these seven destinations twice, in a desktop block
 * and a mobile block about 250 lines apart. Two copies of one menu drift, and
 * the only reason these had not is that nobody had edited either.
 *
 * It lives in its own module rather than at the top of AgentSidebar.js so it
 * can be tested against the router. A destination that does not exist looks
 * completely normal until someone clicks it, and then React Router renders the
 * catch-all rather than erroring. That has shipped here before: footer-light.js
 * linked <Link to="/About">, which matched nothing because React Router is
 * case-sensitive, so it served the bare CRA shell from every page on the site.
 *
 * WHY THESE ARE NOT THE SAME DESTINATIONS AS HEVOLVE WEB'S
 *
 * Web's copy of this menu points About Hevolve at /about and Pricing at
 * /pricing. Copying that here would break both:
 *
 *   /about does not exist in this app. Only /AboutHevolve and /aboutus do.
 *
 *   /pricing exists, but it is not the same page. Here /Plan renders Pricing,
 *   the consumer plans, and /pricing renders CommercialApiPricing, the API
 *   rate card. On web the sidebar entry is even labelled "Cloud Pricing" for
 *   that reason. Repointing /Plan at /pricing would have sent everyone asking
 *   about plans to a developer price list, silently, with no broken link to
 *   show for it.
 *
 * Same shape, different values, deliberately. The two apps share a codebase,
 * not a route table.
 */
const SIDEBAR_LINKS = [
  {to: '/social', label: '🌐 Social'},
  {to: '/social/kids', label: '🧒 Kids Learning'},
  {to: '/admin', label: '⚙️ Admin'},
  {to: '/AboutHevolve', label: 'About Hevolve'},
  {to: '/agents', label: 'Agents'},
  {to: '/aboutus', label: 'About Us'},
  {to: '/Plan', label: 'Pricing'},
];

export default SIDEBAR_LINKS;
