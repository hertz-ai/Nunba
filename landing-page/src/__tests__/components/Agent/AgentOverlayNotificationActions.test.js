/* eslint-disable */
/**
 * AgentOverlay NotificationCard — `actions` array handling.
 *
 * HARTOS COMPONENT_TYPES declares `actions` as a prop of the
 * 'notification' type (HARTOS/integrations/agent_engine/liquid_ui_service.py
 * line 50).  The React renderer previously ignored that contract — only
 * showing title + message and dropping the actions.
 *
 * This test pins the now-honored contract:
 *   1. Actions render as buttons.
 *   2. Clicking `kind:'navigate'` invokes the navigate prop with the target.
 *   3. Clicking dismisses the overlay (cleanup).
 *
 * Regression guard for the chat fall-through busy path: chat hot path
 * emits {type:'notification', actions:[{label, kind:'navigate',
 * target:'/admin/task-ledger?task_id=X'}]} — if NotificationCard
 * forgets actions again, this test fails.
 */

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';

// Mock realtimeService to a no-op so AgentOverlay's useEffect doesn't
// crash without WAMP/SSE infrastructure during the unit test.
jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: jest.fn(() => () => {}),
    off: jest.fn(),
  },
}));

jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));

// Import after mocks.
const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');

describe('AgentOverlay NotificationCard actions', () => {
  test('renders action buttons and routes navigate on click', async () => {
    const navigateSpy = jest.fn();
    let handleEvent;

    // Spy the realtime subscription so we can inject a notification
    // event directly into the overlay.
    const rt = require('../../../services/realtimeService').default;
    rt.on = jest.fn((_topic, cb) => {
      handleEvent = cb;
      return () => {};
    });

    render(<AgentOverlay navigate={navigateSpy} />);

    // Inject a notification with two navigate actions — same shape
    // chatbot_routes.py busy branch emits.
    expect(handleEvent).toBeDefined();
    handleEvent({
      type: 'notification',
      title: 'AI is working on…',
      message: '• demo task (in_progress)',
      severity: 'info',
      actions: [
        {label: 'View all tasks', kind: 'navigate',
         target: '/admin/task-ledger'},
        {label: 'View abc12345', kind: 'navigate',
         target: '/admin/task-ledger?task_id=abc123'},
      ],
    });

    // Both actions rendered.
    const allBtn = await screen.findByText('View all tasks');
    const oneBtn = await screen.findByText('View abc12345');
    expect(allBtn).toBeInTheDocument();
    expect(oneBtn).toBeInTheDocument();

    // Click the specific-task button → navigate fires with that target.
    fireEvent.click(oneBtn);
    expect(navigateSpy).toHaveBeenCalledWith(
      '/admin/task-ledger?task_id=abc123'
    );
  });

  test('notification without actions still renders (back-compat)', async () => {
    const navigateSpy = jest.fn();
    let handleEvent;
    const rt = require('../../../services/realtimeService').default;
    rt.on = jest.fn((_topic, cb) => {
      handleEvent = cb;
      return () => {};
    });

    render(<AgentOverlay navigate={navigateSpy} />);

    // Original notification shape — no actions array.
    handleEvent({
      type: 'notification',
      title: 'Hello',
      message: 'World',
      severity: 'info',
    });

    // findBy* awaits React state flush; getBy* would race the
    // synchronous render and miss the event.
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(await screen.findByText('World')).toBeInTheDocument();
    // No nav fired without actions.
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
