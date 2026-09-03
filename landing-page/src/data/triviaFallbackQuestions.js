/**
 * Offline question bank for the trivia games.
 *
 * Trivia questions normally arrive with the multiplayer session or from the
 * backend catalogue. An unauthenticated visitor gets neither, and the local
 * catalogue entries carried no questions at all, so all seven trivia games
 * rendered "Waiting for questions..." and could never be played — measured
 * across the full 60s budget of the play-to-completion sweep.
 *
 * This is the same shape as the local fallback the rest of the catalogue
 * already relies on: enough real content to play offline, with the server
 * still preferred whenever it answers (TriviaEngine reads session questions
 * first and only falls back to engine_config).
 *
 * Question shape matches what TriviaEngine reads:
 *   { q: string, options: string[], a: string }   // `a` must be one of options
 */

const general = [
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], a: '7' },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], a: 'Pacific' },
  { q: 'How many minutes are in a full day?', options: ['1440', '1200', '960', '2400'], a: '1440' },
  { q: 'What is the chemical symbol for water?', options: ['WA', 'H2O', 'O2', 'HO'], a: 'H2O' },
  { q: 'How many strings does a standard guitar have?', options: ['4', '5', '6', '7'], a: '6' },
  { q: 'What colour do you get mixing blue and yellow?', options: ['Purple', 'Green', 'Orange', 'Brown'], a: 'Green' },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], a: '6' },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], a: 'Mars' },
];

const science = [
  { q: 'What gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], a: 'Carbon dioxide' },
  { q: 'What is the centre of an atom called?', options: ['Nucleus', 'Electron', 'Proton', 'Shell'], a: 'Nucleus' },
  { q: 'At what temperature does water freeze, in Celsius?', options: ['0', '32', '-10', '100'], a: '0' },
  { q: 'Which organ pumps blood around the body?', options: ['Lungs', 'Liver', 'Heart', 'Kidney'], a: 'Heart' },
  { q: 'What force keeps planets in orbit around the Sun?', options: ['Magnetism', 'Gravity', 'Friction', 'Tension'], a: 'Gravity' },
  { q: 'How many bones does an adult human have?', options: ['186', '206', '226', '246'], a: '206' },
  { q: 'What is the most abundant gas in Earth’s atmosphere?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], a: 'Nitrogen' },
  { q: 'What does DNA stand for?', options: ['Deoxyribonucleic acid', 'Dinucleic acid', 'Deoxy nitric acid', 'Dual nucleic acid'], a: 'Deoxyribonucleic acid' },
];

const history = [
  { q: 'In which year did the Second World War end?', options: ['1918', '1939', '1945', '1950'], a: '1945' },
  { q: 'Who was the first person to walk on the Moon?', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], a: 'Neil Armstrong' },
  { q: 'The Great Wall was built in which country?', options: ['Japan', 'China', 'India', 'Mongolia'], a: 'China' },
  { q: 'Which ancient civilisation built the pyramids at Giza?', options: ['Roman', 'Greek', 'Egyptian', 'Persian'], a: 'Egyptian' },
  { q: 'Who wrote the plays Hamlet and Macbeth?', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'John Milton'], a: 'William Shakespeare' },
  { q: 'In which year did India gain independence?', options: ['1942', '1947', '1950', '1935'], a: '1947' },
  { q: 'Which empire was ruled by Julius Caesar?', options: ['Greek', 'Ottoman', 'Roman', 'Byzantine'], a: 'Roman' },
  { q: 'The printing press was developed in Europe by whom?', options: ['Galileo', 'Gutenberg', 'Newton', 'Da Vinci'], a: 'Gutenberg' },
];

