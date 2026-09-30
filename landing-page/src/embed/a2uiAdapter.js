/**
 * a2uiAdapter — normalise an agent_ui_update payload and route it.
 *
 * routeFragment() is the web port of AgentOverlayBridge.handleAgentUIUpdate
 * (Hevolve_React_Native).  The routing SETS live in
 * constants/liquidFragments.js; this file only applies them, so the embed,
 * the RN app and any future web surface route one way.
 *
 * Payload shapes seen for the same fragment (nunba_liquid §1B):
 *   flat     {type:'approval', agent_id, msg_id, ...props}
 *   wrapped  {agent_id, msg_id, component:{type, ...props}}   (emit_event)
 *   chat     chat_response.ui_components[i]                     (HTTP path)
 * Which one reaches the browser from LiquidUIService is not measured, so
 * both are accepted.
 */

import {
  FRAGMENT_MODE, fragmentMode, getComponentSummary,
} from '../constants/liquidFragments';

let _seq = 0;

/** One canonical fragment shape: {type, _agent_id, _ts, _fid, ...props}. */
export function normalizeFragment(payload, fallbackAgentId) {
  if (!payload || typeof payload !== 'object') return null;
  let p = payload;
  if (p.component && typeof p.component === 'object') {
    p = {
      ...p.component,
      agent_id: p.component.agent_id || p.agent_id,
      agent_name: p.component.agent_name || p.agent_name,
      msg_id: p.component.msg_id || p.msg_id,
    };
  }
  const type = p.type && p.type !== 'agent.ui.update'
    ? p.type
    : (p.component_type || 'notification');
  const agentId = p._agent_id || p.agent_id || fallbackAgentId || 'agent';
  const fid = p._fid || p.msg_id || `f${Date.now().toString(36)}_${++_seq}`;
  return {
    ...p,
    type,
    _agent_id: agentId,
    _ts: p._ts || Date.now() / 1000,
    _fid: fid,
    // AgentOverlay suppresses a second card with the same msg_id.
    msg_id: p.msg_id || fid,
  };
}

/**
 * Route a fragment exactly as AgentOverlayBridge does.
 *
 * @param {object} component normalised fragment
 * @param {{navigate:Function, floating:Function, inline:Function}} sinks
 * @returns {string} the FRAGMENT_MODE it was routed as
 */
export function routeFragment(component, sinks) {
  const c = component;
  const mode = fragmentMode(c.type);
  if (mode === FRAGMENT_MODE.NAVIGATE) {
    sinks.navigate({
      target: c.target || '',
      params: c.params || {},
      transition: c.transition || 'default',
      title: c.title || c.target || '',
      _agent_id: c._agent_id,
      _ts: c._ts,
    });
    sinks.floating({
      type: 'notification',
      title: c.agent_name || c._agent_id,
      message: 'Navigating to ' + (c.title || c.target || '...'),
      severity: 'info',
      _ts: c._ts,
      _fid: `${c._fid}:nav`,
      msg_id: `${c._fid}:nav`,
      _summaryOf: c._fid,
    });
  } else if (mode === FRAGMENT_MODE.INLINE) {
    sinks.inline(c);
    sinks.floating({
      type: 'notification',
      title: c.agent_name || c._agent_id,
      message: getComponentSummary(c),
      severity: 'info',
      _ts: c._ts,
      _fid: `${c._fid}:summary`,
      msg_id: `${c._fid}:summary`,
      _summaryOf: c._fid,
    });
  } else {
    sinks.floating(c);
  }
  return mode;
}

/** chat_response.ui_components -> normalised fragments (processChatResponseUI). */
export function fragmentsFromChatResponse(res) {
  if (!res || !Array.isArray(res.ui_components)) return [];
  const agentId = res.agent_id || res.source || 'local';
  return res.ui_components
    .filter((c) => c && c.type)
    .map((c) => normalizeFragment(c, agentId));
}
