import React from 'react';
import {screen, within} from '@testing-library/react';
import {renderWithProviders} from '../../testHelpers';

/* The manual mock at services/__mocks__/socialApi.js, picked up with no
 * factory. SocialLayout calls evolutionApi.leaderboard on mount; the mock
 * resolves { data: [] }, so the Top HARTs block stays collapsed and cannot
 * introduce links this file does not know about.
 *
 * The mock derives its shape from the real module rather than restating it,
 * so it cannot drift. Ported from Hevolve web, where twenty-five hand-written
 * factories each named the two or three exports their author believed the
 * page touched, and nothing verified the belief. */
jest.mock('../../../services/socialApi');

jest.mock('../../../services/routePrefetcher', () => ({
  prefetchRoute: jest.fn(),
}));

jest.mock('../../../components/RoleGuard', () => ({
  useRoleAccess: () => ({canWrite: true}),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useNunbaTheme: () => ({
    isVisitorTheme: false,
    visitorUser: null,
    clearVisitorTheme: jest.fn(),
  }),
}));

jest.mock('../../../components/Social/Autopilot/autopilotStore', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../hooks/useAgentObserver', () => ({
  usePageObserver: jest.fn(),
}));

/* The floating chat widget is stubbed, not rendered.
 *
 * It is not incidental: NunbaChatProvider pulls in utils/deviceId, which
 * imports uuid, whose v9 build ships ESM that this project's jest transform
 * does not process ("Unexpected token 'export'"). The whole suite dies at
 * import time, before a single assertion. Stubbing it also keeps this file
 * about navigation -- the widget contributes no nav links. */
jest.mock('../../../components/Social/shared/NunbaChat', () => ({
  NunbaChatProvider: ({children}) => children,
  NunbaChatPill: () => null,
  NunbaChatPanel: () => null,
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => ({pathname: '/social'}),
}));

import SocialLayout from '../../../components/Social/SocialLayout';

/**
 * Where each sidebar entry must take a visitor.
 *
 * Written out here rather than imported from navGroups. Importing it would
 * make every assertion a tautology -- the test would agree with whatever the
 * component happened to say, including a typo or a destination that silently
 * moved. This list is the independent statement of what the social navigation
 * owes its users.
 */
const PUBLIC_DESTINATIONS = [
  ['Agents', '/'],
  ['Feed', '/social'],
  ['Activity Hub', '/social/hub'],
  ['Thought Experiments', '/social/experiments'],
  ['Trending', '/social?tab=trending'],
  ['Tools', '/social/tools'],
  ['Marketplace', '/social/marketplace'],
  ['Search', '/social/search'],
  ['Communities', '/social/communities'],
  ['Autopilot', '/social/autopilot'],
  ['Recipes', '/social/recipes'],
  ['Achievements', '/social/achievements'],
  ['Challenges', '/social/challenges'],
  ['Seasons', '/social/seasons'],
  ['Kids Learning', '/social/kids'],
  ['Games', '/social/games'],
  ['Mindstory', '/social/mindstory'],
];

/**
 * The content layer, ported from web along with the pages themselves.
 *
 * Every one of these has a matching route in MainRoute.js. A link here
 * without a route there is a link to the 404 handler, which is the specific
 * way this port could half-land: the sidebar looks complete and each entry
 * dead-ends.
 */
const CONTENT_DESTINATIONS = [
  ['Research', '/research'],
  ['News', '/news'],
  ['Answers', '/answers'],
  ['Incidents', '/incidents'],
  ['Blog', '/blog'],
  ['Docs', '/docs'],
  ['Listings', '/listings'],
  ['Hive Census', '/hive'],
  ['Download', '/download'],
  ['Press', '/press'],
];

/** Entries gated behind the member (flat) tier. */
const MEMBER_DESTINATIONS = [
  ['Campaigns', '/social/campaigns'],
  ['Coding Agent', '/social/coding'],
  ['Tracker', '/social/tracker'],
  ['Channels', '/social/channels'],
  ['Hive', '/social/hive'],
  ['HARTs', '/social/agents'],
  ['Resonance', '/social/resonance'],
  ['Compute', '/social/compute'],
  ['Regions', '/social/regions'],
  ['Encounters', '/social/encounters'],
  ['Privacy', '/social/settings/privacy'],
];

function renderAs(accessTier) {
  return renderWithProviders(
    <SocialLayout>
      <div data-testid="page-body">Body</div>
    </SocialLayout>,
    {socialContextValue: {accessTier, currentUser: null, resonance: {level: 0}}}
  );
}

/**
 * The sidebar, addressed as the navigation landmark.
 *
 * The mobile app bar and bottom navigation are in the DOM at all times --
 * they are hidden with `display` breakpoints, which jsdom does not apply --
 * and the bottom bar repeats four of the sidebar's labels.
 */
function nav() {
  return within(screen.getByRole('navigation'));
}

describe('SocialLayout navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('every destination is a real link', () => {
    it.each([
      ...PUBLIC_DESTINATIONS,
      ...CONTENT_DESTINATIONS,
      ...MEMBER_DESTINATIONS,
    ])('%s points at %s', (label, href) => {
      renderAs('central');
      expect(nav().getByRole('link', {name: label})).toHaveAttribute(
        'href',
        href
      );
    });

    /* The regression this guards is not cosmetic. These were
     * onClick={() => navigate(path)}, which no crawler follows, which
     * middle-click and open-in-new-tab ignore, and which assistive tech
     * announces as a button. A future edit that reintroduces a click handler
     * leaves the item visible and working under left-click, so nothing else
     * in the suite would notice. */
    it('renders no nav entry as a bare button', () => {
      renderAs('central');
      const labels = [
        ...PUBLIC_DESTINATIONS,
        ...CONTENT_DESTINATIONS,
        ...MEMBER_DESTINATIONS,
      ].map(([label]) => label);
      const buttons = nav()
        .queryAllByRole('button')
        .map((el) => el.textContent.trim())
        .filter((text) => labels.includes(text));
      expect(buttons).toEqual([]);
    });
  });

  describe('the content layer is reachable without an account', () => {
    it.each(CONTENT_DESTINATIONS)(
      '%s is visible to an anonymous visitor',
      (label, href) => {
        renderAs('anonymous');
        expect(nav().getByRole('link', {name: label})).toHaveAttribute(
          'href',
          href
        );
      }
    );

    it('still hides member-only entries from an anonymous visitor', () => {
      renderAs('anonymous');
      for (const [label] of MEMBER_DESTINATIONS) {
        expect(nav().queryByRole('link', {name: label})).toBeNull();
      }
    });

    it('hides Admin below the regional tier', () => {
      renderAs('flat');
      expect(nav().queryByRole('link', {name: 'Admin'})).toBeNull();
    });

    it('shows Admin at the regional tier', () => {
      renderAs('regional');
      expect(nav().getByRole('link', {name: 'Admin'})).toHaveAttribute(
        'href',
        '/admin'
      );
    });
  });

  /* Switching the items from onClick to component={RouterLink} moves which
   * prop MUI uses to render the root element. Selection is applied through a
   * class on that root, so it is the thing most likely to have been dropped
   * silently by that change. */
  it('marks the current route as selected', () => {
    renderAs('central');
    expect(nav().getByRole('link', {name: 'Feed'})).toHaveClass('Mui-selected');
    expect(nav().getByRole('link', {name: 'Research'})).not.toHaveClass(
      'Mui-selected'
    );
  });

  it('renders its children', () => {
    renderAs('central');
    expect(screen.getByTestId('page-body')).toBeInTheDocument();
  });
});
