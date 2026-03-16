/**
 * Kids Learning Zone - Creativity Game Configurations (10)
 *
 * Covers: color mixing, pattern creation, music/instruments, storytelling,
 * shape drawing, art vocabulary, design thinking, creative word building,
 * art styles knowledge, and imagination exercises.
 *
 * Standalone module so it can be merged into gameConfigs.js without
 * conflicting with other category additions happening in parallel.
 */

const CREATIVITY_GAMES = [
  // 1. Color Mixing Lab (simulation)
  {
    id: 'create-color-mixing-01',
    title: 'Color Mixing Lab',
    category: 'creativity',
    subcategory: 'color-theory',
    template: 'simulation',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'palette',
    color: '#E056A0',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['color-theory', 'primary-colors', 'secondary-colors'],
    tags: ['colors', 'art', 'mixing'],
    content: {
      scenario: {
        title: 'Mix Colors Like an Artist',
        concept: 'creativity:color-mixing',
        startingMoney: 0,
        items: [
          {
            name: 'Mix Red + Yellow to make Orange',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback: 'Yes! Red and yellow combine to create a warm orange.',
          },
          {
            name: 'Mix Red + Green to make Orange',
            price: 0,
            icon: 'palette',
            isGood: false,
            feedback:
              'Red and green actually make a brownish color, not orange.',
          },
          {
            name: 'Mix Blue + Yellow to make Green',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback:
              'Correct! Blue and yellow make green, like grass and leaves.',
          },
          {
            name: 'Mix Blue + Red to make Green',
            price: 0,
            icon: 'palette',
            isGood: false,
            feedback: 'Blue and red make purple, not green.',
          },
          {
            name: 'Mix Red + Blue to make Purple',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback: 'Great job! Red and blue mix together to create purple.',
          },
          {
            name: 'Mix Yellow + Blue to make Purple',
            price: 0,
            icon: 'palette',
            isGood: false,
            feedback: 'Yellow and blue make green, not purple.',
          },
          {
            name: 'Mix Red + White to make Pink',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback: 'Adding white to red lightens it into a lovely pink.',
          },
          {
            name: 'Mix Blue + White to make Light Blue',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback:
              'Adding white to blue creates a soft light blue, like the sky.',
          },
          {
            name: 'Mix Yellow + Green to make Blue',
            price: 0,
            icon: 'palette',
            isGood: false,
            feedback:
              'Yellow and green do not make blue. Blue is a primary color.',
          },
          {
            name: 'Mix Black + White to make Gray',
            price: 0,
            icon: 'palette',
            isGood: true,
            feedback: 'Correct! Mixing black and white gives you gray.',
          },
        ],
        goal: 'Choose the correct color mixes to learn how new colors are made!',
      },
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 2. Pattern Rush (timed-rush)
  {
    id: 'create-pattern-rush-02',
    title: 'Pattern Rush',
    category: 'creativity',
    subcategory: 'patterns',
    template: 'timed-rush',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'shape-plus',
    color: '#E056A0',
    estimatedMinutes: 3,
    questionsPerSession: 12,
    learningObjectives: [
      'pattern-recognition',
      'visual-thinking',
      'creativity',
    ],
    tags: ['patterns', 'shapes', 'colors'],
    content: {
      timeLimit: 60,
      questions: [
        {
          question: 'Red, Blue, Red, Blue, ___?',
          options: ['Green', 'Red', 'Yellow', 'Blue'],
          correctIndex: 1,
          concept: 'pattern:color-ab',
        },
        {
          question: 'Circle, Square, Circle, Square, ___?',
          options: ['Triangle', 'Circle', 'Star', 'Square'],
          correctIndex: 1,
          concept: 'pattern:shape-ab',
        },
        {
          question: 'Big, Small, Big, Small, ___?',
          options: ['Medium', 'Small', 'Big', 'Tiny'],
          correctIndex: 2,
          concept: 'pattern:size-ab',
        },
        {
          question: 'Star, Star, Heart, Star, Star, ___?',
          options: ['Star', 'Heart', 'Circle', 'Square'],
          correctIndex: 1,
          concept: 'pattern:aab',
        },
        {
          question: 'Red, Yellow, Blue, Red, Yellow, ___?',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correctIndex: 2,
          concept: 'pattern:color-abc',
        },
        {
          question: 'Up, Down, Up, Down, ___?',
          options: ['Left', 'Down', 'Up', 'Right'],
          correctIndex: 2,
          concept: 'pattern:direction-ab',
        },
        {
          question: 'Happy, Sad, Happy, Sad, ___?',
          options: ['Angry', 'Happy', 'Sleepy', 'Sad'],
          correctIndex: 1,
          concept: 'pattern:emotion-ab',
        },
        {
          question: 'Triangle, Triangle, Circle, Triangle, Triangle, ___?',
          options: ['Square', 'Triangle', 'Circle', 'Star'],
          correctIndex: 2,
          concept: 'pattern:shape-aab',
        },
        {
          question: 'Clap, Clap, Stomp, Clap, Clap, ___?',
          options: ['Clap', 'Jump', 'Stomp', 'Snap'],
          correctIndex: 2,
          concept: 'pattern:rhythm-aab',
        },
        {
          question: 'Sun, Moon, Star, Sun, Moon, ___?',
          options: ['Moon', 'Sun', 'Star', 'Cloud'],
          correctIndex: 2,
          concept: 'pattern:sky-abc',
        },
        {
          question: '1, 2, 1, 2, 1, ___?',
          options: ['1', '3', '2', '0'],
          correctIndex: 2,
          concept: 'pattern:number-ab',
        },
        {
          question: 'Cat, Dog, Bird, Cat, Dog, ___?',
          options: ['Cat', 'Fish', 'Bird', 'Dog'],
          correctIndex: 2,
          concept: 'pattern:animal-abc',
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

  // 3. Musical Instruments Match (match-pairs)
  {
    id: 'create-music-match-03',
    title: 'Musical Instruments Match',
    category: 'creativity',
    subcategory: 'music',
    template: 'match-pairs',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'music',
    color: '#E056A0',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: ['music-awareness', 'instrument-families', 'matching'],
    tags: ['music', 'instruments', 'sounds'],
    content: {
      pairs: [
        {left: 'Guitar', right: 'Strings', concept: 'music:guitar-family'},
        {left: 'Drum', right: 'Percussion', concept: 'music:drum-family'},
        {left: 'Flute', right: 'Woodwind', concept: 'music:flute-family'},
        {left: 'Trumpet', right: 'Brass', concept: 'music:trumpet-family'},
        {left: 'Piano', right: 'Keyboard', concept: 'music:piano-family'},
        {left: 'Violin', right: 'Strings', concept: 'music:violin-family'},
        {
          left: 'Tambourine',
          right: 'Percussion',
          concept: 'music:tambourine-family',
        },
        {
          left: 'Harmonica',
          right: 'Woodwind',
          concept: 'music:harmonica-family',
        },
        {
          left: 'Xylophone',
          right: 'Percussion',
          concept: 'music:xylophone-family',
        },
        {left: 'Harp', right: 'Strings', concept: 'music:harp-family'},
      ],
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 4. Adventure Story Builder (story-builder)
  {
    id: 'create-story-adventure-04',
    title: 'The Magical Art Show',
    category: 'creativity',
    subcategory: 'storytelling',
    template: 'story-builder',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'book-open-page-variant',
    color: '#E056A0',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    learningObjectives: [
      'storytelling',
      'imagination',
      'decision-making',
      'creative-thinking',
    ],
    tags: ['story', 'art', 'imagination', 'creativity'],
    content: {
      story: {
        start: 'studio-door',
        scenes: {
          'studio-door': {
            text: 'You find a mysterious door in the school hallway with a sign that reads "Art Studio of Wonders." You hear soft music playing inside and see sparkles of light under the door. What do you do?',
            icon: 'door',
            choices: [
              {
                text: 'Open the door and step inside',
                nextScene: 'inside-studio',
                isGood: true,
                concept: 'creativity:curiosity-explore',
              },
              {
                text: 'Walk away because it looks strange',
                nextScene: 'walk-away',
                isGood: false,
                concept: 'creativity:missed-opportunity',
              },
            ],
          },
          'walk-away': {
            text: 'You start to walk away, but you hear a gentle voice say "Every artist was first an explorer." Your curiosity grows stronger. Maybe you should go back and see what is inside.',
            icon: 'lightbulb',
            choices: [
              {
                text: 'Go back and open the door',
                nextScene: 'inside-studio',
                isGood: true,
                concept: 'creativity:courage-return',
              },
            ],
          },
          'inside-studio': {
            text: 'Inside is a magical art studio! Paintings float in the air, sculptures change shape, and paintbrushes dance by themselves. A friendly owl wearing a beret says "Welcome, young artist! Pick a creative tool to begin your adventure."',
            icon: 'palette',
            choices: [
              {
                text: 'Pick up the glowing paintbrush',
                nextScene: 'paintbrush-path',
                isGood: true,
                concept: 'creativity:painting-choice',
              },
              {
                text: 'Pick up the singing clay',
                nextScene: 'sculpture-path',
                isGood: true,
                concept: 'creativity:sculpture-choice',
              },
            ],
          },
          'paintbrush-path': {
            text: 'The paintbrush glows brighter in your hand! When you wave it through the air, it leaves trails of rainbow light. The owl says "Paint something from your imagination, and it will come to life!" What will you paint?',
            icon: 'brush',
            choices: [
              {
                text: 'Paint a friendly dragon',
                nextScene: 'dragon-scene',
                isGood: true,
                concept: 'creativity:imagination-dragon',
              },
              {
                text: 'Paint a beautiful garden',
                nextScene: 'garden-scene',
                isGood: true,
                concept: 'creativity:imagination-garden',
              },
            ],
          },
          'sculpture-path': {
            text: 'The clay hums a lovely tune as you hold it. When you shape it with your hands, it wiggles and giggles. The owl says "Whatever you sculpt will dance and play!" What will you create?',
            icon: 'creation',
            choices: [
              {
                text: 'Sculpt a playful kitten',
                nextScene: 'dragon-scene',
                isGood: true,
                concept: 'creativity:imagination-kitten',
              },
              {
                text: 'Sculpt a tiny castle',
                nextScene: 'garden-scene',
                isGood: true,
                concept: 'creativity:imagination-castle',
              },
            ],
          },
          'dragon-scene': {
            text: 'Your creation comes alive! It is small and friendly, and it wants to help you decorate the studio for the big Art Show tonight. You need to choose colors for the banner. What colors will you pick?',
            icon: 'star',
            choices: [
              {
                text: 'Bright rainbow colors to make everyone smile',
                nextScene: 'art-show',
                isGood: true,
                concept: 'creativity:color-bold',
              },
              {
                text: 'Soft pastel colors for a calm feeling',
                nextScene: 'art-show',
                isGood: true,
                concept: 'creativity:color-gentle',
              },
            ],
          },
          'garden-scene': {
            text: 'Your creation blooms with life! Flowers open, butterflies appear, and a little fountain plays music. The owl claps and says "Wonderful! Now help me design an invitation for the Art Show tonight."',
            icon: 'flower',
            choices: [
              {
                text: 'Draw colorful flowers on the invitation',
                nextScene: 'art-show',
                isGood: true,
                concept: 'creativity:design-floral',
              },
              {
                text: 'Write a poem for the invitation',
                nextScene: 'art-show',
                isGood: true,
                concept: 'creativity:design-poetry',
              },
            ],
          },
          'art-show': {
            text: 'The Art Show is a huge success! Everyone loves your creations. The owl gives you a Golden Brush award and says "Remember, creativity lives inside everyone. All you need to do is imagine, and your ideas can become real." You feel proud and inspired. The End!',
            icon: 'trophy',
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

  // 5. Art & Colors Memory (memory-flip)
  {
    id: 'create-art-memory-05',
    title: 'Art & Colors Memory',
    category: 'creativity',
    subcategory: 'art-vocabulary',
    template: 'memory-flip',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'grid',
    color: '#E056A0',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['art-vocabulary', 'memory', 'color-knowledge'],
    tags: ['art', 'colors', 'memory', 'vocabulary'],
    content: {
      pairs: [
        {
          id: 'art-1',
          front: 'Brush',
          match: 'Painting',
          concept: 'art:brush-painting',
        },
        {
          id: 'art-2',
          front: 'Red + Blue',
          match: 'Purple',
          concept: 'art:mix-purple',
        },
        {
          id: 'art-3',
          front: 'Pencil',
          match: 'Drawing',
          concept: 'art:pencil-drawing',
        },
        {
          id: 'art-4',
          front: 'Red + Yellow',
          match: 'Orange',
          concept: 'art:mix-orange',
        },
        {
          id: 'art-5',
          front: 'Clay',
          match: 'Sculpture',
          concept: 'art:clay-sculpture',
        },
        {
          id: 'art-6',
          front: 'Blue + Yellow',
          match: 'Green',
          concept: 'art:mix-green',
        },
        {
          id: 'art-7',
          front: 'Camera',
          match: 'Photography',
          concept: 'art:camera-photo',
        },
        {
          id: 'art-8',
          front: 'Stage',
          match: 'Theater',
          concept: 'art:stage-theater',
        },
        {
          id: 'art-9',
          front: 'Crayon',
          match: 'Coloring',
          concept: 'art:crayon-coloring',
        },
        {
          id: 'art-10',
          front: 'Scissors',
          match: 'Collage',
          concept: 'art:scissors-collage',
        },
      ],
      gridColumns: 4,
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 8, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 6. Art Styles Quiz (multiple-choice)
  {
    id: 'create-art-styles-06',
    title: 'Art Styles Quiz',
    category: 'creativity',
    subcategory: 'art-knowledge',
    template: 'multiple-choice',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'image-frame',
    color: '#E056A0',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: [
      'art-appreciation',
      'visual-literacy',
      'art-knowledge',
    ],
    tags: ['art', 'styles', 'knowledge'],
    content: {
      questions: [
        {
          question: 'What are the three primary colors?',
          options: [
            'Red, Green, Purple',
            'Red, Blue, Yellow',
            'Orange, Green, Purple',
            'Pink, Blue, Green',
          ],
          correctIndex: 1,
          concept: 'art:primary-colors',
          hint: 'These colors cannot be made by mixing other colors together',
        },
        {
          question: 'What do you call a picture of a person?',
          options: ['Landscape', 'Still Life', 'Portrait', 'Abstract'],
          correctIndex: 2,
          concept: 'art:portrait',
          hint: "It focuses on someone's face or full body",
        },
        {
          question: 'What tool does a sculptor use to shape clay?',
          options: ['Paintbrush', 'Scissors', 'Hands and tools', 'Pencil'],
          correctIndex: 2,
          concept: 'art:sculpture-tools',
          hint: 'Sculptors press and mold the material',
        },
        {
          question: 'What is a painting of mountains, trees, and sky called?',
          options: ['Portrait', 'Landscape', 'Abstract', 'Collage'],
          correctIndex: 1,
          concept: 'art:landscape',
          hint: 'It shows outdoor scenery and nature',
        },
        {
          question: 'What art form uses cut paper glued onto a surface?',
          options: ['Painting', 'Drawing', 'Collage', 'Sculpture'],
          correctIndex: 2,
          concept: 'art:collage',
          hint: 'You cut and paste different pieces together',
        },
        {
          question: 'Which color do you get when you mix red and white?',
          options: ['Purple', 'Orange', 'Pink', 'Gray'],
          correctIndex: 2,
          concept: 'art:mix-pink',
          hint: 'Adding white makes a color lighter',
        },
        {
          question: 'What is a drawing made with dots instead of lines called?',
          options: ['Pointillism', 'Cubism', 'Realism', 'Sketching'],
          correctIndex: 0,
          concept: 'art:pointillism',
          hint: 'Think of tiny points or dots placed close together',
        },
        {
          question: 'What do artists use an easel for?',
          options: [
            'Mixing paint',
            'Holding a canvas while painting',
            'Cleaning brushes',
            'Cutting paper',
          ],
          correctIndex: 1,
          concept: 'art:easel',
          hint: 'It stands upright and holds the surface you paint on',
        },
        {
          question: 'What are warm colors?',
          options: [
            'Blue, Green, Purple',
            'Red, Orange, Yellow',
            'Black, White, Gray',
            'Pink, Lavender, Teal',
          ],
          correctIndex: 1,
          concept: 'art:warm-colors',
          hint: 'Think of fire and sunshine',
        },
        {
          question: 'What are cool colors?',
          options: [
            'Red, Orange, Yellow',
            'Blue, Green, Purple',
            'Black, White, Gray',
            'Pink, Peach, Cream',
          ],
          correctIndex: 1,
          concept: 'art:cool-colors',
          hint: 'Think of water, sky, and grass',
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

  // 7. Creative Word Building (word-build)
  {
    id: 'create-word-art-07',
    title: 'Creative Word Building',
    category: 'creativity',
    subcategory: 'art-vocabulary',
    template: 'word-build',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'alphabetical-variant',
    color: '#E056A0',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['vocabulary', 'spelling', 'art-terms'],
    tags: ['words', 'art', 'vocabulary', 'spelling'],
    content: {
      words: [
        {
          word: 'paint',
          hint: 'A colorful liquid you spread on paper with a brush',
          concept: 'create-word:paint',
          extraLetters: 2,
        },
        {
          word: 'color',
          hint: 'Red, blue, and yellow are examples of this',
          concept: 'create-word:color',
          extraLetters: 2,
        },
        {
          word: 'brush',
          hint: 'A tool with bristles used to apply paint',
          concept: 'create-word:brush',
          extraLetters: 2,
        },
        {
          word: 'music',
          hint: 'Sounds and rhythms that you hear in songs',
          concept: 'create-word:music',
          extraLetters: 3,
        },
        {
          word: 'dance',
          hint: 'Moving your body to rhythm and music',
          concept: 'create-word:dance',
          extraLetters: 2,
        },
        {
          word: 'canvas',
          hint: 'The flat surface that artists paint on',
          concept: 'create-word:canvas',
          extraLetters: 3,
        },
        {
          word: 'sketch',
          hint: 'A quick drawing made with a pencil',
          concept: 'create-word:sketch',
          extraLetters: 3,
        },
        {
          word: 'rhythm',
          hint: 'A pattern of beats in music or poetry',
          concept: 'create-word:rhythm',
          extraLetters: 3,
        },
        {
          word: 'sculpt',
          hint: 'To shape clay or material into art with your hands',
          concept: 'create-word:sculpt',
          extraLetters: 3,
        },
        {
          word: 'design',
          hint: 'A plan or pattern for how something looks',
          concept: 'create-word:design',
          extraLetters: 3,
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

  // 8. Art or Not? (true-false)
  {
    id: 'create-art-truefalse-08',
    title: 'Art or Not?',
    category: 'creativity',
    subcategory: 'art-knowledge',
    template: 'true-false',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'check-decagram',
    color: '#E056A0',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: [
      'art-awareness',
      'creative-thinking',
      'critical-thinking',
    ],
    tags: ['art', 'knowledge', 'true-false'],
    content: {
      statements: [
        {
          text: 'Drawing with crayons is a form of art.',
          answer: true,
          concept: 'art:crayon-art',
          explanation:
            'Drawing with crayons is definitely art! Any way you express your ideas visually is art.',
        },
        {
          text: 'Only adults can be artists.',
          answer: false,
          concept: 'art:anyone-artist',
          explanation:
            'Anyone can be an artist, even young children! Art is for everyone.',
        },
        {
          text: 'Music is a form of creative art.',
          answer: true,
          concept: 'art:music-is-art',
          explanation:
            'Music uses sounds and rhythms creatively, making it a wonderful art form.',
        },
        {
          text: 'You need expensive tools to make good art.',
          answer: false,
          concept: 'art:tools-myth',
          explanation:
            'You can make amazing art with simple things like paper, sticks, or even sand!',
        },
        {
          text: 'Dancing is a creative activity.',
          answer: true,
          concept: 'art:dance-creative',
          explanation:
            'Dancing uses your body to express feelings and ideas. It is very creative!',
        },
        {
          text: 'There is only one right way to draw a cat.',
          answer: false,
          concept: 'art:many-styles',
          explanation:
            'Every artist draws differently and that is what makes art special and unique!',
        },
        {
          text: 'Singing is a way to express creativity.',
          answer: true,
          concept: 'art:singing-creative',
          explanation:
            'Singing lets you use your voice to create beautiful sounds and tell stories.',
        },
        {
          text: 'A sculpture is a flat picture on paper.',
          answer: false,
          concept: 'art:sculpture-3d',
          explanation:
            'A sculpture is a 3D artwork that you can see from all sides, not flat like a picture.',
        },
        {
          text: 'Building with blocks can be a creative activity.',
          answer: true,
          concept: 'art:building-creative',
          explanation:
            'Building and constructing things uses imagination and problem-solving, which are creative skills!',
        },
        {
          text: 'Art must always look real and perfect.',
          answer: false,
          concept: 'art:abstract-ok',
          explanation:
            'Art can be abstract, silly, messy, or imaginary. There are no rules about what art should look like!',
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

  // 9. Art Tools Sorting (drag-to-zone)
  {
    id: 'create-tools-sort-09',
    title: 'Art Tools Sorting',
    category: 'creativity',
    subcategory: 'art-tools',
    template: 'drag-to-zone',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'toolbox',
    color: '#E056A0',
    estimatedMinutes: 4,
    questionsPerSession: 12,
    learningObjectives: ['art-tools', 'classification', 'creative-awareness'],
    tags: ['art', 'tools', 'sorting', 'creativity'],
    content: {
      zones: [
        {id: 'drawing', label: 'Drawing Tools', color: '#9B59B6'},
        {id: 'painting', label: 'Painting Tools', color: '#E74C3C'},
        {id: 'crafts', label: 'Craft Supplies', color: '#2ECC71'},
      ],
      items: [
        {
          id: 'pencil',
          label: 'Pencil',
          zone: 'drawing',
          concept: 'art-tool:pencil',
        },
        {
          id: 'paintbrush',
          label: 'Paintbrush',
          zone: 'painting',
          concept: 'art-tool:paintbrush',
        },
        {
          id: 'glue-stick',
          label: 'Glue Stick',
          zone: 'crafts',
          concept: 'art-tool:glue',
        },
        {
          id: 'eraser',
          label: 'Eraser',
          zone: 'drawing',
          concept: 'art-tool:eraser',
        },
        {
          id: 'watercolors',
          label: 'Watercolors',
          zone: 'painting',
          concept: 'art-tool:watercolors',
        },
        {
          id: 'scissors',
          label: 'Scissors',
          zone: 'crafts',
          concept: 'art-tool:scissors',
        },
        {
          id: 'charcoal',
          label: 'Charcoal Stick',
          zone: 'drawing',
          concept: 'art-tool:charcoal',
        },
        {
          id: 'palette',
          label: 'Paint Palette',
          zone: 'painting',
          concept: 'art-tool:palette',
        },
        {
          id: 'glitter',
          label: 'Glitter',
          zone: 'crafts',
          concept: 'art-tool:glitter',
        },
        {
          id: 'crayon',
          label: 'Crayon',
          zone: 'drawing',
          concept: 'art-tool:crayon',
        },
        {
          id: 'sponge',
          label: 'Paint Sponge',
          zone: 'painting',
          concept: 'art-tool:sponge',
        },
        {
          id: 'tape',
          label: 'Craft Tape',
          zone: 'crafts',
          concept: 'art-tool:tape',
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

  // 10. Design Thinking Steps (sequence-order)
  {
    id: 'create-design-steps-10',
    title: 'Design Thinking Steps',
    category: 'creativity',
    subcategory: 'design-thinking',
    template: 'sequence-order',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'lightbulb-on',
    color: '#E056A0',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: [
      'design-thinking',
      'problem-solving',
      'creative-process',
    ],
    tags: ['design', 'thinking', 'process', 'creativity'],
    content: {
      sequences: [
        {
          items: [
            'Think of an idea',
            'Draw a sketch',
            'Pick your colors',
            'Gather materials',
            'Start creating',
            'Add details',
            'Check your work',
            'Share with friends',
          ],
          concept: 'design:creative-process',
        },
        {
          items: [
            'See a problem',
            'Ask questions',
            'Brainstorm ideas',
            'Pick the best idea',
            'Build a model',
            'Test it out',
            'Make it better',
            'Present your solution',
          ],
          concept: 'design:problem-solving',
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

export default CREATIVITY_GAMES;
