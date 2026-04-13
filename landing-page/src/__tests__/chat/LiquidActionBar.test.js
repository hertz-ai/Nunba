/* eslint-disable */
/**
 * LiquidActionBar — component tests.
 * Covers: seed rendering, role filtering, chat-driven merge via the
 * nunba:ui_actions window event, navigation dispatch on chip click.
 */
import React from 'react';
import {render, screen, fireEvent, act, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

// Mocks for react-router useNavigate — spy on nav calls.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock MUI icons as plain divs so we don't pull in the whole icon bundle.
jest.mock('@mui/icons-material/Forum', () => ({__esModule: true, default: () => <span data-testid="icon-forum" />}));
jest.mock('@mui/icons-material/Chat', () => ({__esModule: true, default: () => <span data-testid="icon-chat" />}));
jest.mock('@mui/icons-material/SportsEsports', () => ({__esModule: true, default: () => <span data-testid="icon-games" />}));
jest.mock('@mui/icons-material/School', () => ({__esModule: true, default: () => <span data-testid="icon-school" />}));
jest.mock('@mui/icons-material/Storefront', () => ({__esModule: true, default: () => <span data-testid="icon-storefront" />}));
jest.mock('@mui/icons-material/Extension', () => ({__esModule: true, default: () => <span data-testid="icon-extension" />}));
jest.mock('@mui/icons-material/PrecisionManufacturing', () => ({__esModule: true, default: () => <span data-testid="icon-pm" />}));
jest.mock('@mui/icons-material/Memory', () => ({__esModule: true, default: () => <span data-testid="icon-memory" />}));
jest.mock('@mui/icons-material/Hub', () => ({__esModule: true, default: () => <span data-testid="icon-hub" />}));
jest.mock('@mui/icons-material/Cloud', () => ({__esModule: true, default: () => <span data-testid="icon-cloud" />}));
jest.mock('@mui/icons-material/People', () => ({__esModule: true, default: () => <span data-testid="icon-people" />}));
jest.mock('@mui/icons-material/AdminPanelSettings', () => ({__esModule: true, default: () => <span data-testid="icon-admin" />}));
jest.mock('@mui/icons-material/OpenInNew', () => ({__esModule: true, default: () => <span data-testid="icon-open" />}));
jest.mock('@mui/icons-material/ExpandMore', () => ({__esModule: true, default: () => <span data-testid="icon-expand-more" />}));
jest.mock('@mui/icons-material/ExpandLess', () => ({__esModule: true, default: () => <span data-testid="icon-expand-less" />}));

import LiquidActionBar, {publishUiActions, UI_ACTIONS_EVENT} from '../../components/Social/Chat/LiquidActionBar';

function renderBar(props = {}) {
  return render(
    <MemoryRouter>
      <LiquidActionBar {...props} />
    </MemoryRouter>,
  );
}

describe('LiquidActionBar — seed rendering', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders the bar container', () => {
    renderBar();
    expect(screen.getByTestId('liquid-action-bar')).toBeInTheDocument();
  });

  test('flat user sees non-admin seed chips', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    expect(screen.getByText('Social Hub')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    // Admin-only pages must be hidden for flat users
    expect(screen.queryByText('Model Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Channels')).not.toBeInTheDocument();
  });

  test('central user sees admin seed chips', () => {
    renderBar({userRole: 'central', maxVisible: 20});
    expect(screen.getByText('Model Management')).toBeInTheDocument();
    expect(screen.getByText('Channels')).toBeInTheDocument();
  });

  test('maxVisible collapses overflow chips behind an expander', () => {
    renderBar({userRole: 'central', maxVisible: 3});
    // At most 3 chips visible initially
    const bar = screen.getByTestId('liquid-action-bar');
    // Expand icon should be present when truncated
    expect(within(bar).getByTestId('icon-expand-more')).toBeInTheDocument();
  });

  test('expander flips to show all chips', () => {
    renderBar({userRole: 'central', maxVisible: 3});
    const bar = screen.getByTestId('liquid-action-bar');
    const expandBtn = within(bar).getByTestId('icon-expand-more').closest('button');
    fireEvent.click(expandBtn);
    // After expand, the "less" icon shows up
    expect(within(bar).getByTestId('icon-expand-less')).toBeInTheDocument();
  });
});

describe('LiquidActionBar — click navigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('clicking a seed chip navigates to its route', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    fireEvent.click(screen.getByText('Social Hub'));
    expect(mockNavigate).toHaveBeenCalledWith('/social');
  });

  test('clicking Games navigates to /social/games', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    fireEvent.click(screen.getByText('Games'));
    expect(mockNavigate).toHaveBeenCalledWith('/social/games');
  });
});

describe('LiquidActionBar — chat-driven merge', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('publishUiActions merges a new action to the front', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    act(() => {
      publishUiActions([
        {
          id: 'admin_models',
          type: 'navigate',
          label: 'Model Management',
          route: '/admin/models',
          icon: 'memory',
          category: 'admin',
        },
      ]);
    });
    // Fresh chat-driven action is now visible (even though flat seed hid it)
    expect(screen.getByText('Model Management')).toBeInTheDocument();
  });

  test('listens for window nunba:ui_actions event directly', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    act(() => {
      window.dispatchEvent(
        new CustomEvent(UI_ACTIONS_EVENT, {
          detail: [
            {
              id: 'new_thing',
              type: 'navigate',
              label: 'New Thing',
              route: '/new',
              icon: 'open_in_new',
              category: 'general',
            },
          ],
        }),
      );
    });
    expect(screen.getByText('New Thing')).toBeInTheDocument();
  });

  test('empty ui_actions array is a no-op', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    const before = screen.getByTestId('liquid-action-bar').querySelectorAll('.MuiChip-root').length;
    act(() => {
      publishUiActions([]);
    });
    const after = screen.getByTestId('liquid-action-bar').querySelectorAll('.MuiChip-root').length;
    expect(after).toBe(before);
  });

  test('duplicate id updates the existing chip, does not double-render', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    // 'social_feed' is a seed; publish a chat-driven version with same id
    act(() => {
      publishUiActions([
        {
          id: 'social_feed',
          type: 'navigate',
          label: 'Social Hub',
          route: '/social',
          icon: 'forum',
          category: 'social',
        },
      ]);
    });
    const chips = screen.getAllByText('Social Hub');
    expect(chips.length).toBe(1);
  });

  test('publishUiActions on non-array input is safe', () => {
    renderBar({userRole: 'flat', maxVisible: 20});
    act(() => {
      publishUiActions(undefined);
      publishUiActions(null);
      publishUiActions('not-an-array');
    });
    // Bar should still render seed chips normally
    expect(screen.getByText('Social Hub')).toBeInTheDocument();
  });
});
