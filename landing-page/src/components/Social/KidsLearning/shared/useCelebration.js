/**
 * useCelebration hook
 *
 * Encapsulates celebration state for any game template.
 * Call triggerCorrect() on right answers, triggerWrong() on wrong,
 * triggerStreak(count) on streaks, triggerComplete(score, total) when done.
 *
 * Returns state for InlineCelebration (within game area, per-interaction)
 * or legacy CelebrationOverlay (full-screen). Templates should use
 * InlineCelebration for voice games, CelebrationOverlay for touch games.
 */
import {useState, useCallback} from 'react';

export default function useCelebration() {
  const [celebType, setCelebType] = useState(null);
  const [celebVisible, setCelebVisible] = useState(false);
  const [celebStreak, setCelebStreak] = useState(0);
  const [celebScore, setCelebScore] = useState(null);
  const [starsEarned, setStarsEarned] = useState(0);
  const [celebPosition, setCelebPosition] = useState(null);

  const triggerCorrect = useCallback((position) => {
    setCelebType('correct');
    setCelebPosition(position || null);
    setCelebVisible(true);
  }, []);

  const triggerWrong = useCallback((position) => {
    setCelebType('wrong');
    setCelebPosition(position || null);
    setCelebVisible(true);
  }, []);

  const triggerStreak = useCallback((count, position) => {
    setCelebType('streak');
    setCelebStreak(count);
    setCelebPosition(position || null);
    setCelebVisible(true);
  }, []);

  const triggerComplete = useCallback((score, total) => {
    const pct = total > 0 ? score / total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    setStarsEarned(stars);
    setCelebScore({correct: score, total});
    setCelebType(pct >= 0.9 ? 'perfect' : 'complete');
    setCelebPosition(null); // complete is always centered
    setCelebVisible(true);
  }, []);

  const handleCelebDone = useCallback(() => setCelebVisible(false), []);

  return {
    celebType,
    celebVisible,
    celebStreak,
    celebScore,
    celebPosition,
    starsEarned,
    triggerCorrect,
    triggerWrong,
    triggerStreak,
    triggerComplete,
    handleCelebDone,
  };
}
