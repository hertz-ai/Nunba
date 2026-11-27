/**
 * AgentPersonaLabel: "<agent name> · <persona>" in the chat header.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  The persona
 * is the one the open agent's newest reply named (HARTOS design_1125 B; the
 * page keeps it on each reply, utils/agentPersona).  It sits in the header
 * bar that stays above the conversation: the agent's big name over an empty
 * chat goes away with the first reply, which is when a persona is known.
 * Until a reply names one, nothing is shown, as before.
 */
import React from 'react';

import {newestPersona, withPersona} from '../../utils/agentPersona';

export default function AgentPersonaLabel({name, promptId, messages}) {
  const persona = newestPersona(messages, promptId);
  if (!persona) return null;
  const label = withPersona(name, persona);
  return (
    <span
      data-testid="agent-persona-label"
      className="mr-auto min-w-0 truncate text-sm font-medium"
      style={{color: 'rgba(255, 255, 255, 0.8)'}}
      title={label}
    >
      {label}
    </span>
  );
}
