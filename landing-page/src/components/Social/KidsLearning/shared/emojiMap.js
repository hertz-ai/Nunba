/**
 * emojiMap.js — Word-to-emoji lookup for kids game visual fallbacks.
 *
 * Used by templates to add visual indicators to text-only options/items
 * when GameAssetService images aren't available.
 */

const EMOJI_MAP = {
  // Animals
  cat: '\u{1F431}',
  dog: '\u{1F436}',
  fish: '\u{1F41F}',
  bird: '\u{1F426}',
  elephant: '\u{1F418}',
  lion: '\u{1F981}',
  rabbit: '\u{1F430}',
  bear: '\u{1F43B}',
  monkey: '\u{1F435}',
  pig: '\u{1F437}',
  cow: '\u{1F42E}',
  horse: '\u{1F434}',
  mouse: '\u{1F42D}',
  frog: '\u{1F438}',
  turtle: '\u{1F422}',
  snake: '\u{1F40D}',
  whale: '\u{1F433}',
  dolphin: '\u{1F42C}',
  octopus: '\u{1F419}',
  butterfly: '\u{1F98B}',
  bee: '\u{1F41D}',
  ladybug: '\u{1F41E}',
  penguin: '\u{1F427}',
  chicken: '\u{1F414}',
  duck: '\u{1F986}',
  tiger: '\u{1F42F}',
  fox: '\u{1F98A}',
  deer: '\u{1F98C}',
  zebra: '\u{1F993}',
  giraffe: '\u{1F992}',
  gorilla: '\u{1F98D}',
  panda: '\u{1F43C}',
  koala: '\u{1F428}',
  owl: '\u{1F989}',
  parrot: '\u{1F99C}',
  spider: '\u{1F577}',
  ant: '\u{1F41C}',
  snail: '\u{1F40C}',
  crab: '\u{1F980}',
  shrimp: '\u{1F990}',
  shark: '\u{1F988}',
  crocodile: '\u{1F40A}',
  dinosaur: '\u{1F995}',
  dragon: '\u{1F409}',

  // Food & Drink
  apple: '\u{1F34E}',
  banana: '\u{1F34C}',
  orange: '\u{1F34A}',
  grape: '\u{1F347}',
  grapes: '\u{1F347}',
  strawberry: '\u{1F353}',
  watermelon: '\u{1F349}',
  peach: '\u{1F351}',
  cherry: '\u{1F352}',
  lemon: '\u{1F34B}',
  pineapple: '\u{1F34D}',
  mango: '\u{1F96D}',
  coconut: '\u{1F965}',
  avocado: '\u{1F951}',
  tomato: '\u{1F345}',
  carrot: '\u{1F955}',
  corn: '\u{1F33D}',
  broccoli: '\u{1F966}',
  pizza: '\u{1F355}',
  burger: '\u{1F354}',
  cake: '\u{1F382}',
  cookie: '\u{1F36A}',
  candy: '\u{1F36C}',
  chocolate: '\u{1F36B}',
  icecream: '\u{1F366}',
  bread: '\u{1F35E}',
  egg: '\u{1F95A}',
  cheese: '\u{1F9C0}',
  milk: '\u{1F95B}',
  water: '\u{1F4A7}',
  juice: '\u{1F9C3}',
  rice: '\u{1F35A}',

  // Nature
  tree: '\u{1F333}',
  flower: '\u{1F33B}',
  rose: '\u{1F339}',
  leaf: '\u{1F343}',
  mushroom: '\u{1F344}',
  cactus: '\u{1F335}',
  plant: '\u{1F331}',
  forest: '\u{1F332}',
  mountain: '\u{26F0}\uFE0F',
  ocean: '\u{1F30A}',
  river: '\u{1F30A}',
  rain: '\u{1F327}\uFE0F',
  snow: '\u{2744}\uFE0F',
  rainbow: '\u{1F308}',
  cloud: '\u{2601}\uFE0F',

  // Space & Weather
  sun: '\u{2600}\uFE0F',
  moon: '\u{1F319}',
  star: '\u{2B50}',
  earth: '\u{1F30D}',
  planet: '\u{1FA90}',
  rocket: '\u{1F680}',
  comet: '\u{2604}\uFE0F',
  lightning: '\u{26A1}',
  thunder: '\u{26A1}',
  wind: '\u{1F32C}\uFE0F',

  // Objects
  car: '\u{1F697}',
  bus: '\u{1F68C}',
  truck: '\u{1F69A}',
  train: '\u{1F682}',
  airplane: '\u{2708}\uFE0F',
  boat: '\u{26F5}',
  bicycle: '\u{1F6B2}',
  ship: '\u{1F6A2}',
  house: '\u{1F3E0}',
  school: '\u{1F3EB}',
  hospital: '\u{1F3E5}',
  church: '\u{26EA}',
  ball: '\u{26BD}',
  book: '\u{1F4D6}',
  pencil: '\u{270F}\uFE0F',
  pen: '\u{1F58A}\uFE0F',
  clock: '\u{1F570}\uFE0F',
  phone: '\u{1F4F1}',
  computer: '\u{1F4BB}',
  camera: '\u{1F4F7}',
  key: '\u{1F511}',
  lamp: '\u{1F4A1}',
  chair: '\u{1FA91}',
  table: '\u{1F6CB}\uFE0F',
  bed: '\u{1F6CF}\uFE0F',
  door: '\u{1F6AA}',
  window: '\u{1FA9F}',
  umbrella: '\u{2602}\uFE0F',
  hat: '\u{1F3A9}',
  shoe: '\u{1F45F}',
  shirt: '\u{1F455}',
  bag: '\u{1F45C}',
  guitar: '\u{1F3B8}',
  drum: '\u{1F941}',
  piano: '\u{1F3B9}',
  trumpet: '\u{1F3BA}',

  // Colors
  red: '\u{1F534}',
  blue: '\u{1F535}',
  green: '\u{1F7E2}',
  yellow: '\u{1F7E1}',
  purple: '\u{1F7E3}',
  white: '\u{26AA}',
  black: '\u{26AB}',
  brown: '\u{1F7E4}',
  pink: '\u{1F49F}',

  // Body
  hand: '\u{270B}',
  eye: '\u{1F441}\uFE0F',
  ear: '\u{1F442}',
  nose: '\u{1F443}',
  mouth: '\u{1F444}',
  foot: '\u{1F9B6}',
  heart: '\u{2764}\uFE0F',
  brain: '\u{1F9E0}',

  // Emotions & People
  happy: '\u{1F60A}',
  sad: '\u{1F622}',
  angry: '\u{1F620}',
  scared: '\u{1F628}',
  surprised: '\u{1F632}',
  love: '\u{2764}\uFE0F',
  friend: '\u{1F46B}',
  family: '\u{1F46A}',
  baby: '\u{1F476}',
  boy: '\u{1F466}',
  girl: '\u{1F467}',

  // Numbers as words
  one: '1\uFE0F\u20E3',
  two: '2\uFE0F\u20E3',
  three: '3\uFE0F\u20E3',
  four: '4\uFE0F\u20E3',
  five: '5\uFE0F\u20E3',
  six: '6\uFE0F\u20E3',
  seven: '7\uFE0F\u20E3',
  eight: '8\uFE0F\u20E3',
  nine: '9\uFE0F\u20E3',
  ten: '\u{1F51F}',
  zero: '0\uFE0F\u20E3',

  // Activities
  run: '\u{1F3C3}',
  swim: '\u{1F3CA}',
  dance: '\u{1F483}',
  sing: '\u{1F3A4}',
  paint: '\u{1F3A8}',
  read: '\u{1F4D6}',
  write: '\u{270D}\uFE0F',
  cook: '\u{1F373}',
  sleep: '\u{1F634}',
  eat: '\u{1F37D}\uFE0F',
  play: '\u{1F3AE}',
  clean: '\u{1F9F9}',

  // Misc concepts
  yes: '\u{2705}',
  no: '\u{274C}',
  true: '\u{2705}',
  false: '\u{274C}',
  big: '\u{1F418}',
  small: '\u{1F41C}',
  hot: '\u{1F525}',
  cold: '\u{2744}\uFE0F',
  fast: '\u{26A1}',
  slow: '\u{1F422}',
  up: '\u{2B06}\uFE0F',
  down: '\u{2B07}\uFE0F',
  left: '\u{2B05}\uFE0F',
  right: '\u{27A1}\uFE0F',
  morning: '\u{1F305}',
  night: '\u{1F303}',
  day: '\u{2600}\uFE0F',
  summer: '\u{2600}\uFE0F',
  winter: '\u{2744}\uFE0F',
  spring: '\u{1F33C}',
  autumn: '\u{1F342}',
};

/**
 * Get an emoji for a given text string.
 * Tries exact match, then first word, then scans for known words.
 * @param {string} text
 * @returns {string|null}
 */
export function getEmojiForText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();

  // Exact match
  if (EMOJI_MAP[lower]) return EMOJI_MAP[lower];

  // First word match
  const words = lower.split(/[\s,;:!?.]+/).filter(Boolean);
  for (const word of words) {
    if (EMOJI_MAP[word]) return EMOJI_MAP[word];
  }

  // Partial match — check if any key is contained in the text
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (key.length >= 3 && lower.includes(key)) return emoji;
  }

  return null;
}

export default EMOJI_MAP;
