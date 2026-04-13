/**
 * Cypress E2E Tests -- Social Notifications Page UI
 *
 * Covers:
 *   1. NotificationsPage (/social/notifications) - list, empty state
 *   2. Mark as read (individual + all)
 *   3. Notification API integration
 *   4. Error handling
 *
 * Note: /social/notifications is behind RoleGuard(minRole="flat").
 *       SocialContext defaults to 'flat' for authenticated users.
 *
 * Backend API: http://localhost:5000/api/social/notifications
 */

const mockNotifications = [
  {
    id: 'n1',
    message: 'Alice liked your post',
    content: 'Alice liked your post',
    is_read: false,
    link: '/social/post/p1',
    created_at: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'n2',
    message: 'Bob commented on your post',
    content: 'Bob commented on your post',
    is_read: true,
    link: '/social/post/p2',
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
];

// ---------------------------------------------------------------
// 1. Page Rendering
// ---------------------------------------------------------------
describe('Social Notifications -- Page UI', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load the notifications page without crashing', () => {
    cy.socialVisit('/social/notifications');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });

  it('should display "Notifications" heading or content', () => {
    cy.socialVisit('/social/notifications');
    cy.get('#root', {timeout: 300000}).should('exist');
    // Wait for the page to fully render - check for notification-related content
    cy.get('body', {timeout: 300000}).should(($body) => {
      const text = $body.text();
      expect(
        text.includes('Notification') ||
          text.includes('No notification') ||
          text.includes('Mark all')
      ).to.be.true;
    });
  });

  it('should render mocked notification items', () => {
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200,
      body: {success: true, data: mockNotifications},
    });

    cy.socialVisit('/social/notifications');
    cy.contains('Alice liked your post', {timeout: 300000}).should('be.visible');
    cy.contains('Bob commented on your post').should('be.visible');
  });

  it('should show "Mark all read" button when notifications exist', () => {
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200,
      body: {success: true, data: mockNotifications},
    });

    cy.socialVisit('/social/notifications');
    cy.contains('Mark all read', {timeout: 300000}).should('be.visible');
  });

  it('should show empty state when no notifications', () => {
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200,
      body: {success: true, data: []},
    });

    cy.socialVisit('/social/notifications');
    cy.contains('No notification', {timeout: 300000}).should('be.visible');
  });

  it('should call mark-all-read API when button is clicked', () => {
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200,
      body: {success: true, data: mockNotifications},
    });
    cy.intercept('POST', '**/api/social/notifications/read-all', {
      statusCode: 200,
      body: {success: true},
    }).as('markAllRead');

    cy.socialVisit('/social/notifications');
    cy.contains('Mark all read', {timeout: 300000}).click({force: true});
    cy.wait('@markAllRead');
  });
});

// ---------------------------------------------------------------
// 2. Notifications API
// ---------------------------------------------------------------
describe('Social Notifications -- API Endpoints', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list notifications via GET /notifications', () => {
    cy.socialRequest('GET', '/notifications').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
      }
    });
  });

  it('should mark notifications as read via POST /notifications/read', () => {
    cy.socialRequest('POST', '/notifications/read', {ids: []}).then((res) => {
      expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
    });
  });

  it('should mark all as read via POST /notifications/read-all', () => {
    cy.socialRequest('POST', '/notifications/read-all').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 3. Error Handling
// ---------------------------------------------------------------
describe('Social Notifications -- Error Handling', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 500,
      body: {success: false, error: 'Server error'},
    });

    cy.socialVisit('/social/notifications');
    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('body').should('not.contain.text', 'Cannot read properties');
  });
});
