/**
 * Kids Learning Zone - Game Batch 2 (Games 26-50)
 *
 * 25 interactive game configurations covering drag-to-zone, sequence-order,
 * word-build, timed-rush, story-builder, simulation, and spot-difference
 * templates across math, english, life-skills, science, and creativity.
 */

const GAMES_BATCH_2 = [
  // =========================================================================
  // 26. Parts of Speech (drag-to-zone + english)
  // =========================================================================
  {
    id: 'int-drag-to-zone-english-parts-of-speech-26',
    title: 'Parts of Speech',
    description:
      'Drag words into the correct grammar category: Noun, Verb, or Adjective.',
    category: 'english',
    subcategory: 'grammar',
    template: 'drag-to-zone',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDCDD',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      items: [
        {id: 'w1', label: 'Running', emoji: '\uD83C\uDFC3'},
        {id: 'w2', label: 'Beautiful', emoji: '\uD83C\uDF38'},
        {id: 'w3', label: 'Table', emoji: '\uD83E\uDE91'},
        {id: 'w4', label: 'Jump', emoji: '\uD83E\uDD38'},
        {id: 'w5', label: 'Happy', emoji: '\uD83D\uDE04'},
        {id: 'w6', label: 'Doctor', emoji: '\uD83D\uDC69\u200D\u2695\uFE0F'},
        {id: 'w7', label: 'Swim', emoji: '\uD83C\uDFCA'},
        {id: 'w8', label: 'Tiny', emoji: '\uD83D\uDD2C'},
        {id: 'w9', label: 'Mountain', emoji: '\u26F0\uFE0F'},
        {id: 'w10', label: 'Write', emoji: '\u270D\uFE0F'},
      ],
      zones: [
        {id: 'noun', label: 'Nouns'},
        {id: 'verb', label: 'Verbs'},
        {id: 'adj', label: 'Adjectives'},
      ],
      correctMapping: {
        w1: 'verb',
        w2: 'adj',
        w3: 'noun',
        w4: 'verb',
        w5: 'adj',
        w6: 'noun',
        w7: 'verb',
        w8: 'adj',
        w9: 'noun',
        w10: 'verb',
      },
    },
  },

  // =========================================================================
  // 27. Recycling Sort (drag-to-zone + life-skills)
  // =========================================================================
  {
    id: 'int-drag-to-zone-life-skills-recycling-sort-27',
    title: 'Recycling Sort',
    description:
      'Sort everyday items into the correct bin: Recycle, Compost, or Trash.',
    category: 'life-skills',
    subcategory: 'environment',
    template: 'drag-to-zone',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\u267B\uFE0F',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      items: [
        {id: 'r1', label: 'Plastic Bottle', emoji: '\uD83E\uDDF4'},
        {id: 'r2', label: 'Banana Peel', emoji: '\uD83C\uDF4C'},
        {id: 'r3', label: 'Newspaper', emoji: '\uD83D\uDCF0'},
        {id: 'r4', label: 'Styrofoam Cup', emoji: '\uD83E\uDD64'},
        {id: 'r5', label: 'Apple Core', emoji: '\uD83C\uDF4E'},
        {id: 'r6', label: 'Aluminum Can', emoji: '\uD83E\uDD6B'},
        {id: 'r7', label: 'Egg Shells', emoji: '\uD83E\uDD5A'},
        {id: 'r8', label: 'Cardboard Box', emoji: '\uD83D\uDCE6'},
        {id: 'r9', label: 'Chip Bag', emoji: '\uD83C\uDF5F'},
        {id: 'r10', label: 'Grass Clippings', emoji: '\uD83C\uDF3F'},
      ],
      zones: [
        {id: 'recycle', label: 'Recycle \u267B\uFE0F'},
        {id: 'compost', label: 'Compost \uD83C\uDF31'},
        {id: 'trash', label: 'Trash \uD83D\uDDD1\uFE0F'},
      ],
      correctMapping: {
        r1: 'recycle',
        r2: 'compost',
        r3: 'recycle',
        r4: 'trash',
        r5: 'compost',
        r6: 'recycle',
        r7: 'compost',
        r8: 'recycle',
        r9: 'trash',
        r10: 'compost',
      },
    },
  },

  // =========================================================================
  // 28. Food Groups (drag-to-zone + science)
  // =========================================================================
  {
    id: 'int-drag-to-zone-science-food-groups-28',
    title: 'Food Groups',
    description:
      'Sort foods into the correct food group: Fruits, Vegetables, Protein, or Grains.',
    category: 'science',
    subcategory: 'nutrition',
    template: 'drag-to-zone',
    difficulty: 2,
    ageRange: [6, 9],
    emoji: '\uD83E\uDD57',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      items: [
        {id: 'f1', label: 'Strawberry', emoji: '\uD83C\uDF53'},
        {id: 'f2', label: 'Broccoli', emoji: '\uD83E\uDD66'},
        {id: 'f3', label: 'Chicken', emoji: '\uD83C\uDF57'},
        {id: 'f4', label: 'Rice', emoji: '\uD83C\uDF5A'},
        {id: 'f5', label: 'Banana', emoji: '\uD83C\uDF4C'},
        {id: 'f6', label: 'Carrot', emoji: '\uD83E\uDD55'},
        {id: 'f7', label: 'Egg', emoji: '\uD83E\uDD5A'},
        {id: 'f8', label: 'Bread', emoji: '\uD83C\uDF5E'},
        {id: 'f9', label: 'Watermelon', emoji: '\uD83C\uDF49'},
        {id: 'f10', label: 'Spinach', emoji: '\uD83E\uDD6C'},
      ],
      zones: [
        {id: 'fruit', label: 'Fruits'},
        {id: 'vegetable', label: 'Vegetables'},
        {id: 'protein', label: 'Protein'},
        {id: 'grain', label: 'Grains'},
      ],
      correctMapping: {
        f1: 'fruit',
        f2: 'vegetable',
        f3: 'protein',
        f4: 'grain',
        f5: 'fruit',
        f6: 'vegetable',
        f7: 'protein',
        f8: 'grain',
        f9: 'fruit',
        f10: 'vegetable',
      },
    },
  },

  // =========================================================================
  // 29. Number Order (sequence-order + math)
  // =========================================================================
  {
    id: 'int-sequence-order-math-number-order-29',
    title: 'Number Order',
    description:
      'Arrange numbers from smallest to largest to master number sense.',
    category: 'math',
    subcategory: 'number sense',
    template: 'sequence-order',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83D\uDD22',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sequences: [
        {
          instruction: 'Put these numbers in order (smallest to largest)',
          items: [
            {id: 'a', label: '15'},
            {id: 'b', label: '3'},
            {id: 'c', label: '27'},
            {id: 'd', label: '8'},
          ],
          correctOrder: ['b', 'd', 'a', 'c'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Smallest to largest',
          items: [
            {id: 'a', label: '42'},
            {id: 'b', label: '17'},
            {id: 'c', label: '5'},
            {id: 'd', label: '33'},
          ],
          correctOrder: ['c', 'b', 'd', 'a'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Arrange from smallest to biggest',
          items: [
            {id: 'a', label: '100'},
            {id: 'b', label: '25'},
            {id: 'c', label: '50'},
            {id: 'd', label: '10'},
          ],
          correctOrder: ['d', 'b', 'c', 'a'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Put in order (smallest first)',
          items: [
            {id: 'a', label: '9'},
            {id: 'b', label: '31'},
            {id: 'c', label: '2'},
            {id: 'd', label: '18'},
          ],
          correctOrder: ['c', 'a', 'd', 'b'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Which comes first? Smallest to largest',
          items: [
            {id: 'a', label: '60'},
            {id: 'b', label: '14'},
            {id: 'c', label: '88'},
            {id: 'd', label: '37'},
          ],
          correctOrder: ['b', 'd', 'a', 'c'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Order from least to greatest',
          items: [
            {id: 'a', label: '7'},
            {id: 'b', label: '45'},
            {id: 'c', label: '21'},
            {id: 'd', label: '12'},
          ],
          correctOrder: ['a', 'd', 'c', 'b'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Smallest to largest',
          items: [
            {id: 'a', label: '73'},
            {id: 'b', label: '19'},
            {id: 'c', label: '56'},
            {id: 'd', label: '4'},
          ],
          correctOrder: ['d', 'b', 'c', 'a'],
          concept: 'Number Ordering',
        },
        {
          instruction: 'Put these numbers in the right order',
          items: [
            {id: 'a', label: '90'},
            {id: 'b', label: '11'},
            {id: 'c', label: '38'},
            {id: 'd', label: '65'},
          ],
          correctOrder: ['b', 'c', 'd', 'a'],
          concept: 'Number Ordering',
        },
      ],
    },
  },

  // =========================================================================
  // 30. Story Sequence (sequence-order + english)
  // =========================================================================
  {
    id: 'int-sequence-order-english-story-sequence-30',
    title: 'Story Sequence',
    description:
      'Put story events in the correct order to build reading comprehension.',
    category: 'english',
    subcategory: 'reading comprehension',
    template: 'sequence-order',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83D\uDCD6',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sequences: [
        {
          instruction: 'Put this story in order',
          items: [
            {id: 's1', label: 'The bird flew away'},
            {id: 's2', label: 'The egg hatched'},
            {id: 's3', label: 'The bird built a nest'},
            {id: 's4', label: 'The bird laid an egg'},
          ],
          correctOrder: ['s3', 's4', 's2', 's1'],
          concept: 'Sequencing',
        },
        {
          instruction: 'What happened first, next, and last?',
          items: [
            {id: 's1', label: 'The snowman melted in the sun'},
            {id: 's2', label: 'It started snowing outside'},
            {id: 's3', label: 'The children built a snowman'},
            {id: 's4', label: 'The children put on warm coats'},
          ],
          correctOrder: ['s2', 's4', 's3', 's1'],
          concept: 'Sequencing',
        },
        {
          instruction: 'Order the story events',
          items: [
            {id: 's1', label: 'She blew out the candles'},
            {id: 's2', label: 'Mom baked a cake'},
            {id: 's3', label: 'Friends sang Happy Birthday'},
            {id: 's4', label: 'She opened her presents'},
          ],
          correctOrder: ['s2', 's3', 's1', 's4'],
          concept: 'Sequencing',
        },
        {
          instruction: 'Put this story in the right order',
          items: [
            {id: 's1', label: 'The dog buried the bone'},
            {id: 's2', label: 'A boy gave his dog a bone'},
            {id: 's3', label: 'The dog ran to the garden'},
            {id: 's4', label: 'The dog dug a hole'},
          ],
          correctOrder: ['s2', 's3', 's4', 's1'],
          concept: 'Sequencing',
        },
        {
          instruction: 'Arrange the events in order',
          items: [
            {id: 's1', label: 'The caterpillar ate many leaves'},
            {id: 's2', label: 'A tiny egg sat on a leaf'},
            {id: 's3', label: 'A beautiful butterfly appeared'},
            {id: 's4', label: 'It made a cozy cocoon'},
          ],
          correctOrder: ['s2', 's1', 's4', 's3'],
          concept: 'Sequencing',
        },
        {
          instruction: 'What order did things happen?',
          items: [
            {id: 's1', label: 'The plant grew tall'},
            {id: 's2', label: 'She planted a seed'},
            {id: 's3', label: 'She watered the soil'},
            {id: 's4', label: 'A flower bloomed'},
          ],
          correctOrder: ['s2', 's3', 's1', 's4'],
          concept: 'Sequencing',
        },
        {
          instruction: 'Put the story in order',
          items: [
            {id: 's1', label: 'The frog hopped away'},
            {id: 's2', label: 'A tadpole swam in the pond'},
            {id: 's3', label: 'The tadpole grew legs'},
            {id: 's4', label: 'Its tail disappeared'},
          ],
          correctOrder: ['s2', 's3', 's4', 's1'],
          concept: 'Sequencing',
        },
        {
          instruction: 'Arrange the events from start to finish',
          items: [
            {id: 's1', label: 'The family ate the cookies'},
            {id: 's2', label: 'She mixed the ingredients'},
            {id: 's3', label: 'She put them in the oven'},
            {id: 's4', label: 'She got out flour and sugar'},
          ],
          correctOrder: ['s4', 's2', 's3', 's1'],
          concept: 'Sequencing',
        },
      ],
    },
  },

  // =========================================================================
  // 31. Daily Routine (sequence-order + life-skills)
  // =========================================================================
  {
    id: 'int-sequence-order-life-skills-daily-routine-31',
    title: 'Daily Routine',
    description:
      'Put daily routine steps in the correct order to build good habits.',
    category: 'life-skills',
    subcategory: 'daily routines',
    template: 'sequence-order',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\u23F0',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sequences: [
        {
          instruction: "What's the right order for your morning?",
          items: [
            {id: 'd1', label: 'Eat breakfast \uD83E\uDD63'},
            {id: 'd2', label: 'Wake up \u23F0'},
            {id: 'd3', label: 'Brush teeth \uD83E\uDEB5'},
            {id: 'd4', label: 'Get dressed \uD83D\uDC55'},
          ],
          correctOrder: ['d2', 'd4', 'd1', 'd3'],
          concept: 'Morning Routine',
        },
        {
          instruction: 'Put the bedtime steps in order',
          items: [
            {id: 'd1', label: 'Turn off the light \uD83D\uDCA1'},
            {id: 'd2', label: 'Put on pajamas \uD83D\uDE34'},
            {id: 'd3', label: 'Brush teeth \uD83E\uDEB5'},
            {id: 'd4', label: 'Read a story \uD83D\uDCD6'},
          ],
          correctOrder: ['d3', 'd2', 'd4', 'd1'],
          concept: 'Bedtime Routine',
        },
        {
          instruction: 'How do you get ready for school?',
          items: [
            {id: 'd1', label: 'Walk to school \uD83D\uDEB6'},
            {id: 'd2', label: 'Pack your backpack \uD83C\uDF92'},
            {id: 'd3', label: 'Eat a healthy breakfast \uD83E\uDD5E'},
            {id: 'd4', label: 'Put on your shoes \uD83D\uDC5F'},
          ],
          correctOrder: ['d3', 'd2', 'd4', 'd1'],
          concept: 'School Preparation',
        },
        {
          instruction: 'What order do you wash your hands?',
          items: [
            {id: 'd1', label: 'Dry with a towel \uD83E\uDDF4'},
            {id: 'd2', label: 'Turn on the water \uD83D\uDEB0'},
            {id: 'd3', label: 'Scrub with soap for 20 seconds \uD83E\uDDF4'},
            {id: 'd4', label: 'Rinse off the soap \uD83D\uDCA7'},
          ],
          correctOrder: ['d2', 'd3', 'd4', 'd1'],
          concept: 'Hand Washing',
        },
        {
          instruction: 'Steps for making a sandwich',
          items: [
            {id: 'd1', label: 'Put the top bread on \uD83C\uDF5E'},
            {id: 'd2', label: 'Get two slices of bread \uD83C\uDF5E'},
            {id: 'd3', label: 'Spread peanut butter \uD83E\uDD5C'},
            {id: 'd4', label: 'Add jelly \uD83C\uDF53'},
          ],
          correctOrder: ['d2', 'd3', 'd4', 'd1'],
          concept: 'Making Food',
        },
        {
          instruction: 'How do you take care of a pet?',
          items: [
            {id: 'd1', label: 'Give fresh water \uD83D\uDCA7'},
            {id: 'd2', label: 'Check the food bowl \uD83E\uDD63'},
            {id: 'd3', label: 'Play together \uD83C\uDFBE'},
            {id: 'd4', label: 'Clean up after them \uD83E\uDDF9'},
          ],
          correctOrder: ['d2', 'd1', 'd3', 'd4'],
          concept: 'Pet Care Routine',
        },
        {
          instruction: 'Steps for cleaning your room',
          items: [
            {id: 'd1', label: 'Put toys in the toy box \uD83E\uDDF8'},
            {id: 'd2', label: 'Look around at the mess \uD83D\uDC40'},
            {id: 'd3', label: 'Make your bed \uD83D\uDECF\uFE0F'},
            {id: 'd4', label: 'Put dirty clothes in the hamper \uD83D\uDC55'},
          ],
          correctOrder: ['d2', 'd3', 'd1', 'd4'],
          concept: 'Cleaning Up',
        },
        {
          instruction: 'How do you cross the street safely?',
          items: [
            {id: 'd1', label: 'Walk across quickly \uD83D\uDEB6'},
            {id: 'd2', label: 'Stop at the curb \uD83D\uDED1'},
            {id: 'd3', label: 'Look left, right, then left again \uD83D\uDC40'},
            {id: 'd4', label: 'Wait for the walk signal \uD83D\uDEA6'},
          ],
          correctOrder: ['d2', 'd4', 'd3', 'd1'],
          concept: 'Road Safety',
        },
      ],
    },
  },

  // =========================================================================
  // 32. Life Cycle (sequence-order + science)
  // =========================================================================
  {
    id: 'int-sequence-order-science-life-cycle-32',
    title: 'Life Cycle',
    description: 'Order the stages of animal and plant life cycles correctly.',
    category: 'science',
    subcategory: 'biology',
    template: 'sequence-order',
    difficulty: 2,
    ageRange: [6, 9],
    emoji: '\uD83E\uDD8B',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sequences: [
        {
          instruction: 'Order the butterfly life cycle',
          items: [
            {id: 'l1', label: 'Butterfly \uD83E\uDD8B'},
            {id: 'l2', label: 'Egg \uD83E\uDD5A'},
            {id: 'l3', label: 'Caterpillar \uD83D\uDC1B'},
            {id: 'l4', label: 'Chrysalis \uD83E\uDED8'},
          ],
          correctOrder: ['l2', 'l3', 'l4', 'l1'],
          concept: 'Butterfly Life Cycle',
        },
        {
          instruction: 'Order the frog life cycle',
          items: [
            {id: 'l1', label: 'Adult Frog \uD83D\uDC38'},
            {id: 'l2', label: 'Frog Eggs \uD83E\uDD5A'},
            {id: 'l3', label: 'Tadpole \uD83D\uDC1F'},
            {id: 'l4', label: 'Tadpole with Legs'},
          ],
          correctOrder: ['l2', 'l3', 'l4', 'l1'],
          concept: 'Frog Life Cycle',
        },
        {
          instruction: 'Order the plant life cycle',
          items: [
            {id: 'l1', label: 'Seed \uD83C\uDF31'},
            {id: 'l2', label: 'Sprout \uD83C\uDF3F'},
            {id: 'l3', label: 'Flower \uD83C\uDF3B'},
            {id: 'l4', label: 'Fruit with Seeds \uD83C\uDF4E'},
          ],
          correctOrder: ['l1', 'l2', 'l3', 'l4'],
          concept: 'Plant Life Cycle',
        },
        {
          instruction: 'Order the chicken life cycle',
          items: [
            {id: 'l1', label: 'Hen \uD83D\uDC14'},
            {id: 'l2', label: 'Egg \uD83E\uDD5A'},
            {id: 'l3', label: 'Chick \uD83D\uDC25'},
            {id: 'l4', label: 'Young Chicken \uD83D\uDC13'},
          ],
          correctOrder: ['l2', 'l3', 'l4', 'l1'],
          concept: 'Chicken Life Cycle',
        },
        {
          instruction: 'How does a tree grow?',
          items: [
            {id: 'l1', label: 'Acorn falls on ground \uD83C\uDF30'},
            {id: 'l2', label: 'Small sapling grows \uD83C\uDF3F'},
            {id: 'l3', label: 'Tall tree with branches \uD83C\uDF33'},
            {id: 'l4', label: 'Tree makes new acorns \uD83C\uDF30'},
          ],
          correctOrder: ['l1', 'l2', 'l3', 'l4'],
          concept: 'Tree Life Cycle',
        },
        {
          instruction: 'Order the water cycle',
          items: [
            {id: 'l1', label: 'Rain falls \uD83C\uDF27\uFE0F'},
            {id: 'l2', label: 'Sun heats the water \u2600\uFE0F'},
            {id: 'l3', label: 'Water evaporates \uD83D\uDCA8'},
            {id: 'l4', label: 'Clouds form \u2601\uFE0F'},
          ],
          correctOrder: ['l2', 'l3', 'l4', 'l1'],
          concept: 'Water Cycle',
        },
        {
          instruction: 'How does a dog grow up?',
          items: [
            {id: 'l1', label: 'Newborn puppy \uD83D\uDC36'},
            {id: 'l2', label: 'Puppy opens its eyes'},
            {id: 'l3', label: 'Playful young dog \uD83D\uDC15'},
            {id: 'l4', label: 'Fully grown adult dog'},
          ],
          correctOrder: ['l1', 'l2', 'l3', 'l4'],
          concept: 'Dog Life Cycle',
        },
        {
          instruction: 'Order the human growing up stages',
          items: [
            {id: 'l1', label: 'Baby \uD83D\uDC76'},
            {id: 'l2', label: 'Toddler \uD83D\uDEB6'},
            {id: 'l3', label: 'Child \uD83E\uDDD2'},
            {id: 'l4', label: 'Teenager \uD83E\uDDD1'},
          ],
          correctOrder: ['l1', 'l2', 'l3', 'l4'],
          concept: 'Human Growth',
        },
      ],
    },
  },

  // =========================================================================
  // 33. Spell It Out (word-build + english)
  // =========================================================================
  {
    id: 'int-word-build-english-spell-it-out-33',
    title: 'Spell It Out',
    description: 'Build common everyday words from scrambled letters.',
    category: 'english',
    subcategory: 'spelling',
    template: 'word-build',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83D\uDD24',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      words: [
        {word: 'HOUSE', hint: 'Where you live \uD83C\uDFE0', image: null},
        {word: 'APPLE', hint: 'A red fruit \uD83C\uDF4E', image: null},
        {word: 'WATER', hint: 'We drink it \uD83D\uDCA7', image: null},
        {word: 'HAPPY', hint: 'Feeling of joy \uD83D\uDE04', image: null},
        {word: 'CLOCK', hint: 'Tells the time \u23F0', image: null},
        {word: 'PLANT', hint: 'Grows in the garden \uD83C\uDF31', image: null},
        {word: 'NIGHT', hint: 'When stars come out \uD83C\uDF19', image: null},
        {word: 'CHAIR', hint: 'You sit on it \uD83E\uDE91', image: null},
        {word: 'TRAIN', hint: 'Rides on tracks \uD83D\uDE82', image: null},
        {
          word: 'CLOUD',
          hint: 'White and fluffy in the sky \u2601\uFE0F',
          image: null,
        },
      ],
    },
  },

  // =========================================================================
  // 34. Big Words (word-build + english)
  // =========================================================================
  {
    id: 'int-word-build-english-big-words-34',
    title: 'Big Words',
    description:
      'Challenge yourself to spell longer vocabulary words from mixed-up letters.',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'word-build',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\uD83C\uDFC6',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      words: [
        {
          word: 'ELEPHANT',
          hint: 'Largest land animal \uD83D\uDC18',
          image: null,
        },
        {
          word: 'BUTTERFLY',
          hint: 'Beautiful insect with wings \uD83E\uDD8B',
          image: null,
        },
        {
          word: 'DINOSAUR',
          hint: 'Ancient creature from long ago \uD83E\uDD95',
          image: null,
        },
        {
          word: 'MOUNTAIN',
          hint: 'Very tall landform \u26F0\uFE0F',
          image: null,
        },
        {
          word: 'TREASURE',
          hint: 'Hidden valuable things \uD83D\uDCB0',
          image: null,
        },
        {
          word: 'UMBRELLA',
          hint: 'Keeps you dry in rain \u2602\uFE0F',
          image: null,
        },
        {
          word: 'CALENDAR',
          hint: 'Shows days and months \uD83D\uDCC5',
          image: null,
        },
        {
          word: 'SANDWICH',
          hint: 'Bread with filling for lunch \uD83E\uDD6A',
          image: null,
        },
        {
          word: 'KANGAROO',
          hint: 'Hops around in Australia \uD83E\uDD98',
          image: null,
        },
        {
          word: 'CHOCOLATE',
          hint: 'Sweet brown treat \uD83C\uDF6B',
          image: null,
        },
      ],
    },
  },

  // =========================================================================
  // 35. Color Words (word-build + creativity)
  // =========================================================================
  {
    id: 'int-word-build-creativity-color-words-35',
    title: 'Color Words',
    description: 'Spell the names of colors from scrambled letters.',
    category: 'creativity',
    subcategory: 'colors',
    template: 'word-build',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83C\uDFA8',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      words: [
        {word: 'PURPLE', hint: 'Mix of red and blue \uD83D\uDFE3', image: null},
        {word: 'ORANGE', hint: 'Color of a sunset \uD83D\uDFE0', image: null},
        {word: 'YELLOW', hint: 'Color of the sun \u2600\uFE0F', image: null},
        {word: 'GREEN', hint: 'Color of grass \uD83D\uDFE2', image: null},
        {word: 'BROWN', hint: 'Color of chocolate \uD83D\uDFEB', image: null},
        {word: 'WHITE', hint: 'Color of snow \u2744\uFE0F', image: null},
        {word: 'BLACK', hint: 'Color of night sky \uD83C\uDF11', image: null},
        {word: 'PINK', hint: 'Light red color \uD83C\uDF38', image: null},
        {word: 'SILVER', hint: 'Shiny like a mirror \uD83E\uDE9E', image: null},
        {word: 'GOLDEN', hint: 'Color of a crown \uD83D\uDC51', image: null},
      ],
    },
  },

  // =========================================================================
  // 36. Number Words (word-build + math)
  // =========================================================================
  {
    id: 'int-word-build-math-number-words-36',
    title: 'Number Words',
    description: 'Spell number words from their jumbled letters.',
    category: 'math',
    subcategory: 'number words',
    template: 'word-build',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83D\uDD22',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      words: [
        {word: 'TWELVE', hint: 'A dozen = ?', image: null},
        {word: 'TWENTY', hint: '2 x 10 = ?', image: null},
        {word: 'HUNDRED', hint: '10 x 10 = ?', image: null},
        {word: 'FIFTEEN', hint: '10 + 5 = ?', image: null},
        {word: 'ELEVEN', hint: '10 + 1 = ?', image: null},
        {word: 'THIRTY', hint: '3 x 10 = ?', image: null},
        {word: 'EIGHT', hint: '4 + 4 = ?', image: null},
        {word: 'SEVEN', hint: 'Days in a week', image: null},
        {word: 'FORTY', hint: '4 x 10 = ?', image: null},
        {word: 'NINETY', hint: '9 x 10 = ?', image: null},
      ],
    },
  },

  // =========================================================================
  // 37. Speed Math (timed-rush + math)
  // =========================================================================
  {
    id: 'int-timed-rush-math-speed-math-37',
    title: 'Speed Math',
    description: 'Answer quick mental math questions before time runs out!',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'timed-rush',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\u26A1',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      timePerQuestion: 10,
      questions: [
        {
          question: '8 x 3 = ?',
          options: ['21', '24', '27', '32'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '45 + 27 = ?',
          options: ['62', '72', '82', '67'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '56 - 19 = ?',
          options: ['37', '47', '35', '43'],
          correctIndex: 0,
          concept: 'Subtraction',
        },
        {
          question: '6 x 7 = ?',
          options: ['36', '48', '42', '49'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
        {
          question: '100 - 34 = ?',
          options: ['76', '66', '56', '74'],
          correctIndex: 1,
          concept: 'Subtraction',
        },
        {
          question: '9 x 4 = ?',
          options: ['32', '36', '40', '28'],
          correctIndex: 1,
          concept: 'Multiplication',
        },
        {
          question: '38 + 45 = ?',
          options: ['73', '83', '93', '78'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: '72 - 28 = ?',
          options: ['54', '44', '34', '48'],
          correctIndex: 1,
          concept: 'Subtraction',
        },
        {
          question: '7 x 8 = ?',
          options: ['54', '48', '56', '64'],
          correctIndex: 2,
          concept: 'Multiplication',
        },
        {
          question: '63 + 29 = ?',
          options: ['82', '92', '88', '96'],
          correctIndex: 1,
          concept: 'Addition',
        },
      ],
    },
  },

  // =========================================================================
  // 38. Quick Spell (timed-rush + english)
  // =========================================================================
  {
    id: 'int-timed-rush-english-quick-spell-38',
    title: 'Quick Spell',
    description: 'Spot the correctly spelled word before time runs out!',
    category: 'english',
    subcategory: 'spelling',
    template: 'timed-rush',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDCA8',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      timePerQuestion: 8,
      questions: [
        {
          question: 'Which spelling is correct?',
          options: ['Beautful', 'Beautiful', 'Beutiful', 'Beautyful'],
          correctIndex: 1,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Becuase', 'Becasue', 'Because', 'Beacuse'],
          correctIndex: 2,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Freind', 'Frend', 'Firend', 'Friend'],
          correctIndex: 3,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Together', 'Togehter', 'Togather', 'Togethr'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Diffrent', 'Diferent', 'Different', 'Differant'],
          correctIndex: 2,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Importent', 'Important', 'Importint', 'Importunt'],
          correctIndex: 1,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Finaly', 'Finely', 'Finelly', 'Finally'],
          correctIndex: 3,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Separate', 'Seperate', 'Separete', 'Seperete'],
          correctIndex: 0,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Libary', 'Liberry', 'Library', 'Libery'],
          correctIndex: 2,
          concept: 'Spelling',
        },
        {
          question: 'Which spelling is correct?',
          options: ['Calender', 'Calandar', 'Calendar', 'Calander'],
          correctIndex: 2,
          concept: 'Spelling',
        },
      ],
    },
  },

  // =========================================================================
  // 39. Emergency Response (timed-rush + life-skills)
  // =========================================================================
  {
    id: 'int-timed-rush-life-skills-emergency-response-39',
    title: 'Emergency Response',
    description: 'Make quick safety decisions in emergency situations.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'timed-rush',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83D\uDEA8',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      timePerQuestion: 12,
      questions: [
        {
          question: 'Your smoke alarm goes off. What do you do first?',
          options: [
            'Hide under bed',
            'Leave the house',
            'Open windows',
            'Call a friend',
          ],
          correctIndex: 1,
          concept: 'Fire Safety',
        },
        {
          question: 'A stranger offers you candy. What do you do?',
          options: [
            'Take it politely',
            'Say no and walk away',
            'Ask what kind',
            'Follow them',
          ],
          correctIndex: 1,
          concept: 'Stranger Danger',
        },
        {
          question: 'You see someone fall and get hurt. What do you do?',
          options: [
            'Walk away',
            'Tell a trusted adult',
            'Try to move them',
            'Laugh at them',
          ],
          correctIndex: 1,
          concept: 'First Aid',
        },
        {
          question: 'There is a thunderstorm. Where is the safest place?',
          options: [
            'Under a tree',
            'In a swimming pool',
            'Inside a building',
            'On a hilltop',
          ],
          correctIndex: 2,
          concept: 'Weather Safety',
        },
        {
          question: 'You smell gas at home. What should you do?',
          options: [
            'Light a match to check',
            'Leave and tell an adult',
            'Ignore it',
            'Turn on the stove',
          ],
          correctIndex: 1,
          concept: 'Gas Safety',
        },
        {
          question: 'Your friend dares you to touch a hot stove. You should:',
          options: [
            'Do it quickly',
            'Refuse and walk away',
            'Use a glove',
            'Say maybe later',
          ],
          correctIndex: 1,
          concept: 'Peer Pressure',
        },
        {
          question: 'You find medicine on the floor. What do you do?',
          options: [
            'Taste it to check',
            'Give it to a pet',
            'Tell an adult right away',
            'Put it in your pocket',
          ],
          correctIndex: 2,
          concept: 'Poison Prevention',
        },
        {
          question: 'What number do you call in an emergency?',
          options: ['411', '611', '911', '311'],
          correctIndex: 2,
          concept: 'Emergency Calls',
        },
        {
          question: 'You are lost in a store. What do you do?',
          options: [
            'Leave the store',
            'Find a store worker',
            'Go with a stranger',
            'Start crying loudly',
          ],
          correctIndex: 1,
          concept: 'Being Lost',
        },
        {
          question: 'Your clothes catch fire. What do you do?',
          options: [
            'Run fast',
            'Stop, drop, and roll',
            'Jump in a pool',
            'Fan the flames',
          ],
          correctIndex: 1,
          concept: 'Fire Safety',
        },
      ],
    },
  },

  // =========================================================================
  // 40. Element Dash (timed-rush + science)
  // =========================================================================
  {
    id: 'int-timed-rush-science-element-dash-40',
    title: 'Element Dash',
    description:
      'Answer quick science questions about elements, the body, and nature.',
    category: 'science',
    subcategory: 'general science',
    template: 'timed-rush',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\uD83E\uDDEA',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      timePerQuestion: 10,
      questions: [
        {
          question: 'What gas do we breathe in?',
          options: ['Carbon dioxide', 'Nitrogen', 'Oxygen', 'Helium'],
          correctIndex: 2,
          concept: 'Respiration',
        },
        {
          question: 'What planet is closest to the Sun?',
          options: ['Venus', 'Mercury', 'Earth', 'Mars'],
          correctIndex: 1,
          concept: 'Solar System',
        },
        {
          question: 'What is H2O?',
          options: ['Salt', 'Sugar', 'Water', 'Air'],
          correctIndex: 2,
          concept: 'Chemistry',
        },
        {
          question: 'How many legs does an insect have?',
          options: ['4', '6', '8', '10'],
          correctIndex: 1,
          concept: 'Biology',
        },
        {
          question: 'What organ pumps blood through your body?',
          options: ['Brain', 'Lungs', 'Heart', 'Stomach'],
          correctIndex: 2,
          concept: 'Human Body',
        },
        {
          question: 'What force keeps us on the ground?',
          options: ['Magnetism', 'Friction', 'Gravity', 'Wind'],
          correctIndex: 2,
          concept: 'Physics',
        },
        {
          question: 'What gas do plants need to make food?',
          options: ['Oxygen', 'Nitrogen', 'Helium', 'Carbon dioxide'],
          correctIndex: 3,
          concept: 'Photosynthesis',
        },
        {
          question: 'What is the largest organ of the human body?',
          options: ['Liver', 'Brain', 'Skin', 'Heart'],
          correctIndex: 2,
          concept: 'Human Body',
        },
        {
          question: 'What is the boiling point of water?',
          options: ['50 C', '100 C', '150 C', '200 C'],
          correctIndex: 1,
          concept: 'States of Matter',
        },
        {
          question: 'Which animal is a mammal?',
          options: ['Shark', 'Frog', 'Dolphin', 'Snake'],
          correctIndex: 2,
          concept: 'Animal Classification',
        },
      ],
    },
  },

  // =========================================================================
  // 41. Lost Puppy Adventure (story-builder + english)
  // =========================================================================
  {
    id: 'int-story-builder-english-lost-puppy-41',
    title: 'Lost Puppy Adventure',
    description:
      'Make choices to help a lost puppy find its way home in this interactive story.',
    category: 'english',
    subcategory: 'reading comprehension',
    template: 'story-builder',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83D\uDC36',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      story: {
        title: 'The Lost Puppy',
        scenes: [
          {
            text: 'You are walking through the park when you hear a soft whimpering sound behind a bush. You peek and find a small, fluffy puppy all alone. It looks scared and hungry. What do you do?',
            choices: [
              {text: 'Look for a collar with a name tag', next: 1},
              {text: 'Offer the puppy some of your snack', next: 2},
            ],
          },
          {
            text: 'Great thinking! The collar says "Max" and has a phone number! You ask a nearby adult to help you call the number. The owner answers and sounds so relieved. They say they will come right away.',
            choices: [
              {text: 'Wait at the park bench with Max', next: 3},
              {text: 'Walk toward the park entrance to meet them', next: 3},
            ],
          },
          {
            text: 'You share a small piece of your apple with the puppy. It eats happily and wags its tail. Now that the puppy trusts you, you notice it has a shiny red collar!',
            choices: [
              {text: 'Read the tag on the collar', next: 1},
              {text: 'Ask the park ranger for help', next: 4},
            ],
          },
          {
            text: 'While you wait, Max curls up in your lap and falls asleep. A woman comes running up with a big smile. "Max! There you are!" she cries. She thanks you for being so kind and responsible.',
            choices: [
              {text: 'Say goodbye and pet Max one last time', next: 5},
              {text: 'Ask the owner how Max got lost', next: 6},
            ],
          },
          {
            text: 'The park ranger smiles and says, "We help lost pets all the time!" They scan the puppy\'s collar tag and find the owner\'s information. They call the owner right away.',
            choices: [
              {text: 'Wait with the ranger and the puppy', next: 3},
              {text: 'Help the ranger make the puppy comfortable', next: 3},
            ],
          },
          {
            text: 'You wave goodbye as Max trots away happily with his owner. You feel warm inside knowing you helped a little friend today. Your parents will be proud!',
            choices: [],
          },
          {
            text: '"He squeezed through a gap in the fence during the thunderstorm last night," the owner explains. "He\'s scared of loud noises." She gives you a card for free ice cream at her shop as a thank you!',
            choices: [{text: 'Wave goodbye to Max', next: 5}],
          },
        ],
        ending: 'You helped Max find his way home! \uD83D\uDC36',
      },
    },
  },

  // =========================================================================
  // 42. Friendship Challenge (story-builder + life-skills)
  // =========================================================================
  {
    id: 'int-story-builder-life-skills-friendship-challenge-42',
    title: 'Friendship Challenge',
    description:
      'Navigate social situations and learn about welcoming a new student.',
    category: 'life-skills',
    subcategory: 'social skills',
    template: 'story-builder',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83E\uDD1D',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      story: {
        title: 'The New Kid',
        scenes: [
          {
            text: 'A new student named Sam walks into your classroom. Sam looks nervous and is holding a lunchbox tightly. The teacher asks everyone to welcome Sam. What do you do?',
            choices: [
              {text: 'Wave and say "Hi Sam, welcome!"', next: 1},
              {text: 'Ask Sam to sit next to you', next: 2},
            ],
          },
          {
            text: 'Sam smiles shyly and waves back. At recess, you notice Sam sitting alone on a bench while everyone else plays. What do you do?',
            choices: [
              {text: 'Invite Sam to join your game', next: 3},
              {text: 'Sit with Sam and talk', next: 4},
            ],
          },
          {
            text: 'Sam sits next to you and whispers "thanks." During group work, Sam seems confused about the assignment. What do you do?',
            choices: [
              {text: 'Explain the assignment step by step', next: 3},
              {text: 'Ask the teacher to help Sam', next: 3},
            ],
          },
          {
            text: '"Want to play tag with us?" you ask. Sam\'s face lights up! While playing, another kid says "Why are you playing with the new kid?" How do you respond?',
            choices: [
              {text: '"Sam is really fun! Come join us!"', next: 5},
              {text: '"Everyone deserves friends. Be nice."', next: 5},
            ],
          },
          {
            text: 'You sit with Sam and learn that Sam just moved from another city. Sam loves drawing and has a pet hamster named Whiskers! You have a lot in common.',
            choices: [
              {text: 'Show Sam around the school', next: 5},
              {text: 'Invite Sam to your friend group at lunch', next: 6},
            ],
          },
          {
            text: 'By the end of the week, Sam has joined your friend group. Sam even shows everyone an amazing drawing of the whole class! Sam tells you, "Thanks for being my first friend here."',
            choices: [{text: '"That\'s what friends are for!"', next: 7}],
          },
          {
            text: 'At lunch, your friends welcome Sam warmly. One friend shares some grapes, another tells a funny joke. Sam laughs for the first time all day.',
            choices: [{text: 'Plan to hang out after school', next: 7}],
          },
          {
            text: 'You and Sam become great friends. Sam teaches you how to draw cool cartoons, and you teach Sam your favorite card game. Making someone feel welcome made everyone happier!',
            choices: [],
          },
        ],
        ending: 'You made a new friend! \uD83E\uDD1D',
      },
    },
  },

  // =========================================================================
  // 43. Space Mission (story-builder + creativity)
  // =========================================================================
  {
    id: 'int-story-builder-creativity-space-mission-43',
    title: 'Space Mission',
    description:
      'Lead a creative space adventure to explore Mars and make discoveries.',
    category: 'creativity',
    subcategory: 'creative writing',
    template: 'story-builder',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83D\uDE80',
    estimatedMinutes: 7,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      story: {
        title: 'Mission to Mars',
        scenes: [
          {
            text: 'Commander, welcome aboard the spaceship Star Explorer! Today is launch day. Your crew of three is ready. The countdown begins: 5... 4... 3... 2... 1... Blastoff! As Earth gets smaller behind you, you see something floating outside. What do you do?',
            choices: [
              {text: 'Use the telescope to get a closer look', next: 1},
              {text: 'Focus on the mission and head to Mars', next: 2},
            ],
          },
          {
            text: 'Through the telescope, you see a beautiful comet with a sparkling blue tail! Your science officer says it might have ice crystals. You could collect a sample, but it would delay the trip.',
            choices: [
              {text: 'Collect the comet sample', next: 3},
              {text: 'Take photos and continue to Mars', next: 2},
            ],
          },
          {
            text: 'After three months of travel, Mars appears as a glowing red dot that grows larger each day. Your pilot guides the ship into orbit. Below you see rusty red deserts, tall volcanoes, and deep canyons. Where do you land?',
            choices: [
              {text: 'Near the giant volcano Olympus Mons', next: 4},
              {text: 'In the deep Valles Marineris canyon', next: 5},
            ],
          },
          {
            text: 'Amazing! You collected ice crystals from the comet. Your lab analysis shows they contain water and organic molecules, the building blocks of life! This is a huge discovery. You send the data to Earth.',
            choices: [{text: 'Continue the journey to Mars', next: 2}],
          },
          {
            text: 'You land near Olympus Mons, the tallest volcano in the solar system. It is three times taller than Mount Everest! While exploring, your robot scout finds a cave entrance in the mountainside.',
            choices: [
              {text: 'Explore the cave carefully', next: 6},
              {text: 'Set up base camp first, then explore', next: 6},
            ],
          },
          {
            text: 'The canyon is breathtaking, deeper than the Grand Canyon on Earth! Your sensors detect something unusual underground: a signal that repeats every 30 seconds.',
            choices: [
              {text: 'Follow the signal deeper', next: 6},
              {text: 'Report the signal to Earth first', next: 6},
            ],
          },
          {
            text: 'Deep inside your exploration site, your flashlight reveals something incredible: walls covered in crystal formations that glow faintly blue. Your science officer gasps: "These crystals contain frozen water! Mars once had flowing water!"',
            choices: [
              {text: 'Collect crystal samples for Earth', next: 7},
              {text: 'Take photos and map the entire area', next: 7},
            ],
          },
          {
            text: 'You send your discovery back to Earth. Scientists around the world celebrate! Your crew plants a flag near the discovery site and takes a group photo. It is time to head home as heroes of space exploration.',
            choices: [],
          },
        ],
        ending: 'Mission accomplished! \uD83D\uDE80',
      },
    },
  },

  // =========================================================================
  // 44. Magic Forest (story-builder + creativity)
  // =========================================================================
  {
    id: 'int-story-builder-creativity-magic-forest-44',
    title: 'Magic Forest',
    description:
      'Explore a magical forest filled with enchanted creatures and surprises.',
    category: 'creativity',
    subcategory: 'imaginative play',
    template: 'story-builder',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83C\uDF32\u2728',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      story: {
        title: 'The Magic Forest',
        scenes: [
          {
            text: 'You discover a glowing door in the trunk of an old oak tree. When you touch it, it swings open to reveal a forest full of color! The trees have rainbow leaves and the flowers sing softly. A tiny fairy flies up to you and says, "The forest needs your help! A grumpy troll has stolen all the sunlight crystals." What do you do?',
            choices: [
              {text: 'Ask the fairy for more information', next: 1},
              {text: "Follow the path toward the troll's bridge", next: 2},
            ],
          },
          {
            text: 'The fairy explains: "The troll hid three sunlight crystals around the forest. Without them, our flowers cannot sing and the rainbow leaves will fade." She gives you a magic map that glows when you are near a crystal.',
            choices: [
              {text: 'Head to the Whispering Waterfall', next: 3},
              {text: 'Visit the Mushroom Village first', next: 4},
            ],
          },
          {
            text: 'You walk down a winding path covered in soft, glowing moss. At the bridge, you see the grumpy troll sitting on a pile of rocks. He looks... sad? His eyes are red like he has been crying.',
            choices: [
              {text: 'Ask the troll why he is sad', next: 5},
              {text: 'Sneak past while he is not looking', next: 3},
            ],
          },
          {
            text: 'Behind the waterfall, your map glows brightly! You reach into the water and find a golden crystal. One down, two to go! A friendly talking fish says, "The next one is in the Mushroom Village."',
            choices: [
              {text: 'Thank the fish and head to Mushroom Village', next: 4},
            ],
          },
          {
            text: 'The Mushroom Village is full of tiny houses made from giant spotted mushrooms. A kind old gnome gives you the second crystal. "The third crystal is with the troll at the bridge," he says. "But be gentle with him. He is lonely."',
            choices: [{text: 'Go talk to the troll kindly', next: 5}],
          },
          {
            text: '"Nobody ever visits me," the troll sniffles. "I took the crystals so someone would come talk to me." You realize the troll just wanted a friend! What do you say?',
            choices: [
              {
                text: '"If you return the crystal, you can be our friend!"',
                next: 6,
              },
              {text: '"Let\'s return the crystals together!"', next: 6},
            ],
          },
          {
            text: 'The troll smiles for the first time in years! He gives you the last crystal and helps you place all three back in the Great Tree. The forest bursts with light, the flowers sing loudly, and every creature cheers!',
            choices: [
              {text: 'Invite the troll to the celebration party', next: 7},
            ],
          },
          {
            text: 'The forest throws the biggest party ever! The troll dances with fairies, gnomes play music, and the singing flowers perform a concert. The fairy crowns you "Friend of the Forest." As you step back through the oak door, you know you can return anytime.',
            choices: [],
          },
        ],
        ending: 'The forest is saved! \uD83C\uDF32\u2728',
      },
    },
  },

  // =========================================================================
  // 45. Lemonade Stand (simulation + math)
  // =========================================================================
  {
    id: 'int-simulation-math-lemonade-stand-45',
    title: 'Lemonade Stand',
    description:
      'Run your own lemonade business by making smart money decisions.',
    category: 'math',
    subcategory: 'money',
    template: 'simulation',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83C\uDF4B',
    estimatedMinutes: 7,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      scenario: {
        title: 'Lemonade Stand',
        startResources: {money: 10, lemons: 20, sugar: 10, cups: 15},
        rounds: [
          {
            situation:
              'It is a hot sunny day! Lots of people are walking by. How many cups of lemonade will you make?',
            decisions: [
              {
                text: '5 cups ($1 each)',
                effect: {money: 5, lemons: -5, sugar: -3, cups: -5},
              },
              {
                text: '10 cups ($1 each)',
                effect: {money: 10, lemons: -10, sugar: -5, cups: -10},
              },
              {
                text: '15 cups ($1 each)',
                effect: {money: 15, lemons: -15, sugar: -8, cups: -15},
              },
            ],
          },
          {
            situation:
              'A supplier is selling lemons. 10 lemons cost $3 or 20 lemons cost $5. What do you buy?',
            decisions: [
              {text: '10 lemons for $3', effect: {money: -3, lemons: 10}},
              {text: '20 lemons for $5', effect: {money: -5, lemons: 20}},
              {text: 'No lemons today', effect: {}},
            ],
          },
          {
            situation:
              'It starts to rain! Fewer customers are walking by. How many cups do you make?',
            decisions: [
              {
                text: '3 cups ($1 each)',
                effect: {money: 3, lemons: -3, sugar: -2, cups: -3},
              },
              {
                text: '8 cups ($1 each, some may not sell)',
                effect: {money: 4, lemons: -8, sugar: -4, cups: -8},
              },
              {text: 'Close for the day', effect: {}},
            ],
          },
          {
            situation:
              'A school group walks by! The teacher asks if you can make 12 cups for $10 total. What do you say?',
            decisions: [
              {
                text: 'Yes! $10 for 12 cups',
                effect: {money: 10, lemons: -12, sugar: -6, cups: -12},
              },
              {
                text: 'No, full price only ($12)',
                effect: {money: 12, lemons: -12, sugar: -6, cups: -12},
              },
              {
                text: 'Offer 8 cups for $8',
                effect: {money: 8, lemons: -8, sugar: -4, cups: -8},
              },
            ],
          },
          {
            situation:
              'You are running low on cups! A store sells 10 cups for $2 or 20 cups for $3. What do you buy?',
            decisions: [
              {text: '10 cups for $2', effect: {money: -2, cups: 10}},
              {text: '20 cups for $3', effect: {money: -3, cups: 20}},
              {
                text: 'Make cups from paper (free but takes time)',
                effect: {cups: 5},
              },
            ],
          },
          {
            situation:
              'The weekend is here! You could set up at the park where there are more people, but it costs $2 for a spot. Or stay on your street for free.',
            decisions: [
              {
                text: 'Pay $2 for the park spot (sell 12 cups)',
                effect: {money: 10, lemons: -12, sugar: -6, cups: -12},
              },
              {
                text: 'Stay on your street (sell 6 cups)',
                effect: {money: 6, lemons: -6, sugar: -3, cups: -6},
              },
              {text: 'Take the day off', effect: {}},
            ],
          },
          {
            situation:
              'Your neighbor wants to buy ALL your remaining lemonade supplies for $8. Or you can keep selling cups yourself.',
            decisions: [
              {
                text: 'Sell everything for $8',
                effect: {money: 8, lemons: -999, sugar: -999, cups: -999},
              },
              {
                text: 'Keep selling cups at $1 each',
                effect: {money: 5, lemons: -5, sugar: -3, cups: -5},
              },
              {
                text: 'Sell half the supplies for $4',
                effect: {money: 4, lemons: -5, sugar: -3},
              },
            ],
          },
          {
            situation:
              'Last day of summer! You count your money and decide what to do with your earnings.',
            decisions: [
              {text: 'Save it all in your piggy bank', effect: {money: 0}},
              {
                text: 'Buy supplies for next summer',
                effect: {money: -5, lemons: 15, sugar: 10, cups: 15},
              },
              {text: 'Donate half to charity', effect: {money: -5}},
            ],
          },
        ],
      },
    },
  },

  // =========================================================================
  // 46. Pet Care (simulation + life-skills)
  // =========================================================================
  {
    id: 'int-simulation-life-skills-pet-care-46',
    title: 'Pet Care',
    description:
      'Take care of a virtual puppy by making responsible decisions.',
    category: 'life-skills',
    subcategory: 'responsibility',
    template: 'simulation',
    difficulty: 1,
    ageRange: [5, 8],
    emoji: '\uD83D\uDC36',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      scenario: {
        title: 'My Pet Dog',
        startResources: {happiness: 50, health: 50, energy: 50},
        rounds: [
          {
            situation: 'Your puppy looks hungry! What do you do?',
            decisions: [
              {
                text: 'Feed healthy food \uD83E\uDD57',
                effect: {health: 20, happiness: 10, energy: 10},
              },
              {
                text: 'Give treats \uD83C\uDF6C',
                effect: {happiness: 20, health: -5, energy: 5},
              },
              {
                text: 'Ignore it',
                effect: {happiness: -20, health: -10, energy: -5},
              },
            ],
          },
          {
            situation:
              'Your puppy is full of energy and wants to play! What activity do you choose?',
            decisions: [
              {
                text: 'Go for a walk in the park \uD83C\uDFDE\uFE0F',
                effect: {happiness: 15, health: 15, energy: -10},
              },
              {
                text: 'Play fetch in the yard \uD83C\uDFBE',
                effect: {happiness: 20, health: 10, energy: -15},
              },
              {
                text: 'Let the puppy watch TV \uD83D\uDCFA',
                effect: {happiness: 5, health: -5, energy: 5},
              },
            ],
          },
          {
            situation:
              'It is bath time! Your puppy hates baths. What do you do?',
            decisions: [
              {
                text: 'Give a gentle bath with warm water \uD83D\uDEC1',
                effect: {health: 15, happiness: -5, energy: -5},
              },
              {
                text: 'Skip the bath today',
                effect: {health: -10, happiness: 5, energy: 0},
              },
              {
                text: 'Use a brush instead \uD83E\uDEB5',
                effect: {health: 10, happiness: 5, energy: -5},
              },
            ],
          },
          {
            situation:
              'Your puppy keeps scratching its ear. It might be sick. What do you do?',
            decisions: [
              {
                text: 'Take it to the vet \uD83C\uDFE5',
                effect: {health: 25, happiness: -5, energy: -5},
              },
              {
                text: 'Wait and see if it stops',
                effect: {health: -15, happiness: -10, energy: 0},
              },
              {
                text: 'Clean the ear gently',
                effect: {health: 10, happiness: 0, energy: -5},
              },
            ],
          },
          {
            situation:
              'A friend comes over and wants to play rough with your puppy. What do you say?',
            decisions: [
              {
                text: '"Let\'s play gently with toys instead" \uD83E\uDDF8',
                effect: {happiness: 15, health: 5, energy: -10},
              },
              {
                text: '"Sure, go ahead!"',
                effect: {happiness: 5, health: -10, energy: -15},
              },
              {
                text: '"My puppy needs to rest right now"',
                effect: {happiness: 5, health: 5, energy: 10},
              },
            ],
          },
          {
            situation: 'It is bedtime for your puppy. Where does it sleep?',
            decisions: [
              {
                text: 'In a cozy dog bed with a blanket \uD83D\uDECF\uFE0F',
                effect: {happiness: 10, health: 10, energy: 20},
              },
              {
                text: 'On the cold floor',
                effect: {happiness: -10, health: -5, energy: 10},
              },
              {
                text: 'In your bed with you',
                effect: {happiness: 15, health: 0, energy: 15},
              },
            ],
          },
          {
            situation: 'Your puppy chewed up a shoe! How do you react?',
            decisions: [
              {
                text: 'Say "No" firmly and give a chew toy instead \uD83E\uDDB4',
                effect: {happiness: 5, health: 5, energy: 0},
              },
              {
                text: 'Yell at the puppy',
                effect: {happiness: -20, health: -5, energy: -5},
              },
              {
                text: 'Ignore it and hide your shoes',
                effect: {happiness: 0, health: 0, energy: 0},
              },
            ],
          },
          {
            situation: 'Your puppy learned a new trick! How do you reward it?',
            decisions: [
              {
                text: 'Praise and a small healthy treat \uD83C\uDF56',
                effect: {happiness: 20, health: 5, energy: 5},
              },
              {
                text: 'Give lots of treats \uD83C\uDF6A',
                effect: {happiness: 15, health: -10, energy: 5},
              },
              {
                text: 'Just a pat on the head',
                effect: {happiness: 10, health: 0, energy: 0},
              },
            ],
          },
        ],
      },
    },
  },

  // =========================================================================
  // 47. Budget Hero (simulation + life-skills)
  // =========================================================================
  {
    id: 'int-simulation-life-skills-budget-hero-47',
    title: 'Budget Hero',
    description:
      'Learn to manage a weekly allowance by making smart spending choices.',
    category: 'life-skills',
    subcategory: 'financial literacy',
    template: 'simulation',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\uD83D\uDCB0',
    estimatedMinutes: 7,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      scenario: {
        title: 'Budget Hero',
        startResources: {money: 20, happiness: 50, savings: 0},
        rounds: [
          {
            situation:
              'You just received your $20 weekly allowance! Your piggy bank is empty. A friend says everyone is buying a new toy for $12. What do you do?',
            decisions: [
              {
                text: 'Buy the toy ($12)',
                effect: {money: -12, happiness: 15, savings: 0},
              },
              {
                text: 'Save half, spend half on a snack ($3)',
                effect: {money: -3, happiness: 5, savings: 7},
              },
              {
                text: 'Save it all for something bigger',
                effect: {money: 0, happiness: -5, savings: 10},
              },
            ],
          },
          {
            situation:
              'Your school is selling cookies for a fundraiser. Each cookie costs $2. Your friend has no money and looks sad.',
            decisions: [
              {
                text: 'Buy 2 cookies: one for you, one for your friend ($4)',
                effect: {money: -4, happiness: 15, savings: 0},
              },
              {
                text: 'Buy 1 cookie for yourself ($2)',
                effect: {money: -2, happiness: 5, savings: 0},
              },
              {
                text: 'Skip the cookies and save your money',
                effect: {money: 0, happiness: -5, savings: 2},
              },
            ],
          },
          {
            situation:
              'You find a $5 bill on the ground at school! Nobody is around. What do you do?',
            decisions: [
              {
                text: 'Turn it in to the lost and found',
                effect: {money: 0, happiness: 10, savings: 0},
              },
              {
                text: 'Keep it and add to savings',
                effect: {money: 5, happiness: 5, savings: 5},
              },
              {
                text: 'Spend it on candy',
                effect: {money: 5, happiness: 10, savings: 0},
              },
            ],
          },
          {
            situation:
              'Your favorite book series has a new release for $8. You also need a new notebook for school ($3). You have enough for both, but not much left after.',
            decisions: [
              {
                text: 'Buy both ($11)',
                effect: {money: -11, happiness: 10, savings: 0},
              },
              {
                text: 'Just the notebook (need) and save for the book',
                effect: {money: -3, happiness: 0, savings: 3},
              },
              {
                text: 'Check if the library has the book, buy the notebook',
                effect: {money: -3, happiness: 10, savings: 3},
              },
            ],
          },
          {
            situation:
              'Your grandma gives you $10 for your birthday! What is your plan?',
            decisions: [
              {
                text: 'Put it all in savings',
                effect: {money: 0, happiness: 0, savings: 10},
              },
              {
                text: 'Save $7, treat yourself to ice cream ($3)',
                effect: {money: -3, happiness: 10, savings: 7},
              },
              {
                text: 'Spend it all on video games',
                effect: {money: -10, happiness: 15, savings: 0},
              },
            ],
          },
          {
            situation:
              'There is a garage sale in your neighborhood. You find a cool used bike for $15. Your old bike still works but is small.',
            decisions: [
              {
                text: 'Buy the bike ($15)',
                effect: {money: -15, happiness: 20, savings: 0},
              },
              {
                text: 'Offer $10 and negotiate',
                effect: {money: -10, happiness: 15, savings: 0},
              },
              {
                text: 'Keep saving. Your old bike is fine for now.',
                effect: {money: 0, happiness: 0, savings: 5},
              },
            ],
          },
          {
            situation:
              'Your friend wants you to split the cost of a $6 pizza for lunch. You brought lunch from home already.',
            decisions: [
              {
                text: 'Split the pizza ($3) and eat your lunch later',
                effect: {money: -3, happiness: 10, savings: 0},
              },
              {
                text: 'Eat your packed lunch and save money',
                effect: {money: 0, happiness: 5, savings: 2},
              },
              {
                text: 'Buy your own full pizza ($6)',
                effect: {money: -6, happiness: 10, savings: 0},
              },
            ],
          },
          {
            situation:
              'End of the month! Time to review. You can see your savings total. A charity at school is collecting for kids who need school supplies.',
            decisions: [
              {
                text: 'Donate $3 to the charity drive',
                effect: {money: -3, happiness: 15, savings: 0},
              },
              {
                text: 'Donate $1 and keep saving',
                effect: {money: -1, happiness: 10, savings: 2},
              },
              {
                text: 'Keep all your money this time',
                effect: {money: 0, happiness: 0, savings: 3},
              },
            ],
          },
        ],
      },
    },
  },

  // =========================================================================
  // 48. Garden Grow (simulation + science)
  // =========================================================================
  {
    id: 'int-simulation-science-garden-grow-48',
    title: 'Garden Grow',
    description: 'Grow a garden by learning about water, sunlight, and soil.',
    category: 'science',
    subcategory: 'botany',
    template: 'simulation',
    difficulty: 2,
    ageRange: [6, 9],
    emoji: '\uD83C\uDF3B',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      scenario: {
        title: 'My Garden',
        startResources: {water: 100, seeds: 10, growth: 0, bugs: 0},
        rounds: [
          {
            situation:
              'Spring has arrived! Time to start your garden. How do you prepare the soil?',
            decisions: [
              {
                text: 'Add compost and mix the soil well \uD83E\uDEB1',
                effect: {growth: 15, seeds: 0, water: 0, bugs: 0},
              },
              {
                text: 'Just dig a hole and plant seeds',
                effect: {growth: 5, seeds: -2, water: 0, bugs: 0},
              },
              {
                text: 'Add lots of water to soften the soil',
                effect: {growth: 8, water: -20, bugs: 0},
              },
            ],
          },
          {
            situation:
              'Time to plant! You have 10 seeds. How many do you plant today?',
            decisions: [
              {
                text: 'Plant 3 seeds with good spacing \uD83C\uDF31',
                effect: {seeds: -3, growth: 10, water: -10, bugs: 0},
              },
              {
                text: 'Plant all 10 seeds close together',
                effect: {seeds: -10, growth: 5, water: -15, bugs: 5},
              },
              {
                text: 'Plant 5 seeds in a row',
                effect: {seeds: -5, growth: 8, water: -10, bugs: 0},
              },
            ],
          },
          {
            situation:
              'The sun is very strong today. Your plants look droopy. What do you do?',
            decisions: [
              {
                text: 'Water them in the early morning \uD83D\uDCA7',
                effect: {water: -15, growth: 12, bugs: 0},
              },
              {
                text: 'Water them in the hot afternoon',
                effect: {water: -25, growth: 5, bugs: 0},
              },
              {
                text: 'Put a shade cloth over them \u2602\uFE0F',
                effect: {water: -5, growth: 10, bugs: 0},
              },
            ],
          },
          {
            situation:
              'Oh no! You spot tiny green bugs on your leaves. They are eating your plants!',
            decisions: [
              {
                text: 'Spray with soapy water (natural remedy) \uD83E\uDDF4',
                effect: {bugs: -8, growth: 5, water: -10},
              },
              {
                text: 'Introduce ladybugs (they eat the bugs!) \uD83D\uDC1E',
                effect: {bugs: -10, growth: 8, water: 0},
              },
              {
                text: 'Pick the bugs off by hand',
                effect: {bugs: -5, growth: 3, water: 0},
              },
            ],
          },
          {
            situation:
              'It has not rained in a week. Your water supply is getting low. How do you conserve water?',
            decisions: [
              {
                text: 'Use mulch around plants to keep moisture \uD83C\uDF3E',
                effect: {water: 10, growth: 8, bugs: 0},
              },
              {
                text: 'Water only the roots, not the leaves',
                effect: {water: -5, growth: 10, bugs: -2},
              },
              {
                text: 'Set up a rain collection barrel',
                effect: {water: 25, growth: 5, bugs: 0},
              },
            ],
          },
          {
            situation:
              'Your plants are growing! You see tiny flower buds starting to form. A strong wind storm is coming tonight.',
            decisions: [
              {
                text: 'Put stakes next to plants for support \uD83E\uDEB5',
                effect: {growth: 10, water: 0, bugs: 0},
              },
              {
                text: 'Cover plants with a tarp',
                effect: {growth: 5, water: 5, bugs: 2},
              },
              {
                text: 'Hope for the best',
                effect: {growth: -5, water: 5, bugs: 0},
              },
            ],
          },
          {
            situation:
              'A neighbor asks if you want to swap some of your seeds for their tomato seeds. You have a few seeds left.',
            decisions: [
              {
                text: 'Trade 2 seeds for tomato seeds \uD83C\uDF45',
                effect: {seeds: -2, growth: 10, water: -5, bugs: 0},
              },
              {
                text: 'Keep all your seeds',
                effect: {seeds: 0, growth: 5, water: 0, bugs: 0},
              },
              {
                text: 'Give seeds as a gift and ask for gardening tips',
                effect: {seeds: -3, growth: 12, water: 0, bugs: -3},
              },
            ],
          },
          {
            situation:
              'Harvest time! Your plants have fruit and vegetables ready to pick. What do you do with the harvest?',
            decisions: [
              {
                text: 'Share with family and neighbors \uD83E\uDD57',
                effect: {growth: 5, water: 0, seeds: 3, bugs: 0},
              },
              {
                text: 'Save seeds from the best plants for next year',
                effect: {growth: 0, water: 0, seeds: 8, bugs: 0},
              },
              {
                text: 'Make a big garden salad celebration \uD83E\uDD57',
                effect: {growth: 0, water: 0, seeds: 2, bugs: 0},
              },
            ],
          },
        ],
      },
    },
  },

  // =========================================================================
  // 49. Spot the Typo (spot-difference + english)
  // =========================================================================
  {
    id: 'int-spot-difference-english-spot-the-typo-49',
    title: 'Spot the Typo',
    description: 'Find the misspelled word hiding in each sentence.',
    category: 'english',
    subcategory: 'spelling',
    template: 'spot-difference',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDD0D',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Find the misspelled word',
          text: 'The beatiful butterfly flew over the garden.',
          differences: [{word: 'beatiful', correct: 'beautiful', position: 1}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'My frend and I went to the park after school.',
          differences: [{word: 'frend', correct: 'friend', position: 1}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'The elefant sprayed water with its long trunk.',
          differences: [{word: 'elefant', correct: 'elephant', position: 1}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'We had a wonderfull time at the beach yesterday.',
          differences: [
            {word: 'wonderfull', correct: 'wonderful', position: 3},
          ],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'The children were exited about the field trip.',
          differences: [{word: 'exited', correct: 'excited', position: 3}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'She ate an appel and a banana for breakfast.',
          differences: [{word: 'appel', correct: 'apple', position: 2}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'The libary has many interesting books to read.',
          differences: [{word: 'libary', correct: 'library', position: 1}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'It is importent to drink water every day.',
          differences: [{word: 'importent', correct: 'important', position: 2}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'The scinetist discovered a new species of frog.',
          differences: [{word: 'scinetist', correct: 'scientist', position: 1}],
          concept: 'Spelling',
        },
        {
          prompt: 'Find the misspelled word',
          text: 'Please remembar to bring your homework tomorrow.',
          differences: [{word: 'remembar', correct: 'remember', position: 1}],
          concept: 'Spelling',
        },
      ],
    },
  },

  // =========================================================================
  // 50. Safety Spotter (spot-difference + life-skills)
  // =========================================================================
  {
    id: 'int-spot-difference-life-skills-safety-spotter-50',
    title: 'Safety Spotter',
    description:
      'Spot the unsafe things in each scene to learn about home and school safety.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'spot-difference',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\u26A0\uFE0F',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: "What's unsafe in this kitchen?",
          description:
            'A kitchen scene with: hot stove unattended, spilled water on floor, knife on edge of counter.',
          differences: [
            {id: 'd1', label: 'Hot stove unattended', x: 30, y: 40},
            {id: 'd2', label: 'Spilled water on floor', x: 50, y: 70},
            {id: 'd3', label: 'Knife on edge of counter', x: 70, y: 30},
          ],
          concept: 'Kitchen Safety',
        },
        {
          prompt: "What's unsafe in this bathroom?",
          description:
            'A bathroom scene with: wet floor with no mat, hair dryer near water, medicine cabinet open.',
          differences: [
            {id: 'd1', label: 'Wet floor with no bath mat', x: 40, y: 65},
            {id: 'd2', label: 'Hair dryer near the sink water', x: 60, y: 35},
            {
              id: 'd3',
              label: 'Open medicine cabinet within reach',
              x: 25,
              y: 25,
            },
          ],
          concept: 'Bathroom Safety',
        },
        {
          prompt: "What's unsafe in this living room?",
          description:
            'A living room scene with: candle left burning alone, electrical cord across walkway, small toy pieces near a baby.',
          differences: [
            {
              id: 'd1',
              label: 'Candle burning with nobody watching',
              x: 65,
              y: 30,
            },
            {
              id: 'd2',
              label: 'Electrical cord across the walkway',
              x: 40,
              y: 60,
            },
            {id: 'd3', label: 'Small toy pieces near a baby', x: 20, y: 55},
          ],
          concept: 'Living Room Safety',
        },
        {
          prompt: "What's unsafe on this playground?",
          description:
            'A playground scene with: broken swing chain, child climbing outside the fence, sharp rocks under the slide.',
          differences: [
            {id: 'd1', label: 'Broken swing chain', x: 25, y: 35},
            {id: 'd2', label: 'Child climbing outside the fence', x: 75, y: 40},
            {id: 'd3', label: 'Sharp rocks under the slide', x: 50, y: 70},
          ],
          concept: 'Playground Safety',
        },
        {
          prompt: "What's unsafe on this street?",
          description:
            'A street scene with: child running into the road, bicycle without a helmet rider, car backing up near kids.',
          differences: [
            {id: 'd1', label: 'Child running into the road', x: 45, y: 50},
            {id: 'd2', label: 'Cyclist without a helmet', x: 70, y: 40},
            {id: 'd3', label: 'Car backing up near children', x: 20, y: 45},
          ],
          concept: 'Road Safety',
        },
        {
          prompt: "What's unsafe in this bedroom?",
          description:
            'A bedroom scene with: curtain cord hanging low, toys on the stairs, nightlight covered by a blanket.',
          differences: [
            {id: 'd1', label: 'Curtain cord hanging low', x: 30, y: 30},
            {id: 'd2', label: 'Toys scattered on the stairs', x: 60, y: 55},
            {id: 'd3', label: 'Nightlight covered by a blanket', x: 75, y: 65},
          ],
          concept: 'Bedroom Safety',
        },
        {
          prompt: "What's unsafe in this garage?",
          description:
            'A garage scene with: chemicals on a low shelf, ladder leaning loosely, tools left on the floor.',
          differences: [
            {
              id: 'd1',
              label: 'Chemicals on a low shelf kids can reach',
              x: 25,
              y: 45,
            },
            {
              id: 'd2',
              label: 'Unstable ladder leaning against wall',
              x: 55,
              y: 30,
            },
            {id: 'd3', label: 'Sharp tools left on the floor', x: 70, y: 65},
          ],
          concept: 'Garage Safety',
        },
        {
          prompt: "What's unsafe at this swimming pool?",
          description:
            'A pool scene with: child swimming alone without an adult, running on wet pool deck, glass cups near the pool edge.',
          differences: [
            {
              id: 'd1',
              label: 'Child swimming with no adult watching',
              x: 40,
              y: 45,
            },
            {id: 'd2', label: 'Running on the wet pool deck', x: 65, y: 55},
            {id: 'd3', label: 'Glass cups near the pool edge', x: 20, y: 60},
          ],
          concept: 'Pool Safety',
        },
      ],
    },
  },
];

export default GAMES_BATCH_2;
