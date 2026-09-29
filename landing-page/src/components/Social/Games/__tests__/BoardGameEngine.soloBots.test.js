/**
 * BoardGameEngine gives seat 1 an opponent through utils/gameAI.
 *
 * Replaces the source-text checks that lived in
 * src/__tests__/utils/gameAI.test.js ("BoardGameEngine.jsx solo-mode
 * wiring"). The engine is rendered for real; only boardgame.io's transport
 * (Local) and React client factory (Client) are mocked, so each test asserts
 * what the engine actually handed to boardgame.io.
 */
import {DIFFICULTY} from '../../../../utils/gameAI';
import BoardGameEngine, {BOARD_REGISTRY} from '../engines/BoardGameEngine';

import {render, screen} from '@testing-library/react';
import {MCTSBot, RandomBot} from 'boardgame.io/ai';
import {Local} from 'boardgame.io/multiplayer';
import {Client} from 'boardgame.io/react';
import React from 'react';


jest.mock('boardgame.io/multiplayer', () => ({Local: jest.fn()}));
jest.mock('boardgame.io/react', () => ({Client: jest.fn()}));

const entry = (boardType) => ({engine: 'boardgame', engine_config: {board_type: boardType}});

// Implementations are set per test: CRA's jest config has resetMocks on.
beforeEach(() => {
  Local.mockReset().mockImplementation(() => ({__transport: 'local'}));
  Client.mockReset().mockImplementation(() => function FakeBoardClient() {
    return null;
  });
});

function botsPassedToLocal() {
  expect(Local).toHaveBeenCalledTimes(1);
  const [opts] = Local.mock.calls[0];
  return opts === undefined ? null : opts.bots;
}

describe('BoardGameEngine solo opponent', () => {
  test.each([
    ['no multiplayer hook', undefined],
    ['a hook with no live session', {isMultiplayer: false}],
  ])('solo (%s): seat 1 is a bounded MCTS bot from gameAI', (_, multiplayer) => {
    render(<BoardGameEngine catalogEntry={entry('reversi')} multiplayer={multiplayer} />);

    const bots = botsPassedToLocal();
    expect(Object.keys(bots)).toEqual(['1']);
    const Bot = bots['1'];
    expect(Bot.prototype).toBeInstanceOf(MCTSBot);
    // Constructed the way boardgame.io's Local master does it.
    const bot = new Bot({game: BOARD_REGISTRY.reversi.game, enumerate: () => []});
    expect(bot.iterations).toBeLessThan(1000); // library default stalls the tab
    expect(bot.playoutDepth).toBeLessThan(50);
  });

  test('the client is built for the requested game with two seats', () => {
    render(<BoardGameEngine catalogEntry={entry('checkers')} />);
    expect(Client).toHaveBeenCalledTimes(1);
    const [opts] = Client.mock.calls[0];
    expect(opts.game).toBe(BOARD_REGISTRY.checkers.game);
    expect(opts.numPlayers).toBe(2);
    expect(opts.multiplayer).toEqual({__transport: 'local'});
  });

  test('easy difficulty plays random legal moves', () => {
    render(<BoardGameEngine catalogEntry={entry('tictactoe')} difficulty={DIFFICULTY.EASY} />);
    expect(botsPassedToLocal()['1']).toBe(RandomBot);
  });

  test('hard difficulty thinks longer than medium', () => {
    const iterationsFor = (difficulty) => {
      Local.mockClear();
      const {unmount} = render(
        <BoardGameEngine catalogEntry={entry('connect4')} difficulty={difficulty} />,
      );
      const Bot = botsPassedToLocal()['1'];
      unmount();
      return new Bot({game: BOARD_REGISTRY.connect4.game, enumerate: () => []}).iterations;
    };
    expect(iterationsFor(DIFFICULTY.HARD)).toBeGreaterThan(iterationsFor(DIFFICULTY.MEDIUM));
  });

  test('difficulty is locked at mount: a new prop does not rebuild the game', () => {
    const {rerender} = render(
      <BoardGameEngine catalogEntry={entry('mancala')} difficulty={DIFFICULTY.EASY} />,
    );
    rerender(<BoardGameEngine catalogEntry={entry('mancala')} difficulty={DIFFICULTY.HARD} />);
    expect(Client).toHaveBeenCalledTimes(1);
    expect(botsPassedToLocal()['1']).toBe(RandomBot);
  });

  test('hotseat keeps both seats human', () => {
    render(<BoardGameEngine catalogEntry={entry('reversi')} soloMode="hotseat" />);
    expect(botsPassedToLocal()).toBeNull();
  });

  test('a live multiplayer session gets no bot', () => {
    render(
      <BoardGameEngine catalogEntry={entry('reversi')} multiplayer={{isMultiplayer: true}} />,
    );
    expect(botsPassedToLocal()).toBeNull();
  });

  test('an unknown board type builds no client', () => {
    render(<BoardGameEngine catalogEntry={entry('go')} />);
    expect(screen.getByText(/not yet available/i)).toBeTruthy();
    expect(Local).not.toHaveBeenCalled();
  });
});
