/**
 * Kids Learning Zone - Interactive Games Batch 1 (Games 1-25 of 100)
 *
 * 25 game configurations spanning multiple templates and categories.
 * Each game contains full, real educational content ready for play.
 *
 * Templates used: multiple-choice, true-false, fill-blank, match-pairs,
 *                 memory-flip, counting, drag-to-zone
 *
 * Categories: math, english, life-skills, science, creativity
 */

const GAMES_BATCH_1 = [
  // =========================================================================
  // 1. Addition Adventure (multiple-choice + math)
  // =========================================================================
  {
    id: 'int-multiple-choice-math-addition-01',
    title: 'Addition Adventure',
    description: 'Practice simple addition with numbers up to 20.',
    category: 'math',
    subcategory: 'addition',
    template: 'multiple-choice',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '➕',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'What is 3 + 4?',
          options: ['5', '6', '7', '8'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 2 + 6?',
          options: ['6', '7', '8', '9'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 5 + 5?',
          options: ['8', '9', '10', '11'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 1 + 9?',
          options: ['8', '9', '10', '11'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 7 + 3?',
          options: ['9', '10', '11', '12'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: 'What is 4 + 8?',
          options: ['10', '11', '12', '13'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 6 + 6?',
          options: ['10', '11', '12', '13'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 9 + 2?',
          options: ['10', '11', '12', '13'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: 'What is 8 + 5?',
          options: ['11', '12', '13', '14'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 7 + 7?',
          options: ['12', '13', '14', '15'],
          correctIndex: 2,
          concept: 'Addition',
        },
      ],
    },
  },

  // =========================================================================
  // 2. Word Meanings (multiple-choice + english)
  // =========================================================================
  {
    id: 'int-multiple-choice-english-vocabulary-02',
    title: 'Word Meanings',
    description: 'Learn what big words really mean.',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'multiple-choice',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '📖',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: "What does 'enormous' mean?",
          options: ['Tiny', 'Very large', 'Fast', 'Colorful'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'brave' mean?",
          options: ['Scared', 'Lazy', 'Courageous', 'Quiet'],
          correctIndex: 2,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'ancient' mean?",
          options: ['New', 'Very old', 'Broken', 'Shiny'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'fragile' mean?",
          options: ['Strong', 'Heavy', 'Easily broken', 'Colorful'],
          correctIndex: 2,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'generous' mean?",
          options: ['Mean', 'Giving freely', 'Tired', 'Angry'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'curious' mean?",
          options: ['Bored', 'Sleepy', 'Eager to learn', 'Afraid'],
          correctIndex: 2,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'rapid' mean?",
          options: ['Slow', 'Very fast', 'Quiet', 'Tall'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'brilliant' mean?",
          options: ['Dull', 'Dark', 'Very bright or smart', 'Small'],
          correctIndex: 2,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'vanish' mean?",
          options: ['Appear', 'Disappear', 'Grow', 'Shrink'],
          correctIndex: 1,
          concept: 'Vocabulary',
        },
        {
          question: "What does 'exhausted' mean?",
          options: ['Excited', 'Happy', 'Very tired', 'Hungry'],
          correctIndex: 2,
          concept: 'Vocabulary',
        },
      ],
    },
  },

  // =========================================================================
  // 3. Kitchen Safety (multiple-choice + life-skills)
  // =========================================================================
  {
    id: 'int-multiple-choice-life-skills-kitchen-safety-03',
    title: 'Kitchen Safety',
    description: 'Learn important rules to stay safe in the kitchen.',
    category: 'life-skills',
    subcategory: 'safety',
    template: 'multiple-choice',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '🍳',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'What should you do before cooking?',
          options: ['Run around', 'Wash your hands', 'Watch TV', 'Sleep'],
          correctIndex: 1,
          concept: 'Hygiene',
        },
        {
          question: 'Who should use sharp knives?',
          options: ['Babies', 'Pets', 'Adults only', 'Anyone'],
          correctIndex: 2,
          concept: 'Sharp Objects',
        },
        {
          question: 'What do you do if you spill water on the floor?',
          options: ['Leave it', 'Wipe it up', 'Step over it', 'Ignore it'],
          correctIndex: 1,
          concept: 'Spill Safety',
        },
        {
          question: 'What should you never touch with wet hands?',
          options: ['A towel', 'A plate', 'Electrical plugs', 'A cup'],
          correctIndex: 2,
          concept: 'Electrical Safety',
        },
        {
          question: 'What do you wear to protect yourself when cooking?',
          options: ['A cape', 'An apron', 'A hat', 'Sunglasses'],
          correctIndex: 1,
          concept: 'Protective Gear',
        },
        {
          question: 'If something is too hot, what should you do?',
          options: [
            'Grab it quickly',
            'Wait for it to cool',
            'Blow on it hard',
            'Touch it to check',
          ],
          correctIndex: 1,
          concept: 'Heat Safety',
        },
        {
          question: 'What should pot handles point toward?',
          options: [
            'The edge of the stove',
            'The back of the stove',
            'Up in the air',
            'The floor',
          ],
          correctIndex: 1,
          concept: 'Stove Safety',
        },
        {
          question: 'What should you do if you see smoke in the kitchen?',
          options: [
            'Ignore it',
            'Open a window',
            'Tell an adult right away',
            'Hide',
          ],
          correctIndex: 2,
          concept: 'Fire Safety',
        },
        {
          question: 'Why do we keep the kitchen floor dry?',
          options: [
            'It looks nice',
            'So nobody slips',
            'For fun',
            'To save water',
          ],
          correctIndex: 1,
          concept: 'Slip Prevention',
        },
        {
          question: 'What should you always do after using the kitchen?',
          options: [
            'Leave everything out',
            'Clean up',
            'Go to bed',
            'Close your eyes',
          ],
          correctIndex: 1,
          concept: 'Tidiness',
        },
      ],
    },
  },

  // =========================================================================
  // 4. Planet Explorer (multiple-choice + science)
  // =========================================================================
  {
    id: 'int-multiple-choice-science-solar-system-04',
    title: 'Planet Explorer',
    description: 'Explore our solar system and learn about the planets.',
    category: 'science',
    subcategory: 'space',
    template: 'multiple-choice',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '🪐',
    estimatedMinutes: 6,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which planet is closest to the Sun?',
          options: ['Earth', 'Mars', 'Mercury', 'Venus'],
          correctIndex: 2,
          concept: 'Solar System',
        },
        {
          question: 'Which planet is known as the Red Planet?',
          options: ['Jupiter', 'Mars', 'Saturn', 'Venus'],
          correctIndex: 1,
          concept: 'Solar System',
        },
        {
          question: 'Which planet has rings around it?',
          options: ['Earth', 'Mars', 'Saturn', 'Mercury'],
          correctIndex: 2,
          concept: 'Solar System',
        },
        {
          question: 'Which planet do we live on?',
          options: ['Mars', 'Earth', 'Venus', 'Jupiter'],
          correctIndex: 1,
          concept: 'Solar System',
        },
        {
          question: 'Which is the largest planet in our solar system?',
          options: ['Saturn', 'Neptune', 'Jupiter', 'Uranus'],
          correctIndex: 2,
          concept: 'Solar System',
        },
        {
          question: 'How many planets are in our solar system?',
          options: ['6', '7', '8', '9'],
          correctIndex: 2,
          concept: 'Solar System',
        },
        {
          question: 'What is the Sun?',
          options: ['A planet', 'A star', 'A moon', 'A comet'],
          correctIndex: 1,
          concept: 'Stars',
        },
        {
          question: 'Which planet is the hottest?',
          options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
          correctIndex: 1,
          concept: 'Solar System',
        },
        {
          question: 'What does Earth have that other planets do not?',
          options: ['Rings', 'Liquid water on the surface', 'Moons', 'Craters'],
          correctIndex: 1,
          concept: 'Earth Science',
        },
        {
          question: 'Which planet is known for its Great Red Spot?',
          options: ['Saturn', 'Jupiter', 'Neptune', 'Mars'],
          correctIndex: 1,
          concept: 'Solar System',
        },
      ],
    },
  },

  // =========================================================================
  // 5. Number Facts (true-false + math)
  // =========================================================================
  {
    id: 'int-true-false-math-number-facts-05',
    title: 'Number Facts',
    description: 'Decide if these math statements are true or false.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'true-false',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🔢',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      statements: [
        {statement: '5 + 3 = 8', isTrue: true, concept: 'Addition'},
        {statement: '10 - 4 = 5', isTrue: false, concept: 'Subtraction'},
        {statement: '2 + 2 = 4', isTrue: true, concept: 'Addition'},
        {statement: '9 - 3 = 7', isTrue: false, concept: 'Subtraction'},
        {statement: '6 + 1 = 7', isTrue: true, concept: 'Addition'},
        {statement: '8 - 5 = 2', isTrue: false, concept: 'Subtraction'},
        {statement: '4 + 4 = 8', isTrue: true, concept: 'Addition'},
        {statement: '7 - 2 = 5', isTrue: true, concept: 'Subtraction'},
        {statement: '3 + 6 = 10', isTrue: false, concept: 'Addition'},
        {statement: '10 - 7 = 3', isTrue: true, concept: 'Subtraction'},
      ],
    },
  },

  // =========================================================================
  // 6. Grammar Check (true-false + english)
  // =========================================================================
  {
    id: 'int-true-false-english-grammar-06',
    title: 'Grammar Check',
    description: 'Test your knowledge of English grammar rules.',
    category: 'english',
    subcategory: 'grammar',
    template: 'true-false',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '✏️',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      statements: [
        {
          statement: "'They're' means 'they are'",
          isTrue: true,
          concept: 'Contractions',
        },
        {
          statement: 'A noun is an action word',
          isTrue: false,
          concept: 'Parts of Speech',
        },
        {
          statement: 'Every sentence should start with a capital letter',
          isTrue: true,
          concept: 'Capitalization',
        },
        {
          statement: "'Its' and 'it\\'s' mean the same thing",
          isTrue: false,
          concept: 'Homophones',
        },
        {
          statement: 'A verb is a doing word',
          isTrue: true,
          concept: 'Parts of Speech',
        },
        {
          statement: "The plural of 'child' is 'childs'",
          isTrue: false,
          concept: 'Plurals',
        },
        {
          statement: 'An adjective describes a noun',
          isTrue: true,
          concept: 'Parts of Speech',
        },
        {
          statement: "'Your' and 'you\\'re' mean the same thing",
          isTrue: false,
          concept: 'Homophones',
        },
        {
          statement: 'A question ends with a question mark',
          isTrue: true,
          concept: 'Punctuation',
        },
        {
          statement: "The past tense of 'go' is 'goed'",
          isTrue: false,
          concept: 'Irregular Verbs',
        },
      ],
    },
  },

  // =========================================================================
  // 7. Healthy Habits (true-false + life-skills)
  // =========================================================================
  {
    id: 'int-true-false-life-skills-healthy-habits-07',
    title: 'Healthy Habits',
    description: 'Learn which habits keep you healthy and strong.',
    category: 'life-skills',
    subcategory: 'health',
    template: 'true-false',
    difficulty: 1,
    ageRange: [5, 8],
    emoji: '💪',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      statements: [
        {
          statement: 'You should brush your teeth twice a day',
          isTrue: true,
          concept: 'Dental Health',
        },
        {
          statement: 'Eating candy for every meal is healthy',
          isTrue: false,
          concept: 'Nutrition',
        },
        {
          statement: 'Drinking water keeps your body hydrated',
          isTrue: true,
          concept: 'Hydration',
        },
        {
          statement: 'You only need to sleep for 2 hours a night',
          isTrue: false,
          concept: 'Sleep',
        },
        {
          statement: 'Washing your hands helps prevent illness',
          isTrue: true,
          concept: 'Hygiene',
        },
        {
          statement: 'Vegetables are bad for you',
          isTrue: false,
          concept: 'Nutrition',
        },
        {
          statement: 'Exercise makes your body stronger',
          isTrue: true,
          concept: 'Fitness',
        },
        {
          statement: 'Watching TV all day is good exercise',
          isTrue: false,
          concept: 'Fitness',
        },
        {
          statement: 'Fruits contain vitamins that help you grow',
          isTrue: true,
          concept: 'Nutrition',
        },
        {
          statement: 'You should cover your mouth when you sneeze',
          isTrue: true,
          concept: 'Hygiene',
        },
      ],
    },
  },

  // =========================================================================
  // 8. Animal Facts (true-false + science)
  // =========================================================================
  {
    id: 'int-true-false-science-animal-facts-08',
    title: 'Animal Facts',
    description: 'Discover amazing truths and myths about animals.',
    category: 'science',
    subcategory: 'animals',
    template: 'true-false',
    difficulty: 2,
    ageRange: [6, 9],
    emoji: '🦁',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      statements: [
        {statement: 'Dolphins are fish', isTrue: false, concept: 'Marine Life'},
        {
          statement: 'A group of lions is called a pride',
          isTrue: true,
          concept: 'Animal Groups',
        },
        {statement: 'Penguins can fly', isTrue: false, concept: 'Birds'},
        {
          statement: 'Bats are the only mammals that can fly',
          isTrue: true,
          concept: 'Mammals',
        },
        {
          statement: 'Spiders have six legs',
          isTrue: false,
          concept: 'Arachnids',
        },
        {
          statement: 'Caterpillars turn into butterflies',
          isTrue: true,
          concept: 'Metamorphosis',
        },
        {statement: 'Snakes have eyelids', isTrue: false, concept: 'Reptiles'},
        {
          statement: 'An octopus has three hearts',
          isTrue: true,
          concept: 'Marine Life',
        },
        {
          statement: 'Elephants are the smallest land animals',
          isTrue: false,
          concept: 'Mammals',
        },
        {
          statement: 'Frogs start their life as tadpoles',
          isTrue: true,
          concept: 'Amphibians',
        },
      ],
    },
  },

  // =========================================================================
  // 9. Missing Numbers (fill-blank + math)
  // =========================================================================
  {
    id: 'int-fill-blank-math-missing-numbers-09',
    title: 'Missing Numbers',
    description: 'Find the missing number to complete the equation.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'fill-blank',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '🔍',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sentences: [
        {
          sentence: '___ + 5 = 12',
          blank: '___',
          answer: '7',
          options: ['5', '6', '7', '8'],
          concept: 'Addition',
        },
        {
          sentence: '9 - ___ = 4',
          blank: '___',
          answer: '5',
          options: ['3', '4', '5', '6'],
          concept: 'Subtraction',
        },
        {
          sentence: '___ + 3 = 10',
          blank: '___',
          answer: '7',
          options: ['6', '7', '8', '9'],
          concept: 'Addition',
        },
        {
          sentence: '15 - ___ = 8',
          blank: '___',
          answer: '7',
          options: ['5', '6', '7', '8'],
          concept: 'Subtraction',
        },
        {
          sentence: '6 + ___ = 11',
          blank: '___',
          answer: '5',
          options: ['4', '5', '6', '7'],
          concept: 'Addition',
        },
        {
          sentence: '___ - 3 = 9',
          blank: '___',
          answer: '12',
          options: ['10', '11', '12', '13'],
          concept: 'Subtraction',
        },
        {
          sentence: '8 + ___ = 16',
          blank: '___',
          answer: '8',
          options: ['6', '7', '8', '9'],
          concept: 'Addition',
        },
        {
          sentence: '___ + 4 = 13',
          blank: '___',
          answer: '9',
          options: ['7', '8', '9', '10'],
          concept: 'Addition',
        },
        {
          sentence: '20 - ___ = 11',
          blank: '___',
          answer: '9',
          options: ['8', '9', '10', '11'],
          concept: 'Subtraction',
        },
        {
          sentence: '___ + 6 = 14',
          blank: '___',
          answer: '8',
          options: ['6', '7', '8', '9'],
          concept: 'Addition',
        },
      ],
    },
  },

  // =========================================================================
  // 10. Complete the Sentence (fill-blank + english)
  // =========================================================================
  {
    id: 'int-fill-blank-english-sentences-10',
    title: 'Complete the Sentence',
    description: 'Pick the right word to finish each sentence.',
    category: 'english',
    subcategory: 'grammar',
    template: 'fill-blank',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '📝',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sentences: [
        {
          sentence: 'The cat ___ on the mat.',
          blank: '___',
          answer: 'sat',
          options: ['sat', 'sit', 'set', 'sot'],
          concept: 'Past Tense',
        },
        {
          sentence: 'She ___ to school every day.',
          blank: '___',
          answer: 'goes',
          options: ['go', 'goes', 'going', 'gone'],
          concept: 'Subject-Verb Agreement',
        },
        {
          sentence: 'They ___ playing in the park.',
          blank: '___',
          answer: 'are',
          options: ['is', 'are', 'am', 'was'],
          concept: 'Subject-Verb Agreement',
        },
        {
          sentence: 'He ___ a delicious cake yesterday.',
          blank: '___',
          answer: 'baked',
          options: ['bake', 'bakes', 'baked', 'baking'],
          concept: 'Past Tense',
        },
        {
          sentence: 'The dog ___ loudly at the mailman.',
          blank: '___',
          answer: 'barked',
          options: ['bark', 'barks', 'barked', 'barking'],
          concept: 'Past Tense',
        },
        {
          sentence: 'I ___ my homework after dinner.',
          blank: '___',
          answer: 'do',
          options: ['do', 'does', 'did', 'done'],
          concept: 'Present Tense',
        },
        {
          sentence: 'We ___ to the beach last summer.',
          blank: '___',
          answer: 'went',
          options: ['go', 'goes', 'went', 'going'],
          concept: 'Past Tense',
        },
        {
          sentence: 'The bird ___ high in the sky.',
          blank: '___',
          answer: 'flies',
          options: ['fly', 'flies', 'flew', 'flying'],
          concept: 'Present Tense',
        },
        {
          sentence: 'She ___ a beautiful song at the concert.',
          blank: '___',
          answer: 'sang',
          options: ['sing', 'sings', 'sang', 'sung'],
          concept: 'Past Tense',
        },
        {
          sentence: 'The children ___ happily in the garden.',
          blank: '___',
          answer: 'played',
          options: ['play', 'plays', 'played', 'playing'],
          concept: 'Past Tense',
        },
      ],
    },
  },

  // =========================================================================
  // 11. Good Manners (fill-blank + life-skills)
  // =========================================================================
  {
    id: 'int-fill-blank-life-skills-manners-11',
    title: 'Good Manners',
    description: 'Learn the polite words and phrases for every situation.',
    category: 'life-skills',
    subcategory: 'manners',
    template: 'fill-blank',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🤝',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sentences: [
        {
          sentence: 'When someone gives you something, say ___',
          blank: '___',
          answer: 'Thank you',
          options: ['Bye', 'Thank you', 'Hello', 'Sorry'],
          concept: 'Politeness',
        },
        {
          sentence: 'When you bump into someone, say ___',
          blank: '___',
          answer: 'Excuse me',
          options: ['Move', 'Excuse me', 'Whatever', 'Hey'],
          concept: 'Apology',
        },
        {
          sentence: 'When you want something, say ___',
          blank: '___',
          answer: 'Please',
          options: ['Now', 'Give me', 'Please', 'Hurry'],
          concept: 'Politeness',
        },
        {
          sentence: 'When you meet someone new, say ___',
          blank: '___',
          answer: 'Nice to meet you',
          options: ['Go away', 'Nice to meet you', 'Who are you', 'Whatever'],
          concept: 'Greetings',
        },
        {
          sentence: 'When you leave, say ___',
          blank: '___',
          answer: 'Goodbye',
          options: ['Goodbye', 'Finally', 'Nothing', 'Whatever'],
          concept: 'Greetings',
        },
        {
          sentence: 'When someone is talking, you should ___',
          blank: '___',
          answer: 'listen quietly',
          options: ['shout louder', 'listen quietly', 'walk away', 'laugh'],
          concept: 'Listening',
        },
        {
          sentence: 'When you make a mistake, say ___',
          blank: '___',
          answer: 'I am sorry',
          options: ['It was not me', 'I am sorry', 'I do not care', 'So what'],
          concept: 'Apology',
        },
        {
          sentence: 'When you enter a room, say ___',
          blank: '___',
          answer: 'Hello',
          options: ['Wow', 'Hello', 'Look at me', 'Nothing'],
          concept: 'Greetings',
        },
        {
          sentence: 'Before eating, you should wash your ___',
          blank: '___',
          answer: 'hands',
          options: ['feet', 'hands', 'hair', 'face'],
          concept: 'Hygiene',
        },
        {
          sentence: 'When someone helps you, say ___',
          blank: '___',
          answer: 'Thank you',
          options: ['Finally', 'Thank you', 'About time', 'OK'],
          concept: 'Gratitude',
        },
      ],
    },
  },

  // =========================================================================
  // 12. Body Parts (fill-blank + science)
  // =========================================================================
  {
    id: 'int-fill-blank-science-body-parts-12',
    title: 'Body Parts',
    description: 'Learn about the human body and what each part does.',
    category: 'science',
    subcategory: 'human body',
    template: 'fill-blank',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🧠',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      sentences: [
        {
          sentence: 'We use our ___ to see',
          blank: '___',
          answer: 'eyes',
          options: ['ears', 'eyes', 'nose', 'mouth'],
          concept: 'Human Body',
        },
        {
          sentence: 'We use our ___ to hear sounds',
          blank: '___',
          answer: 'ears',
          options: ['eyes', 'hands', 'ears', 'feet'],
          concept: 'Human Body',
        },
        {
          sentence: 'We breathe air through our ___ and mouth',
          blank: '___',
          answer: 'nose',
          options: ['nose', 'ears', 'eyes', 'toes'],
          concept: 'Human Body',
        },
        {
          sentence: 'Our ___ pumps blood through the body',
          blank: '___',
          answer: 'heart',
          options: ['brain', 'heart', 'lung', 'stomach'],
          concept: 'Human Body',
        },
        {
          sentence: 'We use our ___ to think and learn',
          blank: '___',
          answer: 'brain',
          options: ['heart', 'lungs', 'brain', 'bones'],
          concept: 'Human Body',
        },
        {
          sentence: 'We chew food with our ___',
          blank: '___',
          answer: 'teeth',
          options: ['lips', 'tongue', 'teeth', 'cheeks'],
          concept: 'Human Body',
        },
        {
          sentence: 'Our ___ help us breathe in air',
          blank: '___',
          answer: 'lungs',
          options: ['lungs', 'kidneys', 'liver', 'muscles'],
          concept: 'Human Body',
        },
        {
          sentence: 'We walk and run using our ___',
          blank: '___',
          answer: 'legs',
          options: ['arms', 'legs', 'ears', 'eyes'],
          concept: 'Human Body',
        },
        {
          sentence: 'Food goes into our ___ after we swallow it',
          blank: '___',
          answer: 'stomach',
          options: ['lungs', 'brain', 'stomach', 'heart'],
          concept: 'Human Body',
        },
        {
          sentence: 'We pick things up with our ___',
          blank: '___',
          answer: 'hands',
          options: ['feet', 'hands', 'knees', 'elbows'],
          concept: 'Human Body',
        },
      ],
    },
  },

  // =========================================================================
  // 13. Number Pairs (match-pairs + math)
  // =========================================================================
  {
    id: 'int-match-pairs-math-number-words-13',
    title: 'Number Pairs',
    description: 'Match numbers to their written words.',
    category: 'math',
    subcategory: 'number sense',
    template: 'match-pairs',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🔗',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      pairs: [
        {left: '5', right: 'Five'},
        {left: '8', right: 'Eight'},
        {left: '3', right: 'Three'},
        {left: '12', right: 'Twelve'},
        {left: '7', right: 'Seven'},
        {left: '10', right: 'Ten'},
        {left: '1', right: 'One'},
        {left: '9', right: 'Nine'},
      ],
    },
  },

  // =========================================================================
  // 14. Opposites (match-pairs + english)
  // =========================================================================
  {
    id: 'int-match-pairs-english-opposites-14',
    title: 'Opposites',
    description: 'Match each word with its opposite.',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'match-pairs',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '↔️',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      pairs: [
        {left: 'Hot', right: 'Cold'},
        {left: 'Big', right: 'Small'},
        {left: 'Happy', right: 'Sad'},
        {left: 'Fast', right: 'Slow'},
        {left: 'Light', right: 'Dark'},
        {left: 'Up', right: 'Down'},
        {left: 'Open', right: 'Closed'},
        {left: 'Full', right: 'Empty'},
      ],
    },
  },

  // =========================================================================
  // 15. Tools & Jobs (match-pairs + life-skills)
  // =========================================================================
  {
    id: 'int-match-pairs-life-skills-tools-jobs-15',
    title: 'Tools & Jobs',
    description: 'Match the tool to the person who uses it.',
    category: 'life-skills',
    subcategory: 'careers',
    template: 'match-pairs',
    difficulty: 2,
    ageRange: [6, 9],
    emoji: '🔧',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      pairs: [
        {left: 'Stethoscope', right: 'Doctor'},
        {left: 'Wrench', right: 'Plumber'},
        {left: 'Paintbrush', right: 'Artist'},
        {left: 'Whisk', right: 'Chef'},
        {left: 'Telescope', right: 'Astronomer'},
        {left: 'Hammer', right: 'Carpenter'},
        {left: 'Microscope', right: 'Scientist'},
        {left: 'Fire hose', right: 'Firefighter'},
      ],
    },
  },

  // =========================================================================
  // 16. Animals & Homes (match-pairs + science)
  // =========================================================================
  {
    id: 'int-match-pairs-science-animal-homes-16',
    title: 'Animals & Homes',
    description: 'Match each animal to the place it lives.',
    category: 'science',
    subcategory: 'habitats',
    template: 'match-pairs',
    difficulty: 1,
    ageRange: [5, 8],
    emoji: '🏠',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      pairs: [
        {left: 'Fish', right: 'Ocean'},
        {left: 'Bird', right: 'Nest'},
        {left: 'Bear', right: 'Cave'},
        {left: 'Bee', right: 'Hive'},
        {left: 'Rabbit', right: 'Burrow'},
        {left: 'Spider', right: 'Web'},
        {left: 'Beaver', right: 'Lodge'},
        {left: 'Ant', right: 'Colony'},
      ],
    },
  },

  // =========================================================================
  // 17. Math Memory (memory-flip + math)
  // =========================================================================
  {
    id: 'int-memory-flip-math-expressions-17',
    title: 'Math Memory',
    description: 'Flip cards to match math expressions with their answers.',
    category: 'math',
    subcategory: 'arithmetic',
    template: 'memory-flip',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '🃏',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      cards: [
        {id: 1, value: '2 + 3', match: 1},
        {id: 2, value: '5', match: 1},
        {id: 3, value: '4 + 4', match: 2},
        {id: 4, value: '8', match: 2},
        {id: 5, value: '6 + 1', match: 3},
        {id: 6, value: '7', match: 3},
        {id: 7, value: '9 - 3', match: 4},
        {id: 8, value: '6', match: 4},
        {id: 9, value: '10 - 1', match: 5},
        {id: 10, value: '9', match: 5},
        {id: 11, value: '3 + 7', match: 6},
        {id: 12, value: '10', match: 6},
        {id: 13, value: '8 - 5', match: 7},
        {id: 14, value: '3', match: 7},
        {id: 15, value: '5 + 6', match: 8},
        {id: 16, value: '11', match: 8},
      ],
    },
  },

  // =========================================================================
  // 18. Rhyme Time (memory-flip + english)
  // =========================================================================
  {
    id: 'int-memory-flip-english-rhymes-18',
    title: 'Rhyme Time',
    description: 'Flip cards to find pairs of words that rhyme.',
    category: 'english',
    subcategory: 'phonics',
    template: 'memory-flip',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🎶',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      cards: [
        {id: 1, value: 'Cat', match: 1},
        {id: 2, value: 'Hat', match: 1},
        {id: 3, value: 'Dog', match: 2},
        {id: 4, value: 'Log', match: 2},
        {id: 5, value: 'Sun', match: 3},
        {id: 6, value: 'Fun', match: 3},
        {id: 7, value: 'Star', match: 4},
        {id: 8, value: 'Car', match: 4},
        {id: 9, value: 'Tree', match: 5},
        {id: 10, value: 'Bee', match: 5},
        {id: 11, value: 'Ring', match: 6},
        {id: 12, value: 'Sing', match: 6},
        {id: 13, value: 'Cake', match: 7},
        {id: 14, value: 'Lake', match: 7},
        {id: 15, value: 'Moon', match: 8},
        {id: 16, value: 'Spoon', match: 8},
      ],
    },
  },

  // =========================================================================
  // 19. Flag Match (memory-flip + life-skills)
  // =========================================================================
  {
    id: 'int-memory-flip-life-skills-flags-19',
    title: 'Flag Match',
    description: 'Match country flags to their names.',
    category: 'life-skills',
    subcategory: 'geography',
    template: 'memory-flip',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '🏁',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      cards: [
        {id: 1, value: '\ud83c\uddfa\ud83c\uddf8', match: 1},
        {id: 2, value: 'USA', match: 1},
        {id: 3, value: '\ud83c\uddec\ud83c\udde7', match: 2},
        {id: 4, value: 'United Kingdom', match: 2},
        {id: 5, value: '\ud83c\uddef\ud83c\uddf5', match: 3},
        {id: 6, value: 'Japan', match: 3},
        {id: 7, value: '\ud83c\udde7\ud83c\uddf7', match: 4},
        {id: 8, value: 'Brazil', match: 4},
        {id: 9, value: '\ud83c\udde8\ud83c\udde6', match: 5},
        {id: 10, value: 'Canada', match: 5},
        {id: 11, value: '\ud83c\udde6\ud83c\uddfa', match: 6},
        {id: 12, value: 'Australia', match: 6},
        {id: 13, value: '\ud83c\uddee\ud83c\uddf3', match: 7},
        {id: 14, value: 'India', match: 7},
        {id: 15, value: '\ud83c\uddeb\ud83c\uddf7', match: 8},
        {id: 16, value: 'France', match: 8},
      ],
    },
  },

  // =========================================================================
  // 20. Color Mix (memory-flip + creativity)
  // =========================================================================
  {
    id: 'int-memory-flip-creativity-color-mix-20',
    title: 'Color Mix',
    description: 'Match color combinations to the colors they make.',
    category: 'creativity',
    subcategory: 'colors',
    template: 'memory-flip',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🎨',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      cards: [
        {id: 1, value: 'Red + Yellow', match: 1},
        {id: 2, value: 'Orange \ud83d\udfe0', match: 1},
        {id: 3, value: 'Blue + Yellow', match: 2},
        {id: 4, value: 'Green \ud83d\udfe2', match: 2},
        {id: 5, value: 'Red + Blue', match: 3},
        {id: 6, value: 'Purple \ud83d\udfe3', match: 3},
        {id: 7, value: 'White + Red', match: 4},
        {id: 8, value: 'Pink \ud83c\udf38', match: 4},
        {id: 9, value: 'Blue + White', match: 5},
        {id: 10, value: 'Light Blue \ud83d\udfe6', match: 5},
        {id: 11, value: 'Red + White + Blue', match: 6},
        {id: 12, value: 'Lavender \ud83d\udc9c', match: 6},
        {id: 13, value: 'Yellow + White', match: 7},
        {id: 14, value: 'Cream \ud83e\uddc1', match: 7},
        {id: 15, value: 'Black + White', match: 8},
        {id: 16, value: 'Gray \ud83e\udd4f', match: 8},
      ],
    },
  },

  // =========================================================================
  // 21. Count the Fruits (counting + math)
  // =========================================================================
  {
    id: 'int-counting-math-fruits-21',
    title: 'Count the Fruits',
    description: 'Count the fruits you see on the screen.',
    category: 'math',
    subcategory: 'counting',
    template: 'counting',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '🍎',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'How many apples?',
          objects: [
            '\ud83c\udf4e',
            '\ud83c\udf4e',
            '\ud83c\udf4e',
            '\ud83c\udf4e',
            '\ud83c\udf4e',
          ],
          correctAnswer: 5,
          concept: 'Counting',
        },
        {
          question: 'How many bananas?',
          objects: ['\ud83c\udf4c', '\ud83c\udf4c', '\ud83c\udf4c'],
          correctAnswer: 3,
          concept: 'Counting',
        },
        {
          question: 'How many oranges?',
          objects: [
            '\ud83c\udf4a',
            '\ud83c\udf4a',
            '\ud83c\udf4a',
            '\ud83c\udf4a',
            '\ud83c\udf4a',
            '\ud83c\udf4a',
            '\ud83c\udf4a',
          ],
          correctAnswer: 7,
          concept: 'Counting',
        },
        {
          question: 'How many grapes?',
          objects: [
            '\ud83c\udf47',
            '\ud83c\udf47',
            '\ud83c\udf47',
            '\ud83c\udf47',
          ],
          correctAnswer: 4,
          concept: 'Counting',
        },
        {
          question: 'How many strawberries?',
          objects: [
            '\ud83c\udf53',
            '\ud83c\udf53',
            '\ud83c\udf53',
            '\ud83c\udf53',
            '\ud83c\udf53',
            '\ud83c\udf53',
          ],
          correctAnswer: 6,
          concept: 'Counting',
        },
        {
          question: 'How many watermelons?',
          objects: ['\ud83c\udf49', '\ud83c\udf49'],
          correctAnswer: 2,
          concept: 'Counting',
        },
        {
          question: 'How many cherries?',
          objects: [
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
            '\ud83c\udf52',
          ],
          correctAnswer: 9,
          concept: 'Counting',
        },
        {
          question: 'How many peaches?',
          objects: [
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
            '\ud83c\udf51',
          ],
          correctAnswer: 8,
          concept: 'Counting',
        },
        {
          question: 'How many lemons?',
          objects: ['\ud83c\udf4b'],
          correctAnswer: 1,
          concept: 'Counting',
        },
        {
          question: 'How many pineapples?',
          objects: [
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
            '\ud83c\udf4d',
          ],
          correctAnswer: 10,
          concept: 'Counting',
        },
      ],
    },
  },

  // =========================================================================
  // 22. Skip Counting (counting + math)
  // =========================================================================
  {
    id: 'int-counting-math-skip-counting-22',
    title: 'Skip Counting',
    description: 'Count by 2s, 5s, and 10s to find the missing number.',
    category: 'math',
    subcategory: 'skip counting',
    template: 'counting',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '🔢',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Count by 2s: 2, 4, 6, ___',
          objects: ['2', '4', '6', '?'],
          correctAnswer: 8,
          concept: 'Skip Counting by 2',
        },
        {
          question: 'Count by 2s: 10, 12, 14, ___',
          objects: ['10', '12', '14', '?'],
          correctAnswer: 16,
          concept: 'Skip Counting by 2',
        },
        {
          question: 'Count by 5s: 5, 10, 15, ___',
          objects: ['5', '10', '15', '?'],
          correctAnswer: 20,
          concept: 'Skip Counting by 5',
        },
        {
          question: 'Count by 5s: 20, 25, 30, ___',
          objects: ['20', '25', '30', '?'],
          correctAnswer: 35,
          concept: 'Skip Counting by 5',
        },
        {
          question: 'Count by 10s: 10, 20, 30, ___',
          objects: ['10', '20', '30', '?'],
          correctAnswer: 40,
          concept: 'Skip Counting by 10',
        },
        {
          question: 'Count by 10s: 50, 60, 70, ___',
          objects: ['50', '60', '70', '?'],
          correctAnswer: 80,
          concept: 'Skip Counting by 10',
        },
        {
          question: 'Count by 2s: 4, 6, 8, ___',
          objects: ['4', '6', '8', '?'],
          correctAnswer: 10,
          concept: 'Skip Counting by 2',
        },
        {
          question: 'Count by 5s: 35, 40, 45, ___',
          objects: ['35', '40', '45', '?'],
          correctAnswer: 50,
          concept: 'Skip Counting by 5',
        },
        {
          question: 'Count by 10s: 30, 40, 50, ___',
          objects: ['30', '40', '50', '?'],
          correctAnswer: 60,
          concept: 'Skip Counting by 10',
        },
        {
          question: 'Count by 2s: 14, 16, 18, ___',
          objects: ['14', '16', '18', '?'],
          correctAnswer: 20,
          concept: 'Skip Counting by 2',
        },
      ],
    },
  },

  // =========================================================================
  // 23. Money Counter (counting + life-skills)
  // =========================================================================
  {
    id: 'int-counting-life-skills-money-23',
    title: 'Money Counter',
    description: 'Count coins and learn about money.',
    category: 'life-skills',
    subcategory: 'money',
    template: 'counting',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '💰',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'How many coins? (1 cent each)',
          objects: ['\ud83e\ude99', '\ud83e\ude99', '\ud83e\ude99'],
          correctAnswer: 3,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 5,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 7,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: ['\ud83e\ude99', '\ud83e\ude99'],
          correctAnswer: 2,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 10,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 4,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 6,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 8,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: ['\ud83e\ude99'],
          correctAnswer: 1,
          concept: 'Counting Coins',
        },
        {
          question: 'How many coins?',
          objects: [
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
            '\ud83e\ude99',
          ],
          correctAnswer: 9,
          concept: 'Counting Coins',
        },
      ],
    },
  },

  // =========================================================================
  // 24. Star Counter (counting + science)
  // =========================================================================
  {
    id: 'int-counting-science-stars-24',
    title: 'Star Counter',
    description: 'Count the stars in each constellation pattern.',
    category: 'science',
    subcategory: 'astronomy',
    template: 'counting',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '⭐',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'How many stars in this constellation?',
          objects: [
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
          ],
          correctAnswer: 7,
          concept: 'Astronomy',
        },
        {
          question: 'How many stars do you see?',
          objects: ['\u2b50', '\u2b50', '\u2b50'],
          correctAnswer: 3,
          concept: 'Astronomy',
        },
        {
          question: 'Count the stars!',
          objects: ['\u2b50', '\u2b50', '\u2b50', '\u2b50', '\u2b50'],
          correctAnswer: 5,
          concept: 'Astronomy',
        },
        {
          question: 'How many stars are shining?',
          objects: [
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
          ],
          correctAnswer: 9,
          concept: 'Astronomy',
        },
        {
          question: 'Count this star group!',
          objects: ['\u2b50', '\u2b50'],
          correctAnswer: 2,
          concept: 'Astronomy',
        },
        {
          question: 'How many stars in the night sky?',
          objects: ['\u2b50', '\u2b50', '\u2b50', '\u2b50', '\u2b50', '\u2b50'],
          correctAnswer: 6,
          concept: 'Astronomy',
        },
        {
          question: 'How many stars are here?',
          objects: ['\u2b50', '\u2b50', '\u2b50', '\u2b50'],
          correctAnswer: 4,
          concept: 'Astronomy',
        },
        {
          question: 'Count all the stars!',
          objects: [
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
          ],
          correctAnswer: 8,
          concept: 'Astronomy',
        },
        {
          question: 'How many stars shine tonight?',
          objects: ['\u2b50'],
          correctAnswer: 1,
          concept: 'Astronomy',
        },
        {
          question: 'Count the big star cluster!',
          objects: [
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
            '\u2b50',
          ],
          correctAnswer: 10,
          concept: 'Astronomy',
        },
      ],
    },
  },

  // =========================================================================
  // 25. Sort by Size (drag-to-zone + math)
  // =========================================================================
  {
    id: 'int-drag-to-zone-math-sort-size-25',
    title: 'Sort by Size',
    description: 'Drag each animal into the Big or Small group.',
    category: 'math',
    subcategory: 'sorting',
    template: 'drag-to-zone',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '🐘',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      items: [
        {id: 'item1', label: 'Elephant', emoji: '\ud83d\udc18'},
        {id: 'item2', label: 'Mouse', emoji: '\ud83d\udc2d'},
        {id: 'item3', label: 'Whale', emoji: '\ud83d\udc33'},
        {id: 'item4', label: 'Ant', emoji: '\ud83d\udc1c'},
        {id: 'item5', label: 'Giraffe', emoji: '\ud83e\udd92'},
        {id: 'item6', label: 'Ladybug', emoji: '\ud83d\udc1e'},
        {id: 'item7', label: 'Horse', emoji: '\ud83d\udc34'},
        {id: 'item8', label: 'Snail', emoji: '\ud83d\udc0c'},
        {id: 'item9', label: 'Bear', emoji: '\ud83d\udc3b'},
        {id: 'item10', label: 'Butterfly', emoji: '\ud83e\udd8b'},
      ],
      zones: [
        {id: 'big', label: 'Big Animals'},
        {id: 'small', label: 'Small Animals'},
      ],
      correctMapping: {
        item1: 'big',
        item2: 'small',
        item3: 'big',
        item4: 'small',
        item5: 'big',
        item6: 'small',
        item7: 'big',
        item8: 'small',
        item9: 'big',
        item10: 'small',
      },
    },
  },
];

export default GAMES_BATCH_1;
