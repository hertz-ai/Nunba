/**
 * Unified TTS ONNX Web Worker — supports LuxTTS (48kHz) and Pocket TTS (24kHz)
 *
 * Single-path: receives engine selection in `load` message, loads ONLY that engine.
 * Backward-compatible with pocket-tts-worker.js message protocol.
 *
 * LuxTTS pipeline (non-autoregressive):
 *   Text → tokenize → text_encoder_int8.onnx → fm_decoder_int8.onnx (4-step diffusion)
 *         → vocos vocoder → 48kHz waveform
 *
 * Pocket TTS pipeline (autoregressive, frame-by-frame):
 *   Text → SentencePiece → text_conditioner → flowLmMain+flowLmFlow → mimiDecoder → 24kHz
 */
/* eslint-disable */
console.log('TTS Worker Starting...');
self.postMessage({
  type: 'status',
  status: 'Worker Thread Started',
  state: 'idle',
});

let ort = null;
let activeEngine = null; // 'luxtts' | 'pocket'
let isGenerating = false;
let isReady = false;

// ---- Shared text preprocessing (from pocket-tts-worker.js) ----
const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];
const ORDINAL_ONES = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];
const ORDINAL_TENS = [
  '',
  '',
  'twentieth',
  'thirtieth',
  'fortieth',
  'fiftieth',
  'sixtieth',
  'seventieth',
  'eightieth',
  'ninetieth',
];

function numberToWords(num, options = {}) {
  const {andword = '', zero = 'zero', group = 0} = options;
  if (num === 0) return zero;
  const convert = (n) => {
    if (n < 20) return ONES[n];
    if (n < 100)
      return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
    if (n < 1000) {
      const r = n % 100;
      return (
        ONES[Math.floor(n / 100)] +
        ' hundred' +
        (r ? (andword ? ' ' + andword + ' ' : ' ') + convert(r) : '')
      );
    }
    if (n < 1e6) {
      const t = Math.floor(n / 1000);
      const r = n % 1000;
      return convert(t) + ' thousand' + (r ? ' ' + convert(r) : '');
    }
    if (n < 1e9) {
      const m = Math.floor(n / 1e6);
      const r = n % 1e6;
      return convert(m) + ' million' + (r ? ' ' + convert(r) : '');
    }
    const b = Math.floor(n / 1e9);
    const r = n % 1e9;
    return convert(b) + ' billion' + (r ? ' ' + convert(r) : '');
  };
  if (group === 2 && num > 1000 && num < 10000) {
    const h = Math.floor(num / 100),
      l = num % 100;
    if (l === 0) return convert(h) + ' hundred';
    if (l < 10)
      return convert(h) + ' ' + (zero === 'oh' ? 'oh' : zero) + ' ' + ONES[l];
    return convert(h) + ' ' + convert(l);
  }
  return convert(num);
}

function ordinalToWords(num) {
  if (num < 20) return ORDINAL_ONES[num] || numberToWords(num) + 'th';
  if (num < 100) {
    const t = Math.floor(num / 10),
      o = num % 10;
    if (o === 0) return ORDINAL_TENS[t];
    return TENS[t] + ' ' + ORDINAL_ONES[o];
  }
  const c = numberToWords(num);
  if (c.endsWith('y')) return c.slice(0, -1) + 'ieth';
  if (c.endsWith('one')) return c.slice(0, -3) + 'first';
  if (c.endsWith('two')) return c.slice(0, -3) + 'second';
  if (c.endsWith('three')) return c.slice(0, -5) + 'third';
  if (c.endsWith('ve')) return c.slice(0, -2) + 'fth';
  if (c.endsWith('e')) return c.slice(0, -1) + 'th';
  if (c.endsWith('t')) return c + 'h';
  return c + 'th';
}

