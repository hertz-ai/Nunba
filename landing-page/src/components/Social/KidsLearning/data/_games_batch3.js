/**
 * Kids Learning Zone - Games Batch 3 (Games 51-75)
 *
 * 25 game configurations spanning spot-difference, puzzle-assemble, tracing,
 * balloon-pop, whack-a-mole, catcher, and flappy-learner templates across
 * math, english, life-skills, science, and creativity categories.
 */

const GAMES_BATCH_3 = [
  // =========================================================================
  // 51. Seasons Spotter (spot-difference + science)
  // =========================================================================
  {
    id: 'int-spot-difference-science-seasons-51',
    title: 'Seasons Spotter',
    description: 'Identify differences between scenes in different seasons.',
    category: 'science',
    subcategory: 'seasons',
    template: 'spot-difference',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83C\uDF43',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: "What's different in winter vs summer?",
          description: 'Same park in two seasons',
          differences: [
            {id: 'd1', label: 'Snow on ground', x: 40, y: 80},
            {id: 'd2', label: 'Bare trees', x: 20, y: 30},
            {id: 'd3', label: 'Heavy coats', x: 60, y: 50},
          ],
          concept: 'Seasons',
        },
        {
          prompt: 'Spot the spring vs autumn differences!',
          description: 'Garden scene changing between spring and autumn',
          differences: [
            {id: 'd1', label: 'Flowers blooming', x: 35, y: 70},
            {id: 'd2', label: 'Leaves turning orange', x: 50, y: 25},
            {id: 'd3', label: 'Birds nesting', x: 75, y: 20},
          ],
          concept: 'Seasons',
        },
        {
          prompt: 'Find the differences between rainy and sunny days!',
          description: 'Same street on a rainy day vs a sunny day',
          differences: [
            {id: 'd1', label: 'Umbrella', x: 55, y: 40},
            {id: 'd2', label: 'Puddles on ground', x: 30, y: 85},
            {id: 'd3', label: 'Rainbow in sky', x: 60, y: 10},
          ],
          concept: 'Weather',
        },
        {
          prompt: 'Compare the farm in summer and winter!',
          description: 'Farmyard across two seasons',
          differences: [
            {id: 'd1', label: 'Crops growing', x: 45, y: 65},
            {id: 'd2', label: 'Frozen pond', x: 70, y: 75},
            {id: 'd3', label: 'Snowman', x: 25, y: 55},
          ],
          concept: 'Seasonal Changes',
        },
        {
          prompt: 'What changed from fall to winter in the forest?',
          description: 'Forest path in fall vs winter',
          differences: [
            {id: 'd1', label: 'Leaves on ground vs snow', x: 40, y: 85},
            {id: 'd2', label: 'Squirrel gathering nuts', x: 65, y: 35},
            {id: 'd3', label: 'Icicles on branches', x: 30, y: 20},
          ],
          concept: 'Fall vs Winter',
        },
        {
          prompt: 'How does the beach change from summer to winter?',
          description: 'Beach scene in summer and winter',
          differences: [
            {id: 'd1', label: 'No swimmers', x: 50, y: 60},
            {id: 'd2', label: 'Grey sky', x: 40, y: 10},
            {id: 'd3', label: 'Seagulls only', x: 70, y: 30},
          ],
          concept: 'Seasonal Beach',
        },
        {
          prompt: 'Spot what changes in the backyard from spring to summer!',
          description: 'Backyard with garden across spring and summer',
          differences: [
            {id: 'd1', label: 'Taller grass', x: 35, y: 75},
            {id: 'd2', label: 'Full bloom flowers', x: 60, y: 50},
            {id: 'd3', label: 'Butterfly added', x: 80, y: 30},
          ],
          concept: 'Spring vs Summer',
        },
        {
          prompt: 'What is different in the city in spring vs autumn?',
          description: 'City street scene in two seasons',
          differences: [
            {id: 'd1', label: 'Falling leaves', x: 45, y: 40},
            {id: 'd2', label: 'People in jackets', x: 55, y: 60},
            {id: 'd3', label: 'Different sky color', x: 50, y: 5},
          ],
          concept: 'Urban Seasons',
        },
      ],
    },
  },

  // =========================================================================
  // 52. Art Detective (spot-difference + creativity)
  // =========================================================================
  {
    id: 'int-spot-difference-creativity-art-52',
    title: 'Art Detective',
    description: 'Find differences between two similar art scenes.',
    category: 'creativity',
    subcategory: 'observation',
    template: 'spot-difference',
    difficulty: 1,
    ageRange: [5, 8],
    emoji: '\uD83C\uDFA8',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Find 3 differences in these paintings',
          description: 'Two similar paintings of a house with a garden',
          differences: [
            {id: 'd1', label: 'Different colored door', x: 45, y: 50},
            {id: 'd2', label: 'Extra flower', x: 70, y: 75},
            {id: 'd3', label: 'Missing window', x: 30, y: 35},
          ],
          concept: 'Observation',
        },
        {
          prompt: 'Spot the changes in the portrait!',
          description: 'Two versions of a painted face',
          differences: [
            {id: 'd1', label: 'Different hat color', x: 50, y: 15},
            {id: 'd2', label: 'Missing earring', x: 25, y: 45},
            {id: 'd3', label: 'Changed eye color', x: 45, y: 40},
          ],
          concept: 'Detail Recognition',
        },
        {
          prompt: 'Find the differences in the underwater painting!',
          description: 'Ocean scene with fish and coral',
          differences: [
            {id: 'd1', label: 'Extra fish', x: 60, y: 35},
            {id: 'd2', label: 'Different coral color', x: 30, y: 70},
            {id: 'd3', label: 'Missing bubbles', x: 75, y: 20},
          ],
          concept: 'Observation',
        },
        {
          prompt: 'Compare these two castle drawings!',
          description: 'Two versions of a medieval castle',
          differences: [
            {id: 'd1', label: 'Missing flag', x: 50, y: 10},
            {id: 'd2', label: 'Extra tower', x: 80, y: 30},
            {id: 'd3', label: 'Different moat color', x: 40, y: 85},
          ],
          concept: 'Structural Detail',
        },
        {
          prompt: 'What changed in the space painting?',
          description: 'Two space scenes with planets and stars',
          differences: [
            {id: 'd1', label: 'Missing planet', x: 30, y: 40},
            {id: 'd2', label: 'Extra star cluster', x: 65, y: 25},
            {id: 'd3', label: 'Rocket direction changed', x: 55, y: 60},
          ],
          concept: 'Spatial Awareness',
        },
        {
          prompt: 'Find differences in the jungle artwork!',
          description: 'Lush jungle scene with animals',
          differences: [
            {id: 'd1', label: 'Different parrot color', x: 70, y: 20},
            {id: 'd2', label: 'Missing monkey', x: 40, y: 35},
            {id: 'd3', label: 'Extra vine', x: 20, y: 50},
          ],
          concept: 'Color & Shape',
        },
        {
          prompt: 'Spot the changes in the farm painting!',
          description: 'Countryside farm with animals and barn',
          differences: [
            {id: 'd1', label: 'Barn door open vs closed', x: 55, y: 45},
            {id: 'd2', label: 'Missing cow', x: 35, y: 65},
            {id: 'd3', label: 'Different fence color', x: 75, y: 70},
          ],
          concept: 'Scene Comparison',
        },
        {
          prompt: 'Compare these two sunset paintings!',
          description: 'Sunset over the ocean with boats',
          differences: [
            {id: 'd1', label: 'Extra sailboat', x: 60, y: 50},
            {id: 'd2', label: 'Different sun color', x: 50, y: 15},
            {id: 'd3', label: 'Missing seagull', x: 30, y: 25},
          ],
          concept: 'Color Perception',
        },
      ],
    },
  },

  // =========================================================================
  // 53. Word Puzzle (puzzle-assemble + english)
  // =========================================================================
  {
    id: 'int-puzzle-assemble-english-compounds-53',
    title: 'Word Puzzle',
    description: 'Assemble compound words from their parts.',
    category: 'english',
    subcategory: 'compound words',
    template: 'puzzle-assemble',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83E\uDDE9',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      puzzles: [
        {
          target: 'RAINBOW',
          pieces: [
            {id: 'p1', label: 'RAIN', position: 0},
            {id: 'p2', label: 'BOW', position: 1},
          ],
          hint: 'It appears after rain \uD83C\uDF08',
          concept: 'Compound Words',
        },
        {
          target: 'SUNFLOWER',
          pieces: [
            {id: 'p1', label: 'SUN', position: 0},
            {id: 'p2', label: 'FLOWER', position: 1},
          ],
          hint: 'A tall yellow plant that follows the sun \uD83C\uDF3B',
          concept: 'Compound Words',
        },
        {
          target: 'BUTTERFLY',
          pieces: [
            {id: 'p1', label: 'BUTTER', position: 0},
            {id: 'p2', label: 'FLY', position: 1},
          ],
          hint: 'A beautiful insect with colorful wings \uD83E\uDD8B',
          concept: 'Compound Words',
        },
        {
          target: 'SNOWBALL',
          pieces: [
            {id: 'p1', label: 'SNOW', position: 0},
            {id: 'p2', label: 'BALL', position: 1},
          ],
          hint: 'Pack snow into a round shape \u26C4',
          concept: 'Compound Words',
        },
        {
          target: 'STARFISH',
          pieces: [
            {id: 'p1', label: 'STAR', position: 0},
            {id: 'p2', label: 'FISH', position: 1},
          ],
          hint: 'A sea creature shaped like a star \u2B50',
          concept: 'Compound Words',
        },
        {
          target: 'CUPCAKE',
          pieces: [
            {id: 'p1', label: 'CUP', position: 0},
            {id: 'p2', label: 'CAKE', position: 1},
          ],
          hint: 'A small cake baked in a cup-shaped mold \uD83E\uDDC1',
          concept: 'Compound Words',
        },
        {
          target: 'BOOKWORM',
          pieces: [
            {id: 'p1', label: 'BOOK', position: 0},
            {id: 'p2', label: 'WORM', position: 1},
          ],
          hint: 'Someone who loves to read \uD83D\uDCDA',
          concept: 'Compound Words',
        },
        {
          target: 'FOOTPRINT',
          pieces: [
            {id: 'p1', label: 'FOOT', position: 0},
            {id: 'p2', label: 'PRINT', position: 1},
          ],
          hint: 'The mark your foot leaves in sand \uD83D\uDC63',
          concept: 'Compound Words',
        },
        {
          target: 'TOOTHBRUSH',
          pieces: [
            {id: 'p1', label: 'TOOTH', position: 0},
            {id: 'p2', label: 'BRUSH', position: 1},
          ],
          hint: 'Use it to clean your teeth every day \uD83E\uDEB7',
          concept: 'Compound Words',
        },
        {
          target: 'DOGHOUSE',
          pieces: [
            {id: 'p1', label: 'DOG', position: 0},
            {id: 'p2', label: 'HOUSE', position: 1},
          ],
          hint: 'Where a pet dog sleeps outside \uD83D\uDC36',
          concept: 'Compound Words',
        },
      ],
    },
  },

  // =========================================================================
  // 54. Map Builder (puzzle-assemble + life-skills)
  // =========================================================================
  {
    id: 'int-puzzle-assemble-life-skills-maps-54',
    title: 'Map Builder',
    description: 'Assemble simple maps to learn about your neighborhood.',
    category: 'life-skills',
    subcategory: 'geography',
    template: 'puzzle-assemble',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83D\uDDFA\uFE0F',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      puzzles: [
        {
          target: 'Neighborhood Map',
          pieces: [
            {id: 'p1', label: 'School \uD83C\uDFEB', position: 0},
            {id: 'p2', label: 'Park \uD83C\uDF33', position: 1},
            {id: 'p3', label: 'Store \uD83C\uDFEA', position: 2},
            {id: 'p4', label: 'Home \uD83C\uDFE0', position: 3},
          ],
          hint: 'Build your neighborhood',
          concept: 'Geography',
        },
        {
          target: 'City Center',
          pieces: [
            {id: 'p1', label: 'Library \uD83D\uDCDA', position: 0},
            {id: 'p2', label: 'Hospital \uD83C\uDFE5', position: 1},
            {id: 'p3', label: 'Fire Station \uD83D\uDE92', position: 2},
            {id: 'p4', label: 'Police Station \uD83D\uDE94', position: 3},
          ],
          hint: 'Important buildings in every city',
          concept: 'Community Services',
        },
        {
          target: 'Shopping Area',
          pieces: [
            {id: 'p1', label: 'Bakery \uD83C\uDF5E', position: 0},
            {id: 'p2', label: 'Pet Shop \uD83D\uDC3E', position: 1},
            {id: 'p3', label: 'Toy Store \uD83E\uDDF8', position: 2},
            {id: 'p4', label: 'Supermarket \uD83D\uDED2', position: 3},
          ],
          hint: 'Places where you can buy things',
          concept: 'Commerce',
        },
        {
          target: 'Recreation Zone',
          pieces: [
            {id: 'p1', label: 'Playground \uD83C\uDFA0', position: 0},
            {id: 'p2', label: 'Swimming Pool \uD83C\uDFCA', position: 1},
            {id: 'p3', label: 'Sports Field \u26BD', position: 2},
            {id: 'p4', label: 'Bike Path \uD83D\uDEB2', position: 3},
          ],
          hint: 'Fun places to play and exercise',
          concept: 'Recreation',
        },
        {
          target: 'Town Square',
          pieces: [
            {id: 'p1', label: 'Fountain \u26F2', position: 0},
            {id: 'p2', label: 'Clock Tower \uD83D\uDD70\uFE0F', position: 1},
            {id: 'p3', label: 'Benches \uD83E\uDE91', position: 2},
            {id: 'p4', label: 'Garden \uD83C\uDF37', position: 3},
          ],
          hint: 'The center of a small town',
          concept: 'Town Layout',
        },
        {
          target: 'School Campus',
          pieces: [
            {id: 'p1', label: 'Classroom \uD83C\uDFEB', position: 0},
            {id: 'p2', label: 'Cafeteria \uD83C\uDF71', position: 1},
            {id: 'p3', label: 'Gym \uD83C\uDFC0', position: 2},
            {id: 'p4', label: 'Art Room \uD83C\uDFA8', position: 3},
          ],
          hint: 'Rooms you find at school',
          concept: 'School Layout',
        },
        {
          target: 'Farm Layout',
          pieces: [
            {id: 'p1', label: 'Barn \uD83C\uDFDA\uFE0F', position: 0},
            {id: 'p2', label: 'Crop Field \uD83C\uDF3E', position: 1},
            {id: 'p3', label: 'Pond \uD83E\uDD86', position: 2},
            {id: 'p4', label: 'Farmhouse \uD83C\uDFE1', position: 3},
          ],
          hint: 'Parts of a working farm',
          concept: 'Rural Geography',
        },
        {
          target: 'Harbor Map',
          pieces: [
            {id: 'p1', label: 'Lighthouse \uD83C\uDF0A', position: 0},
            {id: 'p2', label: 'Dock \u2693', position: 1},
            {id: 'p3', label: 'Fish Market \uD83D\uDC1F', position: 2},
            {id: 'p4', label: 'Boat Shed \u26F5', position: 3},
          ],
          hint: 'Places you find at a harbor',
          concept: 'Coastal Geography',
        },
      ],
    },
  },

  // =========================================================================
  // 55. Skeleton Builder (puzzle-assemble + science)
  // =========================================================================
  {
    id: 'int-puzzle-assemble-science-anatomy-55',
    title: 'Skeleton Builder',
    description: 'Assemble body parts to learn about human anatomy.',
    category: 'science',
    subcategory: 'anatomy',
    template: 'puzzle-assemble',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83E\uDDB4',
    estimatedMinutes: 6,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      puzzles: [
        {
          target: 'Human Body',
          pieces: [
            {id: 'p1', label: 'Head \uD83E\uDDE0', position: 0},
            {id: 'p2', label: 'Chest \uD83D\uDCAA', position: 1},
            {id: 'p3', label: 'Arms \uD83E\uDDBE', position: 2},
            {id: 'p4', label: 'Legs \uD83E\uDDB5', position: 3},
          ],
          hint: 'Build a human body!',
          concept: 'Anatomy',
        },
        {
          target: 'The Face',
          pieces: [
            {id: 'p1', label: 'Eyes \uD83D\uDC41\uFE0F', position: 0},
            {id: 'p2', label: 'Nose \uD83D\uDC43', position: 1},
            {id: 'p3', label: 'Mouth \uD83D\uDC44', position: 2},
            {id: 'p4', label: 'Ears \uD83D\uDC42', position: 3},
          ],
          hint: 'Parts of the face',
          concept: 'Facial Features',
        },
        {
          target: 'The Hand',
          pieces: [
            {id: 'p1', label: 'Thumb \uD83D\uDC4D', position: 0},
            {id: 'p2', label: 'Index Finger \u261D\uFE0F', position: 1},
            {id: 'p3', label: 'Middle Finger', position: 2},
            {id: 'p4', label: 'Palm \u270B', position: 3},
          ],
          hint: 'Parts of your hand',
          concept: 'Hand Anatomy',
        },
        {
          target: 'Digestive System',
          pieces: [
            {id: 'p1', label: 'Mouth \uD83D\uDC44', position: 0},
            {id: 'p2', label: 'Esophagus', position: 1},
            {id: 'p3', label: 'Stomach', position: 2},
            {id: 'p4', label: 'Intestines', position: 3},
          ],
          hint: 'How food travels through your body',
          concept: 'Digestion',
        },
        {
          target: 'Skeleton',
          pieces: [
            {id: 'p1', label: 'Skull \uD83D\uDC80', position: 0},
            {id: 'p2', label: 'Ribcage', position: 1},
            {id: 'p3', label: 'Spine', position: 2},
            {id: 'p4', label: 'Pelvis', position: 3},
          ],
          hint: 'Bones that hold you up',
          concept: 'Skeletal System',
        },
        {
          target: 'Circulatory System',
          pieces: [
            {id: 'p1', label: 'Heart \u2764\uFE0F', position: 0},
            {id: 'p2', label: 'Arteries', position: 1},
            {id: 'p3', label: 'Veins', position: 2},
            {id: 'p4', label: 'Blood Cells', position: 3},
          ],
          hint: 'How blood moves around your body',
          concept: 'Circulation',
        },
        {
          target: 'Respiratory System',
          pieces: [
            {id: 'p1', label: 'Nose \uD83D\uDC43', position: 0},
            {id: 'p2', label: 'Windpipe', position: 1},
            {id: 'p3', label: 'Lungs \uD83E\uDEC1', position: 2},
            {id: 'p4', label: 'Diaphragm', position: 3},
          ],
          hint: 'How you breathe',
          concept: 'Breathing',
        },
        {
          target: 'Muscular System',
          pieces: [
            {id: 'p1', label: 'Biceps \uD83D\uDCAA', position: 0},
            {id: 'p2', label: 'Quadriceps', position: 1},
            {id: 'p3', label: 'Abdominals', position: 2},
            {id: 'p4', label: 'Calves', position: 3},
          ],
          hint: 'Muscles that help you move',
          concept: 'Muscles',
        },
      ],
    },
  },

  // =========================================================================
  // 56. Robot Builder (puzzle-assemble + creativity)
  // =========================================================================
  {
    id: 'int-puzzle-assemble-creativity-robots-56',
    title: 'Robot Builder',
    description: 'Build fun robots by assembling parts in the right order.',
    category: 'creativity',
    subcategory: 'assembly',
    template: 'puzzle-assemble',
    difficulty: 1,
    ageRange: [5, 8],
    emoji: '\uD83E\uDD16',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      puzzles: [
        {
          target: 'Friendly Robot',
          pieces: [
            {id: 'p1', label: 'Head \uD83E\uDD16', position: 0},
            {id: 'p2', label: 'Body \u2B1C', position: 1},
            {id: 'p3', label: 'Arms \uD83D\uDD27', position: 2},
            {id: 'p4', label: 'Legs \uD83E\uDDBF', position: 3},
          ],
          hint: 'Build a robot friend!',
          concept: 'Assembly',
        },
        {
          target: 'Flying Robot',
          pieces: [
            {id: 'p1', label: 'Antenna \uD83D\uDCE1', position: 0},
            {id: 'p2', label: 'Camera Eye \uD83D\uDCF7', position: 1},
            {id: 'p3', label: 'Jet Body \uD83D\uDE80', position: 2},
            {id: 'p4', label: 'Wings \uD83E\uDD85', position: 3},
          ],
          hint: 'A robot that can fly!',
          concept: 'Aerial Design',
        },
        {
          target: 'Helper Robot',
          pieces: [
            {id: 'p1', label: 'Screen Face \uD83D\uDCFA', position: 0},
            {id: 'p2', label: 'Speaker \uD83D\uDD0A', position: 1},
            {id: 'p3', label: 'Grabber Arms \uD83E\uDD1E', position: 2},
            {id: 'p4', label: 'Wheels \uD83D\uDEDE', position: 3},
          ],
          hint: 'A robot that helps around the house',
          concept: 'Functional Design',
        },
        {
          target: 'Guard Robot',
          pieces: [
            {id: 'p1', label: 'Helmet \u26D1\uFE0F', position: 0},
            {id: 'p2', label: 'Armor Body \uD83D\uDEE1\uFE0F', position: 1},
            {id: 'p3', label: 'Shield Arm \uD83D\uDEE1\uFE0F', position: 2},
            {id: 'p4', label: 'Strong Legs \uD83E\uDDB6', position: 3},
          ],
          hint: 'A robot that keeps you safe',
          concept: 'Protective Design',
        },
        {
          target: 'Music Robot',
          pieces: [
            {id: 'p1', label: 'DJ Head \uD83C\uDFA7', position: 0},
            {id: 'p2', label: 'Speaker Body \uD83D\uDD0A', position: 1},
            {id: 'p3', label: 'Drum Arms \uD83E\uDD41', position: 2},
            {id: 'p4', label: 'Dancing Feet \uD83D\uDC83', position: 3},
          ],
          hint: 'A robot that loves music!',
          concept: 'Creative Expression',
        },
        {
          target: 'Explorer Robot',
          pieces: [
            {id: 'p1', label: 'Radar Head \uD83D\uDCE1', position: 0},
            {id: 'p2', label: 'Backpack \uD83C\uDF92', position: 1},
            {id: 'p3', label: 'Tool Arms \uD83E\uDDF0', position: 2},
            {id: 'p4', label: 'Tank Treads \u2699\uFE0F', position: 3},
          ],
          hint: 'A robot that explores new places',
          concept: 'Exploration Design',
        },
        {
          target: 'Chef Robot',
          pieces: [
            {
              id: 'p1',
              label: "Chef's Hat \uD83D\uDC68\u200D\uD83C\uDF73",
              position: 0,
            },
            {id: 'p2', label: 'Apron Body \uD83E\uDDEA', position: 1},
            {id: 'p3', label: 'Spatula Arm \uD83C\uDF73', position: 2},
            {id: 'p4', label: 'Rolling Base \uD83E\uDEF8', position: 3},
          ],
          hint: 'A robot that cooks food!',
          concept: 'Kitchen Design',
        },
        {
          target: 'Pet Robot',
          pieces: [
            {id: 'p1', label: 'Puppy Head \uD83D\uDC36', position: 0},
            {id: 'p2', label: 'Soft Body \uD83E\uDDF8', position: 1},
            {id: 'p3', label: 'Wagging Tail \uD83D\uDC15', position: 2},
            {id: 'p4', label: 'Paw Feet \uD83D\uDC3E', position: 3},
          ],
          hint: 'A robot pet to play with!',
          concept: 'Companion Design',
        },
      ],
    },
  },

  // =========================================================================
  // 57. Letter Tracing A-H (tracing + english)
  // =========================================================================
  {
    id: 'int-tracing-english-letters-ah-57',
    title: 'Letter Tracing A-H',
    description: 'Trace uppercase letters A through H to practice writing.',
    category: 'english',
    subcategory: 'handwriting',
    template: 'tracing',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\u270D\uFE0F',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {letter: 'A', word: 'Apple', hint: 'A is for Apple \uD83C\uDF4E'},
        {letter: 'B', word: 'Bear', hint: 'B is for Bear \uD83D\uDC3B'},
        {letter: 'C', word: 'Cat', hint: 'C is for Cat \uD83D\uDC31'},
        {letter: 'D', word: 'Dog', hint: 'D is for Dog \uD83D\uDC36'},
        {letter: 'E', word: 'Elephant', hint: 'E is for Elephant \uD83D\uDC18'},
        {letter: 'F', word: 'Fish', hint: 'F is for Fish \uD83D\uDC1F'},
        {letter: 'G', word: 'Giraffe', hint: 'G is for Giraffe \uD83E\uDD92'},
        {letter: 'H', word: 'House', hint: 'H is for House \uD83C\uDFE0'},
      ],
    },
  },

  // =========================================================================
  // 58. Number Tracing 1-8 (tracing + english)
  // =========================================================================
  {
    id: 'int-tracing-english-numbers-18-58',
    title: 'Number Tracing 1-8',
    description: 'Trace numbers 1 through 8 to practice writing numerals.',
    category: 'english',
    subcategory: 'handwriting',
    template: 'tracing',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\uD83D\uDD22',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {letter: '1', word: 'One', hint: 'One \u261D\uFE0F'},
        {letter: '2', word: 'Two', hint: 'Two \u270C\uFE0F'},
        {letter: '3', word: 'Three', hint: 'Three \uD83E\uDD1F'},
        {letter: '4', word: 'Four', hint: 'Four \uD83C\uDF40'},
        {letter: '5', word: 'Five', hint: 'Five \uD83D\uDD90\uFE0F'},
        {letter: '6', word: 'Six', hint: 'Six \uD83C\uDFB2'},
        {letter: '7', word: 'Seven', hint: 'Seven \uD83C\uDF08'},
        {letter: '8', word: 'Eight', hint: 'Eight \uD83D\uDC19'},
      ],
    },
  },

  // =========================================================================
  // 59. Shape Tracing (tracing + life-skills)
  // =========================================================================
  {
    id: 'int-tracing-life-skills-shapes-59',
    title: 'Shape Tracing',
    description: 'Trace basic geometric shapes to learn their forms.',
    category: 'life-skills',
    subcategory: 'shapes',
    template: 'tracing',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\uD83D\uDD35',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {letter: '\u25CB', word: 'Circle', hint: 'Round like a ball \u26BD'},
        {letter: '\u25A1', word: 'Square', hint: 'Four equal sides \u2B1C'},
        {letter: '\u25B3', word: 'Triangle', hint: 'Three sides \uD83D\uDD3A'},
        {
          letter: '\u25C7',
          word: 'Diamond',
          hint: 'Like a tilted square \uD83D\uDC8E',
        },
        {letter: '\u2606', word: 'Star', hint: 'Twinkle twinkle \u2B50'},
        {letter: '\u2661', word: 'Heart', hint: 'Love shape \u2764\uFE0F'},
        {letter: '\u2B21', word: 'Hexagon', hint: 'Six sides \uD83D\uDC1D'},
        {letter: '\u2B20', word: 'Pentagon', hint: 'Five sides \u2B50'},
      ],
    },
  },

  // =========================================================================
  // 60. Emoji Tracing (tracing + creativity)
  // =========================================================================
  {
    id: 'int-tracing-creativity-emoji-60',
    title: 'Emoji Tracing',
    description: 'Trace fun emoji-inspired shapes for creative practice.',
    category: 'creativity',
    subcategory: 'drawing',
    template: 'tracing',
    difficulty: 1,
    ageRange: [4, 6],
    emoji: '\uD83D\uDE0A',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      traces: [
        {letter: '\u263A', word: 'Smile', hint: 'Happy face \uD83D\uDE0A'},
        {letter: '\u266A', word: 'Music', hint: 'Make some music \uD83C\uDFB5'},
        {
          letter: '\u273F',
          word: 'Flower',
          hint: 'A pretty flower \uD83C\uDF38',
        },
        {letter: '\u2601', word: 'Cloud', hint: 'Fluffy cloud \u2601\uFE0F'},
        {letter: '\u263C', word: 'Sun', hint: 'Bright sunshine \u2600\uFE0F'},
        {letter: '\u26A1', word: 'Lightning', hint: 'Zap! \u26A1'},
        {letter: '\u2665', word: 'Heart', hint: 'Love \u2764\uFE0F'},
        {letter: '\u2605', word: 'Star', hint: 'Shooting star \uD83C\uDF1F'},
      ],
    },
  },

  // =========================================================================
  // 61. Pop the Sum (balloon-pop + math)
  // =========================================================================
  {
    id: 'int-balloon-pop-math-addition-61',
    title: 'Pop the Sum',
    description: 'Pop the balloon showing the correct addition answer.',
    category: 'math',
    subcategory: 'addition',
    template: 'balloon-pop',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83C\uDF88',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'What is 6 + 3?',
          options: ['7', '8', '9', '10'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 4 + 5?',
          options: ['8', '9', '10', '7'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: 'What is 7 + 2?',
          options: ['8', '10', '9', '11'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 3 + 3?',
          options: ['5', '7', '6', '8'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 8 + 1?',
          options: ['7', '9', '10', '8'],
          correctIndex: 1,
          concept: 'Addition',
        },
        {
          question: 'What is 5 + 5?',
          options: ['9', '11', '8', '10'],
          correctIndex: 3,
          concept: 'Addition',
        },
        {
          question: 'What is 2 + 6?',
          options: ['8', '7', '9', '6'],
          correctIndex: 0,
          concept: 'Addition',
        },
        {
          question: 'What is 9 + 1?',
          options: ['11', '9', '10', '8'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 3 + 7?',
          options: ['9', '11', '10', '8'],
          correctIndex: 2,
          concept: 'Addition',
        },
        {
          question: 'What is 4 + 4?',
          options: ['7', '9', '6', '8'],
          correctIndex: 3,
          concept: 'Addition',
        },
      ],
    },
  },

  // =========================================================================
  // 62. Pop the Vowel (balloon-pop + english)
  // =========================================================================
  {
    id: 'int-balloon-pop-english-vowels-62',
    title: 'Pop the Vowel',
    description: 'Pop the balloon that shows a vowel letter.',
    category: 'english',
    subcategory: 'vowels',
    template: 'balloon-pop',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83C\uDF88',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which is a vowel?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          concept: 'Vowels',
        },
        {
          question: 'Which is a vowel?',
          options: ['F', 'G', 'E', 'H'],
          correctIndex: 2,
          concept: 'Vowels',
        },
        {
          question: 'Which is a vowel?',
          options: ['J', 'K', 'L', 'I'],
          correctIndex: 3,
          concept: 'Vowels',
        },
        {
          question: 'Which is a vowel?',
          options: ['M', 'O', 'P', 'Q'],
          correctIndex: 1,
          concept: 'Vowels',
        },
        {
          question: 'Which is a vowel?',
          options: ['R', 'S', 'T', 'U'],
          correctIndex: 3,
          concept: 'Vowels',
        },
        {
          question: 'Find the vowel!',
          options: ['W', 'X', 'A', 'Z'],
          correctIndex: 2,
          concept: 'Vowels',
        },
        {
          question: 'Find the vowel!',
          options: ['N', 'E', 'V', 'D'],
          correctIndex: 1,
          concept: 'Vowels',
        },
        {
          question: 'Find the vowel!',
          options: ['I', 'T', 'S', 'P'],
          correctIndex: 0,
          concept: 'Vowels',
        },
        {
          question: 'Find the vowel!',
          options: ['L', 'M', 'N', 'O'],
          correctIndex: 3,
          concept: 'Vowels',
        },
        {
          question: 'Find the vowel!',
          options: ['C', 'U', 'G', 'K'],
          correctIndex: 1,
          concept: 'Vowels',
        },
      ],
    },
  },

  // =========================================================================
  // 63. Pop Healthy Food (balloon-pop + life-skills)
  // =========================================================================
  {
    id: 'int-balloon-pop-life-skills-nutrition-63',
    title: 'Pop Healthy Food',
    description: 'Pop the balloon with the healthiest food choice.',
    category: 'life-skills',
    subcategory: 'nutrition',
    template: 'balloon-pop',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83C\uDF4E',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which is the healthiest?',
          options: [
            '\uD83C\uDF4E Apple',
            '\uD83C\uDF6C Candy',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF69 Donut',
          ],
          correctIndex: 0,
          concept: 'Nutrition',
        },
        {
          question: 'Which is best for you?',
          options: [
            '\uD83C\uDF54 Burger',
            '\uD83E\uDD66 Broccoli',
            '\uD83C\uDF5F Fries',
            '\uD83C\uDF55 Pizza',
          ],
          correctIndex: 1,
          concept: 'Nutrition',
        },
        {
          question: 'Pick the healthy snack!',
          options: [
            '\uD83C\uDF6B Chocolate',
            '\uD83C\uDF6D Lollipop',
            '\uD83E\uDD55 Carrot',
            '\uD83C\uDF6A Cookie',
          ],
          correctIndex: 2,
          concept: 'Healthy Snacks',
        },
        {
          question: 'Which drink is healthiest?',
          options: [
            '\uD83E\uDD64 Soda',
            '\uD83E\uDDC3 Water',
            '\uD83C\uDF79 Juice Box',
            '\uD83C\uDF75 Sugar Drink',
          ],
          correctIndex: 1,
          concept: 'Healthy Drinks',
        },
        {
          question: 'Best breakfast choice?',
          options: [
            '\uD83C\uDF69 Donut',
            '\uD83C\uDF70 Cake',
            '\uD83E\uDD5A Eggs',
            '\uD83C\uDF6C Candy',
          ],
          correctIndex: 2,
          concept: 'Breakfast',
        },
        {
          question: 'Which fruit is a healthy snack?',
          options: [
            '\uD83C\uDF6A Cookie',
            '\uD83C\uDF4C Banana',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF6D Lollipop',
          ],
          correctIndex: 1,
          concept: 'Fruits',
        },
        {
          question: 'Pick the healthy lunch!',
          options: [
            '\uD83C\uDF5F Fries',
            '\uD83C\uDF2E Chips',
            '\uD83E\uDD57 Salad',
            '\uD83C\uDF6B Chocolate',
          ],
          correctIndex: 2,
          concept: 'Lunch',
        },
        {
          question: 'Which is a healthy grain?',
          options: [
            '\uD83C\uDF5E Bread',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF6A Cookie',
            '\uD83C\uDF69 Donut',
          ],
          correctIndex: 0,
          concept: 'Grains',
        },
        {
          question: 'Best after-school snack?',
          options: [
            '\uD83C\uDF6C Candy',
            '\uD83C\uDF47 Grapes',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF6D Lollipop',
          ],
          correctIndex: 1,
          concept: 'Healthy Snacks',
        },
        {
          question: 'Which has the most vitamins?',
          options: [
            '\uD83C\uDF5F Fries',
            '\uD83C\uDF55 Pizza',
            '\uD83C\uDF4A Orange',
            '\uD83C\uDF6B Chocolate',
          ],
          correctIndex: 2,
          concept: 'Vitamins',
        },
      ],
    },
  },

  // =========================================================================
  // 64. Pop the Mammal (balloon-pop + science)
  // =========================================================================
  {
    id: 'int-balloon-pop-science-mammals-64',
    title: 'Pop the Mammal',
    description: 'Pop the balloon showing a mammal among other animals.',
    category: 'science',
    subcategory: 'classification',
    template: 'balloon-pop',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83D\uDC3E',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which is a mammal?',
          options: [
            '\uD83D\uDC15 Dog',
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC38 Frog',
            '\uD83D\uDC1F Fish',
          ],
          correctIndex: 0,
          concept: 'Classification',
        },
        {
          question: 'Which is a mammal?',
          options: [
            '\uD83E\uDD8E Lizard',
            '\uD83D\uDC22 Turtle',
            '\uD83D\uDC31 Cat',
            '\uD83D\uDC20 Tropical Fish',
          ],
          correctIndex: 2,
          concept: 'Classification',
        },
        {
          question: 'Find the mammal!',
          options: [
            '\uD83D\uDC14 Chicken',
            '\uD83D\uDC18 Elephant',
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC19 Octopus',
          ],
          correctIndex: 1,
          concept: 'Classification',
        },
        {
          question: 'Which animal is a mammal?',
          options: [
            '\uD83D\uDC38 Frog',
            '\uD83E\uDD9E Lobster',
            '\uD83D\uDC1B Bug',
            '\uD83D\uDC2C Dolphin',
          ],
          correctIndex: 3,
          concept: 'Marine Mammals',
        },
        {
          question: 'Spot the mammal!',
          options: [
            '\uD83E\uDD87 Bat',
            '\uD83D\uDC26 Bird',
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC1F Fish',
          ],
          correctIndex: 0,
          concept: 'Flying Mammals',
        },
        {
          question: 'Which one is a mammal?',
          options: [
            '\uD83D\uDC22 Turtle',
            '\uD83D\uDC0A Crocodile',
            '\uD83D\uDC1B Caterpillar',
            '\uD83D\uDC2E Cow',
          ],
          correctIndex: 3,
          concept: 'Farm Mammals',
        },
        {
          question: 'Find the mammal!',
          options: [
            '\uD83E\uDD9E Crab',
            '\uD83D\uDC0B Whale',
            '\uD83D\uDC20 Fish',
            '\uD83D\uDC19 Octopus',
          ],
          correctIndex: 1,
          concept: 'Marine Mammals',
        },
        {
          question: 'Which is a mammal?',
          options: [
            '\uD83D\uDC14 Hen',
            '\uD83E\uDD86 Duck',
            '\uD83D\uDC07 Rabbit',
            '\uD83E\uDD8E Lizard',
          ],
          correctIndex: 2,
          concept: 'Classification',
        },
        {
          question: 'Spot the mammal!',
          options: [
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC38 Frog',
            '\uD83D\uDC12 Monkey',
            '\uD83D\uDC1B Bug',
          ],
          correctIndex: 2,
          concept: 'Primates',
        },
        {
          question: 'Which one is a mammal?',
          options: [
            '\uD83E\uDD9E Shrimp',
            '\uD83D\uDC26 Eagle',
            '\uD83D\uDC0A Alligator',
            '\uD83D\uDC34 Horse',
          ],
          correctIndex: 3,
          concept: 'Classification',
        },
      ],
    },
  },

  // =========================================================================
  // 65. Whack the Even (whack-a-mole + math)
  // =========================================================================
  {
    id: 'int-whack-a-mole-math-even-65',
    title: 'Whack the Even',
    description: 'Hit the moles showing even numbers and let odd ones go.',
    category: 'math',
    subcategory: 'even and odd',
    template: 'whack-a-mole',
    difficulty: 2,
    ageRange: [6, 8],
    emoji: '\uD83D\uDD28',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Whack the even number!',
          options: ['13', '22', '7', '15'],
          correctIndex: 1,
          concept: 'Even Numbers',
        },
        {
          question: 'Whack the even number!',
          options: ['9', '5', '14', '3'],
          correctIndex: 2,
          concept: 'Even Numbers',
        },
        {
          question: 'Find the even number!',
          options: ['11', '17', '19', '8'],
          correctIndex: 3,
          concept: 'Even Numbers',
        },
        {
          question: 'Whack the even number!',
          options: ['6', '9', '1', '3'],
          correctIndex: 0,
          concept: 'Even Numbers',
        },
        {
          question: 'Which is even?',
          options: ['21', '35', '18', '27'],
          correctIndex: 2,
          concept: 'Even Numbers',
        },
        {
          question: 'Whack the even number!',
          options: ['33', '40', '25', '17'],
          correctIndex: 1,
          concept: 'Even Numbers',
        },
        {
          question: 'Find the even one!',
          options: ['5', '7', '12', '9'],
          correctIndex: 2,
          concept: 'Even Numbers',
        },
        {
          question: 'Whack the even number!',
          options: ['29', '11', '16', '23'],
          correctIndex: 2,
          concept: 'Even Numbers',
        },
        {
          question: 'Which is even?',
          options: ['50', '31', '43', '77'],
          correctIndex: 0,
          concept: 'Even Numbers',
        },
        {
          question: 'Whack the even number!',
          options: ['15', '27', '39', '24'],
          correctIndex: 3,
          concept: 'Even Numbers',
        },
      ],
    },
  },

  // =========================================================================
  // 66. Whack the Noun (whack-a-mole + english)
  // =========================================================================
  {
    id: 'int-whack-a-mole-english-nouns-66',
    title: 'Whack the Noun',
    description: 'Hit the moles showing nouns among other parts of speech.',
    category: 'english',
    subcategory: 'parts of speech',
    template: 'whack-a-mole',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83D\uDD28',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Whack the noun!',
          options: ['Running', 'Chair', 'Quickly', 'Happy'],
          correctIndex: 1,
          concept: 'Nouns',
        },
        {
          question: 'Whack the noun!',
          options: ['Fast', 'Jump', 'Book', 'Slowly'],
          correctIndex: 2,
          concept: 'Nouns',
        },
        {
          question: 'Find the noun!',
          options: ['Beautiful', 'Sing', 'Softly', 'Dog'],
          correctIndex: 3,
          concept: 'Nouns',
        },
        {
          question: 'Whack the noun!',
          options: ['Teacher', 'Loud', 'Run', 'Gently'],
          correctIndex: 0,
          concept: 'Nouns',
        },
        {
          question: 'Which is a noun?',
          options: ['Swim', 'Tall', 'Sun', 'Bright'],
          correctIndex: 2,
          concept: 'Nouns',
        },
        {
          question: 'Whack the noun!',
          options: ['Brave', 'Table', 'Climb', 'Sadly'],
          correctIndex: 1,
          concept: 'Nouns',
        },
        {
          question: 'Find the noun!',
          options: ['Quick', 'Dance', 'Warm', 'Apple'],
          correctIndex: 3,
          concept: 'Nouns',
        },
        {
          question: 'Whack the noun!',
          options: ['House', 'Pretty', 'Walk', 'Kindly'],
          correctIndex: 0,
          concept: 'Nouns',
        },
        {
          question: 'Which is a noun?',
          options: ['Throw', 'Green', 'Slowly', 'River'],
          correctIndex: 3,
          concept: 'Nouns',
        },
        {
          question: 'Whack the noun!',
          options: ['Sleep', 'Angry', 'School', 'Often'],
          correctIndex: 2,
          concept: 'Nouns',
        },
      ],
    },
  },

  // =========================================================================
  // 67. Whack Bad Habits (whack-a-mole + life-skills)
  // =========================================================================
  {
    id: 'int-whack-a-mole-life-skills-habits-67',
    title: 'Whack Bad Habits',
    description: 'Hit the bad habits and let the good ones pass.',
    category: 'life-skills',
    subcategory: 'good habits',
    template: 'whack-a-mole',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83D\uDCAA',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Whack the bad habit!',
          options: [
            'Exercise \uD83C\uDFC3',
            'Littering \uD83D\uDDD1\uFE0F',
            'Reading \uD83D\uDCDA',
            'Sharing \uD83E\uDD1D',
          ],
          correctIndex: 1,
          concept: 'Good Habits',
        },
        {
          question: 'Whack the bad habit!',
          options: [
            'Brushing teeth \uD83E\uDEB7',
            'Eating veggies \uD83E\uDD66',
            'Being mean \uD83D\uDE21',
            'Helping others \uD83E\uDEF6',
          ],
          correctIndex: 2,
          concept: 'Kindness',
        },
        {
          question: 'Which is a bad habit?',
          options: [
            'Saying please \uD83D\uDE4F',
            'Saying thank you \uD83D\uDE0A',
            'Yelling indoors \uD83D\uDCE2',
            'Being patient \u23F3',
          ],
          correctIndex: 2,
          concept: 'Manners',
        },
        {
          question: 'Whack the bad habit!',
          options: [
            'Washing hands \uD83E\uDDFC',
            'Not sharing \uD83D\uDE14',
            'Sleeping on time \uD83D\uDE34',
            'Drinking water \uD83D\uDCA7',
          ],
          correctIndex: 1,
          concept: 'Sharing',
        },
        {
          question: 'Find the bad habit!',
          options: [
            'Staying up too late \uD83C\uDF19',
            'Making your bed \uD83D\uDECF\uFE0F',
            'Eating breakfast \uD83C\uDF73',
            'Being on time \u23F0',
          ],
          correctIndex: 0,
          concept: 'Sleep Habits',
        },
        {
          question: 'Whack the bad habit!',
          options: [
            'Listening to teacher \uD83D\uDC69\u200D\uD83C\uDFEB',
            'Doing homework \uD83D\uDCDD',
            'Cheating on tests \u274C',
            'Studying \uD83D\uDCD6',
          ],
          correctIndex: 2,
          concept: 'Academic Honesty',
        },
        {
          question: 'Which should you whack?',
          options: [
            'Being polite \uD83D\uDE42',
            'Picking up trash \u267B\uFE0F',
            'Wasting food \uD83D\uDC4E',
            'Recycling \u267B\uFE0F',
          ],
          correctIndex: 2,
          concept: 'Waste',
        },
        {
          question: 'Whack the bad habit!',
          options: [
            'Playing outside \u26BD',
            'Too much screen time \uD83D\uDCF1',
            'Reading books \uD83D\uDCD6',
            'Drawing \uD83C\uDFA8',
          ],
          correctIndex: 1,
          concept: 'Screen Time',
        },
        {
          question: 'Find the bad habit!',
          options: [
            'Cleaning your room \uD83E\uDDF9',
            'Helping parents \uD83E\uDEF6',
            'Being kind \u2764\uFE0F',
            'Skipping breakfast \u26D4',
          ],
          correctIndex: 3,
          concept: 'Morning Routine',
        },
        {
          question: 'Whack the bad habit!',
          options: [
            'Telling the truth \u2705',
            'Lying \u274C',
            'Being brave \uD83E\uDDB8',
            'Saying sorry \uD83D\uDE4F',
          ],
          correctIndex: 1,
          concept: 'Honesty',
        },
      ],
    },
  },

  // =========================================================================
  // 68. Whack the Insect (whack-a-mole + science)
  // =========================================================================
  {
    id: 'int-whack-a-mole-science-insects-68',
    title: 'Whack the Insect',
    description: 'Hit the insects and avoid other animals.',
    category: 'science',
    subcategory: 'insects',
    template: 'whack-a-mole',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83D\uDC1B',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC1D Bee',
            '\uD83D\uDC15 Dog',
            '\uD83D\uDC31 Cat',
            '\uD83D\uDC1F Fish',
          ],
          correctIndex: 0,
          concept: 'Insects',
        },
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC22 Turtle',
            '\uD83E\uDD8B Butterfly',
            '\uD83D\uDC26 Bird',
            '\uD83D\uDC12 Monkey',
          ],
          correctIndex: 1,
          concept: 'Insects',
        },
        {
          question: 'Find the insect!',
          options: [
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC38 Frog',
            '\uD83D\uDC1C Ant',
            '\uD83D\uDC2E Cow',
          ],
          correctIndex: 2,
          concept: 'Insects',
        },
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC34 Horse',
            '\uD83D\uDC18 Elephant',
            '\uD83D\uDC07 Rabbit',
            '\uD83E\uDD97 Cricket',
          ],
          correctIndex: 3,
          concept: 'Insects',
        },
        {
          question: 'Which is an insect?',
          options: [
            '\uD83D\uDC1E Ladybug',
            '\uD83D\uDC3B Bear',
            '\uD83D\uDC2C Dolphin',
            '\uD83D\uDC27 Penguin',
          ],
          correctIndex: 0,
          concept: 'Insects',
        },
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC31 Cat',
            '\uD83E\uDEB2 Beetle',
            '\uD83D\uDC15 Dog',
            '\uD83D\uDC1F Fish',
          ],
          correctIndex: 1,
          concept: 'Insects',
        },
        {
          question: 'Find the insect!',
          options: [
            '\uD83D\uDC22 Turtle',
            '\uD83D\uDC0A Croc',
            '\uD83E\uDEB0 Fly',
            '\uD83D\uDC26 Bird',
          ],
          correctIndex: 2,
          concept: 'Insects',
        },
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC3A Wolf',
            '\uD83D\uDC34 Horse',
            '\uD83D\uDC2E Cow',
            '\uD83E\uDEB3 Cockroach',
          ],
          correctIndex: 3,
          concept: 'Insects',
        },
        {
          question: 'Which is an insect?',
          options: [
            '\uD83D\uDC1B Caterpillar',
            '\uD83D\uDC0D Snake',
            '\uD83D\uDC38 Frog',
            '\uD83D\uDC19 Octopus',
          ],
          correctIndex: 0,
          concept: 'Insects',
        },
        {
          question: 'Whack the insect!',
          options: [
            '\uD83D\uDC27 Penguin',
            '\uD83D\uDC2B Camel',
            '\uD83E\uDEB1 Worm',
            '\uD83E\uDD9F Mosquito',
          ],
          correctIndex: 3,
          concept: 'Insects',
        },
      ],
    },
  },

  // =========================================================================
  // 69. Catch Multiples (catcher + math)
  // =========================================================================
  {
    id: 'int-catcher-math-multiples-69',
    title: 'Catch Multiples',
    description: 'Catch falling items that are multiples of a given number.',
    category: 'math',
    subcategory: 'multiples',
    template: 'catcher',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83E\uDDFA',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Catch multiples of 3!',
          correct: ['3', '6', '9', '12', '15'],
          wrong: ['4', '7', '10', '13', '16'],
          concept: 'Multiples',
        },
        {
          prompt: 'Catch multiples of 2!',
          correct: ['2', '4', '6', '8', '10'],
          wrong: ['1', '3', '5', '7', '9'],
          concept: 'Multiples of 2',
        },
        {
          prompt: 'Catch multiples of 5!',
          correct: ['5', '10', '15', '20', '25'],
          wrong: ['3', '7', '11', '14', '18'],
          concept: 'Multiples of 5',
        },
        {
          prompt: 'Catch multiples of 4!',
          correct: ['4', '8', '12', '16', '20'],
          wrong: ['3', '5', '9', '11', '15'],
          concept: 'Multiples of 4',
        },
        {
          prompt: 'Catch multiples of 10!',
          correct: ['10', '20', '30', '40', '50'],
          wrong: ['5', '15', '25', '35', '45'],
          concept: 'Multiples of 10',
        },
        {
          prompt: 'Catch multiples of 6!',
          correct: ['6', '12', '18', '24', '30'],
          wrong: ['4', '8', '14', '20', '26'],
          concept: 'Multiples of 6',
        },
        {
          prompt: 'Catch multiples of 7!',
          correct: ['7', '14', '21', '28', '35'],
          wrong: ['5', '10', '15', '22', '30'],
          concept: 'Multiples of 7',
        },
        {
          prompt: 'Catch multiples of 9!',
          correct: ['9', '18', '27', '36', '45'],
          wrong: ['8', '12', '20', '30', '40'],
          concept: 'Multiples of 9',
        },
      ],
    },
  },

  // =========================================================================
  // 70. Catch Adjectives (catcher + english)
  // =========================================================================
  {
    id: 'int-catcher-english-adjectives-70',
    title: 'Catch Adjectives',
    description: 'Catch falling words that are adjectives.',
    category: 'english',
    subcategory: 'parts of speech',
    template: 'catcher',
    difficulty: 2,
    ageRange: [7, 9],
    emoji: '\uD83E\uDDFA',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Catch the adjectives!',
          correct: ['Happy', 'Tall', 'Bright', 'Soft'],
          wrong: ['Run', 'Jump', 'Table', 'Sing'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Catch describing words!',
          correct: ['Cold', 'Large', 'Tiny', 'Wet'],
          wrong: ['Walk', 'Book', 'Dance', 'Chair'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Grab the adjectives!',
          correct: ['Funny', 'Round', 'Sharp', 'Sweet'],
          wrong: ['Eat', 'Dog', 'Swim', 'House'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Catch the adjectives!',
          correct: ['Dark', 'Heavy', 'Fast', 'Smooth'],
          wrong: ['Read', 'Pen', 'Throw', 'Tree'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Find the describing words!',
          correct: ['Brave', 'Quiet', 'Warm', 'Strong'],
          wrong: ['Car', 'Write', 'Kick', 'Desk'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Catch the adjectives!',
          correct: ['Shiny', 'Wide', 'Deep', 'Clean'],
          wrong: ['Fly', 'Cup', 'Sleep', 'Door'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Grab describing words!',
          correct: ['Loud', 'Thin', 'Rough', 'Dry'],
          wrong: ['Play', 'Spoon', 'Clap', 'Bed'],
          concept: 'Adjectives',
        },
        {
          prompt: 'Catch the adjectives!',
          correct: ['Pretty', 'Long', 'Hard', 'Kind'],
          wrong: ['Cook', 'Hat', 'Push', 'Boat'],
          concept: 'Adjectives',
        },
      ],
    },
  },

  // =========================================================================
  // 71. Catch Vitamins (catcher + life-skills)
  // =========================================================================
  {
    id: 'int-catcher-life-skills-vitamins-71',
    title: 'Catch Vitamins',
    description: 'Catch healthy foods and avoid junk food.',
    category: 'life-skills',
    subcategory: 'nutrition',
    template: 'catcher',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83E\uDD55',
    estimatedMinutes: 4,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Catch healthy foods!',
          correct: [
            '\uD83E\uDD55 Carrot',
            '\uD83E\uDD66 Broccoli',
            '\uD83C\uDF4E Apple',
            '\uD83E\uDED0 Blueberry',
          ],
          wrong: [
            '\uD83C\uDF6C Candy',
            '\uD83C\uDF5F Fries',
            '\uD83C\uDF70 Cake',
            '\uD83E\uDD64 Soda',
          ],
          concept: 'Nutrition',
        },
        {
          prompt: 'Grab the fruits!',
          correct: [
            '\uD83C\uDF4C Banana',
            '\uD83C\uDF53 Strawberry',
            '\uD83C\uDF4A Orange',
            '\uD83C\uDF47 Grapes',
          ],
          wrong: [
            '\uD83C\uDF6A Cookie',
            '\uD83C\uDF69 Donut',
            '\uD83C\uDF6B Chocolate',
            '\uD83C\uDF6D Lollipop',
          ],
          concept: 'Fruits',
        },
        {
          prompt: 'Catch the vegetables!',
          correct: [
            '\uD83E\uDD6C Spinach',
            '\uD83C\uDF3D Corn',
            '\uD83E\uDED1 Pepper',
            '\uD83E\uDD54 Potato',
          ],
          wrong: [
            '\uD83C\uDF54 Burger',
            '\uD83C\uDF2D Hot Dog',
            '\uD83C\uDF55 Pizza',
            '\uD83C\uDF5F Fries',
          ],
          concept: 'Vegetables',
        },
        {
          prompt: 'Grab healthy proteins!',
          correct: [
            '\uD83E\uDD5A Egg',
            '\uD83D\uDC14 Chicken',
            '\uD83E\uDD5C Peanuts',
            '\uD83E\uDDC0 Cheese',
          ],
          wrong: [
            '\uD83C\uDF6C Candy',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF6A Cookie',
            '\uD83C\uDF6D Lollipop',
          ],
          concept: 'Protein',
        },
        {
          prompt: 'Catch healthy drinks!',
          correct: [
            '\uD83E\uDDC3 Water',
            '\uD83E\uDD5B Milk',
            '\uD83C\uDF4A Orange Juice',
            '\uD83C\uDF75 Green Tea',
          ],
          wrong: [
            '\uD83E\uDD64 Soda',
            '\uD83C\uDF79 Sugar Drink',
            '\u2615 Extra Coffee',
            '\uD83E\uDDCB Energy Drink',
          ],
          concept: 'Healthy Drinks',
        },
        {
          prompt: 'Grab healthy snacks!',
          correct: [
            '\uD83E\uDD5C Almonds',
            '\uD83C\uDF4E Apple',
            '\uD83E\uDD55 Carrot Sticks',
            '\uD83E\uDED0 Berries',
          ],
          wrong: [
            '\uD83C\uDF6B Chocolate Bar',
            '\uD83C\uDF5F Fries',
            '\uD83C\uDF70 Cake',
            '\uD83C\uDF69 Donut',
          ],
          concept: 'Snacking',
        },
        {
          prompt: 'Catch breakfast foods!',
          correct: [
            '\uD83E\uDD5A Eggs',
            '\uD83E\uDD5E Pancakes',
            '\uD83C\uDF5E Toast',
            '\uD83E\uDD63 Oatmeal',
          ],
          wrong: [
            '\uD83C\uDF55 Pizza',
            '\uD83C\uDF54 Burger',
            '\uD83C\uDF2D Hot Dog',
            '\uD83C\uDF5F Fries',
          ],
          concept: 'Breakfast',
        },
        {
          prompt: 'Grab vitamin-rich foods!',
          correct: [
            '\uD83C\uDF4A Orange',
            '\uD83E\uDD6C Spinach',
            '\uD83E\uDD55 Carrot',
            '\uD83C\uDF53 Strawberry',
          ],
          wrong: [
            '\uD83C\uDF6C Candy',
            '\uD83C\uDF6B Chocolate',
            '\uD83C\uDF6A Cookie',
            '\uD83C\uDF70 Cake',
          ],
          concept: 'Vitamins',
        },
      ],
    },
  },

  // =========================================================================
  // 72. Catch Planets (catcher + science)
  // =========================================================================
  {
    id: 'int-catcher-science-planets-72',
    title: 'Catch Planets',
    description: 'Catch the planets and avoid non-planet objects.',
    category: 'science',
    subcategory: 'solar system',
    template: 'catcher',
    difficulty: 2,
    ageRange: [7, 10],
    emoji: '\uD83E\uDE90',
    estimatedMinutes: 5,
    questionsPerSession: 8,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      rounds: [
        {
          prompt: 'Catch the planets!',
          correct: ['Mercury', 'Venus', 'Earth', 'Mars'],
          wrong: ['Sun', 'Moon', 'Pluto', 'Asteroid'],
          concept: 'Solar System',
        },
        {
          prompt: 'Grab the outer planets!',
          correct: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
          wrong: ['Comet', 'Star', 'Meteorite', 'Galaxy'],
          concept: 'Outer Planets',
        },
        {
          prompt: 'Catch the rocky planets!',
          correct: ['Mercury', 'Venus', 'Earth', 'Mars'],
          wrong: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
          concept: 'Rocky Planets',
        },
        {
          prompt: 'Catch the gas giants!',
          correct: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
          wrong: ['Mercury', 'Venus', 'Earth', 'Mars'],
          concept: 'Gas Giants',
        },
        {
          prompt: 'Catch planets with moons!',
          correct: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
          wrong: ['Sun', 'Asteroid', 'Comet', 'Meteor'],
          concept: 'Moons',
        },
        {
          prompt: 'Catch planets with rings!',
          correct: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'],
          wrong: ['Earth', 'Mars', 'Venus', 'Mercury'],
          concept: 'Planetary Rings',
        },
        {
          prompt: 'Catch planets closer to the Sun!',
          correct: ['Mercury', 'Venus', 'Earth', 'Mars'],
          wrong: ['Pluto', 'Comet', 'Asteroid', 'Moon'],
          concept: 'Inner Solar System',
        },
        {
          prompt: 'Catch all 8 planets!',
          correct: ['Earth', 'Mars', 'Saturn', 'Neptune'],
          wrong: ['Sun', 'Moon', 'Pluto', 'Ceres'],
          concept: 'Planet vs Dwarf Planet',
        },
      ],
    },
  },

  // =========================================================================
  // 73. Flappy Fractions (flappy-learner + math)
  // =========================================================================
  {
    id: 'int-flappy-learner-math-fractions-73',
    title: 'Flappy Fractions',
    description: 'Fly through the correct fraction gate to score points.',
    category: 'math',
    subcategory: 'fractions',
    template: 'flappy-learner',
    difficulty: 3,
    ageRange: [8, 10],
    emoji: '\uD83D\uDC26',
    estimatedMinutes: 5,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Which fraction is larger?',
          options: ['1/2', '1/4'],
          correctIndex: 0,
          concept: 'Fractions',
        },
        {
          question: 'What is 1/3 + 1/3?',
          options: ['2/3', '2/6'],
          correctIndex: 0,
          concept: 'Fraction Addition',
        },
        {
          question: 'Which fraction is smaller?',
          options: ['3/4', '1/4'],
          correctIndex: 1,
          concept: 'Comparing Fractions',
        },
        {
          question: 'What is 1/2 of 10?',
          options: ['5', '2'],
          correctIndex: 0,
          concept: 'Fractions of Numbers',
        },
        {
          question: 'Which equals 1/2?',
          options: ['2/4', '1/3'],
          correctIndex: 0,
          concept: 'Equivalent Fractions',
        },
        {
          question: 'What is 2/4 simplified?',
          options: ['1/2', '1/4'],
          correctIndex: 0,
          concept: 'Simplifying Fractions',
        },
        {
          question: 'Which is more: 2/3 or 1/3?',
          options: ['2/3', '1/3'],
          correctIndex: 0,
          concept: 'Comparing Fractions',
        },
        {
          question: 'What is 1/4 + 1/4?',
          options: ['2/4', '2/8'],
          correctIndex: 0,
          concept: 'Fraction Addition',
        },
        {
          question: 'Which fraction is closest to 1?',
          options: ['3/4', '1/4'],
          correctIndex: 0,
          concept: 'Fraction Sense',
        },
        {
          question: 'What is 1/2 + 1/4?',
          options: ['3/4', '2/6'],
          correctIndex: 0,
          concept: 'Unlike Denominators',
        },
      ],
    },
  },

  // =========================================================================
  // 74. Flappy Phonics (flappy-learner + english)
  // =========================================================================
  {
    id: 'int-flappy-learner-english-phonics-74',
    title: 'Flappy Phonics',
    description: 'Fly through the gate with the correct beginning sound.',
    category: 'english',
    subcategory: 'phonics',
    template: 'flappy-learner',
    difficulty: 1,
    ageRange: [5, 7],
    emoji: '\uD83D\uDC26',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: "'Cat' starts with which sound?",
          options: ['/k/', '/s/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Ship' starts with which sound?",
          options: ['/sh/', '/s/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Fish' starts with which sound?",
          options: ['/f/', '/v/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Think' starts with which sound?",
          options: ['/th/', '/t/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Ball' starts with which sound?",
          options: ['/b/', '/p/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Dog' starts with which sound?",
          options: ['/d/', '/t/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Goat' starts with which sound?",
          options: ['/k/', '/g/'],
          correctIndex: 1,
          concept: 'Phonics',
        },
        {
          question: "'Moon' starts with which sound?",
          options: ['/n/', '/m/'],
          correctIndex: 1,
          concept: 'Phonics',
        },
        {
          question: "'Nest' starts with which sound?",
          options: ['/n/', '/m/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
        {
          question: "'Chair' starts with which sound?",
          options: ['/ch/', '/k/'],
          correctIndex: 0,
          concept: 'Phonics',
        },
      ],
    },
  },

  // =========================================================================
  // 75. Flappy Road Safety (flappy-learner + life-skills)
  // =========================================================================
  {
    id: 'int-flappy-learner-life-skills-safety-75',
    title: 'Flappy Road Safety',
    description: 'Fly through the gate showing the safe choice.',
    category: 'life-skills',
    subcategory: 'road safety',
    template: 'flappy-learner',
    difficulty: 1,
    ageRange: [6, 8],
    emoji: '\uD83D\uDEA6',
    estimatedMinutes: 4,
    questionsPerSession: 10,
    isInteractive: true,
    rewards: {starsPerCorrect: 1, bonusThreshold: 0.8, bonusStars: 2},
    content: {
      questions: [
        {
          question: 'Before crossing the street...',
          options: ['Look both ways', 'Just run'],
          correctIndex: 0,
          concept: 'Road Safety',
        },
        {
          question: 'The traffic light is red. You should...',
          options: ['Stop and wait', 'Keep walking'],
          correctIndex: 0,
          concept: 'Traffic Lights',
        },
        {
          question: 'Where should you cross the road?',
          options: ['At the crosswalk', 'Anywhere'],
          correctIndex: 0,
          concept: 'Crosswalks',
        },
        {
          question: 'When riding a bike, you should wear...',
          options: ['A helmet', 'Nothing'],
          correctIndex: 0,
          concept: 'Bike Safety',
        },
        {
          question: 'You see a green walking signal. You should...',
          options: ['Walk carefully', 'Run fast'],
          correctIndex: 0,
          concept: 'Pedestrian Signals',
        },
        {
          question: 'Walking near traffic, you should walk on the...',
          options: ['Sidewalk', 'Road'],
          correctIndex: 0,
          concept: 'Sidewalk Safety',
        },
        {
          question: 'In a car, you must always wear a...',
          options: ['Seatbelt', 'Hat'],
          correctIndex: 0,
          concept: 'Car Safety',
        },
        {
          question: 'At night, you should wear...',
          options: ['Bright colors', 'Dark clothes'],
          correctIndex: 0,
          concept: 'Visibility',
        },
        {
          question: 'When getting off the school bus...',
          options: ['Wait for it to stop', 'Jump off early'],
          correctIndex: 0,
          concept: 'Bus Safety',
        },
        {
          question: 'If a ball rolls into the street...',
          options: ['Ask an adult for help', 'Chase it immediately'],
          correctIndex: 0,
          concept: 'Street Awareness',
        },
      ],
    },
  },
];

export default GAMES_BATCH_3;
