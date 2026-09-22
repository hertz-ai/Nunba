import realtimeService from '../../services/realtimeService';
import {useToast} from '../shared/ToastProvider';

import {useEffect} from 'react';

/**
 * An owned agent's direct message, shown to the person it was sent to.
 *
 * This repo ships BOTH halves of a path that did not connect. `routes/
 * chatbot_routes.agent_contact_request` delivers an OWNED agent's message
 * straight through (`creator_user_id == target_user_id`, so no consent step) by
 * calling `on_notification` with `type: 'agent_message'`, and the payload carries
 * `agent_name`, `message`, `reason` and `request_id`.
 *
 * App.js received that event and wrote the payload to
 * `localStorage['agent_proactive_message']` with the comment "so Agent component
 * picks it up". Nothing in landing-page/src ever read that key, so the message
 * reached the browser and stopped there. (`active_agent_id`, written on the same
 * line, IS read by the chat UI for agent selection and stays put; only the
 * message body had no reader.)
 *
 * Why a component of its own: `App` RENDERS `ToastProvider`, so it cannot call
 * `useToast` itself. This has to sit inside the provider. It renders nothing.
 *
 * Ported from the hevolve SPA, which had the identical dead write.
 */
export default function AgentMessageToast() {
  // Destructure rather than holding the context object: ToastProvider passes a
  // fresh `value={{showToast, dismissToast}}` literal on every render, and it
  // re-renders on every toast, so depending on the object would tear down and
  // resubscribe each time. `showToast` is a useCallback([]) and is stable.
  const {showToast} = useToast() || {};

  useEffect(() => {
    if (!showToast) return undefined;
    return realtimeService.on('agent_message', (data) => {
      if (!data?.agent_id) return;
      // `reason` is the fallback the sender fills when it has no message body.
      const message = data.message || data.reason;
      if (!message) return;
      showToast('mention', {
        title: data.agent_name || 'Your agent',
        message,
      });
    });
  }, [showToast]);

  return null;
}
