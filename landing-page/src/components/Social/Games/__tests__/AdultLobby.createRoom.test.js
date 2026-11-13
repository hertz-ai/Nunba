/**
 * AdultLobby: "Create Room" creates a room with the default size.
 *
 * The button was wired as onClick={createSession}, so React passed the
 * click event as createSession's first parameter, maxPlayers.  It went into
 * the request body as max_players, axios could not serialise the event (DOM
 * references), the call threw before any request left, and the lobby showed
 * "Could not create game session".  Found through
 * cypress/e2e/multiplayer-lobby.cy.js on 2026-11-06: no POST /games was
 * ever sent.
 */

import AdultLobby from '../AdultLobby';

import {fireEvent, render, screen} from '@testing-library/react';
import React from 'react';

test('Create Room calls createSession without the click event', () => {
  const createSession = jest.fn();
  render(
    <AdultLobby
      gameTitle="General Knowledge"
      onStartSolo={jest.fn()}
      multiplayer={{
        status: 'idle',
        createSession,
        joinSession: jest.fn(),
        quickMatch: jest.fn(),
        participants: [],
      }}
    />
  );

  fireEvent.click(screen.getByRole('button', {name: /create room/i}));

  expect(createSession).toHaveBeenCalledTimes(1);
  // No argument: createSession(maxPlayers = 4) keeps its default.  (The
  // count, not the arguments: a diff of a click event's DOM references
  // crashed Jest's printer.)
  expect(createSession.mock.calls[0].length).toBe(0);
});
