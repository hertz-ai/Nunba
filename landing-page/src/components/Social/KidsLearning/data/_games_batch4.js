/**
 * Kids Learning Zone - Game Batch 4 (Games 76-100)
 *
 * 25 canvas-based interactive game configurations covering:
 *   - flappy-learner (1 game)
 *   - runner-dodge (4 games)
 *   - math-castle (4 games)
 *   - letter-trace-canvas (4 games)
 *   - paint-by-concept (4 games)
 *   - builder (4 games)
 *   - word-maze (4 games)
 *
 * Categories: math, english, life-skills, science, creativity
 */

const GAMES_BATCH_4 = [
  // ============================================================================
  // 76. Flappy Elements (flappy-learner + science)
  // ============================================================================
  {
    id: 'int-flappy-learner-science-elements-76',
    title: 'Flappy Elements',
    description:
      'Fly through the correct element gates to learn about chemistry and states of matter.',
    category: 'science',
    subcategory: 'chemistry',
    template: 'flappy-learner',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\u2697\uFE0F',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which is a gas at room temp?',
          options: ['Oxygen', 'Iron'],
          correctIndex: 0,
          concept: 'States of Matter',
        },
        {
          question: 'Which helps plants grow?',
          options: ['Sunlight', 'Darkness'],
          correctIndex: 0,
          concept: 'Photosynthesis',
        },
        {
          question: 'Which is a liquid metal?',
          options: ['Mercury', 'Gold'],
          correctIndex: 0,
          concept: 'Metals',
        },
        {
          question: 'Which gas do we breathe out?',
          options: ['Carbon Dioxide', 'Nitrogen'],
          correctIndex: 0,
          concept: 'Respiration',
        },
        {
          question: 'Water is made of hydrogen and...?',
          options: ['Oxygen', 'Carbon'],
          correctIndex: 0,
          concept: 'Compounds',
        },
        {
          question: 'Which is lighter than air?',
          options: ['Helium', 'Lead'],
          correctIndex: 0,
          concept: 'Density',
        },
        {
          question: 'Which element makes bones strong?',
          options: ['Calcium', 'Neon'],
          correctIndex: 0,
          concept: 'Human Body',
        },
        {
          question: 'What gas do plants release?',
          options: ['Oxygen', 'Methane'],
          correctIndex: 0,
          concept: 'Photosynthesis',
        },
        {
          question: 'Which is a noble gas?',
          options: ['Argon', 'Chlorine'],
          correctIndex: 0,
          concept: 'Periodic Table',
        },
        {
          question: 'Which element is in pencils?',
          options: ['Carbon', 'Silver'],
          correctIndex: 0,
          concept: 'Elements',
        },
      ],
    },
  },

  // ============================================================================
  // 77. Number Runner (runner-dodge + math)
  // ============================================================================
  {
    id: 'int-runner-dodge-math-arithmetic-77',
    title: 'Number Runner',
    description:
      'Collect the correct answers and dodge the wrong ones while running through a math-filled world.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'runner-dodge',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83C\uDFC3',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: '7 + 5 = ?',
          options: ['12', '11', '13'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: '9 - 3 = ?',
          options: ['6', '5', '7'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
        {
          question: '4 + 8 = ?',
          options: ['12', '10', '14'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: '15 - 7 = ?',
          options: ['8', '9', '7'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
        {
          question: '6 + 6 = ?',
          options: ['12', '11', '13'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: '13 - 5 = ?',
          options: ['8', '7', '9'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
        {
          question: '9 + 4 = ?',
          options: ['13', '12', '14'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: '11 - 6 = ?',
          options: ['5', '6', '4'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
        {
          question: '8 + 7 = ?',
          options: ['15', '14', '16'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: '16 - 9 = ?',
          options: ['7', '8', '6'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
      ],
    },
  },

  // ============================================================================
  // 78. Spelling Runner (runner-dodge + english)
  // ============================================================================
  {
    id: 'int-runner-dodge-english-spelling-78',
    title: 'Spelling Runner',
    description:
      'Collect the correctly spelled words and dodge the misspelled ones as you race forward.',
    category: 'english',
    subcategory: 'spelling',
    template: 'runner-dodge',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDCDD',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Correct spelling?',
          options: ['Friend', 'Freind', 'Frend'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Because', 'Becuse', 'Becauz'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['School', 'Skool', 'Shool'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['People', 'Pepole', 'Peeple'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Enough', 'Enuf', 'Enugh'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Beautiful', 'Butiful', 'Beautful'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Together', 'Togeter', 'Togehter'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Different', 'Diffrent', 'Diferent'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Thought', 'Thot', 'Thougt'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Correct spelling?',
          options: ['Through', 'Thru', 'Throgh'],
          correctIndex: 0,
          concept: 'Spelling',
        },
      ],
    },
  },

  // ============================================================================
  // 79. Safety Runner (runner-dodge + life-skills)
  // ============================================================================
  {
    id: 'int-runner-dodge-life-skills-safety-79',
    title: 'Safety Runner',
    description:
      'Collect safe items and dodge dangerous hazards as you run through everyday scenes.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'runner-dodge',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83D\uDEE1\uFE0F',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which is safe to touch?',
          options: [
            '\uD83E\uDDF8 Teddy bear',
            '\uD83D\uDD25 Fire',
            '\u26A1 Wire',
          ],
          correctIndex: 0,
          concept: 'Safety',
        },
        {
          question: 'Which is safe to drink?',
          options: [
            '\uD83E\uDDC3 Water bottle',
            '\uD83E\uDDEA Chemical',
            '\uD83E\uDDF4 Bleach',
          ],
          correctIndex: 0,
          concept: 'Safety',
        },
        {
          question: 'Which is safe to play with?',
          options: [
            '\u26BD Soccer ball',
            '\uD83D\uDD2A Knife',
            '\uD83D\uDCA3 Firecracker',
          ],
          correctIndex: 0,
          concept: 'Safety',
        },
        {
          question: 'What should you wear on a bike?',
          options: [
            '\u26D1\uFE0F Helmet',
            '\uD83D\uDC51 Crown',
            '\uD83C\uDFA9 Top hat',
          ],
          correctIndex: 0,
          concept: 'Road Safety',
        },
        {
          question: 'Which is safe near water?',
          options: [
            '\uD83E\uDDCD Life jacket',
            '\uD83C\uDFCB\uFE0F Heavy weights',
            '\u26D3\uFE0F Chain',
          ],
          correctIndex: 0,
          concept: 'Water Safety',
        },
        {
          question: 'Fire alarm goes off. What do you do?',
          options: [
            '\uD83D\uDEAA Leave calmly',
            '\uD83D\uDECC Hide under bed',
            '\uD83D\uDCF1 Play games',
          ],
          correctIndex: 0,
          concept: 'Fire Safety',
        },
        {
          question: 'Which crossing is safest?',
          options: [
            '\uD83D\uDEB6 Crosswalk',
            '\uD83C\uDFCE\uFE0F Highway',
            '\uD83D\uDE82 Train tracks',
          ],
          correctIndex: 0,
          concept: 'Road Safety',
        },
        {
          question: 'Which snack is safe?',
          options: [
            '\uD83C\uDF4E Apple',
            '\uD83C\uDF3F Unknown berries',
            '\uD83D\uDC8A Strange pills',
          ],
          correctIndex: 0,
          concept: 'Food Safety',
        },
        {
          question: 'Who should you open the door for?',
          options: [
            '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Family',
            '\uD83E\uDDD1 Stranger',
            '\uD83D\uDC64 Unknown person',
          ],
          correctIndex: 0,
          concept: 'Home Safety',
        },
        {
          question: 'Thunder and lightning. Where is safest?',
          options: [
            '\uD83C\uDFE0 Inside house',
            '\uD83C\uDF33 Under a tree',
            '\uD83C\uDFD6\uFE0F Open field',
          ],
          correctIndex: 0,
          concept: 'Weather Safety',
        },
      ],
    },
  },

  // ============================================================================
  // 80. Food Chain Runner (runner-dodge + science)
  // ============================================================================
  {
    id: 'int-runner-dodge-science-foodchain-80',
    title: 'Food Chain Runner',
    description:
      'Collect what the animal eats and dodge its predators in this food chain adventure.',
    category: 'science',
    subcategory: 'biology',
    template: 'runner-dodge',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDC07',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Rabbit eats...',
          options: [
            '\uD83E\uDD55 Carrots',
            '\uD83E\uDD81 Lions',
            '\uD83E\uDD85 Eagles',
          ],
          correctIndex: 0,
          concept: 'Food Chain',
        },
        {
          question: 'Frog eats...',
          options: [
            '\uD83E\uDEB2 Insects',
            '\uD83D\uDC3B Bears',
            '\uD83E\uDD8A Foxes',
          ],
          correctIndex: 0,
          concept: 'Food Chain',
        },
        {
          question: 'Cow eats...',
          options: [
            '\uD83C\uDF3F Grass',
            '\uD83D\uDC14 Chickens',
            '\uD83D\uDC1F Fish',
          ],
          correctIndex: 0,
          concept: 'Herbivores',
        },
        {
          question: 'Owl eats...',
          options: [
            '\uD83D\uDC01 Mice',
            '\uD83D\uDC18 Elephants',
            '\uD83D\uDC04 Cows',
          ],
          correctIndex: 0,
          concept: 'Food Chain',
        },
        {
          question: 'Caterpillar eats...',
          options: [
            '\uD83C\uDF43 Leaves',
            '\uD83D\uDC0D Snakes',
            '\uD83E\uDD89 Owls',
          ],
          correctIndex: 0,
          concept: 'Herbivores',
        },
        {
          question: 'Shark eats...',
          options: [
            '\uD83D\uDC1F Fish',
            '\uD83C\uDF33 Trees',
            '\uD83C\uDF3E Wheat',
          ],
          correctIndex: 0,
          concept: 'Predators',
        },
        {
          question: 'Bee collects...',
          options: [
            '\uD83C\uDF3B Nectar',
            '\uD83E\uDD69 Meat',
            '\uD83E\uDDC0 Cheese',
          ],
          correctIndex: 0,
          concept: 'Pollinators',
        },
        {
          question: 'Squirrel eats...',
          options: [
            '\uD83C\uDF30 Acorns',
            '\uD83D\uDC0D Snakes',
            '\uD83E\uDD88 Sharks',
          ],
          correctIndex: 0,
          concept: 'Food Chain',
        },
        {
          question: 'Spider catches...',
          options: [
            '\uD83E\uDEB0 Flies',
            '\uD83D\uDC22 Turtles',
            '\uD83E\uDD8B Deer',
          ],
          correctIndex: 0,
          concept: 'Predators',
        },
        {
          question: 'Penguin eats...',
          options: [
            '\uD83D\uDC1F Fish',
            '\uD83C\uDF4E Apples',
            '\uD83C\uDF3D Corn',
          ],
          correctIndex: 0,
          concept: 'Food Chain',
        },
      ],
    },
  },

  // ============================================================================
  // 81. Addition Castle (math-castle + math)
  // ============================================================================
  {
    id: 'int-math-castle-math-addition-81',
    title: 'Addition Castle',
    description:
      'Defend your castle by solving addition problems before enemies reach the walls.',
    category: 'math',
    subcategory: 'addition',
    template: 'math-castle',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83C\uDFF0',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      waves: [
        {
          enemies: [
            {
              question: '3 + 4 = ?',
              options: ['6', '7', '8', '9'],
              correctIndex: 1,
              health: 1,
              speed: 1,
              concept: 'Addition',
            },
            {
              question: '5 + 6 = ?',
              options: ['10', '11', '12', '13'],
              correctIndex: 1,
              health: 1,
              speed: 1,
              concept: 'Addition',
            },
          ],
        },
        {
          enemies: [
            {
              question: '8 + 7 = ?',
              options: ['13', '14', '15', '16'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Addition',
            },
            {
              question: '9 + 6 = ?',
              options: ['13', '14', '15', '16'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Addition',
            },
          ],
        },
        {
          enemies: [
            {
              question: '7 + 7 = ?',
              options: ['12', '13', '14', '15'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Addition',
            },
            {
              question: '6 + 9 = ?',
              options: ['14', '15', '16', '17'],
              correctIndex: 1,
              health: 1,
              speed: 1.5,
              concept: 'Addition',
            },
            {
              question: '5 + 8 = ?',
              options: ['11', '12', '13', '14'],
              correctIndex: 2,
              health: 1,
              speed: 2,
              concept: 'Addition',
            },
          ],
        },
        {
          enemies: [
            {
              question: '8 + 8 = ?',
              options: ['14', '15', '16', '17'],
              correctIndex: 2,
              health: 1,
              speed: 2,
              concept: 'Addition',
            },
            {
              question: '9 + 9 = ?',
              options: ['16', '17', '18', '19'],
              correctIndex: 2,
              health: 1,
              speed: 2,
              concept: 'Addition',
            },
            {
              question: '7 + 6 = ?',
              options: ['11', '12', '13', '14'],
              correctIndex: 2,
              health: 1,
              speed: 2,
              concept: 'Addition',
            },
          ],
        },
      ],
    },
  },

  // ============================================================================
  // 82. Multiplication Castle (math-castle + math)
  // ============================================================================
  {
    id: 'int-math-castle-math-multiplication-82',
    title: 'Multiplication Castle',
    description:
      'Defend your castle with multiplication mastery against increasingly fast enemies.',
    category: 'math',
    subcategory: 'multiplication',
    template: 'math-castle',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\u2694\uFE0F',
    estimatedMinutes: 7,
    questionsPerSession: 12,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      waves: [
        {
          enemies: [
            {
              question: '6 \u00D7 7 = ?',
              options: ['40', '42', '44', '48'],
              correctIndex: 1,
              health: 2,
              speed: 1,
              concept: 'Multiplication',
            },
            {
              question: '8 \u00D7 9 = ?',
              options: ['72', '64', '81', '56'],
              correctIndex: 0,
              health: 2,
              speed: 1,
              concept: 'Multiplication',
            },
          ],
        },
        {
          enemies: [
            {
              question: '7 \u00D7 8 = ?',
              options: ['54', '56', '58', '64'],
              correctIndex: 1,
              health: 2,
              speed: 1.2,
              concept: 'Multiplication',
            },
            {
              question: '9 \u00D7 7 = ?',
              options: ['56', '63', '72', '81'],
              correctIndex: 1,
              health: 2,
              speed: 1.2,
              concept: 'Multiplication',
            },
            {
              question: '6 \u00D7 8 = ?',
              options: ['42', '46', '48', '54'],
              correctIndex: 2,
              health: 2,
              speed: 1.2,
              concept: 'Multiplication',
            },
          ],
        },
        {
          enemies: [
            {
              question: '12 \u00D7 4 = ?',
              options: ['44', '46', '48', '52'],
              correctIndex: 2,
              health: 2,
              speed: 1.5,
              concept: 'Multiplication',
            },
            {
              question: '11 \u00D7 6 = ?',
              options: ['60', '66', '72', '77'],
              correctIndex: 1,
              health: 2,
              speed: 1.5,
              concept: 'Multiplication',
            },
            {
              question: '7 \u00D7 9 = ?',
              options: ['56', '63', '72', '81'],
              correctIndex: 1,
              health: 2,
              speed: 1.5,
              concept: 'Multiplication',
            },
          ],
        },
        {
          enemies: [
            {
              question: '8 \u00D7 8 = ?',
              options: ['56', '64', '72', '80'],
              correctIndex: 1,
              health: 3,
              speed: 1.8,
              concept: 'Multiplication',
            },
            {
              question: '12 \u00D7 7 = ?',
              options: ['72', '77', '84', '91'],
              correctIndex: 2,
              health: 3,
              speed: 1.8,
              concept: 'Multiplication',
            },
          ],
        },
        {
          enemies: [
            {
              question: '9 \u00D7 9 = ?',
              options: ['72', '81', '90', '99'],
              correctIndex: 1,
              health: 3,
              speed: 2,
              concept: 'Multiplication',
            },
            {
              question: '12 \u00D7 12 = ?',
              options: ['132', '140', '144', '148'],
              correctIndex: 2,
              health: 3,
              speed: 2,
              concept: 'Multiplication',
            },
            {
              question: '11 \u00D7 11 = ?',
              options: ['111', '121', '131', '141'],
              correctIndex: 1,
              health: 3,
              speed: 2,
              concept: 'Multiplication',
            },
          ],
        },
      ],
    },
  },

  // ============================================================================
  // 83. Science Castle (math-castle + science)
  // ============================================================================
  {
    id: 'int-math-castle-science-general-83',
    title: 'Science Castle',
    description:
      'Defend your castle with science knowledge covering temperature, photosynthesis, and more.',
    category: 'science',
    subcategory: 'general science',
    template: 'math-castle',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83D\uDD2C',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      waves: [
        {
          enemies: [
            {
              question: 'Water freezes at?',
              options: ['0\u00B0C', '50\u00B0C', '100\u00B0C', '-50\u00B0C'],
              correctIndex: 0,
              health: 1,
              speed: 1,
              concept: 'Temperature',
            },
            {
              question: 'Plants need ___ to make food',
              options: ['Darkness', 'Sunlight', 'Noise', 'Wind'],
              correctIndex: 1,
              health: 1,
              speed: 1,
              concept: 'Photosynthesis',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'How many legs does an insect have?',
              options: ['4', '6', '8', '10'],
              correctIndex: 1,
              health: 1,
              speed: 1.2,
              concept: 'Insects',
            },
            {
              question: 'What force pulls things down?',
              options: ['Magnetism', 'Gravity', 'Friction', 'Wind'],
              correctIndex: 1,
              health: 1,
              speed: 1.2,
              concept: 'Forces',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'Water boils at?',
              options: ['50\u00B0C', '75\u00B0C', '100\u00B0C', '200\u00B0C'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Temperature',
            },
            {
              question: 'The Earth revolves around the...',
              options: ['Moon', 'Sun', 'Mars', 'Stars'],
              correctIndex: 1,
              health: 1,
              speed: 1.5,
              concept: 'Solar System',
            },
            {
              question: 'Sound travels through...',
              options: ['Vacuum', 'Air', 'Nothing', 'Light'],
              correctIndex: 1,
              health: 1,
              speed: 1.5,
              concept: 'Sound',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'Largest organ of the body?',
              options: ['Heart', 'Brain', 'Skin', 'Liver'],
              correctIndex: 2,
              health: 2,
              speed: 1.5,
              concept: 'Human Body',
            },
            {
              question: 'Which planet is closest to the Sun?',
              options: ['Venus', 'Mercury', 'Earth', 'Mars'],
              correctIndex: 1,
              health: 2,
              speed: 1.5,
              concept: 'Solar System',
            },
            {
              question: 'What gas do fish breathe from water?',
              options: ['Nitrogen', 'Oxygen', 'Helium', 'Carbon'],
              correctIndex: 1,
              health: 2,
              speed: 1.5,
              concept: 'Respiration',
            },
          ],
        },
      ],
    },
  },

  // ============================================================================
  // 84. Music Castle (math-castle + creativity)
  // ============================================================================
  {
    id: 'int-math-castle-creativity-music-84',
    title: 'Music Castle',
    description:
      'Defend your castle with music theory knowledge - notes, instruments, and rhythm.',
    category: 'creativity',
    subcategory: 'music',
    template: 'math-castle',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83C\uDFB5',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      waves: [
        {
          enemies: [
            {
              question: 'How many notes in a scale?',
              options: ['5', '6', '7', '8'],
              correctIndex: 2,
              health: 1,
              speed: 1,
              concept: 'Music Theory',
            },
            {
              question: 'Which is a string instrument?',
              options: ['Drum', 'Guitar', 'Flute', 'Trumpet'],
              correctIndex: 1,
              health: 1,
              speed: 1,
              concept: 'Instruments',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'A piano has black and ___ keys',
              options: ['Red', 'Blue', 'White', 'Green'],
              correctIndex: 2,
              health: 1,
              speed: 1.2,
              concept: 'Instruments',
            },
            {
              question: 'Which instrument do you blow into?',
              options: ['Violin', 'Drum', 'Flute', 'Harp'],
              correctIndex: 2,
              health: 1,
              speed: 1.2,
              concept: 'Instruments',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'How many lines on a music staff?',
              options: ['3', '4', '5', '6'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Music Theory',
            },
            {
              question: 'What does "forte" mean?',
              options: ['Soft', 'Slow', 'Loud', 'Fast'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Music Theory',
            },
            {
              question: 'Which is a percussion instrument?',
              options: ['Violin', 'Flute', 'Drums', 'Cello'],
              correctIndex: 2,
              health: 1,
              speed: 1.5,
              concept: 'Instruments',
            },
          ],
        },
        {
          enemies: [
            {
              question: 'A duet is played by how many people?',
              options: ['1', '2', '3', '4'],
              correctIndex: 1,
              health: 2,
              speed: 1.8,
              concept: 'Music Theory',
            },
            {
              question: 'What symbol raises a note half a step?',
              options: ['Flat', 'Sharp', 'Natural', 'Rest'],
              correctIndex: 1,
              health: 2,
              speed: 1.8,
              concept: 'Music Theory',
            },
            {
              question: 'Which instrument family includes violin?',
              options: ['Brass', 'Woodwind', 'Strings', 'Percussion'],
              correctIndex: 2,
              health: 2,
              speed: 1.8,
              concept: 'Instruments',
            },
          ],
        },
      ],
    },
  },

  // ============================================================================
  // 85. Lowercase Letters a-h (letter-trace-canvas + english)
  // ============================================================================
  {
    id: 'int-letter-trace-canvas-english-lowercase-85',
    title: 'Lowercase Letters a-h',
    description:
      'Trace lowercase letters a through h with guided strokes and fun word associations.',
    category: 'english',
    subcategory: 'handwriting',
    template: 'letter-trace-canvas',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\u270D\uFE0F',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {
          letter: 'a',
          word: 'ant',
          hint: 'a is for ant \uD83D\uDC1C',
          image: null,
        },
        {letter: 'b', word: 'ball', hint: 'b is for ball \u26BD', image: null},
        {letter: 'c', word: 'cup', hint: 'c is for cup \u2615', image: null},
        {
          letter: 'd',
          word: 'duck',
          hint: 'd is for duck \uD83E\uDD86',
          image: null,
        },
        {
          letter: 'e',
          word: 'egg',
          hint: 'e is for egg \uD83E\uDD5A',
          image: null,
        },
        {
          letter: 'f',
          word: 'fox',
          hint: 'f is for fox \uD83E\uDD8A',
          image: null,
        },
        {
          letter: 'g',
          word: 'goat',
          hint: 'g is for goat \uD83D\uDC10',
          image: null,
        },
        {
          letter: 'h',
          word: 'hat',
          hint: 'h is for hat \uD83C\uDFA9',
          image: null,
        },
      ],
    },
  },

  // ============================================================================
  // 86. Cursive Letters (letter-trace-canvas + english)
  // ============================================================================
  {
    id: 'int-letter-trace-canvas-english-cursive-86',
    title: 'Cursive Letters',
    description:
      'Practice tracing beautiful cursive letters with elegant strokes.',
    category: 'english',
    subcategory: 'handwriting',
    template: 'letter-trace-canvas',
    difficulty: 3,
    ageRange: [7, 10],
    emoji: '\u2728',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {
          letter: '\uD835\uDC9C',
          word: 'Amazing',
          hint: 'Cursive A \u2728',
          image: null,
        },
        {
          letter: '\u212C',
          word: 'Beautiful',
          hint: 'Cursive B \uD83C\uDF38',
          image: null,
        },
        {
          letter: '\uD835\uDC9E',
          word: 'Creative',
          hint: 'Cursive C \uD83C\uDFA8',
          image: null,
        },
        {
          letter: '\uD835\uDC9F',
          word: 'Dream',
          hint: 'Cursive D \uD83D\uDCAB',
          image: null,
        },
        {
          letter: '\u2130',
          word: 'Elegant',
          hint: 'Cursive E \uD83E\uDDA2',
          image: null,
        },
        {
          letter: '\u2131',
          word: 'Fancy',
          hint: 'Cursive F \uD83D\uDC51',
          image: null,
        },
        {
          letter: '\uD835\uDCA2',
          word: 'Gentle',
          hint: 'Cursive G \uD83D\uDD4A\uFE0F',
          image: null,
        },
        {
          letter: '\u210B',
          word: 'Happy',
          hint: 'Cursive H \uD83D\uDE0A',
          image: null,
        },
      ],
    },
  },

  // ============================================================================
  // 87. Write Your Name (letter-trace-canvas + life-skills)
  // ============================================================================
  {
    id: 'int-letter-trace-canvas-life-skills-names-87',
    title: 'Write Your Name',
    description:
      'Practice writing common first names to build handwriting confidence.',
    category: 'life-skills',
    subcategory: 'handwriting',
    template: 'letter-trace-canvas',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\uD83D\uDCDB',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {
          letter: 'Sam',
          word: 'Name',
          hint: 'Write Sam! \uD83D\uDC66',
          image: null,
        },
        {
          letter: 'Mia',
          word: 'Name',
          hint: 'Write Mia! \uD83D\uDC67',
          image: null,
        },
        {
          letter: 'Leo',
          word: 'Name',
          hint: 'Write Leo! \uD83E\uDD81',
          image: null,
        },
        {
          letter: 'Ava',
          word: 'Name',
          hint: 'Write Ava! \uD83C\uDF1F',
          image: null,
        },
        {
          letter: 'Max',
          word: 'Name',
          hint: 'Write Max! \uD83D\uDC36',
          image: null,
        },
        {
          letter: 'Zoe',
          word: 'Name',
          hint: 'Write Zoe! \uD83E\uDD8B',
          image: null,
        },
        {
          letter: 'Kai',
          word: 'Name',
          hint: 'Write Kai! \uD83C\uDF0A',
          image: null,
        },
        {
          letter: 'Ivy',
          word: 'Name',
          hint: 'Write Ivy! \uD83C\uDF3F',
          image: null,
        },
      ],
    },
  },

  // ============================================================================
  // 88. Doodle Shapes (letter-trace-canvas + creativity)
  // ============================================================================
  {
    id: 'int-letter-trace-canvas-creativity-doodles-88',
    title: 'Doodle Shapes',
    description:
      'Trace fun doodle shapes like suns, stars, and hearts to spark creativity.',
    category: 'creativity',
    subcategory: 'drawing',
    template: 'letter-trace-canvas',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\uD83C\uDFA8',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {
          letter: '\u2600',
          word: 'Sun',
          hint: 'Draw a sun! \u2600\uFE0F',
          image: null,
        },
        {
          letter: '\uD83C\uDF08',
          word: 'Rainbow',
          hint: 'Draw a rainbow! \uD83C\uDF08',
          image: null,
        },
        {
          letter: '\u2B50',
          word: 'Star',
          hint: 'Draw a star! \u2B50',
          image: null,
        },
        {
          letter: '\uD83C\uDF38',
          word: 'Flower',
          hint: 'Draw a flower! \uD83C\uDF38',
          image: null,
        },
        {
          letter: '\uD83C\uDFE0',
          word: 'House',
          hint: 'Draw a house! \uD83C\uDFE0',
          image: null,
        },
        {
          letter: '\uD83D\uDC31',
          word: 'Cat',
          hint: 'Draw a cat face! \uD83D\uDC31',
          image: null,
        },
        {
          letter: '\uD83C\uDF19',
          word: 'Moon',
          hint: 'Draw a moon! \uD83C\uDF19',
          image: null,
        },
        {
          letter: '\u2764',
          word: 'Heart',
          hint: 'Draw a heart! \u2764\uFE0F',
          image: null,
        },
      ],
    },
  },

  // ============================================================================
  // 89. Paint by Numbers (paint-by-concept + math)
  // ============================================================================
  {
    id: 'int-paint-by-concept-math-numbers-89',
    title: 'Paint by Numbers',
    description:
      'Answer math questions to unlock colors and paint a beautiful picture zone by zone.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'paint-by-concept',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83D\uDD8C\uFE0F',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      zones: [
        {
          id: 'z1',
          label: 'Zone 1',
          color: '#FF6B6B',
          question: 'What is 3 + 5?',
          options: ['7', '8', '9', '6'],
          correctIndex: 1,
        },
        {
          id: 'z2',
          label: 'Zone 2',
          color: '#4ECDC4',
          question: 'What is 10 - 4?',
          options: ['5', '6', '7', '8'],
          correctIndex: 1,
        },
        {
          id: 'z3',
          label: 'Zone 3',
          color: '#45B7D1',
          question: 'What is 2 \u00D7 3?',
          options: ['5', '6', '7', '8'],
          correctIndex: 1,
        },
        {
          id: 'z4',
          label: 'Zone 4',
          color: '#96CEB4',
          question: 'What is 12 \u00F7 4?',
          options: ['2', '3', '4', '5'],
          correctIndex: 1,
        },
        {
          id: 'z5',
          label: 'Zone 5',
          color: '#FFEAA7',
          question: 'What is 7 + 8?',
          options: ['14', '15', '16', '13'],
          correctIndex: 1,
        },
        {
          id: 'z6',
          label: 'Zone 6',
          color: '#DDA0DD',
          question: 'What is 20 - 9?',
          options: ['10', '11', '12', '13'],
          correctIndex: 1,
        },
        {
          id: 'z7',
          label: 'Zone 7',
          color: '#FF9A9E',
          question: 'What is 4 \u00D7 4?',
          options: ['12', '14', '16', '18'],
          correctIndex: 2,
        },
        {
          id: 'z8',
          label: 'Zone 8',
          color: '#A8E6CF',
          question: 'What is 15 \u00F7 3?',
          options: ['4', '5', '6', '7'],
          correctIndex: 1,
        },
      ],
    },
  },

  // ============================================================================
  // 90. Paint by Spelling (paint-by-concept + english)
  // ============================================================================
  {
    id: 'int-paint-by-concept-english-spelling-90',
    title: 'Paint by Spelling',
    description:
      'Spell words correctly to unlock colors and reveal a hidden picture.',
    category: 'english',
    subcategory: 'spelling',
    template: 'paint-by-concept',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83C\uDFA8',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      zones: [
        {
          id: 'z1',
          label: 'Sky',
          color: '#87CEEB',
          question: 'Correct spelling?',
          options: ['Beautful', 'Beautiful', 'Beutiful', 'Beautyful'],
          correctIndex: 1,
        },
        {
          id: 'z2',
          label: 'Grass',
          color: '#90EE90',
          question: 'Correct spelling?',
          options: ['Friend', 'Freind', 'Frend', 'Freand'],
          correctIndex: 0,
        },
        {
          id: 'z3',
          label: 'Sun',
          color: '#FFD700',
          question: 'Correct spelling?',
          options: ['Wensday', 'Wendesday', 'Wednesday', 'Wednseday'],
          correctIndex: 2,
        },
        {
          id: 'z4',
          label: 'Cloud',
          color: '#F0F8FF',
          question: 'Correct spelling?',
          options: ['Receive', 'Recieve', 'Receeve', 'Receve'],
          correctIndex: 0,
        },
        {
          id: 'z5',
          label: 'Tree',
          color: '#228B22',
          question: 'Correct spelling?',
          options: ['Definately', 'Definitly', 'Definitely', 'Definatly'],
          correctIndex: 2,
        },
        {
          id: 'z6',
          label: 'Flower',
          color: '#FF69B4',
          question: 'Correct spelling?',
          options: ['Separate', 'Seperate', 'Separete', 'Seprate'],
          correctIndex: 0,
        },
        {
          id: 'z7',
          label: 'Butterfly',
          color: '#DA70D6',
          question: 'Correct spelling?',
          options: ['Occured', 'Ocurred', 'Occurred', 'Ocured'],
          correctIndex: 2,
        },
        {
          id: 'z8',
          label: 'River',
          color: '#4169E1',
          question: 'Correct spelling?',
          options: ['Necesary', 'Neccessary', 'Necessary', 'Neccesary'],
          correctIndex: 2,
        },
      ],
    },
  },

  // ============================================================================
  // 91. Paint Safety Signs (paint-by-concept + life-skills)
  // ============================================================================
  {
    id: 'int-paint-by-concept-life-skills-safety-91',
    title: 'Paint Safety Signs',
    description:
      'Identify safety signs correctly to color them in and learn their meanings.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'paint-by-concept',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\u26A0\uFE0F',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      zones: [
        {
          id: 'z1',
          label: 'Stop Sign',
          color: '#FF0000',
          question: 'What does a red octagon sign mean?',
          options: ['Go', 'Stop', 'Slow down', 'Turn'],
          correctIndex: 1,
        },
        {
          id: 'z2',
          label: 'Yield Sign',
          color: '#FFD700',
          question: 'A yellow triangle sign means...',
          options: ['Speed up', 'Yield/Caution', 'Park here', 'U-turn'],
          correctIndex: 1,
        },
        {
          id: 'z3',
          label: 'Crosswalk',
          color: '#FFFFFF',
          question: 'White stripes on the road mean...',
          options: [
            'No walking',
            'Pedestrian crossing',
            'Speed bump',
            'Parking',
          ],
          correctIndex: 1,
        },
        {
          id: 'z4',
          label: 'Fire Exit',
          color: '#00FF00',
          question: 'A green "EXIT" sign shows...',
          options: ['Entrance', 'Restroom', 'Emergency exit', 'Elevator'],
          correctIndex: 2,
        },
        {
          id: 'z5',
          label: 'No Swimming',
          color: '#0000FF',
          question: 'A crossed-out swimmer sign means...',
          options: ['Swim here', 'No swimming', 'Deep water', 'Lifeguard'],
          correctIndex: 1,
        },
        {
          id: 'z6',
          label: 'Poison',
          color: '#800080',
          question: 'A skull and crossbones means...',
          options: ['Pirate ship', 'Danger/Poison', 'Halloween', 'Game over'],
          correctIndex: 1,
        },
        {
          id: 'z7',
          label: 'School Zone',
          color: '#FF8C00',
          question: 'A sign with children walking means...',
          options: ['Playground', 'School zone', 'Toy store', 'Park'],
          correctIndex: 1,
        },
        {
          id: 'z8',
          label: 'Hospital',
          color: '#FF4444',
          question: 'A white "H" on blue means...',
          options: ['Hotel', 'Hospital', 'Helipad', 'Highway'],
          correctIndex: 1,
        },
      ],
    },
  },

  // ============================================================================
  // 92. Paint the Solar System (paint-by-concept + science)
  // ============================================================================
  {
    id: 'int-paint-by-concept-science-solar-92',
    title: 'Paint the Solar System',
    description:
      'Answer science questions to paint each planet in the solar system.',
    category: 'science',
    subcategory: 'astronomy',
    template: 'paint-by-concept',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83C\uDF0C',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      zones: [
        {
          id: 'z1',
          label: 'Mercury',
          color: '#8B8B83',
          question: 'Closest planet to the Sun?',
          options: ['Venus', 'Mercury', 'Earth', 'Mars'],
          correctIndex: 1,
        },
        {
          id: 'z2',
          label: 'Venus',
          color: '#FFA500',
          question: 'Hottest planet?',
          options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
          correctIndex: 1,
        },
        {
          id: 'z3',
          label: 'Earth',
          color: '#4169E1',
          question: 'Which planet has liquid water?',
          options: ['Mars', 'Venus', 'Earth', 'Saturn'],
          correctIndex: 2,
        },
        {
          id: 'z4',
          label: 'Mars',
          color: '#CD5C5C',
          question: 'Which planet is called the Red Planet?',
          options: ['Jupiter', 'Venus', 'Saturn', 'Mars'],
          correctIndex: 3,
        },
        {
          id: 'z5',
          label: 'Jupiter',
          color: '#DAA520',
          question: 'Largest planet in our solar system?',
          options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'],
          correctIndex: 1,
        },
        {
          id: 'z6',
          label: 'Saturn',
          color: '#F4A460',
          question: 'Which planet has the most visible rings?',
          options: ['Jupiter', 'Uranus', 'Saturn', 'Neptune'],
          correctIndex: 2,
        },
        {
          id: 'z7',
          label: 'Uranus',
          color: '#AFEEEE',
          question: 'Which planet rotates on its side?',
          options: ['Neptune', 'Uranus', 'Saturn', 'Jupiter'],
          correctIndex: 1,
        },
        {
          id: 'z8',
          label: 'Neptune',
          color: '#4682B4',
          question: 'Farthest known planet from the Sun?',
          options: ['Uranus', 'Pluto', 'Neptune', 'Saturn'],
          correctIndex: 2,
        },
      ],
    },
  },

  // ============================================================================
  // 93. Addition Tower (builder + math)
  // ============================================================================
  {
    id: 'int-builder-math-addition-93',
    title: 'Addition Tower',
    description:
      'Stack blocks higher and higher by solving addition problems correctly.',
    category: 'math',
    subcategory: 'addition',
    template: 'builder',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83E\uDDF1',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: '2 + 3 = ?',
          options: ['4', '5', '6', '7'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '4 + 4 = ?',
          options: ['6', '7', '8', '9'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: '1 + 6 = ?',
          options: ['5', '6', '7', '8'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: '3 + 5 = ?',
          options: ['7', '8', '9', '10'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '5 + 5 = ?',
          options: ['8', '9', '10', '11'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: '2 + 7 = ?',
          options: ['8', '9', '10', '11'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '6 + 3 = ?',
          options: ['7', '8', '9', '10'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: '4 + 5 = ?',
          options: ['8', '9', '10', '11'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '7 + 2 = ?',
          options: ['8', '9', '10', '11'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '3 + 3 = ?',
          options: ['5', '6', '7', '8'],
          correctIndex: 1,
          concept: 'Addition',
        },
      ],
    },
  },

  // ============================================================================
  // 94. Times Table Tower (builder + math)
  // ============================================================================
  {
    id: 'int-builder-math-multiplication-94',
    title: 'Times Table Tower',
    description:
      'Build the tallest tower by mastering your multiplication tables.',
    category: 'math',
    subcategory: 'multiplication',
    template: 'builder',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\uD83C\uDFD7\uFE0F',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: '7 \u00D7 8 = ?',
          options: ['54', '56', '58', '64'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '9 \u00D7 6 = ?',
          options: ['52', '54', '56', '48'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '8 \u00D7 7 = ?',
          options: ['48', '54', '56', '63'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
        {
          question: '6 \u00D7 6 = ?',
          options: ['30', '34', '36', '42'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
        {
          question: '12 \u00D7 5 = ?',
          options: ['55', '60', '65', '70'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '9 \u00D7 9 = ?',
          options: ['72', '81', '90', '99'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '11 \u00D7 7 = ?',
          options: ['70', '77', '84', '88'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '8 \u00D7 6 = ?',
          options: ['42', '46', '48', '54'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
        {
          question: '7 \u00D7 9 = ?',
          options: ['56', '63', '72', '81'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '12 \u00D7 8 = ?',
          options: ['88', '92', '96', '104'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
      ],
    },
  },

  // ============================================================================
  // 95. Vocabulary Tower (builder + english)
  // ============================================================================
  {
    id: 'int-builder-english-vocabulary-95',
    title: 'Vocabulary Tower',
    description:
      'Build a word tower by matching vocabulary words to their correct definitions.',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'builder',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDCDA',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: "What does 'brave' mean?",
          options: ['Scared', 'Courageous', 'Tiny', 'Loud'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'ancient' mean?",
          options: ['New', 'Very old', 'Small', 'Fast'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'enormous' mean?",
          options: ['Tiny', 'Very big', 'Slow', 'Quiet'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'fragile' mean?",
          options: ['Strong', 'Easily broken', 'Heavy', 'Round'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'generous' mean?",
          options: ['Greedy', 'Willing to give', 'Angry', 'Tired'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'curious' mean?",
          options: ['Bored', 'Eager to learn', 'Sleepy', 'Sad'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'brilliant' mean?",
          options: ['Dull', 'Very bright or clever', 'Slow', 'Quiet'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'timid' mean?",
          options: ['Brave', 'Shy', 'Loud', 'Strong'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'swift' mean?",
          options: ['Slow', 'Very fast', 'Heavy', 'Tall'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'peculiar' mean?",
          options: ['Normal', 'Strange or unusual', 'Pretty', 'Big'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
      ],
    },
  },

  // ============================================================================
  // 96. Color Tower (builder + creativity)
  // ============================================================================
  {
    id: 'int-builder-creativity-colors-96',
    title: 'Color Tower',
    description:
      'Build a colorful tower by mixing primary colors to create new ones.',
    category: 'creativity',
    subcategory: 'color theory',
    template: 'builder',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83C\uDF08',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Red + Blue = ?',
          options: ['Green', 'Purple', 'Orange', 'Yellow'],
          correctIndex: 1,
          concept: 'Color Mixing',
        },
        {
          question: 'Yellow + Blue = ?',
          options: ['Purple', 'Orange', 'Green', 'Red'],
          correctIndex: 2,
          concept: 'Color Mixing',
        },
        {
          question: 'Red + Yellow = ?',
          options: ['Purple', 'Green', 'Orange', 'Blue'],
          correctIndex: 2,
          concept: 'Color Mixing',
        },
        {
          question: 'Red + White = ?',
          options: ['Pink', 'Gray', 'Peach', 'Lavender'],
          correctIndex: 0,
          concept: 'Color Mixing',
        },
        {
          question: 'Blue + White = ?',
          options: ['Purple', 'Light blue', 'Green', 'Gray'],
          correctIndex: 1,
          concept: 'Color Mixing',
        },
        {
          question: 'Black + White = ?',
          options: ['Brown', 'Beige', 'Gray', 'Silver'],
          correctIndex: 2,
          concept: 'Color Mixing',
        },
        {
          question: 'Yellow + Red + Blue = ?',
          options: ['White', 'Brown', 'Gray', 'Black'],
          correctIndex: 1,
          concept: 'Color Mixing',
        },
        {
          question: 'Which is a primary color?',
          options: ['Green', 'Orange', 'Purple', 'Red'],
          correctIndex: 3,
          concept: 'Primary Colors',
        },
        {
          question: 'Which is a warm color?',
          options: ['Blue', 'Green', 'Orange', 'Purple'],
          correctIndex: 2,
          concept: 'Color Temperature',
        },
        {
          question: 'Which is a cool color?',
          options: ['Red', 'Orange', 'Yellow', 'Blue'],
          correctIndex: 3,
          concept: 'Color Temperature',
        },
      ],
    },
  },

  // ============================================================================
  // 97. Number Maze (word-maze + math)
  // ============================================================================
  {
    id: 'int-word-maze-math-arithmetic-97',
    title: 'Number Maze',
    description:
      'Navigate through a maze by solving math problems at each junction.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'word-maze',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83E\uDDED',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      maze: {
        gridSize: 5,
        start: [0, 0],
        end: [4, 4],
        questions: [
          {
            position: [1, 0],
            question: '5 + 3 = ?',
            options: ['7', '8'],
            correctIndex: 1,
            concept: 'Addition',
          },
          {
            position: [2, 1],
            question: '9 - 4 = ?',
            options: ['5', '6'],
            correctIndex: 0,
            concept: 'Subtraction',
          },
          {
            position: [1, 2],
            question: '6 + 7 = ?',
            options: ['12', '13'],
            correctIndex: 1,
            concept: 'Addition',
          },
          {
            position: [3, 1],
            question: '14 - 6 = ?',
            options: ['8', '9'],
            correctIndex: 0,
            concept: 'Subtraction',
          },
          {
            position: [2, 3],
            question: '8 + 4 = ?',
            options: ['11', '12'],
            correctIndex: 1,
            concept: 'Addition',
          },
          {
            position: [3, 2],
            question: '15 - 8 = ?',
            options: ['6', '7'],
            correctIndex: 1,
            concept: 'Subtraction',
          },
          {
            position: [4, 3],
            question: '3 + 9 = ?',
            options: ['12', '11'],
            correctIndex: 0,
            concept: 'Addition',
          },
          {
            position: [3, 4],
            question: '17 - 9 = ?',
            options: ['7', '8'],
            correctIndex: 1,
            concept: 'Subtraction',
          },
          {
            position: [1, 3],
            question: '7 + 6 = ?',
            options: ['14', '13'],
            correctIndex: 1,
            concept: 'Addition',
          },
          {
            position: [4, 1],
            question: '11 - 5 = ?',
            options: ['6', '7'],
            correctIndex: 0,
            concept: 'Subtraction',
          },
        ],
      },
    },
  },

  // ============================================================================
  // 98. Word Maze (word-maze + english)
  // ============================================================================
  {
    id: 'int-word-maze-english-synonyms-98',
    title: 'Word Maze',
    description:
      'Find your way through the maze by choosing correct synonyms at each junction.',
    category: 'english',
    subcategory: 'synonyms',
    template: 'word-maze',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDCD6',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      maze: {
        gridSize: 5,
        start: [0, 0],
        end: [4, 4],
        questions: [
          {
            position: [1, 0],
            question: "Synonym for 'happy'?",
            options: ['Sad', 'Joyful'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
          {
            position: [2, 1],
            question: "Synonym for 'big'?",
            options: ['Tiny', 'Large'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
          {
            position: [1, 2],
            question: "Synonym for 'fast'?",
            options: ['Quick', 'Slow'],
            correctIndex: 0,
            concept: 'Synonyms',
          },
          {
            position: [3, 1],
            question: "Synonym for 'angry'?",
            options: ['Calm', 'Furious'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
          {
            position: [2, 3],
            question: "Synonym for 'smart'?",
            options: ['Clever', 'Foolish'],
            correctIndex: 0,
            concept: 'Synonyms',
          },
          {
            position: [3, 2],
            question: "Synonym for 'pretty'?",
            options: ['Ugly', 'Beautiful'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
          {
            position: [4, 3],
            question: "Synonym for 'cold'?",
            options: ['Chilly', 'Warm'],
            correctIndex: 0,
            concept: 'Synonyms',
          },
          {
            position: [3, 4],
            question: "Synonym for 'start'?",
            options: ['End', 'Begin'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
          {
            position: [1, 3],
            question: "Synonym for 'small'?",
            options: ['Little', 'Huge'],
            correctIndex: 0,
            concept: 'Synonyms',
          },
          {
            position: [4, 1],
            question: "Synonym for 'brave'?",
            options: ['Afraid', 'Courageous'],
            correctIndex: 1,
            concept: 'Synonyms',
          },
        ],
      },
    },
  },

  // ============================================================================
  // 99. Safety Maze (word-maze + life-skills)
  // ============================================================================
  {
    id: 'int-word-maze-life-skills-safety-99',
    title: 'Safety Maze',
    description:
      'Navigate the maze by making the safest choices at every crossroads.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'word-maze',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83D\uDEA8',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      maze: {
        gridSize: 5,
        start: [0, 0],
        end: [4, 4],
        questions: [
          {
            position: [1, 0],
            question: 'Stranger offers a ride...',
            options: ['Say no, tell adult', 'Get in car'],
            correctIndex: 0,
            concept: 'Stranger Danger',
          },
          {
            position: [2, 1],
            question: 'You smell smoke at home...',
            options: ['Get out and call 911', 'Hide under bed'],
            correctIndex: 0,
            concept: 'Fire Safety',
          },
          {
            position: [1, 2],
            question: 'Found medicine on the floor...',
            options: ['Tell a grown-up', 'Taste it'],
            correctIndex: 0,
            concept: 'Poison Safety',
          },
          {
            position: [3, 1],
            question: 'Ball rolls into the street...',
            options: ['Look both ways first', 'Run after it'],
            correctIndex: 0,
            concept: 'Road Safety',
          },
          {
            position: [2, 3],
            question: 'Someone online asks your address...',
            options: ['Never share it', 'Tell them'],
            correctIndex: 0,
            concept: 'Online Safety',
          },
          {
            position: [3, 2],
            question: 'A friend dares you to climb a roof...',
            options: ['Say no, stay safe', 'Climb up'],
            correctIndex: 0,
            concept: 'Peer Pressure',
          },
          {
            position: [4, 3],
            question: 'Lost in a store...',
            options: ['Find a store worker', 'Leave the store'],
            correctIndex: 0,
            concept: 'Getting Lost',
          },
          {
            position: [3, 4],
            question: 'Thunderstorm while swimming...',
            options: ['Get out of water', 'Keep swimming'],
            correctIndex: 0,
            concept: 'Weather Safety',
          },
          {
            position: [1, 3],
            question: "A dog you don't know runs up...",
            options: ['Stand still, stay calm', 'Run and scream'],
            correctIndex: 0,
            concept: 'Animal Safety',
          },
          {
            position: [4, 1],
            question: 'Power lines fell on the ground...',
            options: ['Stay far away', 'Go look at them'],
            correctIndex: 0,
            concept: 'Electrical Safety',
          },
        ],
      },
    },
  },

  // ============================================================================
  // 100. Adventure Maze (word-maze + creativity)
  // ============================================================================
  {
    id: 'int-word-maze-creativity-adventure-100',
    title: 'Adventure Maze',
    description:
      'Make creative choices at each junction to forge your own path through the adventure maze.',
    category: 'creativity',
    subcategory: 'imagination',
    template: 'word-maze',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83C\uDF1F',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      maze: {
        gridSize: 5,
        start: [0, 0],
        end: [4, 4],
        questions: [
          {
            position: [1, 0],
            question: 'You find a magic door...',
            options: ['Open it! \u2728', 'Walk away'],
            correctIndex: 0,
            concept: 'Imagination',
          },
          {
            position: [2, 1],
            question: 'A talking cat asks for help...',
            options: ['Help the cat! \uD83D\uDC31', 'Ignore it'],
            correctIndex: 0,
            concept: 'Empathy',
          },
          {
            position: [1, 2],
            question: 'You see a rainbow bridge...',
            options: ['Cross it! \uD83C\uDF08', 'Stay here'],
            correctIndex: 0,
            concept: 'Exploration',
          },
          {
            position: [3, 1],
            question: 'A treasure chest appears...',
            options: ['Open and share! \uD83C\uDF81', 'Keep walking'],
            correctIndex: 0,
            concept: 'Generosity',
          },
          {
            position: [2, 3],
            question: 'A dragon blocks the path...',
            options: ['Befriend it! \uD83D\uDC09', 'Run away'],
            correctIndex: 0,
            concept: 'Courage',
          },
          {
            position: [3, 2],
            question: 'You find magic paint...',
            options: ['Paint a world! \uD83C\uDFA8', 'Leave it'],
            correctIndex: 0,
            concept: 'Creativity',
          },
          {
            position: [4, 3],
            question: 'A fairy offers a wish...',
            options: ['Wish for everyone! \u2B50', 'Wish for yourself'],
            correctIndex: 0,
            concept: 'Kindness',
          },
          {
            position: [3, 4],
            question: 'Two paths: dark cave or sunny meadow...',
            options: ['Explore the cave! \uD83D\uDD26', 'Sunny meadow'],
            correctIndex: 0,
            concept: 'Adventure',
          },
          {
            position: [1, 3],
            question: 'A robot needs fixing...',
            options: ['Fix it together! \uD83E\uDD16', 'Leave it broken'],
            correctIndex: 0,
            concept: 'Problem Solving',
          },
          {
            position: [4, 1],
            question: 'You can fly or breathe underwater...',
            options: ['Fly to the stars! \uD83D\uDE80', 'Stay on ground'],
            correctIndex: 0,
            concept: 'Imagination',
          },
        ],
      },
    },
  },
];

export default GAMES_BATCH_4;
