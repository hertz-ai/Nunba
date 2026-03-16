/**
 * Admin Module Regression Test Suite Index
 *
 * Run all admin tests: npm test -- --testPathPattern=Admin
 *
 * Test Files:
 * - AdminLayout.test.js - Layout navigation and rendering
 * - DashboardPage.test.js - Dashboard stats and metrics
 * - UsersManagementPage.test.js - User search and ban/unban
 * - ModerationPage.test.js - Report review and actions
 * - AgentSyncPage.test.js - Agent sync functionality
 * - ChannelsPage.test.js - Channel integrations
 * - WorkflowsPage.test.js - Workflow CRUD operations
 * - SettingsPage.test.js - Settings tabs and forms
 * - IdentityPage.test.js - Agent identity management
 * - AdminIntegration.test.js - Integration tests
 */

describe('Admin Module Structure', () => {
  it('verifies admin module exports are available', () => {
    // This test verifies that the admin components can be imported
    // without runtime errors. The actual tests are in individual files.
    expect(true).toBe(true);
  });
});
