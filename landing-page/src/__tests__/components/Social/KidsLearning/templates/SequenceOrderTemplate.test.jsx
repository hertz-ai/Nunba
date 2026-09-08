import SequenceOrderTemplate from '../../../../../components/Social/KidsLearning/templates/SequenceOrderTemplate';
import {renderWithProviders} from '../../../../testHelpers';

import {screen, fireEvent} from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock(
  '../../../../../components/Social/KidsLearning/shared/SoundManager',
  () => ({
    GameSounds: {
      correct: jest.fn(),
      wrong: jest.fn(),
      tap: jest.fn(),
      complete: jest.fn(),
      streak: jest.fn(),
      intro: jest.fn(),
      countdownTick: jest.fn(),
      countdownEnd: jest.fn(),
      starEarned: jest.fn(),
      dragStart: jest.fn(),
      dragDrop: jest.fn(),
      cardFlip: jest.fn(),
      matchFound: jest.fn(),
      levelUp: jest.fn(),
      pop: jest.fn(),
      whoosh: jest.fn(),
      splash: jest.fn(),
      explosion: jest.fn(),
      gatePass: jest.fn(),
      enemyDefeat: jest.fn(),
      castleHit: jest.fn(),
      blockStack: jest.fn(),
      blockFall: jest.fn(),
      paintFill: jest.fn(),
      powerUp: jest.fn(),
      coinCollect: jest.fn(),
      speakText: jest.fn().mockResolvedValue(undefined),
      startBackgroundMusic: jest.fn(),
      stopBackgroundMusic: jest.fn(),
      stopTTS: jest.fn(),
      cleanup: jest.fn(),
      setMuted: jest.fn(),
      isMuted: jest.fn(() => false),
      warmUp: jest.fn().mockResolvedValue(undefined),
    },
    HapticPatterns: {},
    SoundEvents: {},
  })
);

jest.mock('../../../../../hooks/useAnimations', () => ({
  useReducedMotion: jest.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockConfig = {
  title: 'Put in Order',
  emoji: '\uD83D\uDD22',
  template: 'sequence-order',
  content: {
    sequences: [
      {items: ['First', 'Second', 'Third'], concept: 'Ordering'},
      {items: ['Morning', 'Afternoon', 'Evening'], concept: 'Time of Day'},
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SequenceOrderTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crash with valid config', () => {
    expect(() => {
      renderWithProviders(
        <SequenceOrderTemplate
          config={mockConfig}
          onAnswer={jest.fn()}
          onComplete={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  test('renders with empty config gracefully', () => {
    expect(() => {
      renderWithProviders(
        <SequenceOrderTemplate
          config={{}}
          onAnswer={jest.fn()}
          onComplete={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  test('renders with null config gracefully', () => {
    expect(() => {
      renderWithProviders(
        <SequenceOrderTemplate
          config={null}
          onAnswer={jest.fn()}
          onComplete={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  test('renders with undefined config gracefully', () => {
    expect(() => {
      renderWithProviders(
        <SequenceOrderTemplate
          config={undefined}
          onAnswer={jest.fn()}
          onComplete={jest.fn()}
        />
      );
    }).not.toThrow();
  });

  test('shows "No sequences available." for empty sequences', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={{content: {sequences: []}}}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('No sequences available.')).toBeInTheDocument();
  });

  test('displays concept label', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('Ordering')).toBeInTheDocument();
  });

  test('displays instruction text', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(
      screen.getByText('Put these in the correct order')
    ).toBeInTheDocument();
  });

  test('displays all sequence items', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  test('displays Check Order button', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('Check Order')).toBeInTheDocument();
  });

  test('displays score starting at 0', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    // Score is now shown via visual ProgressStars component (no text score).
    // Verify the sequence counter is rendered instead.
    expect(screen.getByText(/Sequence 1 of 2/)).toBeInTheDocument();
  });

  test('displays sequence counter', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText(/Sequence 1 of 2/)).toBeInTheDocument();
  });

  test('displays position numbers', () => {
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={jest.fn()}
        onComplete={jest.fn()}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // '3' is the text of position 3
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('calls onAnswer when Check Order is clicked', () => {
    const onAnswer = jest.fn();
    renderWithProviders(
      <SequenceOrderTemplate
        config={mockConfig}
        onAnswer={onAnswer}
        onComplete={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Check Order'));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(
      expect.any(Boolean),
      'Ordering',
      expect.any(Number)
    );
  });
  // -------------------------------------------------------------------------
  // A run where two cards carry the same value
  // -------------------------------------------------------------------------

  /**
   * The Fibonacci run in Number Patterns opens 1, 1, 2, so two cards read "1".
   * The check used to compare the index each card was DEALT from, which made
   * exactly one arrangement of that identical pair count; putting the other
   * "1" first marked the whole run wrong, with nothing on screen to tell the
   * two cards apart. It is judged on the value in each position now.
   */
  const fibConfig = {
    title: 'Number Patterns',
    template: 'sequence-order',
    content: {
      sequences: [{items: ['1', '1', '2'], concept: 'pattern:fibonacci-intro'}],
    },
  };

  /** The values currently on the board, in board order. */
  const boardValues = () =>
    screen
      .getAllByRole('listitem')
      .map((el) => el.getAttribute('aria-label').split(': ').slice(1).join(': '));

  test('accepts a run ordered correctly by value, whichever equal card leads', () => {
    // Both arrangements of the two identical "1" cards are played, each on a
    // fresh board. Asserting only one would pass or fail on how the deal
    // shuffled - which is exactly the coin-toss the fix removes.
    for (const swapEqualCards of [false, true]) {
      const onAnswer = jest.fn();
      const {unmount} = renderWithProviders(
        <SequenceOrderTemplate
          config={fibConfig}
          onAnswer={onAnswer}
          onComplete={jest.fn()}
        />
      );

      // Walk the "2" down to the last slot; the board then reads 1, 1, 2.
      for (let guard = 0; guard < 5; guard++) {
        const values = boardValues();
        const twoAt = values.indexOf('2');
        if (twoAt === values.length - 1) break;
        fireEvent.keyDown(screen.getAllByRole('listitem')[twoAt], {
          key: 'ArrowDown',
        });
      }

      // Swapping the two leading cards leaves the board reading the same
      // three values and puts the OTHER "1" first.
      if (swapEqualCards) {
        fireEvent.keyDown(screen.getAllByRole('listitem')[0], {
          key: 'ArrowDown',
        });
      }

      expect(boardValues()).toEqual(['1', '1', '2']);

      fireEvent.click(screen.getByText('Check Order'));

      expect(onAnswer).toHaveBeenCalledWith(
        true,
        'pattern:fibonacci-intro',
        expect.any(Number)
      );
      unmount();
    }
  });
});
