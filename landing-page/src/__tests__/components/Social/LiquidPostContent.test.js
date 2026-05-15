/* eslint-disable */
/**
 * LiquidPostContent — agentic-action dispatch contract.
 *
 * The component is a leaf renderer used inside ThoughtExperimentTracker
 * and similar feed surfaces.  When the user clicks an action inside
 * the server-rendered Liquid tree, LiquidPostContent dispatches a
 * `liquid:vote` / `liquid:poll_vote` / `liquid:quiz_answer` CustomEvent
 * on `window` so parent containers can react.
 *
 * This test pins the dispatch contract by invoking the internal
 * handleAction prop on SocialLiquidUI directly (it's spread into the
 * inner ServerDrivenUI as `onAction`).
 */

import React from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';

// Stub SocialLiquidUI to a jest.fn so test can read `onAction` from the
// mock's call history (Jest forbids capturing closures inside jest.mock
// factories — hence this Function-arg-recording pattern).
const mockSocialLiquidUi = jest.fn(() => null);
jest.mock('../../../components/shared/LiquidUI', () => ({
  __esModule: true,
  SocialLiquidUI: (props) => mockSocialLiquidUi(props),
  buildSocialTokens: () => ({}),
}));

// react-router-dom: keep MemoryRouter real, mock only useNavigate.
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => global.__navigateSpy,
  };
});
global.__navigateSpy = jest.fn();
const navigateSpy = global.__navigateSpy;

const getOnAction = () => {
  const lastCall = mockSocialLiquidUi.mock.calls.at(-1);
  return lastCall ? lastCall[0].onAction : null;
};

import LiquidPostContent from
  '../../../components/Social/Feed/LiquidPostContent';

const POST = {
  id: 'p-42',
  author: 'cypress',
  intent_category: 'community',
  hypothesis: 'h',
  expected_outcome: 'o',
  title: 't',
  content: 'c',
  dynamic_layout: {type: 'column', children: []},
};

describe('LiquidPostContent agentic action dispatch', () => {
  let dispatchSpy;
  beforeEach(() => {
    mockSocialLiquidUi.mockClear();
    navigateSpy.mockReset();
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    render(
      <MemoryRouter>
        <LiquidPostContent post={POST} />
      </MemoryRouter>
    );
  });
  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  test('vote → liquid:vote CustomEvent on window', () => {
    const onAction = getOnAction();
    expect(onAction).toBeInstanceOf(Function);
    onAction({type: 'vote', payload: {value: 1}});
    const evt = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find((e) => e.type === 'liquid:vote');
    expect(evt).toBeDefined();
    expect(evt.detail.postId).toBe('p-42');
    expect(evt.detail.value).toBe(1);
  });

  test('poll_vote → liquid:poll_vote CustomEvent', () => {
    getOnAction()({type: 'poll_vote', payload: {option: 'A'}});
    const evt = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find((e) => e.type === 'liquid:poll_vote');
    expect(evt).toBeDefined();
    expect(evt.detail.option).toBe('A');
  });

  test('quiz_answer → liquid:quiz_answer CustomEvent', () => {
    getOnAction()({type: 'quiz_answer', payload: {answer: 'B'}});
    const evt = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find((e) => e.type === 'liquid:quiz_answer');
    expect(evt).toBeDefined();
    expect(evt.detail.answer).toBe('B');
  });

  test('navigate with path → router navigate', () => {
    getOnAction()({type: 'navigate', payload: {path: '/social/foo'}});
    expect(navigateSpy).toHaveBeenCalledWith('/social/foo');
  });

  test('comment → navigate to post detail with #comments', () => {
    getOnAction()({type: 'comment'});
    expect(navigateSpy).toHaveBeenCalledWith('/social/post/p-42#comments');
  });

  test('challenge_accept without id → /social/challenges', () => {
    getOnAction()({type: 'challenge_accept'});
    expect(navigateSpy).toHaveBeenCalledWith('/social/challenges');
  });

  test('unknown action type is a no-op (no dispatch, no nav)', () => {
    const before = dispatchSpy.mock.calls.length;
    getOnAction()({type: 'made_up_kind'});
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(dispatchSpy.mock.calls.length).toBe(before);
  });
});
