/**
 * Kids Learning Zone - Extra Life Skills Game Configurations (15 games)
 *
 * These supplement the 10 Life Skills games in gameConfigs.js to reach 25 total.
 * Templates used: story-builder, timed-rush, memory-flip, drag-to-zone,
 * spot-difference, sequence-order, word-build, match-pairs, simulation,
 * multiple-choice, true-false, fill-blank, counting.
 */

const LIFE_SKILLS_GAMES_EXTRA = [
  // 11. Life Choices Story (story-builder)
  {
    id: 'life-story-choices-11',
    title: 'Life Choices Story',
    category: 'lifeSkills',
    subcategory: 'decision-making',
    template: 'story-builder',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'book-open-variant',
    emoji: '🤔',
    color: '#FFE66D',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    learningObjectives: [
      'decision-making',
      'ethics',
      'empathy',
      'consequences',
    ],
    tags: ['story', 'ethics', 'decisions', 'empathy'],
    content: {
      story: {
        start: 'playground-scene',
        scenes: {
          'playground-scene': {
            text: 'You are at the playground during recess. You see a new kid sitting alone on a bench looking sad while everyone else is playing. What do you do?',
            icon: 'account-group',
            choices: [
              {
                text: 'Walk over and ask if they want to play',
                nextScene: 'invite-play',
                isGood: true,
                concept: 'ethics:include-others',
              },
              {
                text: 'Keep playing with your friends and ignore them',
                nextScene: 'ignore-kid',
                isGood: false,
                concept: 'ethics:ignoring-lonely',
              },
            ],
          },
          'invite-play': {
            text: 'The new kid\'s face lights up! "Really? Thank you!" they say. Their name is Alex. You start playing together when one of your friends comes over and says, "Why are you playing with the new kid? Come play with us instead."',
            icon: 'emoticon-happy',
            choices: [
              {
                text: 'Say "Alex can play with all of us!"',
                nextScene: 'include-all',
                isGood: true,
                concept: 'ethics:inclusive-play',
              },
              {
                text: 'Leave Alex to go with your friend',
                nextScene: 'leave-alex',
                isGood: false,
                concept: 'ethics:abandoning-friend',
              },
            ],
          },
          'ignore-kid': {
            text: 'You keep playing, but you keep looking back at the bench. The kid looks even sadder now. You remember how you felt on YOUR first day at a new school.',
            icon: 'emoticon-sad',
            choices: [
              {
                text: 'Go back and invite them to play',
                nextScene: 'invite-play',
                isGood: true,
                concept: 'ethics:empathy-action',
              },
              {
                text: 'Tell a teacher the new kid is alone',
                nextScene: 'tell-teacher',
                isGood: true,
                concept: 'ethics:seeking-help',
              },
            ],
          },
          'include-all': {
            text: 'Your friend thinks about it and says, "Sure, the more the merrier!" Now you are all playing tag together. Alex is really fast and everyone is having fun!',
            icon: 'emoticon-happy',
            choices: [
              {
                text: 'Continue playing together',
                nextScene: 'lunch-scene',
                isGood: true,
                concept: 'ethics:teamwork',
              },
            ],
          },
          'leave-alex': {
            text: "You start to walk away but see Alex's smile fade. You feel a knot in your stomach. That was not very kind.",
            icon: 'emoticon-sad',
            choices: [
              {
                text: 'Go back and say "Sorry, come play with all of us!"',
                nextScene: 'include-all',
                isGood: true,
                concept: 'ethics:making-amends',
              },
            ],
          },
          'tell-teacher': {
            text: 'The teacher thanks you for caring and goes to check on the new kid. She brings Alex over to join the group. Sometimes asking for help is the right thing to do!',
            icon: 'school',
            choices: [
              {
                text: 'Welcome Alex to the group',
                nextScene: 'include-all',
                isGood: true,
                concept: 'ethics:welcoming',
              },
            ],
          },
          'lunch-scene': {
            text: 'At lunch, Alex accidentally drops their tray and food spills everywhere. Some kids start to laugh. What do you do?',
            icon: 'food',
            choices: [
              {
                text: 'Help Alex clean up and share some of your food',
                nextScene: 'help-cleanup',
                isGood: true,
                concept: 'ethics:helping-embarrassed',
              },
              {
                text: 'Just watch and do nothing',
                nextScene: 'watch-nothing',
                isGood: false,
                concept: 'ethics:bystander',
              },
            ],
          },
          'help-cleanup': {
            text: 'You help pick up the food and share your sandwich with Alex. Other kids see you helping and come to help too. Alex says, "You are the best friend I could ask for."',
            icon: 'hand-heart',
            choices: [
              {
                text: 'Continue the story',
                nextScene: 'happy-ending',
                isGood: true,
                concept: 'ethics:leading-by-example',
              },
            ],
          },
          'watch-nothing': {
            text: 'Alex tries to clean up alone, looking embarrassed. You feel bad for not helping. A kind choice could have made a big difference.',
            icon: 'emoticon-sad',
            choices: [
              {
                text: 'Go help Alex now - better late than never',
                nextScene: 'help-cleanup',
                isGood: true,
                concept: 'ethics:late-kindness',
              },
            ],
          },
          'happy-ending': {
            text: 'At the end of the day, Alex tells you: "This is the best first day I have ever had, and it is because of you." You learned that including others, standing up for them, and being kind can change someone\'s whole day. The End.',
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

  // 12. Safety Quiz Rush (timed-rush)
  {
    id: 'life-timed-safety-12',
    title: 'Safety Quiz Rush',
    category: 'lifeSkills',
    subcategory: 'safety',
    template: 'timed-rush',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'timer',
    emoji: '🚨',
    color: '#FFE66D',
    estimatedMinutes: 3,
    questionsPerSession: 12,
    learningObjectives: ['safety', 'emergency-knowledge', 'quick-thinking'],
    tags: ['safety', 'timed', 'emergency'],
    content: {
      timeLimit: 60,
      questions: [
        {
          question: 'What number do you call in an emergency?',
          options: ['911', '411', '311'],
          correctIndex: 0,
          concept: 'safety:emergency-number',
        },
        {
          question: 'What should you do if your clothes catch fire?',
          options: ['Run fast', 'Stop, drop, and roll', 'Fan the flames'],
          correctIndex: 1,
          concept: 'safety:fire-on-clothes',
        },
        {
          question: 'Is it safe to swim alone without an adult?',
          options: ['Yes', 'Only in shallow water', 'No'],
          correctIndex: 2,
          concept: 'safety:swim-supervision',
        },
        {
          question: 'What should you do during an earthquake?',
          options: [
            'Drop, cover, and hold on',
            'Run outside',
            'Stand near a window',
          ],
          correctIndex: 0,
          concept: 'safety:earthquake',
        },
        {
          question: 'Should you tell an adult if a stranger offers you candy?',
          options: [
            'No, take the candy',
            'Only if the candy looks bad',
            'Yes, always tell an adult',
          ],
          correctIndex: 2,
          concept: 'safety:stranger-danger',
        },
        {
          question: 'What do you do if you smell smoke?',
          options: ['Open windows', 'Get low and get out', 'Look for the fire'],
          correctIndex: 1,
          concept: 'safety:smoke',
        },
        {
          question: 'Where should you go during a tornado warning?',
          options: [
            'An interior room on the lowest floor',
            'Near windows',
            'Outside to watch',
          ],
          correctIndex: 0,
          concept: 'safety:tornado',
        },
        {
          question: 'Should you touch a downed power line?',
          options: ['Yes, to move it', 'Only with gloves', 'Never touch it'],
          correctIndex: 2,
          concept: 'safety:power-line',
        },
        {
          question: 'What should you wear when riding a bike?',
          options: ['A hat', 'A helmet', 'Sunglasses'],
          correctIndex: 1,
          concept: 'safety:bike-helmet',
        },
        {
          question: 'Is it safe to play near a busy road?',
          options: ['No, never', 'Yes, if careful', 'Only with friends'],
          correctIndex: 0,
          concept: 'safety:road-play',
        },
        {
          question: 'What should you do if lost in a store?',
          options: [
            'Wander around',
            'Leave the store',
            'Find a store worker and ask for help',
          ],
          correctIndex: 2,
          concept: 'safety:lost-store',
        },
        {
          question: 'Should you run near a swimming pool?',
          options: [
            'No, you could slip and fall',
            'Yes, to get there faster',
            'Only if the floor is dry',
          ],
          correctIndex: 0,
          concept: 'safety:pool-safety',
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

  // 13. Chore Memory Match (memory-flip)
  {
    id: 'life-memory-chores-13',
    title: 'Chore Memory Match',
    category: 'lifeSkills',
    subcategory: 'daily-routine',
    template: 'memory-flip',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'grid',
    emoji: '🧠',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['chores', 'responsibility', 'tool-matching'],
    tags: ['chores', 'memory', 'tools'],
    content: {
      pairs: [
        {
          id: 'pair-1',
          front: 'Sweep the floor',
          match: 'Broom',
          concept: 'chore:sweep-broom',
        },
        {
          id: 'pair-2',
          front: 'Wash dishes',
          match: 'Sponge',
          concept: 'chore:wash-sponge',
        },
        {
          id: 'pair-3',
          front: 'Water plants',
          match: 'Watering can',
          concept: 'chore:water-can',
        },
        {
          id: 'pair-4',
          front: 'Clean windows',
          match: 'Spray bottle',
          concept: 'chore:window-spray',
        },
        {
          id: 'pair-5',
          front: 'Dry clothes',
          match: 'Clothesline',
          concept: 'chore:dry-line',
        },
        {
          id: 'pair-6',
          front: 'Take out trash',
          match: 'Trash bag',
          concept: 'chore:trash-bag',
        },
        {
          id: 'pair-7',
          front: 'Set the table',
          match: 'Plates and forks',
          concept: 'chore:table-setting',
        },
        {
          id: 'pair-8',
          front: 'Wipe counter',
          match: 'Cloth',
          concept: 'chore:wipe-cloth',
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

  // 14. Recycling Sort Advanced (drag-to-zone)
  {
    id: 'life-drag-recycle-14',
    title: 'Recycling Sort Advanced',
    category: 'lifeSkills',
    subcategory: 'environment',
    template: 'drag-to-zone',
    ageRange: [5, 9],
    difficulty: 2,
    icon: 'recycle',
    emoji: '♻️',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 12,
    learningObjectives: ['recycling', 'waste-management', 'environment'],
    tags: ['recycling', 'environment', 'sorting'],
    content: {
      zones: [
        {id: 'paper', label: 'Paper', color: '#3498DB'},
        {id: 'plastic', label: 'Plastic', color: '#F39C12'},
        {id: 'glass', label: 'Glass', color: '#2ECC71'},
        {id: 'organic', label: 'Organic / Compost', color: '#8B4513'},
      ],
      items: [
        {
          id: 'cereal-box',
          label: 'Cereal Box',
          zone: 'paper',
          concept: 'recycle:paper-cereal',
        },
        {
          id: 'soda-bottle',
          label: 'Soda Bottle',
          zone: 'plastic',
          concept: 'recycle:plastic-soda',
        },
        {
          id: 'wine-bottle',
          label: 'Glass Bottle',
          zone: 'glass',
          concept: 'recycle:glass-wine',
        },
        {
          id: 'banana-peel',
          label: 'Banana Peel',
          zone: 'organic',
          concept: 'recycle:organic-banana',
        },
        {
          id: 'envelope',
          label: 'Paper Envelope',
          zone: 'paper',
          concept: 'recycle:paper-envelope',
        },
        {
          id: 'detergent',
          label: 'Detergent Bottle',
          zone: 'plastic',
          concept: 'recycle:plastic-detergent',
        },
        {
          id: 'mason-jar',
          label: 'Mason Jar',
          zone: 'glass',
          concept: 'recycle:glass-mason',
        },
        {
          id: 'apple-core',
          label: 'Apple Core',
          zone: 'organic',
          concept: 'recycle:organic-apple',
        },
        {
          id: 'wrapping-paper',
          label: 'Wrapping Paper',
          zone: 'paper',
          concept: 'recycle:paper-wrapping',
        },
        {
          id: 'milk-carton',
          label: 'Plastic Milk Carton',
          zone: 'plastic',
          concept: 'recycle:plastic-milk',
        },
        {
          id: 'coffee-grounds',
          label: 'Coffee Grounds',
          zone: 'organic',
          concept: 'recycle:organic-coffee',
        },
        {
          id: 'pasta-sauce-jar',
          label: 'Pasta Sauce Jar',
          zone: 'glass',
          concept: 'recycle:glass-sauce',
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

  // 15. Spot the Hazard (spot-difference)
  {
    id: 'life-spot-hazards-15',
    title: 'Spot the Hazard',
    category: 'lifeSkills',
    subcategory: 'safety',
    template: 'spot-difference',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'alert',
    emoji: '⚠️',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['safety', 'hazard-awareness', 'home-safety'],
    tags: ['safety', 'hazards', 'home'],
    content: {
      rounds: [
        {
          title: 'Kitchen: Knife left on edge of counter',
          differences: [
            {
              x: 60,
              y: 30,
              label: 'A knife on the edge could fall and hurt someone',
            },
          ],
          concept: 'hazard:knife-edge',
        },
        {
          title: 'Bathroom: Water puddle on tile floor',
          differences: [
            {
              x: 40,
              y: 70,
              label: 'A wet floor is slippery and can cause falls',
            },
          ],
          concept: 'hazard:wet-floor',
        },
        {
          title: 'Living room: Electrical cord across walkway',
          differences: [
            {x: 50, y: 60, label: 'A cord on the floor is a tripping hazard'},
          ],
          concept: 'hazard:trip-cord',
        },
        {
          title: 'Bedroom: Candle burning near curtains',
          differences: [
            {x: 70, y: 20, label: 'An open flame near fabric can start a fire'},
          ],
          concept: 'hazard:candle-curtain',
        },
        {
          title: 'Garage: Cleaning chemicals on low shelf',
          differences: [
            {
              x: 30,
              y: 50,
              label:
                'Chemicals should be stored high and locked away from children',
            },
          ],
          concept: 'hazard:chemicals-low',
        },
        {
          title: 'Garden: Broken glass on the grass',
          differences: [
            {x: 55, y: 65, label: 'Broken glass can cut bare feet'},
          ],
          concept: 'hazard:broken-glass',
        },
        {
          title: 'Kitchen: Pot handle sticking out over stove edge',
          differences: [
            {
              x: 45,
              y: 25,
              label:
                'A pot handle sticking out can be bumped and spill hot liquid',
            },
          ],
          concept: 'hazard:pot-handle',
        },
        {
          title: 'Hallway: Heavy bookshelf not anchored to wall',
          differences: [
            {
              x: 35,
              y: 40,
              label: 'An unsecured bookshelf can tip over on children',
            },
          ],
          concept: 'hazard:bookshelf-tip',
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

  // 16. Daily Routine Order (sequence-order)
  {
    id: 'life-sequence-routine-16',
    title: 'Daily Routine Order',
    category: 'lifeSkills',
    subcategory: 'daily-routine',
    template: 'sequence-order',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'calendar-clock',
    emoji: '📅',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['routine', 'time-management', 'sequencing'],
    tags: ['routine', 'daily-life', 'evening'],
    content: {
      sequences: [
        {
          items: [
            'Come home from school',
            'Wash hands',
            'Have a healthy snack',
            'Do homework',
            'Play or read',
            'Help set the dinner table',
            'Eat dinner with family',
            'Brush teeth and go to bed',
          ],
          concept: 'routine:after-school',
        },
        {
          items: [
            'Put away toys',
            'Take a warm bath',
            'Put on pajamas',
            'Brush teeth',
            'Read a bedtime story',
            'Say goodnight to family',
            'Turn off the light',
            'Close eyes and sleep',
          ],
          concept: 'routine:bedtime',
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

  // 17. Feelings Word Builder (word-build)
  {
    id: 'life-word-feelings-17',
    title: 'Feelings Word Builder',
    category: 'lifeSkills',
    subcategory: 'emotion-recognition',
    template: 'word-build',
    ageRange: [5, 8],
    difficulty: 2,
    icon: 'emoticon-happy',
    emoji: '😊',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: ['emotions', 'vocabulary', 'self-awareness'],
    tags: ['emotions', 'feelings', 'vocabulary'],
    content: {
      words: [
        {
          word: 'happy',
          hint: 'Feeling joyful and pleased',
          concept: 'feeling:happy',
          extraLetters: 2,
          emoji: '😄',
          imagePrompt:
            'cute cartoon happy face, bright yellow smiling face with big grin, white background, children educational illustration style',
        },
        {
          word: 'angry',
          hint: 'Feeling upset and frustrated',
          concept: 'feeling:angry',
          extraLetters: 2,
          emoji: '😠',
          imagePrompt:
            'cute cartoon angry face, red frowning face with furrowed brows, white background, children educational illustration style',
        },
        {
          word: 'scared',
          hint: 'Feeling afraid of something',
          concept: 'feeling:scared',
          extraLetters: 2,
          emoji: '😨',
          imagePrompt:
            'cute cartoon scared face, blue worried face with wide eyes and open mouth, white background, children educational illustration style',
        },
        {
          word: 'excited',
          hint: 'Feeling thrilled about something coming up',
          concept: 'feeling:excited',
          extraLetters: 3,
          emoji: '🤩',
          imagePrompt:
            'cute cartoon excited face, bright face with star eyes and big smile, white background, children educational illustration style',
        },
        {
          word: 'lonely',
          hint: 'Feeling alone and wishing for company',
          concept: 'feeling:lonely',
          extraLetters: 2,
          emoji: '😔',
          imagePrompt:
            'cute cartoon sad face, blue face with downcast eyes sitting alone, white background, children educational illustration style',
        },
        {
          word: 'grateful',
          hint: 'Feeling thankful for something good',
          concept: 'feeling:grateful',
          extraLetters: 3,
          emoji: '🙏',
          imagePrompt:
            'cute cartoon praying hands, two hands pressed together in gratitude, white background, children educational illustration style',
        },
        {
          word: 'nervous',
          hint: 'Feeling worried about something ahead',
          concept: 'feeling:nervous',
          extraLetters: 3,
          emoji: '😰',
          imagePrompt:
            'cute cartoon nervous face, worried face with sweat drop and biting lip, white background, children educational illustration style',
        },
        {
          word: 'proud',
          hint: 'Feeling good about an achievement',
          concept: 'feeling:proud',
          extraLetters: 2,
          emoji: '🤩',
          imagePrompt:
            'cute cartoon proud face, confident face with big smile and sparkle eyes, white background, children educational illustration style',
        },
        {
          word: 'confused',
          hint: 'Not understanding what is happening',
          concept: 'feeling:confused',
          extraLetters: 3,
          emoji: '😕',
          imagePrompt:
            'cute cartoon confused face, face with tilted head and question mark, white background, children educational illustration style',
        },
        {
          word: 'brave',
          hint: 'Feeling courage even when afraid',
          concept: 'feeling:brave',
          extraLetters: 2,
          emoji: '🦸',
          imagePrompt:
            'cute cartoon superhero kid, child wearing cape with brave pose, white background, children educational illustration style',
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

  // 18. Countries and Landmarks (match-pairs)
  {
    id: 'life-match-countries-18',
    title: 'Countries and Landmarks',
    category: 'lifeSkills',
    subcategory: 'general-knowledge',
    template: 'match-pairs',
    ageRange: [6, 10],
    difficulty: 2,
    icon: 'earth',
    emoji: '🌍',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: ['geography', 'countries', 'landmarks', 'culture'],
    tags: ['geography', 'countries', 'landmarks'],
    content: {
      pairs: [
        {
          left: 'France',
          right: 'Eiffel Tower',
          concept: 'geography:france-eiffel',
        },
        {left: 'Egypt', right: 'Pyramids', concept: 'geography:egypt-pyramids'},
        {left: 'China', right: 'Great Wall', concept: 'geography:china-wall'},
        {left: 'India', right: 'Taj Mahal', concept: 'geography:india-taj'},
        {
          left: 'USA',
          right: 'Statue of Liberty',
          concept: 'geography:usa-liberty',
        },
        {
          left: 'Australia',
          right: 'Sydney Opera House',
          concept: 'geography:australia-opera',
        },
        {
          left: 'Italy',
          right: 'Colosseum',
          concept: 'geography:italy-colosseum',
        },
        {
          left: 'Brazil',
          right: 'Christ the Redeemer',
          concept: 'geography:brazil-christ',
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

  // 19. Piggy Bank Simulator (simulation)
  {
    id: 'life-sim-budget-19',
    title: 'Piggy Bank Simulator',
    category: 'lifeSkills',
    subcategory: 'money-management',
    template: 'simulation',
    ageRange: [6, 9],
    difficulty: 2,
    icon: 'piggy-bank',
    emoji: '🐷',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    learningObjectives: [
      'money-management',
      'saving',
      'spending-wisely',
      'budgeting',
    ],
    tags: ['money', 'saving', 'budgeting', 'simulation'],
    content: {
      scenario: {
        title: 'Save for a New Bike',
        concept: 'money:saving-goal',
        startingMoney: 15,
        items: [
          {
            name: 'Save $3 in piggy bank',
            price: 3,
            icon: 'piggy-bank',
            isGood: true,
            feedback:
              'Great choice! Saving brings you closer to your bike goal!',
          },
          {
            name: 'Buy a small toy car',
            price: 4,
            icon: 'car',
            isGood: false,
            feedback:
              'Fun now, but it takes money away from your bike savings.',
          },
          {
            name: 'Help neighbor and earn $2',
            price: -2,
            icon: 'hand-heart',
            isGood: true,
            feedback: 'Earning money by helping others is wonderful!',
          },
          {
            name: 'Buy candy at the store',
            price: 2,
            icon: 'candy',
            isGood: false,
            feedback: 'Candy is a small treat but does not help your savings.',
          },
          {
            name: 'Save $5 in piggy bank',
            price: 5,
            icon: 'piggy-bank',
            isGood: true,
            feedback: 'A big save! You are getting much closer to your goal!',
          },
          {
            name: 'Buy a comic book',
            price: 3,
            icon: 'book-open-variant',
            isGood: false,
            feedback: 'You can borrow comics from the library for free!',
          },
          {
            name: 'Do extra chores and earn $3',
            price: -3,
            icon: 'broom',
            isGood: true,
            feedback:
              'Working hard and earning money shows great responsibility!',
          },
          {
            name: 'Buy stickers',
            price: 1,
            icon: 'star',
            isGood: false,
            feedback: 'Small purchases add up. Keep saving for the big goal!',
          },
        ],
        goal: 'Save as much money as you can for a new bicycle that costs $25!',
      },
    },
    rewards: {starsPerCorrect: 1, bonusThreshold: 6, bonusStars: 3},
    threeR: {
      measuresRetention: true,
      measuresRecall: true,
      measuresRegistration: true,
    },
  },

  // 20. Good Manners Quiz (multiple-choice)
  {
    id: 'life-manners-quiz-20',
    title: 'Good Manners Quiz',
    category: 'lifeSkills',
    subcategory: 'manners',
    template: 'multiple-choice',
    ageRange: [4, 8],
    difficulty: 1,
    icon: 'hand-heart',
    emoji: '🤝',
    color: '#FFE66D',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    learningObjectives: ['manners', 'politeness', 'social-etiquette'],
    tags: ['manners', 'etiquette', 'social'],
    content: {
      questions: [
        {
          question: 'Someone gives you a gift. What do you say?',
          options: [
            'Nothing',
            'Thank you!',
            'I wanted something else',
            'Give me more',
          ],
          correctIndex: 1,
          concept: 'manners:thank-you',
          hint: 'Being grateful is important',
        },
        {
          question: 'You accidentally bump into someone. What do you say?',
          options: [
            'Watch where you are going!',
            'Nothing',
            'Excuse me, I am sorry',
            'That was your fault',
          ],
          correctIndex: 2,
          concept: 'manners:sorry',
          hint: 'Taking responsibility is polite',
        },
        {
          question: 'You want to ask the teacher a question. What do you do?',
          options: [
            'Shout the question loudly',
            'Raise your hand and wait',
            'Talk to your friend instead',
            'Get up and walk to the teacher',
          ],
          correctIndex: 1,
          concept: 'manners:raise-hand',
          hint: 'Waiting your turn shows respect',
        },
        {
          question:
            'You are eating dinner with your family. What is good manners?',
          options: [
            'Chew with your mouth open',
            'Put elbows on the table',
            'Chew with your mouth closed',
            'Talk with food in your mouth',
          ],
          correctIndex: 2,
          concept: 'manners:table-manners',
          hint: 'Nobody wants to see chewed food',
        },
        {
          question: 'Someone is speaking. What should you do?',
          options: [
            'Interrupt them',
            'Walk away',
            'Listen quietly until they finish',
            'Talk louder than them',
          ],
          correctIndex: 2,
          concept: 'manners:listening',
          hint: 'Everyone deserves to be heard',
        },
        {
          question: 'You need to pass in front of someone. What do you say?',
          options: [
            'Move!',
            'Excuse me, please',
            'Get out of my way',
            'Nothing, just push through',
          ],
          correctIndex: 1,
          concept: 'manners:excuse-me',
          hint: 'Polite words help you get along with others',
        },
        {
          question: 'An adult holds the door open for you. What do you do?',
          options: [
            'Run through quickly',
            'Say "Thank you" and walk through',
            'Ignore them',
            'Let the door close behind you',
          ],
          correctIndex: 1,
          concept: 'manners:door-holding',
          hint: 'Show appreciation when someone helps you',
        },
        {
          question: "You want to borrow a friend's toy. What do you say?",
          options: [
            'Give it to me!',
            'I want that',
            'May I please borrow your toy?',
            'Take it without asking',
          ],
          correctIndex: 2,
          concept: 'manners:ask-permission',
          hint: 'Using "please" and asking shows respect',
        },
        {
          question: 'You sneeze in class. What should you do?',
          options: [
            'Sneeze loudly into the air',
            'Cover your mouth and say excuse me',
            'Sneeze on your hand and touch things',
            'Ignore it',
          ],
          correctIndex: 1,
          concept: 'manners:sneeze-cover',
          hint: 'Covering prevents spreading germs',
        },
        {
          question:
            "You meet a friend's parent for the first time. What do you say?",
          options: [
            'Hey',
            'Hello, it is nice to meet you',
            'Who are you?',
            'Say nothing',
          ],
          correctIndex: 1,
          concept: 'manners:greeting-adults',
          hint: 'A warm greeting makes a great first impression',
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

  // 21. Healthy Habits (true-false)
  {
    id: 'life-healthy-tf-21',
    title: 'Healthy Habits',
    category: 'lifeSkills',
    subcategory: 'healthy-habits',
    template: 'true-false',
    ageRange: [5, 8],
    difficulty: 1,
    icon: 'heart-pulse',
    emoji: '💚',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    learningObjectives: ['healthy-habits', 'nutrition', 'exercise', 'sleep'],
    tags: ['health', 'habits', 'nutrition'],
    content: {
      statements: [
        {
          text: 'You should drink plenty of water every day.',
          answer: true,
          concept: 'health:drink-water',
          explanation:
            'Water keeps your body hydrated and helps it work properly!',
        },
        {
          text: 'It is okay to eat candy for every meal.',
          answer: false,
          concept: 'health:balanced-diet',
          explanation:
            'You need fruits, vegetables, and protein for a balanced diet.',
        },
        {
          text: 'Getting 8-10 hours of sleep is good for growing kids.',
          answer: true,
          concept: 'health:sleep',
          explanation: 'Sleep helps your brain and body grow strong!',
        },
        {
          text: 'Exercise is only for adults.',
          answer: false,
          concept: 'health:exercise-kids',
          explanation:
            'Kids need at least 60 minutes of active play every day!',
        },
        {
          text: 'Brushing your teeth twice a day keeps them healthy.',
          answer: true,
          concept: 'health:dental',
          explanation: 'Brushing removes germs that can cause cavities.',
        },
        {
          text: 'You do not need to eat breakfast before school.',
          answer: false,
          concept: 'health:breakfast',
          explanation: 'Breakfast gives your brain energy to learn and focus!',
        },
        {
          text: 'Fruits and vegetables are important for your health.',
          answer: true,
          concept: 'health:fruits-veggies',
          explanation: 'They have vitamins and minerals your body needs.',
        },
        {
          text: 'Watching TV all day is a healthy activity.',
          answer: false,
          concept: 'health:screen-time',
          explanation:
            'Too much screen time is not good. Mix in active play and reading!',
        },
        {
          text: 'Washing your hands before eating prevents sickness.',
          answer: true,
          concept: 'health:handwashing',
          explanation: 'Hand washing removes germs that can make you sick.',
        },
        {
          text: 'You should eat as many sweets as you want.',
          answer: false,
          concept: 'health:limit-sweets',
          explanation:
            'Too many sweets can cause tooth decay and are not nutritious.',
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

  // 22. Community Helpers (match-pairs)
  {
    id: 'life-community-helpers-22',
    title: 'Community Helpers',
    category: 'lifeSkills',
    subcategory: 'community',
    template: 'match-pairs',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'account-group',
    emoji: '👨‍🚒',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['community-helpers', 'occupations', 'roles'],
    tags: ['community', 'helpers', 'occupations'],
    content: {
      pairs: [
        {
          left: 'Doctor',
          right: 'Helps you feel better when sick',
          concept: 'community:doctor',
        },
        {
          left: 'Firefighter',
          right: 'Puts out fires and rescues people',
          concept: 'community:firefighter',
        },
        {
          left: 'Teacher',
          right: 'Helps you learn at school',
          concept: 'community:teacher',
        },
        {
          left: 'Police Officer',
          right: 'Keeps the community safe',
          concept: 'community:police',
        },
        {
          left: 'Farmer',
          right: 'Grows food for us to eat',
          concept: 'community:farmer',
        },
        {
          left: 'Mail Carrier',
          right: 'Delivers letters and packages',
          concept: 'community:mail',
        },
        {
          left: 'Dentist',
          right: 'Takes care of your teeth',
          concept: 'community:dentist',
        },
        {
          left: 'Librarian',
          right: 'Helps you find books to read',
          concept: 'community:librarian',
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

  // 23. Seasons and Weather (drag-to-zone)
  {
    id: 'life-seasons-weather-23',
    title: 'Seasons and Weather',
    category: 'lifeSkills',
    subcategory: 'general-knowledge',
    template: 'drag-to-zone',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'weather-sunny',
    emoji: '🌦️',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 12,
    learningObjectives: ['seasons', 'weather', 'nature-cycles'],
    tags: ['seasons', 'weather', 'nature'],
    content: {
      zones: [
        {id: 'spring', label: 'Spring', color: '#2ECC71'},
        {id: 'summer', label: 'Summer', color: '#F1C40F'},
        {id: 'autumn', label: 'Autumn', color: '#E67E22'},
        {id: 'winter', label: 'Winter', color: '#3498DB'},
      ],
      items: [
        {
          id: 'flowers-bloom',
          label: 'Flowers bloom',
          zone: 'spring',
          concept: 'season:spring-flowers',
        },
        {
          id: 'swimming',
          label: 'Swimming at the beach',
          zone: 'summer',
          concept: 'season:summer-swim',
        },
        {
          id: 'falling-leaves',
          label: 'Leaves fall from trees',
          zone: 'autumn',
          concept: 'season:autumn-leaves',
        },
        {
          id: 'snowman',
          label: 'Building a snowman',
          zone: 'winter',
          concept: 'season:winter-snow',
        },
        {
          id: 'baby-animals',
          label: 'Baby animals are born',
          zone: 'spring',
          concept: 'season:spring-animals',
        },
        {
          id: 'ice-cream',
          label: 'Eating ice cream',
          zone: 'summer',
          concept: 'season:summer-icecream',
        },
        {
          id: 'pumpkin',
          label: 'Pumpkin picking',
          zone: 'autumn',
          concept: 'season:autumn-pumpkin',
        },
        {
          id: 'warm-coat',
          label: 'Wearing a warm coat',
          zone: 'winter',
          concept: 'season:winter-coat',
        },
        {
          id: 'rain-boots',
          label: 'Using rain boots',
          zone: 'spring',
          concept: 'season:spring-rain',
        },
        {
          id: 'sun-hat',
          label: 'Wearing a sun hat',
          zone: 'summer',
          concept: 'season:summer-hat',
        },
        {
          id: 'harvest',
          label: 'Harvesting crops',
          zone: 'autumn',
          concept: 'season:autumn-harvest',
        },
        {
          id: 'hot-cocoa',
          label: 'Drinking hot cocoa',
          zone: 'winter',
          concept: 'season:winter-cocoa',
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

  // 24. How to Be a Good Friend (fill-blank)
  {
    id: 'life-friendship-fill-24',
    title: 'How to Be a Good Friend',
    category: 'lifeSkills',
    subcategory: 'social-skills',
    template: 'fill-blank',
    ageRange: [5, 8],
    difficulty: 1,
    icon: 'account-heart',
    emoji: '💛',
    color: '#FFE66D',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    learningObjectives: ['friendship', 'social-skills', 'empathy'],
    tags: ['friendship', 'social', 'kindness'],
    content: {
      questions: [
        {
          text: 'A good friend ___ when you are feeling sad.',
          blank: 'listens',
          options: ['laughs', 'listens', 'ignores'],
          concept: 'friendship:listening',
          hint: 'A good friend pays attention to your feelings',
        },
        {
          text: 'Friends should ___ their toys with each other.',
          blank: 'share',
          options: ['hide', 'share', 'break'],
          concept: 'friendship:sharing',
          hint: 'Giving others a turn is kind',
        },
        {
          text: 'When your friend is hurt, you should show ___.',
          blank: 'kindness',
          options: ['anger', 'kindness', 'boredom'],
          concept: 'friendship:kindness',
          hint: 'Caring about how others feel',
        },
        {
          text: 'A good friend keeps their ___ and does not tell secrets.',
          blank: 'promise',
          options: ['toys', 'promise', 'money'],
          concept: 'friendship:trust',
          hint: 'When you say you will do something',
        },
        {
          text: 'Friends ___ each other when things are hard.',
          blank: 'help',
          options: ['trick', 'help', 'blame'],
          concept: 'friendship:helping',
          hint: 'Supporting someone through difficult times',
        },
        {
          text: "It is important to say ___ when you hurt a friend's feelings.",
          blank: 'sorry',
          options: ['nothing', 'sorry', 'goodbye'],
          concept: 'friendship:apologizing',
          hint: 'Taking responsibility for mistakes',
        },
        {
          text: 'Good friends take ___ and do not always go first.',
          blank: 'turns',
          options: ['everything', 'turns', 'breaks'],
          concept: 'friendship:fairness',
          hint: 'Being fair means everyone gets a chance',
        },
        {
          text: 'Friends should be ___ to each other no matter what.',
          blank: 'respectful',
          options: ['mean', 'respectful', 'bossy'],
          concept: 'friendship:respect',
          hint: 'Treating others the way you want to be treated',
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

  // 25. Counting Good Deeds (counting)
  {
    id: 'life-counting-deeds-25',
    title: 'Counting Good Deeds',
    category: 'lifeSkills',
    subcategory: 'kindness',
    template: 'counting',
    ageRange: [4, 7],
    difficulty: 1,
    icon: 'hand-heart',
    emoji: '❤️',
    color: '#FFE66D',
    estimatedMinutes: 3,
    questionsPerSession: 8,
    learningObjectives: ['kindness', 'counting', 'moral-values'],
    tags: ['kindness', 'counting', 'good-deeds'],
    content: {
      rounds: [
        {
          count: 3,
          icon: 'hand-heart',
          color: '#FF69B4',
          concept: 'deeds:help-3',
          label: 'times you helped today',
        },
        {
          count: 5,
          icon: 'emoticon-happy',
          color: '#FFD700',
          concept: 'deeds:smile-5',
          label: 'smiles you shared',
        },
        {
          count: 2,
          icon: 'food',
          color: '#FF6347',
          concept: 'deeds:share-2',
          label: 'snacks you shared',
        },
        {
          count: 4,
          icon: 'account-heart',
          color: '#2ECC71',
          concept: 'deeds:kind-4',
          label: 'kind words you said',
        },
        {
          count: 6,
          icon: 'star',
          color: '#9370DB',
          concept: 'deeds:star-6',
          label: 'good deeds this week',
        },
        {
          count: 1,
          icon: 'broom',
          color: '#4682B4',
          concept: 'deeds:clean-1',
          label: 'time you cleaned up',
        },
        {
          count: 7,
          icon: 'heart',
          color: '#FF1493',
          concept: 'deeds:love-7',
          label: 'people you said I love you to',
        },
        {
          count: 3,
          icon: 'book-open-variant',
          color: '#20B2AA',
          concept: 'deeds:read-3',
          label: 'books you read to someone',
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

export default LIFE_SKILLS_GAMES_EXTRA;
