import AdminLayout from '../../../components/Admin/AdminLayout';
import SocialContext from '../../../contexts/SocialContext';
import {renderWithProviders} from '../../testHelpers';

import {screen, fireEvent, act} from '@testing-library/react';
import React from 'react';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({pathname: '/admin'}),
  // The redirect AdminLayout renders, as a marker the tests can read.
  Navigate: ({to}) =>
    require('react').createElement('div', {'data-testid': 'redirect'}, to),
}));

const mockFetchProfile = jest.fn();

// A social context whose fetchProfile answers the way /auth/me would.
// It starts where the desktop page was on 2026-10-19: a token, no user,
// and the boot /auth/me unanswered (404 before HARTOS had the route).
function AskingSocial({answer, initial, children}) {
  const [ctx, setCtx] = React.useState({
    currentUser: null,
    loading: false,
    isAuthenticated: false,
    userRole: null,
    isGuest: false,
    accessTier: 'anonymous',
    profileAnswer: 'unanswered',
    ...initial,
  });
  const fetchProfile = React.useCallback(() => {
    mockFetchProfile();
    setCtx((c) => ({...c, profileAnswer: 'asking'}));
    return Promise.resolve().then(() => setCtx((c) => ({...c, ...answer})));
  }, [answer]);
  return (
    <SocialContext.Provider value={{...ctx, fetchProfile}}>
      {children}
    </SocialContext.Provider>
  );
}

const SIGNED_IN = {
  currentUser: {id: '10202', username: 'owner', role: 'flat'},
  isAuthenticated: true,
  userRole: 'flat',
  accessTier: 'flat',
  profileAnswer: 'answered',
};

describe('AdminLayout Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    test('renders Admin Panel title in sidebar', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      // Mobile + desktop drawers both render sidebar content, so text appears multiple times
      const elements = screen.getAllByText('Admin Panel');
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toBeInTheDocument();
    });

    test('renders Nunba Admin title in app bar', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      expect(screen.getByText('Nunba Admin')).toBeInTheDocument();
    });

    test('renders children content', () => {
      renderWithProviders(
        <AdminLayout>
          <div data-testid="test-child">Test Child Content</div>
        </AdminLayout>
      );
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Child Content')).toBeInTheDocument();
    });

    test('renders all navigation menu items', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const navItems = [
        'Dashboard',
        'Revenue',
        'Users',
        'Moderation',
        'Agent Sync',
        'Channels',
        'Workflows',
        'Settings',
        'Identity',
        'Agents Live',
        'Content Tasks',
      ];

      // Each nav item appears in both mobile and desktop drawers
      navItems.forEach((item) => {
        const elements = screen.getAllByText(item);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    test('renders back button', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      // Back button should exist (ArrowBackIcon)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    test('navigates to /social when back button clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      // Find the back button by its tooltip
      const backButton = screen.getByLabelText('Back to Social');
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/social');
    });

    test('navigates to /admin/users when Users clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Users')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    test('navigates to /admin/moderation when Moderation clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Moderation')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/moderation');
    });

    test('navigates to /admin/agents when Agent Sync clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Agent Sync')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/agents');
    });

    test('navigates to /admin/channels when Channels clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Channels')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/channels');
    });

    test('navigates to /admin/workflows when Workflows clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Workflows')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/workflows');
    });

    test('navigates to /admin/settings when Settings clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Settings')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/settings');
    });

    test('navigates to /admin/identity when Identity clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Identity')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/identity');
    });

    test('navigates to /admin/revenue when Revenue clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Revenue')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/revenue');
    });

    test('navigates to /admin/agent-dashboard when Agents Live clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Agents Live')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/agent-dashboard');
    });

    test('navigates to /admin/content-tasks when Content Tasks clicked', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      fireEvent.click(screen.getAllByText('Content Tasks')[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/content-tasks');
    });
  });

  describe('Active State', () => {
    test('Dashboard item is selected when on /admin path', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const dashboardButton = screen
        .getAllByText('Dashboard')[0]
        .closest('[role="button"]');
      expect(dashboardButton).toHaveClass('Mui-selected');
    });
  });

  describe('Opening Admin when /auth/me did not answer at boot', () => {
    beforeEach(() => {
      mockFetchProfile.mockClear();
    });

    test('asks /auth/me instead of redirecting, then shows Admin', async () => {
      renderWithProviders(
        <AskingSocial answer={SIGNED_IN}>
          <AdminLayout>
            <div data-testid="test-child">Dashboard</div>
          </AdminLayout>
        </AskingSocial>
      );
      expect(screen.queryByTestId('redirect')).toBeNull();
      expect(mockFetchProfile).toHaveBeenCalledTimes(1);

      await act(async () => {});

      expect(screen.queryByTestId('redirect')).toBeNull();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(mockFetchProfile).toHaveBeenCalledTimes(1);
    });

    test('asks once: a second non-answer redirects to /social', async () => {
      renderWithProviders(
        <AskingSocial answer={{profileAnswer: 'unanswered'}}>
          <AdminLayout>
            <div data-testid="test-child">Dashboard</div>
          </AdminLayout>
        </AskingSocial>
      );
      await act(async () => {});

      expect(screen.getByTestId('redirect').textContent).toBe('/social');
      expect(mockFetchProfile).toHaveBeenCalledTimes(1);
    });

    test('a signed-out answer (401/403) redirects without asking again', () => {
      renderWithProviders(
        <AskingSocial initial={{profileAnswer: 'answered'}} answer={SIGNED_IN}>
          <AdminLayout>
            <div data-testid="test-child">Dashboard</div>
          </AdminLayout>
        </AskingSocial>
      );
      expect(screen.getByTestId('redirect').textContent).toBe('/social');
      expect(mockFetchProfile).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('navigation items are keyboard accessible', () => {
      renderWithProviders(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );

      const usersButton = screen
        .getAllByText('Users')[0]
        .closest('[role="button"]');
      expect(usersButton).toHaveAttribute('tabindex', '0');
    });
  });
});
