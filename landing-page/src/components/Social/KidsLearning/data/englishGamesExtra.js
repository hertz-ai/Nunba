/**
 * Kids Learning Zone - Extra English Game Configurations (20 games)
 *
 * These supplement the 10 English games in gameConfigs.js to reach 30 total.
 * Templates used: timed-rush, story-builder, memory-flip, drag-to-zone,
 * spot-difference, sequence-order, counting, match-pairs, word-build,
 * multiple-choice, true-false, fill-blank, simulation.
 */

const ENGLISH_GAMES_EXTRA = [
  // 11. Spelling Speed Run (timed-rush)
  {
    id: 'eng-timed-spelling-11',
    title: 'Spelling Speed Run',
    category: 'english',
    subcategory: 'spelling',
    template: 'timed-rush',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'timer',
    emoji: '⏱️',
    color: '#FF6B6B',
    estimatedMinutes: 3,
    questionsPerSession: 12,
    learningObjectives: ['spelling', 'speed', 'vocabulary'],
    tags: ['spelling', 'speed', 'timed'],
    content: {
      timeLimit: 60,
      questions: [
        {
          question: 'Which is spelled correctly?',
          options: ['becuz', 'because', 'becaus'],
          correctIndex: 1,
          concept: 'spell:because',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['freind', 'frend', 'friend'],
          correctIndex: 2,
          concept: 'spell:friend',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['beautiful', 'beutiful', 'beautifull'],
          correctIndex: 0,
          concept: 'spell:beautiful',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['togeather', 'together', 'togather'],
          correctIndex: 1,
          concept: 'spell:together',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['diffrent', 'diferent', 'different'],
          correctIndex: 2,
          concept: 'spell:different',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['remember', 'rember', 'remeber'],
          correctIndex: 0,
          concept: 'spell:remember',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['importent', 'important', 'importint'],
          correctIndex: 1,
          concept: 'spell:important',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['libary', 'liberry', 'library'],
          correctIndex: 2,
          concept: 'spell:library',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['calendar', 'calender', 'calander'],
          correctIndex: 0,
          concept: 'spell:calendar',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['suprise', 'surprise', 'surprize'],
          correctIndex: 1,
          concept: 'spell:surprise',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['definatly', 'definetly', 'definitely'],
          correctIndex: 2,
          concept: 'spell:definitely',
        },
        {
          question: 'Which is spelled correctly?',
          options: ['necessary', 'necessery', 'neccessary'],
          correctIndex: 0,
          concept: 'spell:necessary',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 10, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 12. Story Time Adventure (story-builder)
  {
    id: 'eng-story-adventure-12',
    title: 'Story Time Adventure',
    category: 'english',
    subcategory: 'story',
    template: 'story-builder',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'book-open-variant',
    emoji: '📚',
    color: '#FF6B6B',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    learningObjectives: [
      'reading',
      'comprehension',
      'decision-making',
      'vocabulary',
    ],
    tags: ['story', 'adventure', 'forest', 'friendship'],
    content: {
      story: {
        start: 'forest-start',
        scenes: {
          'forest-start': {
            text: 'You and your best friend Leo discover a glowing path in the forest behind your school. The trees shimmer with golden leaves and you hear a gentle melody. A small owl sits on a signpost with two arrows.',
            icon: 'tree',
            choices: [
              {
                text: 'Follow the path to the left marked "Riddle River"',
                nextScene: 'riddle-river',
                isGood: true,
                concept: 'story:curiosity-riddle',
              },
              {
                text: 'Follow the path to the right marked "Story Mountain"',
                nextScene: 'story-mountain',
                isGood: true,
                concept: 'story:curiosity-mountain',
              },
            ],
          },
          'riddle-river': {
            text: 'You reach a sparkling river where a friendly fox sits on a rock. "To cross my bridge, answer my riddle," the fox says. "I have cities but no houses, forests but no trees, and water but no fish. What am I?"',
            icon: 'bridge',
            choices: [
              {
                text: 'A map!',
                nextScene: 'riddle-correct',
                isGood: true,
                concept: 'story:riddle-map',
              },
              {
                text: 'A painting!',
                nextScene: 'riddle-tryagain',
                isGood: false,
                concept: 'story:riddle-wrong',
              },
            ],
          },
          'riddle-tryagain': {
            text: 'The fox shakes his head gently. "Not quite! Think about something that shows places but is flat and made of paper." Leo whispers, "I think I know!"',
            icon: 'emoticon-sad',
            choices: [
              {
                text: 'Listen to Leo and say "A map!"',
                nextScene: 'riddle-correct',
                isGood: true,
                concept: 'story:teamwork-listen',
              },
            ],
          },
          'riddle-correct': {
            text: '"Wonderful!" the fox cheers. The bridge appears and you cross safely. On the other side you find a meadow with a giant book lying open. Its pages are blank!',
            icon: 'star',
            choices: [
              {
                text: 'Write your own story in the book',
                nextScene: 'write-story',
                isGood: true,
                concept: 'story:creativity-write',
              },
              {
                text: 'Read the tiny words appearing at the bottom',
                nextScene: 'read-magic',
                isGood: true,
                concept: 'story:observation-read',
              },
            ],
          },
          'story-mountain': {
            text: 'You climb a gentle hill and find a circle of talking animals. A deer says, "We are trying to put our story in order, but the pages blew away! Can you help us sort them?"',
            icon: 'nature-people',
            choices: [
              {
                text: 'Help the animals sort the story pages',
                nextScene: 'sort-pages',
                isGood: true,
                concept: 'story:helpfulness-sort',
              },
              {
                text: 'Ask the animals to tell you the story first',
                nextScene: 'listen-story',
                isGood: true,
                concept: 'story:listening-skill',
              },
            ],
          },
          'sort-pages': {
            text: 'You and Leo arrange the pages: Beginning, Middle, End. The animals cheer! The deer says, "Every good story has a beginning that introduces characters, a middle with a problem, and an end with a solution!"',
            icon: 'book-open-variant',
            choices: [
              {
                text: 'Continue to the celebration',
                nextScene: 'happy-ending',
                isGood: true,
                concept: 'story:structure-learned',
              },
            ],
          },
          'listen-story': {
            text: 'The rabbit begins: "Once upon a time, a brave mouse wanted to cross a river." The bear continues: "She built a tiny raft from leaves." The deer finishes: "And she made it safely home!" You learn that stories need a beginning, middle, and end.',
            icon: 'book-open-variant',
            choices: [
              {
                text: 'Thank them and continue',
                nextScene: 'happy-ending',
                isGood: true,
                concept: 'story:listening-comprehension',
              },
            ],
          },
          'write-story': {
            text: 'You pick up a golden quill and write: "Once upon a time, two friends found a magical forest." As you write, the words come alive! Tiny characters dance across the pages. Leo adds: "And they made friends with every creature they met." The book glows warmly.',
            icon: 'pencil',
            choices: [
              {
                text: 'Finish the story with a happy ending',
                nextScene: 'happy-ending',
                isGood: true,
                concept: 'story:creative-writing',
              },
            ],
          },
          'read-magic': {
            text: 'Tiny golden words appear: "The best stories are the ones where friends work together." Suddenly, the book fills with pictures of all the adventures you and Leo have had today. You realize reading and sharing stories brings people closer.',
            icon: 'star',
            choices: [
              {
                text: 'Share this discovery with Leo',
                nextScene: 'happy-ending',
                isGood: true,
                concept: 'story:sharing-knowledge',
              },
            ],
          },
          'happy-ending': {
            text: 'The forest fills with warm golden light. The owl from the signpost flies down and says, "You have learned the magic of stories: reading, writing, listening, and sharing. Every word you learn makes the world brighter!" You and Leo head home, excited to read more books. The End.',
            icon: 'star',
            choices: [],
          },
        },
      },
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 13. Word Memory Match (memory-flip)
  {
    id: 'eng-memory-words-13',
    title: 'Word Memory Match',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'memory-flip',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'grid',
    emoji: '🧠',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['vocabulary', 'memory', 'word-meaning'],
    tags: ['memory', 'vocabulary', 'definitions'],
    content: {
      pairs: [
        {
          id: 'pair-1',
          front: 'brave',
          match: 'not afraid',
          concept: 'vocab:brave',
        },
        {
          id: 'pair-2',
          front: 'gentle',
          match: 'soft and kind',
          concept: 'vocab:gentle',
        },
        {
          id: 'pair-3',
          front: 'ancient',
          match: 'very old',
          concept: 'vocab:ancient',
        },
        {
          id: 'pair-4',
          front: 'enormous',
          match: 'very big',
          concept: 'vocab:enormous',
        },
        {
          id: 'pair-5',
          front: 'joyful',
          match: 'very happy',
          concept: 'vocab:joyful',
        },
        {
          id: 'pair-6',
          front: 'curious',
          match: 'wanting to know',
          concept: 'vocab:curious',
        },
        {
          id: 'pair-7',
          front: 'fragile',
          match: 'breaks easily',
          concept: 'vocab:fragile',
        },
        {
          id: 'pair-8',
          front: 'swift',
          match: 'very fast',
          concept: 'vocab:swift',
        },
      ],
      gridColumns: 4,
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 14. Parts of Speech Sorting (drag-to-zone)
  {
    id: 'eng-drag-parts-14',
    title: 'Parts of Speech',
    category: 'english',
    subcategory: 'grammar',
    template: 'drag-to-zone',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'sort',
    emoji: '📝',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 12,
    learningObjectives: ['grammar', 'parts-of-speech', 'classification'],
    tags: ['grammar', 'nouns', 'verbs', 'adjectives'],
    content: {
      zones: [
        {id: 'noun', label: 'Nouns', color: '#3498DB'},
        {id: 'verb', label: 'Verbs', color: '#E74C3C'},
        {id: 'adjective', label: 'Adjectives', color: '#2ECC71'},
      ],
      items: [
        {id: 'cat', label: 'cat', zone: 'noun', concept: 'grammar:noun-cat'},
        {id: 'run', label: 'run', zone: 'verb', concept: 'grammar:verb-run'},
        {
          id: 'tall',
          label: 'tall',
          zone: 'adjective',
          concept: 'grammar:adj-tall',
        },
        {
          id: 'teacher',
          label: 'teacher',
          zone: 'noun',
          concept: 'grammar:noun-teacher',
        },
        {id: 'jump', label: 'jump', zone: 'verb', concept: 'grammar:verb-jump'},
        {
          id: 'soft',
          label: 'soft',
          zone: 'adjective',
          concept: 'grammar:adj-soft',
        },
        {
          id: 'garden',
          label: 'garden',
          zone: 'noun',
          concept: 'grammar:noun-garden',
        },
        {
          id: 'write',
          label: 'write',
          zone: 'verb',
          concept: 'grammar:verb-write',
        },
        {
          id: 'bright',
          label: 'bright',
          zone: 'adjective',
          concept: 'grammar:adj-bright',
        },
        {
          id: 'mountain',
          label: 'mountain',
          zone: 'noun',
          concept: 'grammar:noun-mountain',
        },
        {id: 'swim', label: 'swim', zone: 'verb', concept: 'grammar:verb-swim'},
        {
          id: 'heavy',
          label: 'heavy',
          zone: 'adjective',
          concept: 'grammar:adj-heavy',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 10, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 15. Spot the Grammar Error (spot-difference)
  {
    id: 'eng-spot-errors-15',
    title: 'Spot the Grammar Error',
    category: 'english',
    subcategory: 'grammar',
    template: 'spot-difference',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'magnify',
    emoji: '🔍',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['grammar', 'proofreading', 'error-detection'],
    tags: ['grammar', 'errors', 'proofreading'],
    content: {
      rounds: [
        {
          title: '"She dont like ice cream."',
          differences: [{x: 20, y: 50, label: '"dont" should be "doesn\'t"'}],
          concept: 'grammar:subject-verb-agreement',
        },
        {
          title: '"The dogs is playing outside."',
          differences: [
            {x: 35, y: 50, label: '"is" should be "are" (plural subject)'},
          ],
          concept: 'grammar:plural-verb',
        },
        {
          title: '"Him went to the store."',
          differences: [
            {x: 10, y: 50, label: '"Him" should be "He" (subject pronoun)'},
          ],
          concept: 'grammar:subject-pronoun',
        },
        {
          title: '"I eated all my vegetables."',
          differences: [
            {
              x: 25,
              y: 50,
              label: '"eated" should be "ate" (irregular past tense)',
            },
          ],
          concept: 'grammar:irregular-past',
        },
        {
          title: '"We was happy to see you."',
          differences: [
            {x: 22, y: 50, label: '"was" should be "were" (we were)'},
          ],
          concept: 'grammar:were-was',
        },
        {
          title: '"Her and me went to school."',
          differences: [
            {x: 15, y: 50, label: '"Her and me" should be "She and I"'},
          ],
          concept: 'grammar:pronoun-case',
        },
        {
          title: '"The childs are singing."',
          differences: [
            {
              x: 20,
              y: 50,
              label: '"childs" should be "children" (irregular plural)',
            },
          ],
          concept: 'grammar:irregular-plural',
        },
        {
          title: '"I have ran five laps today."',
          differences: [
            {x: 30, y: 50, label: '"have ran" should be "have run"'},
          ],
          concept: 'grammar:past-participle',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 16. Story Sequencing (sequence-order)
  {
    id: 'eng-sequence-story-16',
    title: 'Story Sequencing',
    category: 'english',
    subcategory: 'comprehension',
    template: 'sequence-order',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'format-list-numbered',
    emoji: '📋',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['sequencing', 'comprehension', 'story-structure'],
    tags: ['story', 'ordering', 'comprehension'],
    content: {
      sequences: [
        {
          items: [
            'The farmer planted seeds in the soil.',
            'He watered the seeds every day.',
            'Small green sprouts appeared.',
            'The plants grew taller and taller.',
            'Bright flowers bloomed in the garden.',
            'Bees and butterflies visited the flowers.',
            'The farmer picked the ripe vegetables.',
            'He shared the harvest with his neighbors.',
          ],
          concept: 'sequence:farmer-story',
        },
        {
          items: [
            'Maria found a lost kitten in the rain.',
            'She wrapped it in a warm towel.',
            'She gave it milk and food.',
            'She made "Found Kitten" posters.',
            'She hung the posters around the neighborhood.',
            'A family called saying it was their kitten.',
            'Maria returned the kitten to its family.',
            'The family thanked Maria for her kindness.',
          ],
          concept: 'sequence:kitten-story',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 17. Syllable Counting (counting)
  {
    id: 'eng-counting-syllables-17',
    title: 'Syllable Counting',
    category: 'english',
    subcategory: 'phonics',
    template: 'counting',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'music-note',
    emoji: '🎵',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['phonics', 'syllables', 'word-structure'],
    tags: ['phonics', 'syllables', 'counting'],
    content: {
      rounds: [
        {
          count: 1,
          icon: 'dog',
          color: '#8B4513',
          concept: 'syllable:dog',
          label: 'dog (1 clap)',
        },
        {
          count: 2,
          icon: 'apple',
          color: '#FF6347',
          concept: 'syllable:apple',
          label: 'ap-ple (2 claps)',
        },
        {
          count: 3,
          icon: 'butterfly',
          color: '#FF69B4',
          concept: 'syllable:butterfly',
          label: 'but-ter-fly (3 claps)',
        },
        {
          count: 4,
          icon: 'caterpillar',
          color: '#2ECC71',
          concept: 'syllable:caterpillar',
          label: 'cat-er-pil-lar (4 claps)',
        },
        {
          count: 2,
          icon: 'flower',
          color: '#FF8C00',
          concept: 'syllable:flower',
          label: 'flow-er (2 claps)',
        },
        {
          count: 3,
          icon: 'elephant',
          color: '#9370DB',
          concept: 'syllable:elephant',
          label: 'el-e-phant (3 claps)',
        },
        {
          count: 1,
          icon: 'tree',
          color: '#228B22',
          concept: 'syllable:tree',
          label: 'tree (1 clap)',
        },
        {
          count: 4,
          icon: 'alligator',
          color: '#2E8B57',
          concept: 'syllable:alligator',
          label: 'al-li-ga-tor (4 claps)',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 18. Synonym Pairs (match-pairs)
  {
    id: 'eng-synonym-match-18',
    title: 'Synonym Pairs',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'match-pairs',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'swap-horizontal',
    emoji: '🔄',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['vocabulary', 'synonyms', 'word-relationships'],
    tags: ['synonyms', 'vocabulary', 'advanced'],
    content: {
      pairs: [
        {left: 'angry', right: 'furious', concept: 'synonym:angry-furious'},
        {
          left: 'brave',
          right: 'courageous',
          concept: 'synonym:brave-courageous',
        },
        {left: 'calm', right: 'peaceful', concept: 'synonym:calm-peaceful'},
        {
          left: 'difficult',
          right: 'challenging',
          concept: 'synonym:difficult-challenging',
        },
        {
          left: 'enormous',
          right: 'gigantic',
          concept: 'synonym:enormous-gigantic',
        },
        {left: 'funny', right: 'hilarious', concept: 'synonym:funny-hilarious'},
        {left: 'gentle', right: 'tender', concept: 'synonym:gentle-tender'},
        {left: 'hurry', right: 'rush', concept: 'synonym:hurry-rush'},
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 19. Word Scramble Challenge (word-build)
  {
    id: 'eng-word-scramble-19',
    title: 'Word Scramble Challenge',
    category: 'english',
    subcategory: 'spelling',
    template: 'word-build',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'puzzle',
    emoji: '🧩',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['spelling', 'vocabulary', 'word-recognition'],
    tags: ['spelling', 'scramble', 'vocabulary'],
    content: {
      words: [
        {
          word: 'planet',
          hint: 'Earth is one of these in our solar system',
          concept: 'spell:planet',
          extraLetters: 2,
          emoji: '🌍',
          imagePrompt:
            'cute cartoon planet Earth, blue and green globe with friendly face, white background, children educational illustration style',
        },
        {
          word: 'garden',
          hint: 'A place where flowers and vegetables grow',
          concept: 'spell:garden',
          extraLetters: 2,
          emoji: '🌻',
          imagePrompt:
            'cute cartoon sunflower, bright yellow petals with green stem and happy face, white background, children educational illustration style',
        },
        {
          word: 'bridge',
          hint: 'You cross this to get over a river',
          concept: 'spell:bridge',
          extraLetters: 2,
          emoji: '🌉',
          imagePrompt:
            'cute cartoon bridge, stone arch bridge over a small river, white background, children educational illustration style',
        },
        {
          word: 'castle',
          hint: 'A king or queen lives in this big building',
          concept: 'spell:castle',
          extraLetters: 2,
          emoji: '🏰',
          imagePrompt:
            'cute cartoon castle, tall stone towers with flags and a drawbridge, white background, children educational illustration style',
        },
        {
          word: 'island',
          hint: 'Land surrounded by water on all sides',
          concept: 'spell:island',
          extraLetters: 3,
          emoji: '🏝️',
          imagePrompt:
            'cute cartoon tropical island, small island with palm tree surrounded by blue water, white background, children educational illustration style',
        },
        {
          word: 'forest',
          hint: 'A large area filled with many trees',
          concept: 'spell:forest',
          extraLetters: 2,
          emoji: '🌲',
          imagePrompt:
            'cute cartoon evergreen tree, tall green pine tree, white background, children educational illustration style',
        },
        {
          word: 'blanket',
          hint: 'You put this over you to stay warm in bed',
          concept: 'spell:blanket',
          extraLetters: 3,
          emoji: '🛏️',
          imagePrompt:
            'cute cartoon bed, cozy bed with soft colorful blanket and pillow, white background, children educational illustration style',
        },
        {
          word: 'trumpet',
          hint: 'A shiny brass musical instrument you blow',
          concept: 'spell:trumpet',
          extraLetters: 3,
          emoji: '🎺',
          imagePrompt:
            'cute cartoon trumpet, shiny golden brass trumpet, white background, children educational illustration style',
        },
        {
          word: 'kitchen',
          hint: 'The room in your house where food is cooked',
          concept: 'spell:kitchen',
          extraLetters: 3,
          emoji: '🍳',
          imagePrompt:
            'cute cartoon frying pan, pan with a sunny-side-up egg, white background, children educational illustration style',
        },
        {
          word: 'rainbow',
          hint: 'A colorful arc that appears after rain',
          concept: 'spell:rainbow',
          extraLetters: 3,
          emoji: '🌈',
          imagePrompt:
            'cute cartoon rainbow, bright colorful arc with clouds on each end, white background, children educational illustration style',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 20. Vocabulary Quiz Master (multiple-choice)
  {
    id: 'eng-vocab-quiz-20',
    title: 'Vocabulary Quiz Master',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'multiple-choice',
    ageRange: [7, 10],
    difficulty: 3,
    icon: 'school',
    emoji: '🎓',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['vocabulary', 'comprehension', 'context-clues'],
    tags: ['vocabulary', 'advanced', 'quiz'],
    content: {
      questions: [
        {
          question: 'What does "brilliant" mean?',
          options: [
            'Very dark',
            'Very bright or clever',
            'Very slow',
            'Very quiet',
          ],
          correctIndex: 1,
          concept: 'vocab:brilliant',
          hint: 'Think of a shining star or a smart idea',
        },
        {
          question: 'What does "cautious" mean?',
          options: ['Very fast', 'Very careful', 'Very loud', 'Very happy'],
          correctIndex: 1,
          concept: 'vocab:cautious',
          hint: 'Someone who looks both ways before crossing',
        },
        {
          question: 'What does "generous" mean?',
          options: [
            'Mean and selfish',
            'Willing to give and share',
            'Very tired',
            'Very angry',
          ],
          correctIndex: 1,
          concept: 'vocab:generous',
          hint: 'Think of someone who shares their lunch',
        },
        {
          question: 'What does "enormous" mean?',
          options: ['Very tiny', 'Very slow', 'Very large', 'Very old'],
          correctIndex: 2,
          concept: 'vocab:enormous',
          hint: 'Think of the size of an elephant',
        },
        {
          question: 'What does "peculiar" mean?',
          options: ['Normal', 'Strange or unusual', 'Beautiful', 'Dangerous'],
          correctIndex: 1,
          concept: 'vocab:peculiar',
          hint: 'Something that makes you say "that is odd!"',
        },
        {
          question: 'What does "exhausted" mean?',
          options: ['Very excited', 'Very scared', 'Very tired', 'Very hungry'],
          correctIndex: 2,
          concept: 'vocab:exhausted',
          hint: 'How you feel after running a long race',
        },
        {
          question: 'What does "magnificent" mean?',
          options: [
            'Very ugly',
            'Very small',
            'Very ordinary',
            'Very impressive and beautiful',
          ],
          correctIndex: 3,
          concept: 'vocab:magnificent',
          hint: 'Think of a grand palace or a stunning sunset',
        },
        {
          question: 'What does "anxious" mean?',
          options: [
            'Worried or nervous',
            'Very happy',
            'Very bored',
            'Very sleepy',
          ],
          correctIndex: 0,
          concept: 'vocab:anxious',
          hint: 'How you might feel before a big test',
        },
        {
          question: 'What does "humble" mean?',
          options: [
            'Rude and proud',
            'Modest and not boastful',
            'Loud and silly',
            'Angry and mean',
          ],
          correctIndex: 1,
          concept: 'vocab:humble',
          hint: 'Someone who does not brag about themselves',
        },
        {
          question: 'What does "determined" mean?',
          options: [
            'Lazy and tired',
            'Having a firm purpose',
            'Very confused',
            'Very silly',
          ],
          correctIndex: 1,
          concept: 'vocab:determined',
          hint: 'Someone who never gives up',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 21. Antonym Match-Up (match-pairs)
  {
    id: 'eng-antonym-match-21',
    title: 'Antonym Match-Up',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'match-pairs',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'swap-horizontal',
    emoji: '↔️',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['vocabulary', 'antonyms', 'word-relationships'],
    tags: ['antonyms', 'opposites', 'vocabulary'],
    content: {
      pairs: [
        {left: 'hot', right: 'cold', concept: 'antonym:hot-cold'},
        {left: 'light', right: 'dark', concept: 'antonym:light-dark'},
        {left: 'early', right: 'late', concept: 'antonym:early-late'},
        {left: 'open', right: 'close', concept: 'antonym:open-close'},
        {left: 'soft', right: 'hard', concept: 'antonym:soft-hard'},
        {left: 'full', right: 'empty', concept: 'antonym:full-empty'},
        {left: 'above', right: 'below', concept: 'antonym:above-below'},
        {left: 'noisy', right: 'quiet', concept: 'antonym:noisy-quiet'},
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 22. Compound Words (word-build)
  {
    id: 'eng-compound-words-22',
    title: 'Compound Words',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'word-build',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'link',
    emoji: '🔗',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['vocabulary', 'compound-words', 'word-structure'],
    tags: ['compound', 'words', 'vocabulary'],
    content: {
      words: [
        {
          word: 'sunflower',
          hint: 'A bright yellow flower that faces the sun',
          concept: 'compound:sunflower',
          extraLetters: 2,
          emoji: '🌻',
          imagePrompt:
            'cute cartoon sunflower, tall bright yellow flower with green leaves and happy face, white background, children educational illustration style',
        },
        {
          word: 'rainbow',
          hint: 'Colorful arc in the sky after it rains',
          concept: 'compound:rainbow',
          extraLetters: 2,
          emoji: '🌈',
          imagePrompt:
            'cute cartoon rainbow, bright colorful arc with fluffy clouds, white background, children educational illustration style',
        },
        {
          word: 'butterfly',
          hint: 'A beautiful insect with colorful wings',
          concept: 'compound:butterfly',
          extraLetters: 3,
          emoji: '🦋',
          imagePrompt:
            'cute cartoon butterfly, colorful wings with purple and blue patterns, white background, children educational illustration style',
        },
        {
          word: 'snowman',
          hint: 'A figure made of snow in winter',
          concept: 'compound:snowman',
          extraLetters: 2,
          emoji: '⛄',
          imagePrompt:
            'cute cartoon snowman, three white snowballs with carrot nose scarf and top hat, white background, children educational illustration style',
        },
        {
          word: 'toothbrush',
          hint: 'You use this to clean your teeth',
          concept: 'compound:toothbrush',
          extraLetters: 3,
          emoji: '🪷',
          imagePrompt:
            'cute cartoon toothbrush, colorful toothbrush with toothpaste on bristles, white background, children educational illustration style',
        },
        {
          word: 'starfish',
          hint: 'A sea creature shaped like a star',
          concept: 'compound:starfish',
          extraLetters: 2,
          emoji: '⭐',
          imagePrompt:
            'cute cartoon starfish, orange five-pointed sea star with happy face, white background, children educational illustration style',
        },
        {
          word: 'football',
          hint: 'A ball you kick in a popular sport',
          concept: 'compound:football',
          extraLetters: 2,
          emoji: '⚽',
          imagePrompt:
            'cute cartoon soccer ball, classic black and white football, white background, children educational illustration style',
        },
        {
          word: 'popcorn',
          hint: 'A snack you eat at the movies',
          concept: 'compound:popcorn',
          extraLetters: 2,
          emoji: '🍿',
          imagePrompt:
            'cute cartoon popcorn, red and white striped bucket overflowing with fluffy popcorn, white background, children educational illustration style',
        },
        {
          word: 'bookshelf',
          hint: 'Furniture where you store books',
          concept: 'compound:bookshelf',
          extraLetters: 3,
          emoji: '📚',
          imagePrompt:
            'cute cartoon bookshelf, wooden shelf filled with colorful books, white background, children educational illustration style',
        },
        {
          word: 'waterfall',
          hint: 'Water flowing down from a high place',
          concept: 'compound:waterfall',
          extraLetters: 3,
          emoji: '🌊',
          imagePrompt:
            'cute cartoon waterfall, blue water cascading down rocks into a pool, white background, children educational illustration style',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 23. Verb Tense Quiz (multiple-choice)
  {
    id: 'eng-verb-tense-23',
    title: 'Verb Tense Quiz',
    category: 'english',
    subcategory: 'grammar',
    template: 'multiple-choice',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'clock-outline',
    emoji: '⏰',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['grammar', 'verb-tenses', 'sentence-structure'],
    tags: ['grammar', 'verbs', 'tenses'],
    content: {
      questions: [
        {
          question: 'Yesterday, I ___ to the park. (go)',
          options: ['go', 'went', 'going', 'goes'],
          correctIndex: 1,
          concept: 'grammar:past-go',
          hint: 'This happened yesterday, so use the past tense',
        },
        {
          question: 'She ___ a book right now. (read)',
          options: ['read', 'reads', 'is reading', 'readed'],
          correctIndex: 2,
          concept: 'grammar:present-continuous-read',
          hint: 'She is doing it right now',
        },
        {
          question: 'Tomorrow we ___ to the beach. (go)',
          options: ['went', 'go', 'will go', 'going'],
          correctIndex: 2,
          concept: 'grammar:future-go',
          hint: 'This will happen tomorrow',
        },
        {
          question: 'The cat ___ on the mat every day. (sit)',
          options: ['sat', 'sits', 'sitting', 'will sit'],
          correctIndex: 1,
          concept: 'grammar:present-sit',
          hint: 'It happens every day, so use simple present',
        },
        {
          question: 'Last week, they ___ a sandcastle. (build)',
          options: ['build', 'builds', 'building', 'built'],
          correctIndex: 3,
          concept: 'grammar:past-build',
          hint: 'This happened last week',
        },
        {
          question: 'I ___ my homework already. (finish)',
          options: ['finish', 'finished', 'will finish', 'finishing'],
          correctIndex: 1,
          concept: 'grammar:past-finish',
          hint: '"Already" means it is done',
        },
        {
          question: 'He ___ soccer every Saturday. (play)',
          options: ['played', 'plays', 'playing', 'will play'],
          correctIndex: 1,
          concept: 'grammar:present-play',
          hint: 'Every Saturday means it is a regular habit',
        },
        {
          question: 'Next year I ___ how to swim. (learn)',
          options: ['learned', 'learn', 'learning', 'will learn'],
          correctIndex: 3,
          concept: 'grammar:future-learn',
          hint: 'Next year is in the future',
        },
        {
          question: 'The birds ___ south last autumn. (fly)',
          options: ['fly', 'flies', 'flew', 'will fly'],
          correctIndex: 2,
          concept: 'grammar:past-fly',
          hint: 'Last autumn is in the past',
        },
        {
          question: 'Look! The baby ___ ! (walk)',
          options: ['walked', 'walks', 'is walking', 'will walk'],
          correctIndex: 2,
          concept: 'grammar:present-continuous-walk',
          hint: '"Look!" means it is happening right now',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 24. Prepositions Fill-In (fill-blank)
  {
    id: 'eng-prepositions-24',
    title: 'Prepositions Fill-In',
    category: 'english',
    subcategory: 'grammar',
    template: 'fill-blank',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'pencil',
    emoji: '✏️',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['grammar', 'prepositions', 'sentence-structure'],
    tags: ['grammar', 'prepositions'],
    content: {
      questions: [
        {
          text: 'The cat is sitting ___ the table.',
          blank: 'on',
          options: ['on', 'at', 'to'],
          concept: 'grammar:prep-on',
          hint: 'The cat is resting on top of the table',
        },
        {
          text: 'The bird flew ___ the window.',
          blank: 'through',
          options: ['under', 'through', 'on'],
          concept: 'grammar:prep-through',
          hint: 'The bird went from one side to the other',
        },
        {
          text: 'She is hiding ___ the bed.',
          blank: 'under',
          options: ['over', 'on', 'under'],
          concept: 'grammar:prep-under',
          hint: 'She is below the bed',
        },
        {
          text: 'The ball rolled ___ the hill.',
          blank: 'down',
          options: ['up', 'down', 'at'],
          concept: 'grammar:prep-down',
          hint: 'The ball went from the top toward the bottom',
        },
        {
          text: 'He put the book ___ the shelf.',
          blank: 'on',
          options: ['in', 'on', 'at'],
          concept: 'grammar:prep-on-shelf',
          hint: 'The book is resting on top of the shelf',
        },
        {
          text: 'The fish swam ___ the pond.',
          blank: 'in',
          options: ['on', 'at', 'in'],
          concept: 'grammar:prep-in',
          hint: 'The fish is inside the water of the pond',
        },
        {
          text: 'We walked ___ the bridge.',
          blank: 'across',
          options: ['under', 'across', 'into'],
          concept: 'grammar:prep-across',
          hint: 'We went from one side of the bridge to the other',
        },
        {
          text: 'The picture hangs ___ the wall.',
          blank: 'on',
          options: ['on', 'under', 'to'],
          concept: 'grammar:prep-on-wall',
          hint: 'The picture is attached to the wall surface',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 25. Sentence or Fragment? (true-false)
  {
    id: 'eng-sentence-fragment-25',
    title: 'Sentence or Fragment?',
    category: 'english',
    subcategory: 'grammar',
    template: 'true-false',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'format-text',
    emoji: '📄',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: ['grammar', 'sentence-structure', 'completeness'],
    tags: ['grammar', 'sentences', 'fragments'],
    content: {
      statements: [
        {
          text: '"The cat sat on the mat." is a complete sentence.',
          answer: true,
          concept: 'grammar:complete-sentence-1',
          explanation:
            'It has a subject (the cat) and a verb (sat) and expresses a complete thought.',
        },
        {
          text: '"Running very fast." is a complete sentence.',
          answer: false,
          concept: 'grammar:fragment-1',
          explanation: 'This is a fragment. It has no subject. Who is running?',
        },
        {
          text: '"We love to read books." is a complete sentence.',
          answer: true,
          concept: 'grammar:complete-sentence-2',
          explanation:
            'It has a subject (we) and a verb (love) and makes sense on its own.',
        },
        {
          text: '"Because it was raining." is a complete sentence.',
          answer: false,
          concept: 'grammar:fragment-2',
          explanation:
            'This is a fragment. It starts with "because" and does not finish the thought.',
        },
        {
          text: '"The big red." is a complete sentence.',
          answer: false,
          concept: 'grammar:fragment-3',
          explanation:
            'This is a fragment. "The big red" what? It is missing the main idea.',
        },
        {
          text: '"My dog barks at squirrels." is a complete sentence.',
          answer: true,
          concept: 'grammar:complete-sentence-3',
          explanation:
            'It has a subject (my dog), a verb (barks), and a complete thought.',
        },
        {
          text: '"Jumped over the fence." is a complete sentence.',
          answer: false,
          concept: 'grammar:fragment-4',
          explanation:
            'This is a fragment. Who jumped over the fence? The subject is missing.',
        },
        {
          text: '"The sun shines brightly." is a complete sentence.',
          answer: true,
          concept: 'grammar:complete-sentence-4',
          explanation:
            'It has a subject (the sun), a verb (shines), and makes complete sense.',
        },
        {
          text: '"Under the big tree in the yard." is a complete sentence.',
          answer: false,
          concept: 'grammar:fragment-5',
          explanation:
            'This is a fragment. It tells us a location but no action happens.',
        },
        {
          text: '"She helped her friend carry the bags." is a complete sentence.',
          answer: true,
          concept: 'grammar:complete-sentence-5',
          explanation:
            'It has a subject (she), a verb (helped), and a complete idea.',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 26. Plural Nouns Builder (word-build)
  {
    id: 'eng-plurals-build-26',
    title: 'Plural Nouns Builder',
    category: 'english',
    subcategory: 'grammar',
    template: 'word-build',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'account-group',
    emoji: '👥',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: ['grammar', 'plurals', 'spelling'],
    tags: ['grammar', 'plurals', 'spelling'],
    content: {
      words: [
        {
          word: 'cats',
          hint: 'More than one cat',
          concept: 'plural:cats',
          extraLetters: 2,
          emoji: '🐱',
          imagePrompt:
            'cute cartoon cats, two friendly orange tabby cats sitting together, white background, children educational illustration style',
        },
        {
          word: 'boxes',
          hint: 'More than one box (add -es)',
          concept: 'plural:boxes',
          extraLetters: 2,
          emoji: '📦',
          imagePrompt:
            'cute cartoon cardboard boxes, two brown boxes stacked, white background, children educational illustration style',
        },
        {
          word: 'babies',
          hint: 'More than one baby (y becomes ies)',
          concept: 'plural:babies',
          extraLetters: 3,
          emoji: '👶',
          imagePrompt:
            'cute cartoon babies, two smiling babies in diapers, white background, children educational illustration style',
        },
        {
          word: 'leaves',
          hint: 'More than one leaf (f becomes ves)',
          concept: 'plural:leaves',
          extraLetters: 3,
          emoji: '🍂',
          imagePrompt:
            'cute cartoon autumn leaves, colorful orange and red falling leaves, white background, children educational illustration style',
        },
        {
          word: 'children',
          hint: 'More than one child (irregular)',
          concept: 'plural:children',
          extraLetters: 3,
          emoji: '👦',
          imagePrompt:
            'cute cartoon children, group of happy diverse kids waving, white background, children educational illustration style',
        },
        {
          word: 'mice',
          hint: 'More than one mouse (irregular)',
          concept: 'plural:mice',
          extraLetters: 2,
          emoji: '🐭',
          imagePrompt:
            'cute cartoon mice, two small gray mice with big ears, white background, children educational illustration style',
        },
        {
          word: 'feet',
          hint: 'More than one foot (irregular)',
          concept: 'plural:feet',
          extraLetters: 2,
          emoji: '🦶',
          imagePrompt:
            'cute cartoon feet, pair of bare feet with wiggly toes, white background, children educational illustration style',
        },
        {
          word: 'teeth',
          hint: 'More than one tooth (irregular)',
          concept: 'plural:teeth',
          extraLetters: 2,
          emoji: '🦷',
          imagePrompt:
            'cute cartoon teeth, row of white smiling teeth, white background, children educational illustration style',
        },
        {
          word: 'foxes',
          hint: 'More than one fox (add -es)',
          concept: 'plural:foxes',
          extraLetters: 2,
          emoji: '🦊',
          imagePrompt:
            'cute cartoon foxes, two orange foxes with fluffy tails, white background, children educational illustration style',
        },
        {
          word: 'stories',
          hint: 'More than one story (y becomes ies)',
          concept: 'plural:stories',
          extraLetters: 3,
          emoji: '📚',
          imagePrompt:
            'cute cartoon stack of books, colorful books piled together, white background, children educational illustration style',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 27. Context Clues Detective (multiple-choice)
  {
    id: 'eng-context-clues-27',
    title: 'Context Clues Detective',
    category: 'english',
    subcategory: 'reading',
    template: 'multiple-choice',
    ageRange: [7, 10],
    difficulty: 3,
    icon: 'magnify',
    emoji: '🕵️',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: [
      'reading',
      'comprehension',
      'context-clues',
      'vocabulary',
    ],
    tags: ['reading', 'context-clues', 'vocabulary'],
    content: {
      questions: [
        {
          question: '"The desert was arid and dry." What does "arid" mean?',
          options: ['Wet', 'Very dry', 'Cold', 'Green'],
          correctIndex: 1,
          concept: 'context:arid',
          hint: 'The sentence says "arid AND dry" - they mean similar things',
        },
        {
          question:
            '"She was elated when she won the prize." What does "elated" mean?',
          options: ['Sad', 'Angry', 'Very happy', 'Confused'],
          correctIndex: 2,
          concept: 'context:elated',
          hint: 'Winning a prize would make you feel...',
        },
        {
          question:
            '"The sloth moved at a sluggish pace." What does "sluggish" mean?',
          options: ['Very fast', 'Very slow', 'Very loud', 'Very quiet'],
          correctIndex: 1,
          concept: 'context:sluggish',
          hint: 'Sloths are known for being very slow',
        },
        {
          question: '"The fierce lion roared loudly." What does "fierce" mean?',
          options: ['Gentle', 'Wild and powerful', 'Tiny', 'Funny'],
          correctIndex: 1,
          concept: 'context:fierce',
          hint: 'A roaring lion is strong and powerful',
        },
        {
          question:
            '"The transparent glass let all the light through." What does "transparent" mean?',
          options: ['Dark', 'Heavy', 'You can see through it', 'Colorful'],
          correctIndex: 2,
          concept: 'context:transparent',
          hint: 'Light passes through it completely',
        },
        {
          question:
            '"She was famished after skipping lunch." What does "famished" mean?',
          options: ['Very full', 'Very tired', 'Very hungry', 'Very happy'],
          correctIndex: 2,
          concept: 'context:famished',
          hint: 'Skipping a meal would make you feel...',
        },
        {
          question:
            '"The fragrance of the roses filled the room." What does "fragrance" mean?',
          options: ['Color', 'Sound', 'Smell', 'Size'],
          correctIndex: 2,
          concept: 'context:fragrance',
          hint: 'Roses are known for how they smell',
        },
        {
          question:
            '"The frigid wind made us shiver." What does "frigid" mean?',
          options: ['Warm', 'Very cold', 'Gentle', 'Strong'],
          correctIndex: 1,
          concept: 'context:frigid',
          hint: 'If you shiver, the air must be...',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 28. Letter Sound Sorting (drag-to-zone)
  {
    id: 'eng-letter-sounds-28',
    title: 'Letter Sound Sorting',
    category: 'english',
    subcategory: 'phonics',
    template: 'drag-to-zone',
    ageRange: [4, 6],
    difficulty: 1,
    icon: 'alphabetical-variant',
    emoji: '🔤',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 12,
    learningObjectives: ['phonics', 'initial-sounds', 'letter-recognition'],
    tags: ['phonics', 'letters', 'sounds'],
    content: {
      zones: [
        {id: 'b-sound', label: 'Starts with B', color: '#3498DB'},
        {id: 's-sound', label: 'Starts with S', color: '#E74C3C'},
        {id: 'm-sound', label: 'Starts with M', color: '#2ECC71'},
      ],
      items: [
        {id: 'ball', label: 'Ball', zone: 'b-sound', concept: 'phonics:b-ball'},
        {id: 'sun', label: 'Sun', zone: 's-sound', concept: 'phonics:s-sun'},
        {id: 'moon', label: 'Moon', zone: 'm-sound', concept: 'phonics:m-moon'},
        {
          id: 'banana',
          label: 'Banana',
          zone: 'b-sound',
          concept: 'phonics:b-banana',
        },
        {id: 'star', label: 'Star', zone: 's-sound', concept: 'phonics:s-star'},
        {id: 'milk', label: 'Milk', zone: 'm-sound', concept: 'phonics:m-milk'},
        {id: 'book', label: 'Book', zone: 'b-sound', concept: 'phonics:b-book'},
        {
          id: 'snake',
          label: 'Snake',
          zone: 's-sound',
          concept: 'phonics:s-snake',
        },
        {
          id: 'mouse',
          label: 'Mouse',
          zone: 'm-sound',
          concept: 'phonics:m-mouse',
        },
        {id: 'bear', label: 'Bear', zone: 'b-sound', concept: 'phonics:b-bear'},
        {id: 'sock', label: 'Sock', zone: 's-sound', concept: 'phonics:s-sock'},
        {id: 'map', label: 'Map', zone: 'm-sound', concept: 'phonics:m-map'},
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 10, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 29. Word Bookstore (simulation)
  {
    id: 'eng-bookstore-sim-29',
    title: 'Word Bookstore',
    category: 'english',
    subcategory: 'vocabulary',
    template: 'simulation',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'book-open-variant',
    emoji: '📚',
    color: '#FF6B6B',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['vocabulary', 'reading', 'decision-making'],
    tags: ['vocabulary', 'simulation', 'reading'],
    content: {
      scenario: {
        title: 'Build Your Library',
        concept: 'vocab:book-categories',
        startingMoney: 20,
        items: [
          {
            name: 'Dictionary (learn new words)',
            price: 3,
            icon: 'book-open-variant',
            isGood: true,
            feedback: 'A dictionary helps you learn the meaning of new words!',
          },
          {
            name: 'Comic book with no words',
            price: 2,
            icon: 'book-open-variant',
            isGood: false,
            feedback:
              'Comics are fun but books with words help you learn more vocabulary.',
          },
          {
            name: 'Story book with chapters',
            price: 4,
            icon: 'book-open-variant',
            isGood: true,
            feedback: 'Chapter books help you practice reading longer stories!',
          },
          {
            name: 'Poetry collection',
            price: 3,
            icon: 'book-open-variant',
            isGood: true,
            feedback:
              'Poetry teaches you about rhyming and beautiful language!',
          },
          {
            name: 'Blank notebook for writing stories',
            price: 2,
            icon: 'pencil',
            isGood: true,
            feedback:
              'Writing your own stories is a great way to practice language!',
          },
          {
            name: 'Science encyclopedia',
            price: 5,
            icon: 'book-open-variant',
            isGood: true,
            feedback: 'Encyclopedias teach you facts and new vocabulary words!',
          },
          {
            name: 'Random stickers',
            price: 3,
            icon: 'star',
            isGood: false,
            feedback: 'Stickers are fun but do not help you learn new words.',
          },
          {
            name: 'Fairy tale collection',
            price: 4,
            icon: 'book-open-variant',
            isGood: true,
            feedback:
              'Fairy tales are full of wonderful words and life lessons!',
          },
        ],
        goal: 'Spend your coins wisely to build a library that helps you learn the most words!',
      },
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 30. Punctuation Power (fill-blank)
  {
    id: 'eng-punctuation-30',
    title: 'Punctuation Power',
    category: 'english',
    subcategory: 'grammar',
    template: 'fill-blank',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'format-text',
    emoji: '❗',
    color: '#FF6B6B',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['grammar', 'punctuation', 'sentence-structure'],
    tags: ['grammar', 'punctuation'],
    content: {
      questions: [
        {
          text: 'What is your name___',
          blank: '?',
          options: ['.', '!', '?'],
          concept: 'grammar:question-mark',
          hint: 'This is asking something',
        },
        {
          text: 'The dog is sleeping___',
          blank: '.',
          options: ['.', '!', '?'],
          concept: 'grammar:period',
          hint: 'This is a simple statement',
        },
        {
          text: 'Watch out for the car___',
          blank: '!',
          options: ['.', '!', '?'],
          concept: 'grammar:exclamation',
          hint: 'This is an urgent warning',
        },
        {
          text: 'Where is the library___',
          blank: '?',
          options: ['.', '!', '?'],
          concept: 'grammar:question-mark-2',
          hint: 'This is asking for a location',
        },
        {
          text: 'I love ice cream___',
          blank: '.',
          options: ['.', '!', '?'],
          concept: 'grammar:period-2',
          hint: 'This is a calm statement about something you like',
        },
        {
          text: 'Hooray, we won the game___',
          blank: '!',
          options: ['.', '!', '?'],
          concept: 'grammar:exclamation-2',
          hint: '"Hooray" shows strong excitement',
        },
        {
          text: 'Can you help me___',
          blank: '?',
          options: ['.', '!', '?'],
          concept: 'grammar:question-mark-3',
          hint: 'You are asking someone to do something',
        },
        {
          text: 'The fire is spreading___',
          blank: '!',
          options: ['.', '!', '?'],
          concept: 'grammar:exclamation-3',
          hint: 'This is an emergency situation',
        },
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },
];

export default ENGLISH_GAMES_EXTRA;