const UNICODE_MAP = {
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  æ: 'ae',
  ç: 'c',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ñ: 'n',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ø: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ý: 'y',
  ÿ: 'y',
  ß: 'ss',
  œ: 'oe',
  ð: 'd',
  þ: 'th',
  À: 'A',
  Á: 'A',
  Â: 'A',
  Ã: 'A',
  Ä: 'A',
  Å: 'A',
  Æ: 'AE',
  Ç: 'C',
  È: 'E',
  É: 'E',
  Ê: 'E',
  Ë: 'E',
  Ì: 'I',
  Í: 'I',
  Î: 'I',
  Ï: 'I',
  Ñ: 'N',
  Ò: 'O',
  Ó: 'O',
  Ô: 'O',
  Õ: 'O',
  Ö: 'O',
  Ø: 'O',
  Ù: 'U',
  Ú: 'U',
  Û: 'U',
  Ü: 'U',
  Ý: 'Y',
  '\u201C': '"',
  '\u201D': '"',
  '\u2018': "'",
  '\u2019': "'",
  '\u2026': '...',
  '\u2013': '-',
  '\u2014': '-',
};
function convertToAscii(t) {
  return t
    .split('')
    .map((c) => UNICODE_MAP[c] || c)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const ABBREVIATIONS = [
  [/\bmrs\./gi, 'misuss'],
  [/\bms\./gi, 'miss'],
  [/\bmr\./gi, 'mister'],
  [/\bdr\./gi, 'doctor'],
  [/\bst\./gi, 'saint'],
  [/\bco\./gi, 'company'],
  [/\bjr\./gi, 'junior'],
  [/\bmaj\./gi, 'major'],
  [/\bgen\./gi, 'general'],
  [/\bdrs\./gi, 'doctors'],
  [/\brev\./gi, 'reverend'],
  [/\blt\./gi, 'lieutenant'],
  [/\bhon\./gi, 'honorable'],
  [/\bsgt\./gi, 'sergeant'],
  [/\bcapt\./gi, 'captain'],
  [/\besq\./gi, 'esquire'],
  [/\bltd\./gi, 'limited'],
  [/\bcol\./gi, 'colonel'],
  [/\bft\./gi, 'fort'],
];
const CASED_ABBREVIATIONS = [
  [/\bTTS\b/g, 'text to speech'],
  [/\bHz\b/g, 'hertz'],
  [/\bkHz\b/g, 'kilohertz'],
  [/\bAPI\b/g, 'a p i'],
  [/\bCPU\b/g, 'c p u'],
  [/\bGPU\b/g, 'g p u'],
  [/\bMB\b/g, 'megabyte'],
  [/\bGB\b/g, 'gigabyte'],
  [/\betc\b/g, 'etcetera'],
];
function expandAbbreviations(t) {
  for (const [r, s] of [...ABBREVIATIONS, ...CASED_ABBREVIATIONS])
    t = t.replace(r, s);
  return t;
}

function normalizeNumbers(text) {
  text = text.replace(/#(\d)/g, (_, d) => `number ${d}`);
  text = text.replace(/(\d)([KMBT])/gi, (_, n, s) => {
    const m = {k: 'thousand', m: 'million', b: 'billion', t: 'trillion'};
    return `${n} ${m[s.toLowerCase()]}`;
  });
  for (let i = 0; i < 2; i++)
    text = text.replace(/(\d)([a-z])|([a-z])(\d)/gi, (m, d1, l1, l2, d2) => {
      if (d1 && l1) return `${d1} ${l1}`;
      if (l2 && d2) return `${l2} ${d2}`;
      return m;
    });
  text = text.replace(/(\d[\d,]+\d)/g, (m) => m.replace(/,/g, ''));
  text = text.replace(
    /£([\d,]*\d+)/g,
    (_, a) => `${a.replace(/,/g, '')} pounds`
  );
  text = text.replace(/\$([\d.,]*\d+)/g, (_, a) => {
    const p = a.replace(/,/g, '').split('.');
    const d = parseInt(p[0]) || 0;
    const c = p[1] ? parseInt(p[1]) : 0;
    if (d && c)
      return `${d} ${d === 1 ? 'dollar' : 'dollars'}, ${c} ${c === 1 ? 'cent' : 'cents'}`;
    if (d) return `${d} ${d === 1 ? 'dollar' : 'dollars'}`;
    if (c) return `${c} ${c === 1 ? 'cent' : 'cents'}`;
    return 'zero dollars';
  });
  text = text.replace(/(\d+)(st|nd|rd|th)/gi, (_, n) =>
    ordinalToWords(parseInt(n))
  );
  text = text.replace(/\d+/g, (m) => {
    const n = parseInt(m);
    if (n > 1000 && n < 3000) {
      if (n === 2000) return 'two thousand';
      if (n > 2000 && n < 2010) return 'two thousand ' + numberToWords(n % 100);
      if (n % 100 === 0) return numberToWords(Math.floor(n / 100)) + ' hundred';
      return numberToWords(n, {zero: 'oh', group: 2});
    }
    return numberToWords(n);
  });
  return text;
}

const SPECIAL_CHARS = [
  [/@/g, ' at '],
  [/&/g, ' and '],
  [/%/g, ' percent '],
  [/:/g, '.'],
  [/;/g, ','],
  [/\+/g, ' plus '],
  [/\\/g, ' backslash '],
  [/~/g, ' about '],
  [/<=/g, ' less than or equal to '],
  [/>=/g, ' greater than or equal to '],
  [/</g, ' less than '],
  [/>/g, ' greater than '],
  [/=/g, ' equals '],
  [/\//g, ' slash '],
  [/_/g, ' '],
];
function normalizeSpecial(t) {
  t = t.replace(/https?:\/\//gi, 'h t t p s colon slash slash ');
  t = t.replace(/(.) - (.)/g, '$1, $2');
  t = t.replace(/([A-Z])\.([A-Z])/gi, '$1 dot $2');
  return t;
}
function expandSpecialCharacters(t) {
  for (const [r, s] of SPECIAL_CHARS) t = t.replace(r, s);
  return t;
}
function collapseWhitespace(t) {
  return t.replace(/\s+/g, ' ').replace(/ ([.\?!,])/g, '$1');
}
function dedupPunctuation(t) {
  return t
    .replace(/\.\.\.+/g, '[E]')
    .replace(/,+/g, ',')
    .replace(/[.,]*\.[.,]*/g, '.')
    .replace(/[.,!]*![.,!]*/g, '!')
    .replace(/[.,!?]*\?[.,!?]*/g, '?')
    .replace(/\[E\]/g, '...');
}

function prepareText(text) {
  text = text.trim();
  if (!text) return '';
  text = convertToAscii(text);
  text = normalizeNumbers(text);
  text = normalizeSpecial(text);
  text = expandAbbreviations(text);
  text = expandSpecialCharacters(text);
  text = collapseWhitespace(text);
  text = dedupPunctuation(text);
  text = text.trim();
  if (text && text[text.length - 1].match(/[a-zA-Z0-9]/)) text += '.';
  if (text && !text[0].match(/[A-Z]/))
    text = text[0].toUpperCase() + text.slice(1);
  return text;
}

// ---- Shared utilities ----
function stripQuery(u) {
  const i = u.indexOf('?');
  return i >= 0 ? u.slice(0, i) : u;
}
function baseName(u) {
  return stripQuery(u).split('/').pop();
}
async function fetchOk(url) {
  const r = await fetch(url, {mode: 'cors', credentials: 'omit'});
  if (!r.ok) throw new Error(`Fetch ${r.status} for ${url}`);
  return r;
}

async function createSessionWithExternalData(modelUrl, sessionOpts) {
  const modelResp = await fetchOk(modelUrl);
  const modelBuf = await modelResp.arrayBuffer();
  const raw = stripQuery(modelUrl);
  const candidates = [
    raw + '_data',
    raw.replace(/\.onnx$/i, '.onnx_data'),
    raw.replace(/\.onnx$/i, '.data'),
    raw.replace(/\.onnx$/i, '_data'),
  ];
  let externalData = null;
  for (const extUrl of candidates) {
    try {
      const extResp = await fetch(extUrl, {mode: 'cors', credentials: 'omit'});
      if (extResp.ok) {
        const bytes = new Uint8Array(await extResp.arrayBuffer());
        externalData = [{data: bytes, path: baseName(extUrl)}];
        break;
      }
    } catch (_) {}
  }
  const opts = {...sessionOpts};
  if (externalData) opts.externalData = externalData;
  return ort.InferenceSession.create(modelBuf, opts);
}

// ============================================================
//  LuxTTS Engine
// ============================================================

const LUXTTS_HF = 'https://huggingface.co/YatharthS/LuxTTS/resolve/main';
const LUXTTS_MODELS = {
  text_encoder: `${LUXTTS_HF}/text_encoder_int8.onnx`,
  fm_decoder: `${LUXTTS_HF}/fm_decoder_int8.onnx`,
  vocoder: `${LUXTTS_HF}/vocoder/vocos.bin`,
  tokens: `${LUXTTS_HF}/tokens.txt`,
  config: `${LUXTTS_HF}/config.json`,
};

const LUXTTS_SAMPLE_RATE = 48000;
const LUXTTS_FEAT_DIM = 100;
const LUXTTS_DEFAULT_STEPS = 4;
const LUXTTS_CHUNK_GAP_SEC = 0.25;

let luxTextEncoderSession = null;
let luxFmDecoderSession = null;
let luxVocoderSession = null;
let luxTokenMap = null;
let luxConfig = null;
let luxNumSteps = LUXTTS_DEFAULT_STEPS;

/**
 * Parse tokens.txt into a Map<string, number>.
 * Format: each line is "token\tindex" or "token index"
 */
function parseLuxTokens(text) {
  const map = new Map();
  const lines = text.trim().split('\n');
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const token = parts[0];
      const id = parseInt(parts[1], 10);
      if (!isNaN(id)) map.set(token, id);
    }
  }
  return map;
}

/**
 * Tokenize text for LuxTTS.
 * Uses character-level encoding: lowercase letters map to token IDs.
 * Punctuation and spaces are mapped directly.
 *
 * For better quality, this can be upgraded to use espeak-ng WASM
 * for proper IPA phonemization. The token vocabulary supports both
 * graphemes (a-z) and IPA symbols.
 */
function luxTokenize(text) {
  if (!luxTokenMap) return [];
  const normalized = text.toLowerCase().trim();
  const ids = [];
  // Start token (^)
  if (luxTokenMap.has('^')) ids.push(luxTokenMap.get('^'));
  for (const char of normalized) {
    if (luxTokenMap.has(char)) {
      ids.push(luxTokenMap.get(char));
    }
    // Skip unknown characters (emoji, non-Latin, etc.)
  }
  // End token ($)
  if (luxTokenMap.has('$')) ids.push(luxTokenMap.get('$'));
  return ids;
}

/**
 * Split text into sentence-level chunks for LuxTTS.
 * Since LuxTTS is non-autoregressive, each chunk generates complete audio.
 */
function luxSplitSentences(text) {
  const prepared = prepareText(text);
  if (!prepared) return [];
  const sentences = (prepared.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return [prepared];
  return sentences;
}

/**
 * Generate Gaussian noise (Box-Muller transform)
 */
function gaussianNoise(size) {
  const arr = new Float32Array(size);
  for (let i = 0; i < size; i += 2) {
    let u = 0,
      v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    const mag = Math.sqrt(-2 * Math.log(u));
    arr[i] = mag * Math.cos(2 * Math.PI * v);
    if (i + 1 < size) arr[i + 1] = mag * Math.sin(2 * Math.PI * v);
  }
  return arr;
}

async function loadLuxTTSModels() {
  const version = '1.20.0';
  const cdnBase = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;

  postMessage({
    type: 'status',
    status: 'Loading ONNX Runtime...',
    state: 'loading',
  });
  try {
    const ortModule = await import(
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/ort.min.mjs`
    );
    ort = ortModule.default || ortModule;
  } catch (e) {
    throw new Error('Failed to load ONNX Runtime: ' + e.message);
  }

  ort.env.wasm.wasmPaths = cdnBase;
  ort.env.wasm.simd = true;
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency || 2, 2)
    : 1;
  const sessionOpts = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };

  // Load config and tokens in parallel with models
  postMessage({
    type: 'status',
    status: 'Downloading LuxTTS models (~130 MB first time)...',
    state: 'loading',
  });

  const [textEncSession, fmDecSession, vocSession, tokensResp, configResp] =
    await Promise.all([
      createSessionWithExternalData(LUXTTS_MODELS.text_encoder, sessionOpts),
      createSessionWithExternalData(LUXTTS_MODELS.fm_decoder, sessionOpts),
      (async () => {
        // vocos.bin — try loading as ONNX session
        try {
          return await createSessionWithExternalData(
            LUXTTS_MODELS.vocoder,
            sessionOpts
          );
        } catch (e) {
          console.warn(
            'vocos.bin failed to load as ONNX, trying alternative...',
            e
          );
          // Fallback: try sherpa-onnx vocos_24khz.onnx or similar
          return null;
        }
      })(),
      fetchOk(LUXTTS_MODELS.tokens),
      fetchOk(LUXTTS_MODELS.config),
    ]);

  luxTextEncoderSession = textEncSession;
  luxFmDecoderSession = fmDecSession;
  luxVocoderSession = vocSession;

  // Parse tokens
  const tokensText = await tokensResp.text();
  luxTokenMap = parseLuxTokens(tokensText);
  console.log('[LuxTTS] Loaded', luxTokenMap.size, 'tokens');

  // Parse config
  try {
    luxConfig = await configResp.json();
    console.log('[LuxTTS] Config:', luxConfig);
  } catch (e) {
    console.warn('[LuxTTS] Could not parse config.json:', e);
  }

  // Log model I/O for debugging tensor contracts
  console.log(
    '[LuxTTS] text_encoder inputs:',
    luxTextEncoderSession.inputNames
  );
  console.log(
    '[LuxTTS] text_encoder outputs:',
    luxTextEncoderSession.outputNames
  );
  console.log('[LuxTTS] fm_decoder inputs:', luxFmDecoderSession.inputNames);
  console.log('[LuxTTS] fm_decoder outputs:', luxFmDecoderSession.outputNames);
  if (luxVocoderSession) {
    console.log('[LuxTTS] vocoder inputs:', luxVocoderSession.inputNames);
    console.log('[LuxTTS] vocoder outputs:', luxVocoderSession.outputNames);
  }

  // Report voices — LuxTTS uses voice cloning, no predefined voices
  postMessage({
    type: 'voices_loaded',
    voices: ['default'],
    defaultVoice: 'default',
  });

  isReady = true;
  postMessage({type: 'status', status: 'Ready (LuxTTS)', state: 'idle'});
  postMessage({type: 'loaded'});
}

/**
 * LuxTTS inference pipeline for a single text chunk.
 * Returns Float32Array waveform at 48kHz.
 */
async function luxGenerateChunk(text) {
  const tokenIds = luxTokenize(text);
  if (tokenIds.length === 0) return null;

  // Step 1: Text encoder
  // Input: tokens [1, seq_len] int64
  const tokenTensor = new ort.Tensor(
    'int64',
    BigInt64Array.from(tokenIds.map((x) => BigInt(x))),
    [1, tokenIds.length]
  );

  // Build encoder inputs dynamically based on model's expected inputs
  const encInputs = {};
  for (const name of luxTextEncoderSession.inputNames) {
    if (name === 'tokens' || name === 'token_ids' || name === 'input_ids') {
      encInputs[name] = tokenTensor;
    } else if (name === 'prompt_tokens') {
      // Empty prompt tokens for default voice
      encInputs[name] = new ort.Tensor('int64', new BigInt64Array(0), [1, 0]);
    } else if (name.includes('feat_len') || name.includes('prompt_len')) {
      encInputs[name] = new ort.Tensor(
        'int64',
        BigInt64Array.from([BigInt(0)]),
        [1]
      );
    } else if (name.includes('speed')) {
      encInputs[name] = new ort.Tensor('float32', new Float32Array([1.0]), [1]);
    }
  }

  const encResult = await luxTextEncoderSession.run(encInputs);
  const textCondition = encResult[luxTextEncoderSession.outputNames[0]];
  const numFrames = textCondition.dims[1];
  const featDim = textCondition.dims[2] || LUXTTS_FEAT_DIM;

  // Yield to prevent main thread starvation
  await new Promise((r) => setTimeout(r, 0));

  // Step 2: Flow matching diffusion (4 steps)
  const dt = 1.0 / luxNumSteps;
  let x = gaussianNoise(numFrames * featDim);

  // Empty speech condition (no voice cloning prompt)
  const speechCondition = new ort.Tensor('float32', new Float32Array(0), [
    1,
    0,
    featDim,
  ]);

  for (let step = 0; step < luxNumSteps; step++) {
    if (!isGenerating) return null;

    const t = step * dt;

    // Build decoder inputs dynamically
    const decInputs = {};
    for (const name of luxFmDecoderSession.inputNames) {
      if (name === 't' || name === 'timestep') {
        decInputs[name] = new ort.Tensor('float32', new Float32Array([t]), [1]);
      } else if (name === 'x' || name === 'noise' || name === 'sample') {
        decInputs[name] = new ort.Tensor('float32', x, [1, numFrames, featDim]);
      } else if (
        name === 'text_condition' ||
        name === 'text_embeddings' ||
        name === 'encoder_output'
      ) {
        decInputs[name] = textCondition;
      } else if (
        name === 'speech_condition' ||
        name === 'prompt_features' ||
        name === 'speaker_embedding'
      ) {
        decInputs[name] = speechCondition;
      } else if (name === 'guidance_scale' || name === 'cfg_scale') {
        decInputs[name] = new ort.Tensor(
          'float32',
          new Float32Array([1.0]),
          [1]
        );
      }
    }

    const decResult = await luxFmDecoderSession.run(decInputs);
    const velocity = decResult[luxFmDecoderSession.outputNames[0]].data;

    // Euler step: x = x + v * dt
    for (let i = 0; i < x.length; i++) {
      x[i] += velocity[i] * dt;
    }

    // Yield between steps
    if (step < luxNumSteps - 1) await new Promise((r) => setTimeout(r, 0));
  }

  // x now contains mel features [1, numFrames, featDim]
  await new Promise((r) => setTimeout(r, 0));

  // Step 3: Vocoder — convert mel to waveform
  if (luxVocoderSession) {
    // Try both [1, featDim, numFrames] and [1, numFrames, featDim] shapes
    // Vocos typically expects [B, feat_dim, T] (transposed)
    const melTransposed = new Float32Array(numFrames * featDim);
    for (let f = 0; f < featDim; f++) {
      for (let t = 0; t < numFrames; t++) {
        melTransposed[f * numFrames + t] = x[t * featDim + f];
      }
    }

    const vocInputs = {};
    for (const name of luxVocoderSession.inputNames) {
      if (name === 'mel' || name === 'features' || name === 'input') {
        // Try transposed shape first (most vocoders expect [B, feat_dim, T])
        vocInputs[name] = new ort.Tensor('float32', melTransposed, [
          1,
          featDim,
          numFrames,
        ]);
      }
    }

    try {
      const vocResult = await luxVocoderSession.run(vocInputs);
      const waveform = new Float32Array(
        vocResult[luxVocoderSession.outputNames[0]].data
      );
      return waveform;
    } catch (e) {
      console.warn(
        '[LuxTTS] Vocoder failed with transposed shape, trying original:',
        e.message
      );
      // Retry with original shape [1, numFrames, featDim]
      const vocInputs2 = {};
      for (const name of luxVocoderSession.inputNames) {
        vocInputs2[name] = new ort.Tensor('float32', x, [
          1,
          numFrames,
          featDim,
        ]);
      }
      try {
        const vocResult2 = await luxVocoderSession.run(vocInputs2);
        return new Float32Array(
          vocResult2[luxVocoderSession.outputNames[0]].data
        );
      } catch (e2) {
        console.error('[LuxTTS] Vocoder failed:', e2);
        return null;
      }
    }
  } else {
    // No vocoder available — return raw mel features (will sound like noise)
    console.warn('[LuxTTS] No vocoder available, returning silence');
    // Generate silence for the expected duration
    const hopLength = 256;
    const numSamples = numFrames * hopLength * 2; // *2 for 48kHz from 24kHz features
    return new Float32Array(numSamples);
  }
}

async function luxStartGeneration(text) {
  isGenerating = true;
  postMessage({type: 'status', status: 'Generating...', state: 'running'});
  postMessage({type: 'generation_started', data: {time: performance.now()}});

  try {
    const chunks = luxSplitSentences(text);
    if (!chunks.length) throw new Error('No text to generate');

    const t0 = performance.now();
    let totalAudioSamples = 0;
    let isFirstChunk = true;

    for (let ci = 0; ci < chunks.length; ci++) {
      if (!isGenerating) break;

      const waveform = await luxGenerateChunk(chunks[ci]);
      if (!waveform || !isGenerating) break;

      totalAudioSamples += waveform.length;
      const isLast = ci === chunks.length - 1;

      postMessage(
        {
          type: 'audio_chunk',
          data: waveform,
          metrics: {
            chunkDuration: waveform.length / LUXTTS_SAMPLE_RATE,
            isFirst: isFirstChunk,
            isLast,
            chunkStart: true,
          },
        },
        [waveform.buffer]
      );

      isFirstChunk = false;

      // Add silence gap between sentences
      if (!isLast && isGenerating) {
        const gap = new Float32Array(
          Math.floor(LUXTTS_CHUNK_GAP_SEC * LUXTTS_SAMPLE_RATE)
        );
        postMessage(
          {
            type: 'audio_chunk',
            data: gap,
            metrics: {
              chunkDuration: gap.length / LUXTTS_SAMPLE_RATE,
              isFirst: false,
              isLast: false,
              isSilence: true,
            },
          },
          [gap.buffer]
        );
      }
    }

    const totalSec = (performance.now() - t0) / 1000;
    const audioSec = totalAudioSamples / LUXTTS_SAMPLE_RATE;
    const rtfx = audioSec / totalSec;
    postMessage({
      type: 'status',
      status: `Finished (RTFx: ${rtfx.toFixed(2)}x)`,
      state: 'idle',
      metrics: {rtfx, totalTime: totalSec, audioDuration: audioSec},
    });
  } catch (err) {
    postMessage({type: 'error', error: err.toString()});
  } finally {
    if (isGenerating) postMessage({type: 'stream_ended'});
    isGenerating = false;
  }
}

// ============================================================
//  Pocket TTS Engine (copied from pocket-tts-worker.js)
// ============================================================

const POCKET_HF_MODEL =
  'https://huggingface.co/KevinAHM/pocket-tts-onnx/resolve/main';
const POCKET_HF_SPACE =
  'https://huggingface.co/spaces/KevinAHM/pocket-tts-web/resolve/main';

const POCKET_MODELS = {
  mimi_encoder: `${POCKET_HF_MODEL}/mimi_encoder.onnx?download=true`,
  text_conditioner: `${POCKET_HF_MODEL}/text_conditioner.onnx?download=true`,
  flow_lm_main: `${POCKET_HF_MODEL}/flow_lm_main_int8.onnx?download=true`,
  flow_lm_flow: `${POCKET_HF_MODEL}/flow_lm_flow_int8.onnx?download=true`,
  mimi_decoder: `${POCKET_HF_MODEL}/mimi_decoder_int8.onnx?download=true`,
  tokenizer: `${POCKET_HF_MODEL}/tokenizer.model`,
  voices: `${POCKET_HF_MODEL}/voices.bin`,
};

const POCKET_SAMPLE_RATE = 24000;
const POCKET_SAMPLES_PER_FRAME = 1920;
const POCKET_MAX_FRAMES = 500;
const POCKET_CHUNK_TARGET_TOKENS = 50;
const POCKET_CHUNK_GAP_SEC = 0.25;
const POCKET_RESET_FLOW_STATE_EACH_CHUNK = true;
const POCKET_RESET_MIMI_STATE_EACH_CHUNK = true;
const POCKET_MAX_LSD = 10;
const POCKET_DEFAULT_LSD = 5;

let pocketMimiEncoderSession = null;
let pocketTextConditionerSession = null;
let pocketFlowLmMainSession = null;
let pocketFlowLmFlowSession = null;
let pocketMimiDecoderSession = null;
let pocketTokenizerProcessor = null;
let pocketPredefinedVoices = {};
let pocketStTensors = [];
let pocketCurrentLSD = POCKET_DEFAULT_LSD;
let pocketCurrentVoiceEmbedding = null;
let pocketCurrentVoiceName = null;
let pocketVoiceConditioningCache = new Map();

// Pocket TTS state shapes
const POCKET_FLOW_LM_STATE_SHAPES = {
  state_0: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_1: {shape: [0], dtype: 'float32'},
  state_2: {shape: [1], dtype: 'int64'},
  state_3: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_4: {shape: [0], dtype: 'float32'},
  state_5: {shape: [1], dtype: 'int64'},
  state_6: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_7: {shape: [0], dtype: 'float32'},
  state_8: {shape: [1], dtype: 'int64'},
  state_9: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_10: {shape: [0], dtype: 'float32'},
  state_11: {shape: [1], dtype: 'int64'},
  state_12: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_13: {shape: [0], dtype: 'float32'},
  state_14: {shape: [1], dtype: 'int64'},
  state_15: {shape: [2, 1, 1000, 16, 64], dtype: 'float32'},
  state_16: {shape: [0], dtype: 'float32'},
  state_17: {shape: [1], dtype: 'int64'},
};
const POCKET_MIMI_DEC_STATE_SHAPES = {
  state_0: {shape: [1], dtype: 'bool'},
  state_1: {shape: [1, 512, 6], dtype: 'float32'},
  state_2: {shape: [1], dtype: 'bool'},
  state_3: {shape: [1, 64, 2], dtype: 'float32'},
  state_4: {shape: [1, 256, 6], dtype: 'float32'},
  state_5: {shape: [1], dtype: 'bool'},
  state_6: {shape: [1, 256, 2], dtype: 'float32'},
  state_7: {shape: [1], dtype: 'bool'},
  state_8: {shape: [1, 128, 0], dtype: 'float32'},
  state_9: {shape: [1, 128, 5], dtype: 'float32'},
  state_10: {shape: [1], dtype: 'bool'},
  state_11: {shape: [1, 128, 2], dtype: 'float32'},
  state_12: {shape: [1], dtype: 'bool'},
  state_13: {shape: [1, 64, 0], dtype: 'float32'},
  state_14: {shape: [1, 64, 4], dtype: 'float32'},
  state_15: {shape: [1], dtype: 'bool'},
  state_16: {shape: [1, 64, 2], dtype: 'float32'},
  state_17: {shape: [1], dtype: 'bool'},
  state_18: {shape: [1, 32, 0], dtype: 'float32'},
  state_19: {shape: [2, 1, 8, 1000, 64], dtype: 'float32'},
  state_20: {shape: [1], dtype: 'int64'},
  state_21: {shape: [1], dtype: 'int64'},
  state_22: {shape: [2, 1, 8, 1000, 64], dtype: 'float32'},
  state_23: {shape: [1], dtype: 'int64'},
  state_24: {shape: [1], dtype: 'int64'},
  state_25: {shape: [1], dtype: 'bool'},
  state_26: {shape: [1, 512, 16], dtype: 'float32'},
  state_27: {shape: [1], dtype: 'bool'},
  state_28: {shape: [1, 1, 6], dtype: 'float32'},
  state_29: {shape: [1], dtype: 'bool'},
  state_30: {shape: [1, 64, 2], dtype: 'float32'},
  state_31: {shape: [1], dtype: 'bool'},
  state_32: {shape: [1, 32, 0], dtype: 'float32'},
  state_33: {shape: [1], dtype: 'bool'},
  state_34: {shape: [1, 512, 2], dtype: 'float32'},
  state_35: {shape: [1], dtype: 'bool'},
  state_36: {shape: [1, 64, 4], dtype: 'float32'},
  state_37: {shape: [1], dtype: 'bool'},
  state_38: {shape: [1, 128, 2], dtype: 'float32'},
  state_39: {shape: [1], dtype: 'bool'},
  state_40: {shape: [1, 64, 0], dtype: 'float32'},
  state_41: {shape: [1], dtype: 'bool'},
  state_42: {shape: [1, 128, 5], dtype: 'float32'},
  state_43: {shape: [1], dtype: 'bool'},
  state_44: {shape: [1, 256, 2], dtype: 'float32'},
  state_45: {shape: [1], dtype: 'bool'},
  state_46: {shape: [1, 128, 0], dtype: 'float32'},
  state_47: {shape: [1], dtype: 'bool'},
  state_48: {shape: [1, 256, 6], dtype: 'float32'},
  state_49: {shape: [2, 1, 8, 1000, 64], dtype: 'float32'},
  state_50: {shape: [1], dtype: 'int64'},
  state_51: {shape: [1], dtype: 'int64'},
  state_52: {shape: [2, 1, 8, 1000, 64], dtype: 'float32'},
  state_53: {shape: [1], dtype: 'int64'},
  state_54: {shape: [1], dtype: 'int64'},
  state_55: {shape: [1, 512, 16], dtype: 'float32'},
};

function pocketInitState(session, shapes) {
  const state = {};
  for (const name of session.inputNames) {
    if (!name.startsWith('state_')) continue;
    const info = shapes[name];
    if (!info) continue;
    const {shape, dtype} = info;
    const sz = shape.reduce((a, b) => a * b, 1);
    let data;
    if (dtype === 'int64') data = new BigInt64Array(sz);
    else if (dtype === 'bool') data = new Uint8Array(sz);
    else data = new Float32Array(sz);
    state[name] = new ort.Tensor(dtype, data, shape);
  }
  return state;
}

function pocketParseVoicesBin(buffer) {
  const voices = {},
    view = new DataView(buffer);
  let off = 0;
  const n = view.getUint32(off, true);
  off += 4;
  for (let i = 0; i < n; i++) {
    const nb = new Uint8Array(buffer, off, 32);
    const ne = nb.indexOf(0);
    const name = new TextDecoder()
      .decode(nb.subarray(0, ne > 0 ? ne : 32))
      .trim();
    off += 32;
    const frames = view.getUint32(off, true);
    off += 4;
    const dim = view.getUint32(off, true);
    off += 4;
    const sz = frames * dim;
    voices[name] = {
      data: new Float32Array(new Float32Array(buffer, off, sz)),
      shape: [1, frames, dim],
    };
    off += sz * 4;
  }
  return voices;
}

async function pocketEncodeVoiceAudio(audioData) {
  const input = new ort.Tensor('float32', audioData, [1, 1, audioData.length]);
  const out = await pocketMimiEncoderSession.run({audio: input});
  const emb = out[pocketMimiEncoderSession.outputNames[0]];
  return {data: new Float32Array(emb.data), shape: emb.dims};
}

async function pocketBuildVoiceConditionedState(voiceEmb) {
  const flowState = pocketInitState(
    pocketFlowLmMainSession,
    POCKET_FLOW_LM_STATE_SHAPES
  );
  const emptySeq = new ort.Tensor('float32', new Float32Array(0), [1, 0, 32]);
  const voiceTensor = new ort.Tensor('float32', voiceEmb.data, voiceEmb.shape);
  const result = await pocketFlowLmMainSession.run({
    sequence: emptySeq,
    text_embeddings: voiceTensor,
    ...flowState,
  });
  for (let i = 2; i < pocketFlowLmMainSession.outputNames.length; i++) {
    const on = pocketFlowLmMainSession.outputNames[i];
    if (on.startsWith('out_state_'))
      flowState[`state_${parseInt(on.replace('out_state_', ''))}`] = result[on];
  }
  return flowState;
}

async function pocketEnsureVoiceConditioningCached(name, emb, opts = {}) {
  const {force = false, statusText = 'Conditioning voice...'} = opts;
  if (!force && pocketVoiceConditioningCache.has(name))
    return pocketVoiceConditioningCache.get(name);
  postMessage({type: 'status', status: statusText, state: 'loading'});
  const state = await pocketBuildVoiceConditionedState(emb);
  pocketVoiceConditioningCache.set(name, state);
  return state;
}

function pocketSplitIntoBestSentences(text) {
  const prepared = prepareText(text);
  if (!prepared) return [];
  const sentences = (prepared.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return [];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    const ids = pocketTokenizerProcessor.encodeIds(s);
    if (ids.length > POCKET_CHUNK_TARGET_TOKENS) {
      if (cur) {
        chunks.push(cur.trim());
        cur = '';
      }
      for (let i = 0; i < ids.length; i += POCKET_CHUNK_TARGET_TOKENS) {
        const c = pocketTokenizerProcessor
          .decodeIds(ids.slice(i, i + POCKET_CHUNK_TARGET_TOKENS))
          .trim();
        if (c) chunks.push(c);
      }
      continue;
    }
    if (!cur) {
      cur = s;
      continue;
    }
    const combined = `${cur} ${s}`;
    if (
      pocketTokenizerProcessor.encodeIds(combined).length >
      POCKET_CHUNK_TARGET_TOKENS
    ) {
      chunks.push(cur.trim());
      cur = s;
    } else cur = combined;
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

async function loadPocketTTSModels() {
  const version = '1.20.0';
  const cdnBase = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;

  postMessage({
    type: 'status',
    status: 'Loading ONNX Runtime...',
    state: 'loading',
  });
  try {
    const ortModule = await import(
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/ort.min.mjs`
    );
    ort = ortModule.default || ortModule;
  } catch (e) {
    throw new Error('Failed to load ONNX Runtime: ' + e.message);
  }

  ort.env.wasm.wasmPaths = cdnBase;
  ort.env.wasm.simd = true;
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency || 2, 2)
    : 1;
  const sessionOpts = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };

  postMessage({
    type: 'status',
    status: 'Downloading Pocket TTS models (~200 MB first time)...',
    state: 'loading',
  });

  const [enc, txtCond, fMain, fFlow, dec] = await Promise.all([
    createSessionWithExternalData(POCKET_MODELS.mimi_encoder, sessionOpts),
    createSessionWithExternalData(POCKET_MODELS.text_conditioner, sessionOpts),
    createSessionWithExternalData(POCKET_MODELS.flow_lm_main, sessionOpts),
    createSessionWithExternalData(POCKET_MODELS.flow_lm_flow, sessionOpts),
    createSessionWithExternalData(POCKET_MODELS.mimi_decoder, sessionOpts),
  ]);
  pocketMimiEncoderSession = enc;
  pocketTextConditionerSession = txtCond;
  pocketFlowLmMainSession = fMain;
  pocketFlowLmFlowSession = fFlow;
  pocketMimiDecoderSession = dec;

  // Load tokenizer via sentencepiece
  postMessage({
    type: 'status',
    status: 'Loading tokenizer...',
    state: 'loading',
  });
  const spResp = await fetch(`${POCKET_HF_SPACE}/sentencepiece.js`);
  const spCode = await spResp.text();
  const spBlob = new Blob([spCode], {type: 'application/javascript'});
  const spUrl = URL.createObjectURL(spBlob);
  const spModule = await import(spUrl);
  URL.revokeObjectURL(spUrl);
  const SentencePieceProcessor = spModule.SentencePieceProcessor;
  if (!SentencePieceProcessor)
    throw new Error('SentencePieceProcessor not found');
  pocketTokenizerProcessor = new SentencePieceProcessor();
  const tokResp = await fetch(POCKET_MODELS.tokenizer);
  const tokBuf = await tokResp.arrayBuffer();
  const tokB64 = btoa(String.fromCharCode(...new Uint8Array(tokBuf)));
  await pocketTokenizerProcessor.loadFromB64StringModel(tokB64);

  // Load predefined voices
  postMessage({type: 'status', status: 'Loading voices...', state: 'loading'});
  try {
    const vResp = await fetch(POCKET_MODELS.voices);
    if (vResp.ok) {
      pocketPredefinedVoices = pocketParseVoicesBin(await vResp.arrayBuffer());
      if (pocketPredefinedVoices['marius']) {
        pocketCurrentVoiceEmbedding = pocketPredefinedVoices['marius'];
        pocketCurrentVoiceName = 'marius';
      } else {
        const f = Object.keys(pocketPredefinedVoices)[0];
        if (f) {
          pocketCurrentVoiceEmbedding = pocketPredefinedVoices[f];
          pocketCurrentVoiceName = f;
        }
      }
    }
  } catch (e) {
    console.warn('Could not load voices:', e);
  }

  if (pocketCurrentVoiceEmbedding && pocketCurrentVoiceName) {
    await pocketEnsureVoiceConditioningCached(
      pocketCurrentVoiceName,
      pocketCurrentVoiceEmbedding,
      {
        force: true,
        statusText: `Conditioning voice (${pocketCurrentVoiceName})...`,
      }
    );
  }

  postMessage({
    type: 'voices_loaded',
    voices: Object.keys(pocketPredefinedVoices),
    defaultVoice: pocketCurrentVoiceName,
  });

  // Pre-allocate s/t tensors
  pocketStTensors = {};
  for (let lsd = 1; lsd <= POCKET_MAX_LSD; lsd++) {
    pocketStTensors[lsd] = [];
    const dt = 1.0 / lsd;
    for (let j = 0; j < lsd; j++) {
      pocketStTensors[lsd].push({
        s: new ort.Tensor('float32', new Float32Array([j / lsd]), [1, 1]),
        t: new ort.Tensor('float32', new Float32Array([j / lsd + dt]), [1, 1]),
      });
    }
  }

  isReady = true;
  postMessage({type: 'status', status: 'Ready (Pocket TTS)', state: 'idle'});
  postMessage({type: 'loaded'});
}

async function pocketStartGeneration(text, voiceName) {
  isGenerating = true;
  pocketCurrentLSD = POCKET_DEFAULT_LSD;
  postMessage({type: 'status', status: 'Generating...', state: 'running'});
  postMessage({type: 'generation_started', data: {time: performance.now()}});
  try {
    const chunks = pocketSplitIntoBestSentences(text);
    if (!chunks.length) throw new Error('No text to generate');

    let resolved = pocketCurrentVoiceName;
    if (
      voiceName &&
      voiceName !== pocketCurrentVoiceName &&
      pocketPredefinedVoices[voiceName]
    ) {
      pocketCurrentVoiceEmbedding = pocketPredefinedVoices[voiceName];
      pocketCurrentVoiceName = voiceName;
      resolved = voiceName;
      await pocketEnsureVoiceConditioningCached(
        resolved,
        pocketCurrentVoiceEmbedding,
        {statusText: `Conditioning voice (${resolved})...`}
      );
    }
    if (!pocketCurrentVoiceEmbedding || !resolved)
      throw new Error('No voice available');
    if (!pocketVoiceConditioningCache.has(resolved))
      throw new Error('Voice cache missing');

    await pocketRunPipeline(resolved, chunks);
  } catch (err) {
    postMessage({type: 'error', error: err.toString()});
  } finally {
    if (isGenerating) {
      postMessage({type: 'stream_ended'});
      postMessage({type: 'status', status: 'Finished', state: 'idle'});
    }
    isGenerating = false;
  }
}

async function pocketRunPipeline(voiceName, chunks) {
  let mimiState = pocketInitState(
    pocketMimiDecoderSession,
    POCKET_MIMI_DEC_STATE_SHAPES
  );
  const emptySeq = new ort.Tensor('float32', new Float32Array(0), [1, 0, 32]);
  const emptyTE = new ort.Tensor('float32', new Float32Array(0), [1, 0, 1024]);
  const baseFlow = pocketVoiceConditioningCache.get(voiceName);
  let flowState = {...baseFlow};
  const FIRST_CHUNK = 3,
    NORMAL_CHUNK = 12,
    FRAMES_AFTER_EOS = 3;
  let isFirstAudio = true,
    totalDecoded = 0;
  let totalFlowTime = 0,
    totalDecTime = 0;
  const t0 = performance.now();

  for (let ci = 0; ci < chunks.length; ci++) {
    if (!isGenerating) break;
    if (POCKET_RESET_FLOW_STATE_EACH_CHUNK && ci > 0) flowState = {...baseFlow};
    if (POCKET_RESET_MIMI_STATE_EACH_CHUNK && ci > 0)
      mimiState = pocketInitState(
        pocketMimiDecoderSession,
        POCKET_MIMI_DEC_STATE_SHAPES
      );

    let isFirstOfChunk = true;
    const tokenIds = pocketTokenizerProcessor.encodeIds(chunks[ci]);
    const txtIn = new ort.Tensor(
      'int64',
      BigInt64Array.from(tokenIds.map((x) => BigInt(x))),
      [1, tokenIds.length]
    );
    const txtCondRes = await pocketTextConditionerSession.run({
      token_ids: txtIn,
    });
    let txtEmb = txtCondRes[pocketTextConditionerSession.outputNames[0]];
    if (txtEmb.dims.length === 2)
      txtEmb = new ort.Tensor('float32', txtEmb.data, [
        1,
        txtEmb.dims[0],
        txtEmb.dims[1],
      ]);

    const condRes = await pocketFlowLmMainSession.run({
      sequence: emptySeq,
      text_embeddings: txtEmb,
      ...flowState,
    });
    for (let i = 2; i < pocketFlowLmMainSession.outputNames.length; i++) {
      const on = pocketFlowLmMainSession.outputNames[i];
      if (on.startsWith('out_state_'))
        flowState[`state_${parseInt(on.replace('out_state_', ''))}`] =
          condRes[on];
    }

    const latents = [];
    let curLatent = new ort.Tensor(
      'float32',
      new Float32Array(32).fill(NaN),
      [1, 1, 32]
    );
    let decoded = 0,
      eosStep = null,
      chunkGenMs = 0,
      ended = false;

    for (let step = 0; step < POCKET_MAX_FRAMES; step++) {
      if (!isGenerating) break;
      if (step > 0) await new Promise((r) => setTimeout(r, 0));

      const st = performance.now();
      const ar = await pocketFlowLmMainSession.run({
        sequence: curLatent,
        text_embeddings: emptyTE,
        ...flowState,
      });
      const elapsed = performance.now() - st;
      chunkGenMs += elapsed;
      totalFlowTime += elapsed;

      const cond = ar['conditioning'];
      const eosLogit = ar['eos_logit'].data[0];
      if (eosLogit > -4.0 && eosStep === null) eosStep = step;
      const shouldStop = eosStep !== null && step >= eosStep + FRAMES_AFTER_EOS;

      const TEMP = 0.7,
        STD = Math.sqrt(TEMP);
      let x = new Float32Array(32);
      for (let i = 0; i < 32; i++) {
        let u = 0,
          v = 0;
        while (!u) u = Math.random();
        while (!v) v = Math.random();
        x[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * STD;
      }
      const lsd = pocketCurrentLSD,
        dt = 1.0 / lsd;
      for (let j = 0; j < lsd; j++) {
        const fr = await pocketFlowLmFlowSession.run({
          c: cond,
          s: pocketStTensors[lsd][j].s,
          t: pocketStTensors[lsd][j].t,
          x: new ort.Tensor('float32', x, [1, 32]),
        });
        const v = fr['flow_dir'].data;
        for (let k = 0; k < 32; k++) x[k] += v[k] * dt;
        if (j < lsd - 1) await new Promise((r) => setTimeout(r, 0));
      }

      latents.push(new Float32Array(x));
      curLatent = new ort.Tensor('float32', x, [1, 1, 32]);
      for (let i = 2; i < pocketFlowLmMainSession.outputNames.length; i++) {
        const on = pocketFlowLmMainSession.outputNames[i];
        if (on.startsWith('out_state_'))
          flowState[`state_${parseInt(on.replace('out_state_', ''))}`] = ar[on];
      }

      const pending = latents.length - decoded;
      let decSz = 0;
      if (shouldStop) decSz = pending;
      else if (isFirstAudio && pending >= FIRST_CHUNK) decSz = FIRST_CHUNK;
      else if (pending >= NORMAL_CHUNK) decSz = NORMAL_CHUNK;

      if (decSz > 0) {
        const dl = new Float32Array(decSz * 32);
        for (let i = 0; i < decSz; i++) dl.set(latents[decoded + i], i * 32);
        const lt = new ort.Tensor('float32', dl, [1, decSz, 32]);
        const ds = performance.now();
        const dr = await pocketMimiDecoderSession.run({
          latent: lt,
          ...mimiState,
        });
        const de = performance.now() - ds;
        totalDecTime += de;
        chunkGenMs += de;
        const audio = new Float32Array(
          dr[pocketMimiDecoderSession.outputNames[0]].data
        );
        for (let i = 1; i < pocketMimiDecoderSession.outputNames.length; i++) {
          mimiState[`state_${i - 1}`] =
            dr[pocketMimiDecoderSession.outputNames[i]];
        }
        decoded += decSz;
        totalDecoded += decSz;
        const isLast = shouldStop && ci === chunks.length - 1;
        postMessage(
          {
            type: 'audio_chunk',
            data: audio,
            metrics: {
              chunkDuration: audio.length / POCKET_SAMPLE_RATE,
              genTimeSec: chunkGenMs / 1000,
              isFirst: isFirstAudio,
              isLast,
              chunkStart: isFirstOfChunk,
            },
          },
          [audio.buffer]
        );
        isFirstAudio = false;
        isFirstOfChunk = false;
        chunkGenMs = 0;
      }
      if (shouldStop) {
        ended = true;
        break;
      }
    }

    if (ended && isGenerating && ci < chunks.length - 1) {
      const gap = new Float32Array(
        Math.max(1, Math.floor(POCKET_CHUNK_GAP_SEC * POCKET_SAMPLE_RATE))
      );
      postMessage(
        {
          type: 'audio_chunk',
          data: gap,
          metrics: {
            chunkDuration: gap.length / POCKET_SAMPLE_RATE,
            isFirst: false,
            isLast: false,
            isSilence: true,
          },
        },
        [gap.buffer]
      );
    }
  }

  const totalSec = (performance.now() - t0) / 1000;
  const audioSec =
    (totalDecoded * POCKET_SAMPLES_PER_FRAME) / POCKET_SAMPLE_RATE;
  const genSec = (totalFlowTime + totalDecTime) / 1000;
  const rtfx = audioSec / genSec;
  postMessage({
    type: 'status',
    status: `Finished (RTFx: ${rtfx.toFixed(2)}x)`,
    state: 'idle',
    metrics: {
      rtfx,
      genTime: genSec,
      totalTime: totalSec,
      audioDuration: audioSec,
    },
  });
}

// ============================================================
//  Worker message handler — routes to active engine
// ============================================================

self.onmessage = async (e) => {
  const {type, data} = e.data;

  if (type === 'load') {
    const engine = data?.engine || 'pocket'; // Default to pocket for backward compat
    activeEngine = engine;
    try {
      if (engine === 'luxtts') {
        await loadLuxTTSModels();
      } else {
        await loadPocketTTSModels();
      }
    } catch (err) {
      postMessage({type: 'error', error: err.toString()});
    }
  } else if (type === 'generate') {
    if (!isReady) {
      postMessage({type: 'error', error: 'Models not loaded yet.'});
      return;
    }
    if (isGenerating) return;
    try {
      if (activeEngine === 'luxtts') {
        await luxStartGeneration(data.text);
      } else {
        await pocketStartGeneration(data.text, data.voice);
      }
    } catch (err) {
      console.error('Generation Error:', err);
      postMessage({type: 'error', error: err.toString()});
    }
  } else if (type === 'encode_voice') {
    if (!isReady) {
      postMessage({type: 'error', error: 'Models not loaded yet.'});
      return;
    }
    if (isGenerating) {
      postMessage({type: 'error', error: 'Busy generating.'});
      return;
    }
    if (activeEngine === 'pocket') {
      try {
        const emb = await pocketEncodeVoiceAudio(data.audio);
        pocketCurrentVoiceEmbedding = emb;
        pocketCurrentVoiceName = 'custom';
        await pocketEnsureVoiceConditioningCached('custom', emb, {
          force: true,
          statusText: 'Conditioning custom voice...',
        });
        postMessage({type: 'voice_encoded', voiceName: 'custom'});
        postMessage({type: 'status', status: 'Ready', state: 'idle'});
      } catch (err) {
        postMessage({type: 'error', error: 'Voice encode failed: ' + err});
      }
    } else {
      // LuxTTS voice cloning requires reference audio processing
      // TODO: implement LuxTTS voice cloning via prompt features
      postMessage({type: 'voice_encoded', voiceName: 'default'});
      postMessage({
        type: 'status',
        status: 'Ready (LuxTTS default voice)',
        state: 'idle',
      });
    }
  } else if (type === 'set_voice') {
    if (!isReady || isGenerating) return;
    if (activeEngine === 'pocket') {
      try {
        if (data.voiceName === 'custom') {
          if (
            !pocketCurrentVoiceEmbedding ||
            pocketCurrentVoiceName !== 'custom'
          ) {
            postMessage({type: 'error', error: 'No custom voice.'});
            return;
          }
        } else if (pocketPredefinedVoices[data.voiceName]) {
          pocketCurrentVoiceEmbedding = pocketPredefinedVoices[data.voiceName];
          pocketCurrentVoiceName = data.voiceName;
        } else {
          postMessage({
            type: 'error',
            error: 'Unknown voice: ' + data.voiceName,
          });
          return;
        }
        await pocketEnsureVoiceConditioningCached(
          pocketCurrentVoiceName,
          pocketCurrentVoiceEmbedding,
          {statusText: `Conditioning voice (${pocketCurrentVoiceName})...`}
        );
        postMessage({type: 'voice_set', voiceName: pocketCurrentVoiceName});
        postMessage({type: 'status', status: 'Ready', state: 'idle'});
      } catch (err) {
        postMessage({type: 'error', error: 'Voice switch failed: ' + err});
      }
    } else {
      // LuxTTS: voice selection is a no-op for now (default voice only)
      postMessage({type: 'voice_set', voiceName: 'default'});
    }
  } else if (type === 'set_lsd') {
    if (activeEngine === 'pocket') {
      const n = Math.max(1, Math.min(POCKET_MAX_LSD, data.lsd));
      if (n !== pocketCurrentLSD) pocketCurrentLSD = n;
    } else {
      // Map LSD to LuxTTS num_steps (3-4 range)
      const n = Math.max(2, Math.min(8, data.lsd));
      luxNumSteps = n;
    }
  } else if (type === 'stop') {
    isGenerating = false;
    postMessage({type: 'status', status: 'Stopped', state: 'idle'});
  }
};