const geography = [
  { q: 'What is the capital of Japan?', options: ['Osaka', 'Kyoto', 'Tokyo', 'Nagoya'], a: 'Tokyo' },
  { q: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Mississippi'], a: 'Nile' },
  { q: 'Mount Everest sits on the border of Nepal and which country?', options: ['India', 'China', 'Bhutan', 'Pakistan'], a: 'China' },
  { q: 'Which desert is the largest hot desert on Earth?', options: ['Gobi', 'Kalahari', 'Sahara', 'Atacama'], a: 'Sahara' },
  { q: 'How many countries make up the United Kingdom?', options: ['2', '3', '4', '5'], a: '4' },
  { q: 'Which continent is Egypt mainly located in?', options: ['Asia', 'Africa', 'Europe', 'Oceania'], a: 'Africa' },
  { q: 'What is the smallest country in the world by area?', options: ['Monaco', 'Nauru', 'Vatican City', 'San Marino'], a: 'Vatican City' },
  { q: 'Which ocean lies to the east of India?', options: ['Bay of Bengal', 'Arabian Sea', 'Red Sea', 'Coral Sea'], a: 'Bay of Bengal' },
];

const tech = [
  { q: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit'], a: 'Central Processing Unit' },
  { q: 'Which company created the Android operating system?', options: ['Apple', 'Microsoft', 'Google', 'Samsung'], a: 'Google' },
  { q: 'How many bits are in a byte?', options: ['4', '8', '16', '32'], a: '8' },
  { q: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperText Transmission Path', 'Host Transfer Protocol'], a: 'HyperText Transfer Protocol' },
  { q: 'Which language is primarily used to style web pages?', options: ['HTML', 'CSS', 'SQL', 'JSON'], a: 'CSS' },
  { q: 'What does GPU stand for?', options: ['General Processing Unit', 'Graphics Processing Unit', 'Grid Power Unit', 'Global Process Unit'], a: 'Graphics Processing Unit' },
  { q: 'Which protocol turns a domain name into an IP address?', options: ['FTP', 'DNS', 'SMTP', 'SSH'], a: 'DNS' },
  { q: 'What does "open source" mean for software?', options: ['It is free of bugs', 'Its source code is publicly available', 'It runs only online', 'It has no licence'], a: 'Its source code is publicly available' },
];

const movies = [
  { q: 'Which film features a character called Forrest Gump?', options: ['Cast Away', 'Forrest Gump', 'Big', 'Philadelphia'], a: 'Forrest Gump' },
  { q: 'What kind of animal is Simba in The Lion King?', options: ['Tiger', 'Lion', 'Leopard', 'Cheetah'], a: 'Lion' },
  { q: 'In which film would you find the starship Millennium Falcon?', options: ['Star Trek', 'Star Wars', 'Alien', 'Dune'], a: 'Star Wars' },
  { q: 'Which studio created Toy Story?', options: ['DreamWorks', 'Pixar', 'Blue Sky', 'Illumination'], a: 'Pixar' },
  { q: 'What is the highest award at the Academy Awards called?', options: ['Golden Globe', 'Oscar', 'BAFTA', 'Palme d’Or'], a: 'Oscar' },
  { q: 'Which film series features a wizard called Harry?', options: ['Narnia', 'Harry Potter', 'Percy Jackson', 'Eragon'], a: 'Harry Potter' },
  { q: 'What does a film’s "director" primarily do?', options: ['Write the music', 'Guide the creative vision', 'Sell tickets', 'Design posters'], a: 'Guide the creative vision' },
  { q: 'Which animated film features a snowman named Olaf?', options: ['Frozen', 'Tangled', 'Moana', 'Brave'], a: 'Frozen' },
];

const party = [
  { q: 'How many players are on a football (soccer) team on the pitch?', options: ['9', '10', '11', '12'], a: '11' },
  { q: 'What is the traditional colour of a taxi in New York City?', options: ['Black', 'Yellow', 'White', 'Green'], a: 'Yellow' },
  { q: 'How many cards are in a standard deck, excluding jokers?', options: ['48', '50', '52', '54'], a: '52' },
  { q: 'What is the fastest land animal?', options: ['Lion', 'Cheetah', 'Horse', 'Greyhound'], a: 'Cheetah' },
  { q: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], a: '366' },
  { q: 'Which sport uses a shuttlecock?', options: ['Tennis', 'Squash', 'Badminton', 'Table tennis'], a: 'Badminton' },
  { q: 'What do you call a group of wolves?', options: ['Herd', 'Pack', 'Flock', 'School'], a: 'Pack' },
  { q: 'How many colours are in a rainbow, traditionally?', options: ['5', '6', '7', '8'], a: '7' },
];

export const TRIVIA_FALLBACK_QUESTIONS = {
  'trivia-general': general,
  'trivia-science': science,
  'trivia-history': history,
  'trivia-geography': geography,
  'trivia-tech': tech,
  'trivia-movies': movies,
  'party-trivia': party,
};

export default TRIVIA_FALLBACK_QUESTIONS;
