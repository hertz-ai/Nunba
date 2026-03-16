/**
 * useCelebration hook
 *
 * Encapsulates celebration overlay + progress stars state for any game template.
 * Call triggerCorrect() on right answers, triggerStreak(count) on streaks,
 * and triggerComplete(score, total) when the game ends.
 *
 * Returns state for both CelebrationOverlay and ProgressStars components.
 */
import {useState, useCallback} from 'react';

export default function useCelebration() {
  const [celebType, setCelebType] = useState(null);
  const [celebVisible, setCelebVisible] = useState(false);
  const [celebStreak, setCelebStreak] = useState(0);
  const [celebScore, setCelebScore] = useState(null);
  const [starsEarned, setStarsEarned] = useState(0);

  const triggerCorrect = useCallback(() => {
    setCelebType('correct');
    setCelebVisible(true);
  }, []);

  const triggerStreak = useCallback((count) => {
    setCelebType('streak');
    setCelebStreak(count);
    setCelebVisible(true);
  }, []);

  const triggerComplete = useCallback((score, total) => {
    const pct = total > 0 ? score / total : 0;
    const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    setStarsEarned(stars);
    setCelebScore({correct: score, total});
    setCelebType(pct >= 0.9 ? 'perfect' : 'complete');
    setCelebVisible(true);
  }, []);

  const handleCelebDone = useCallback(() => setCelebVisible(false), []);

  return {
    celebType,
    celebVisible,
    celebStreak,
    celebScore,
    starsEarned,
    triggerCorrect,
    triggerStreak,
    triggerComplete,
    handleCelebDone,
  };
}
