/* eslint-disable */
import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';

jest.mock('../../utils/logger', () => ({
  logger: {log: jest.fn(), warn: jest.fn(), error: jest.fn()},
}));

import ThinkingProcessContainer from '../../pages/chat/ThinkingProcessContainer';

const defaultProps = {
  thinkingMessages: [],
  onToggleMain: jest.fn(),
  onToggleIndividual: jest.fn(),
  isMainExpanded: false,
  isContainerCompleted: false,
};

function renderThinking(overrides = {}) {
  return render(
    <ThinkingProcessContainer {...defaultProps} {...overrides} />
  );
}

describe('ThinkingProcessContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Basic rendering ──────────────────────────────────────────────────────

  it('renders without crashing', () => {
    const {container} = renderThinking();
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('shows "Thought process" text when not completed', () => {
    renderThinking();
    expect(screen.getByText('Thought process')).toBeInTheDocument();
  });

  // ── Completed state ──────────────────────────────────────────────────────

  it('shows "Thought process (completed)" when isContainerCompleted is true', () => {
    renderThinking({isContainerCompleted: true});
    expect(screen.getByText('Thought process (completed)')).toBeInTheDocument();
  });

  it('shows green checkmark icon when completed', () => {
    const {container} = renderThinking({isContainerCompleted: true});
    const checkCircle = container.querySelector('.bg-green-500');
    expect(checkCircle).toBeInTheDocument();
  });

  it('shows pulsing dots when not completed', () => {
    const {container} = renderThinking({isContainerCompleted: false});
    const dots = container.querySelectorAll('.animate-pulse');
    expect(dots.length).toBeGreaterThanOrEqual(3);
  });

  it('marks completed when all individual steps are completed', () => {
    renderThinking({
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 's1', content: 'Step 1 text', isCompleted: true, isExpanded: false},
        {id: 's2', content: 'Step 2 text', isCompleted: true, isExpanded: false},
      ],
    });
    expect(screen.getByText('Thought process (completed)')).toBeInTheDocument();
  });

  // ── Expand/collapse main ─────────────────────────────────────────────────

  it('calls onToggleMain when header button is clicked', () => {
    const onToggleMain = jest.fn();
    renderThinking({onToggleMain});
    fireEvent.click(screen.getByText('Thought process').closest('button'));
    expect(onToggleMain).toHaveBeenCalledTimes(1);
  });

  it('does not show step content when main is collapsed', () => {
    renderThinking({
      isMainExpanded: false,
      thinkingMessages: [
        {id: 's1', content: 'Hidden step', isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.queryByText('Thinking in progress...')).not.toBeInTheDocument();
  });

  it('shows expanded content when isMainExpanded is true', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 's1', content: 'Step content', isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.getByText('Thinking in progress...')).toBeInTheDocument();
  });

  it('shows "Thinking completed" banner when expanded and completed', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'Done step', isCompleted: true, isExpanded: false},
      ],
    });
    // The text includes a checkmark character
    expect(screen.getByText(/Thinking completed/)).toBeInTheDocument();
  });

  // ── Thinking steps rendering ─────────────────────────────────────────────

  it('renders individual step labels', () => {
    renderThinking({
      isMainExpanded: true,
      thinkingMessages: [
        {id: 's1', content: 'First', isCompleted: false, isExpanded: false},
        {id: 's2', content: 'Second', isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('shows step content preview in collapsed step', () => {
    renderThinking({
      isMainExpanded: true,
      thinkingMessages: [
        {id: 's1', content: 'Short preview text here', isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.getByText('Short preview text here')).toBeInTheDocument();
  });

  it('truncates long content preview with ellipsis', () => {
    const longContent = 'A'.repeat(60);
    renderThinking({
      isMainExpanded: true,
      thinkingMessages: [
        {id: 's1', content: longContent, isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.getByText(longContent.slice(0, 50) + '...')).toBeInTheDocument();
  });

  it('shows full step content when step is expanded', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'Full step content here', isCompleted: true, isExpanded: true},
      ],
    });
    // The content should be visible in the expanded area
    const contentDivs = screen.getAllByText('Full step content here');
    expect(contentDivs.length).toBeGreaterThan(0);
  });

  // ── Individual step toggle ───────────────────────────────────────────────

  it('calls onToggleIndividual when step header is clicked', () => {
    const onToggleIndividual = jest.fn();
    renderThinking({
      isMainExpanded: true,
      onToggleIndividual,
      thinkingMessages: [
        {id: 'step-1', content: 'Some content', isCompleted: false, isExpanded: false},
      ],
    });
    fireEvent.click(screen.getByText('Step 1').closest('button'));
    expect(onToggleIndividual).toHaveBeenCalledWith('step-1');
  });

  // ── Duration display ─────────────────────────────────────────────────────

  it('formats duration in milliseconds when < 1 second', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'Fast', isCompleted: true, isExpanded: true, duration: 0.5},
      ],
    });
    expect(screen.getByText('Step duration: 500ms')).toBeInTheDocument();
  });

  it('formats duration in seconds when < 60 seconds', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'Medium', isCompleted: true, isExpanded: true, duration: 15.3},
      ],
    });
    expect(screen.getByText('Step duration: 15.3s')).toBeInTheDocument();
  });

  it('formats duration in minutes when >= 60 seconds', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'Long', isCompleted: true, isExpanded: true, duration: 90},
      ],
    });
    expect(screen.getByText('Step duration: 1m 30s')).toBeInTheDocument();
  });

  it('shows total thinking time when completed and expanded', () => {
    renderThinking({
      isMainExpanded: true,
      isContainerCompleted: true,
      thinkingMessages: [
        {id: 's1', content: 'A', isCompleted: true, isExpanded: false, duration: 5},
        {id: 's2', content: 'B', isCompleted: true, isExpanded: false, duration: 3},
      ],
    });
    expect(screen.getByText(/Total thinking time: 8\.0s/)).toBeInTheDocument();
  });

  // ── Live timer ───────────────────────────────────────────────────────────

  it('increments live time while thinking is in progress', () => {
    renderThinking({
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 's1', content: 'Working', isCompleted: false, isExpanded: false},
      ],
    });
    // Advance timer by 900ms (3 intervals of 300ms)
    act(() => {
      jest.advanceTimersByTime(900);
    });
    // Should show some live time value (0.9s would be rendered)
    expect(screen.getByText('900ms')).toBeInTheDocument();
  });

  it('stops live timer when completed', () => {
    const {rerender} = renderThinking({
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 's1', content: 'Working', isCompleted: false, isExpanded: false},
      ],
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Re-render as completed
    rerender(
      <ThinkingProcessContainer
        {...defaultProps}
        isContainerCompleted={true}
        thinkingMessages={[
          {id: 's1', content: 'Done', isCompleted: true, isExpanded: false, duration: 2},
        ]}
      />
    );

    // Gather all elements showing 2.0s
    const matches = screen.getAllByText(/2\.0s/);
    expect(matches.length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // After more time elapses, the displayed duration should NOT have changed
    const matchesAfter = screen.getAllByText(/2\.0s/);
    expect(matchesAfter.length).toBe(matches.length);
  });

  // ── Collapsed preview text ───────────────────────────────────────────────

  it('shows preview of latest step when collapsed and thinking', () => {
    renderThinking({
      isMainExpanded: false,
      isContainerCompleted: false,
      thinkingMessages: [
        {id: 's1', content: 'Analyzing the user request for context', isCompleted: false, isExpanded: false},
      ],
    });
    expect(screen.getByText('Analyzing the user request for context')).toBeInTheDocument();
  });

  it('shows truncated preview when latest step has long content', () => {
    renderThinking({
      isMainExpanded: false,
      isContainerCompleted: false,
      thinkingMessages: [
        {
          id: 's1',
          content: 'one two three four five six seven eight nine ten',
          isCompleted: false,
          isExpanded: false,
        },
      ],
    });
    expect(screen.getByText('one two three four five six...')).toBeInTheDocument();
  });

  // ── Rotate arrow on expand ───────────────────────────────────────────────

  it('has rotate-180 class on chevron when main is expanded', () => {
    const {container} = renderThinking({isMainExpanded: true, thinkingMessages: []});
    const rotated = container.querySelector('.rotate-180');
    expect(rotated).toBeInTheDocument();
  });

  it('does not have rotate-180 class when collapsed', () => {
    const {container} = renderThinking({isMainExpanded: false});
    // The transform div should exist but not be rotated
    const allTransform = container.querySelectorAll('.transform');
    const rotated = container.querySelector('.rotate-180');
    expect(rotated).toBeNull();
  });
});
