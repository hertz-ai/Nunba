/**
 * Interactive Games - 100 game configurations for Kids Learning Zone.
 *
 * Games span 25 templates (15 DOM-based + 10 canvas-based) across
 * 5 categories: math, english, life-skills, science, creativity.
 *
 * Each batch contains 25 games with full educational content.
 */

import GAMES_BATCH_1 from './_games_batch1';
import GAMES_BATCH_2 from './_games_batch2';
import GAMES_BATCH_3 from './_games_batch3';
import GAMES_BATCH_4 from './_games_batch4';

const INTERACTIVE_GAMES = [
  ...GAMES_BATCH_1,
  ...GAMES_BATCH_2,
  ...GAMES_BATCH_3,
  ...GAMES_BATCH_4,
];

export default INTERACTIVE_GAMES;
