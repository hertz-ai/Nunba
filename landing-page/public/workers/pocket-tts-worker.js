/**
 * Pocket TTS ONNX Web Worker — adapted from KevinAHM/pocket-tts-web
 * Runs 5-model ONNX pipeline in a Web Worker for browser-side TTS.
 * Models loaded from HuggingFace CDN; cached by browser after first fetch.
 */
/* eslint-disable */
console.log('Pocket TTS Worker Starting...');
self.postMessage({
  type: 'status',
  status: 'Worker Thread Started',
  state: 'idle',
});

let ort = null;

// ----- CDN paths -----
const HF_MODEL = 'https://huggingface.co/KevinAHM/pocket-tts-onnx/resolve/main';
const HF_SPACE =
  'https://huggingface.co/spaces/KevinAHM/pocket-tts-web/resolve/main';

const MODELS = {
  mimi_encoder: `${HF_MODEL}/mimi_encoder.onnx?download=true`,
  text_conditioner: `${HF_MODEL}/text_conditioner.onnx?download=true`,
  flow_lm_main: `${HF_MODEL}/flow_lm_main_int8.onnx?download=true`,
  flow_lm_flow: `${HF_MODEL}/flow_lm_flow_int8.onnx?download=true`,
  mimi_decoder: `${HF_MODEL}/mimi_decoder_int8.onnx?download=true`,
  tokenizer: `${HF_MODEL}/tokenizer.model`,
  voices: `${HF_MODEL}/voices.bin`,
};

const SAMPLE_RATE = 24000;
const SAMPLES_PER_FRAME = 1920;
const MAX_FRAMES = 500;
const CHUNK_TARGET_TOKENS = 50;
const CHUNK_GAP_SEC = 0.25;
const RESET_FLOW_STATE_EACH_CHUNK = true;
const RESET_MIMI_STATE_EACH_CHUNK = true;

// State
let mimiEncoderSession = null;
let textConditionerSession = null;
let flowLmMainSession = null;
let flowLmFlowSession = null;
let mimiDecoderSession = null;
let tokenizerProcessor = null;
let predefinedVoices = {};
let stTensors = [];
let isGenerating = false;
let isReady = false;

const MAX_LSD = 10;
const DEFAULT_LSD = 5; // Balance quality vs speed; lower = faster, less CPU
let currentLSD = DEFAULT_LSD;
let currentVoiceEmbedding = null;
let currentVoiceName = null;
let voiceConditioningCache = new Map();

// ---- Text preprocessing ----
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

function splitIntoBestSentences(text) {
  const prepared = prepareText(text);
  if (!prepared) return [];
  const sentences = (prepared.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return [];
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    const ids = tokenizerProcessor.encodeIds(s);
    if (ids.length > CHUNK_TARGET_TOKENS) {
      if (cur) {
        chunks.push(cur.trim());
        cur = '';
      }
      for (let i = 0; i < ids.length; i += CHUNK_TARGET_TOKENS) {
        const c = tokenizerProcessor
          .decodeIds(ids.slice(i, i + CHUNK_TARGET_TOKENS))
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
    if (tokenizerProcessor.encodeIds(combined).length > CHUNK_TARGET_TOKENS) {
      chunks.push(cur.trim());
      cur = s;
    } else cur = combined;
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

function stripQuery(u) {
  const i = u.indexOf('?');
  return i >= 0 ? u.slice(0, i) : u;
}
function baseName(u) {
  return stripQuery(u).split('/').pop();
}

async function fetchOk(url) {
  const r = await fetch(url, {mode: 'cors', credentials: 'omit'});
  if (!r.ok) throw new Error(`Fetch failed ${r.status} for ${url}`);
  return r;
}

/**
 * Minimal external-data-safe model loader for ORT-Web
 * - Loads ONNX bytes
 * - Tries common external weight file names
 * - Creates session from bytes (not URL)
 */
async function createSessionWithExternalData(modelUrl, sessionOpts) {
  const modelResp = await fetchOk(modelUrl);
  const modelBuf = await modelResp.arrayBuffer();

  const raw = stripQuery(modelUrl);

  // common external data filename patterns
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
        console.log('[PocketTTS] external data found:', extUrl);
        break;
      }
    } catch (_) {
      // ignore
    }
  }

  const opts = {...sessionOpts};
  if (externalData) opts.externalData = externalData;

  return ort.InferenceSession.create(modelBuf, opts);
}

// ---- Worker message handler ----
self.onmessage = async (e) => {
  const {type, data} = e.data;
  if (type === 'load') {
    try {
      await loadModels();
      postMessage({type: 'loaded'});
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
      await startGeneration(data.text, data.voice);
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
    try {
      const emb = await encodeVoiceAudio(data.audio);
      currentVoiceEmbedding = emb;
      currentVoiceName = 'custom';
      await ensureVoiceConditioningCached('custom', emb, {
        force: true,
        statusText: 'Conditioning custom voice...',
      });
      postMessage({type: 'voice_encoded', voiceName: 'custom'});
      postMessage({type: 'status', status: 'Ready', state: 'idle'});
    } catch (err) {
      postMessage({type: 'error', error: 'Voice encode failed: ' + err});
    }
  } else if (type === 'set_voice') {
    if (!isReady || isGenerating) return;
    try {
      if (data.voiceName === 'custom') {
        if (!currentVoiceEmbedding || currentVoiceName !== 'custom') {
          postMessage({type: 'error', error: 'No custom voice.'});
          return;
        }
      } else if (predefinedVoices[data.voiceName]) {
        currentVoiceEmbedding = predefinedVoices[data.voiceName];
        currentVoiceName = data.voiceName;
      } else {
        postMessage({type: 'error', error: 'Unknown voice: ' + data.voiceName});
        return;
      }
      await ensureVoiceConditioningCached(
        currentVoiceName,
        currentVoiceEmbedding,
        {statusText: `Conditioning voice (${currentVoiceName})...`}
      );
      postMessage({type: 'voice_set', voiceName: currentVoiceName});
      postMessage({type: 'status', status: 'Ready', state: 'idle'});
    } catch (err) {
      postMessage({type: 'error', error: 'Voice switch failed: ' + err});
    }
  } else if (type === 'set_lsd') {
    const n = Math.max(1, Math.min(MAX_LSD, data.lsd));
    if (n !== currentLSD) {
      currentLSD = n;
    }
  } else if (type === 'stop') {
    isGenerating = false;
    postMessage({type: 'status', status: 'Stopped', state: 'idle'});
  }
};

// ---- Model loading ----
async function loadModels() {
  if (mimiEncoderSession) return;
  postMessage({
    type: 'status',
    status: 'Loading ONNX Runtime...',
    state: 'loading',
  });

  const version = '1.20.0';
  const cdnBase = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;
  try {
    const ortModule = await import(
      `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/ort.min.mjs`
    );
    ort = ortModule.default || ortModule;
  } catch (e) {
    throw new Error('Failed to load ONNX Runtime: ' + e.message);
  }
  if (!ort) throw new Error('ONNX Runtime failed to load');

  ort.env.wasm.wasmPaths = cdnBase;
  ort.env.wasm.simd = true;
  // Cap at 2 WASM threads — leave CPU cores free for main thread + AudioWorklet
  ort.env.wasm.numThreads = self.crossOriginIsolated
    ? Math.min(navigator.hardwareConcurrency || 2, 2)
    : 1;

  const sessionOpts = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };

  postMessage({
    type: 'status',
    status: 'Downloading models (~200 MB first time)...',
    state: 'loading',
  });

  const [enc, txtCond, fMain, fFlow, dec] = await Promise.all([
    createSessionWithExternalData(MODELS.mimi_encoder, sessionOpts),
    createSessionWithExternalData(MODELS.text_conditioner, sessionOpts),
    createSessionWithExternalData(MODELS.flow_lm_main, sessionOpts),
    createSessionWithExternalData(MODELS.flow_lm_flow, sessionOpts),
    createSessionWithExternalData(MODELS.mimi_decoder, sessionOpts),
  ]);
  mimiEncoderSession = enc;
  textConditionerSession = txtCond;
  flowLmMainSession = fMain;
  flowLmFlowSession = fFlow;
  mimiDecoderSession = dec;

  // Load tokenizer via sentencepiece (blob URL trick for cross-origin)
  postMessage({
    type: 'status',
    status: 'Loading tokenizer...',
    state: 'loading',
  });
  const spResp = await fetch(`${HF_SPACE}/sentencepiece.js`);
  const spCode = await spResp.text();
  const spBlob = new Blob([spCode], {type: 'application/javascript'});
  const spUrl = URL.createObjectURL(spBlob);
  const spModule = await import(spUrl);
  URL.revokeObjectURL(spUrl);
  const SentencePieceProcessor = spModule.SentencePieceProcessor;
  if (!SentencePieceProcessor)
    throw new Error('SentencePieceProcessor not found');
  tokenizerProcessor = new SentencePieceProcessor();
  const tokResp = await fetch(MODELS.tokenizer);
  const tokBuf = await tokResp.arrayBuffer();
  const tokB64 = btoa(String.fromCharCode(...new Uint8Array(tokBuf)));
  await tokenizerProcessor.loadFromB64StringModel(tokB64);

  // Load predefined voices
  postMessage({type: 'status', status: 'Loading voices...', state: 'loading'});
  try {
    const vResp = await fetch(MODELS.voices);
    if (vResp.ok) {
      predefinedVoices = parseVoicesBin(await vResp.arrayBuffer());
      if (predefinedVoices['marius']) {
        currentVoiceEmbedding = predefinedVoices['marius'];
        currentVoiceName = 'marius';
      } else {
        const f = Object.keys(predefinedVoices)[0];
        if (f) {
          currentVoiceEmbedding = predefinedVoices[f];
          currentVoiceName = f;
        }
      }
    }
  } catch (e) {
    console.warn('Could not load voices:', e);
  }

  if (currentVoiceEmbedding && currentVoiceName) {
    await ensureVoiceConditioningCached(
      currentVoiceName,
      currentVoiceEmbedding,
      {force: true, statusText: `Conditioning voice (${currentVoiceName})...`}
    );
  }

  postMessage({
    type: 'voices_loaded',
    voices: Object.keys(predefinedVoices),
    defaultVoice: currentVoiceName,
  });

  // Pre-allocate s/t tensors for flow matching
  stTensors = {};
  for (let lsd = 1; lsd <= MAX_LSD; lsd++) {
    stTensors[lsd] = [];
    const dt = 1.0 / lsd;
    for (let j = 0; j < lsd; j++) {
      stTensors[lsd].push({
        s: new ort.Tensor('float32', new Float32Array([j / lsd]), [1, 1]),
        t: new ort.Tensor('float32', new Float32Array([j / lsd + dt]), [1, 1]),
      });
    }
  }

  isReady = true;
  postMessage({type: 'status', status: 'Ready', state: 'idle'});
  postMessage({type: 'loaded'});
}

function parseVoicesBin(buffer) {
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

async function encodeVoiceAudio(audioData) {
  const input = new ort.Tensor('float32', audioData, [1, 1, audioData.length]);
  const out = await mimiEncoderSession.run({audio: input});
  const emb = out[mimiEncoderSession.outputNames[0]];
  return {data: new Float32Array(emb.data), shape: emb.dims};
}

// ---- State shapes (from ONNX model metadata) ----
const FLOW_LM_STATE_SHAPES = {
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
const MIMI_DEC_STATE_SHAPES = {
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

function initState(session, shapes) {
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

async function buildVoiceConditionedState(voiceEmb) {
  const flowState = initState(flowLmMainSession, FLOW_LM_STATE_SHAPES);
  const emptySeq = new ort.Tensor('float32', new Float32Array(0), [1, 0, 32]);
  const voiceTensor = new ort.Tensor('float32', voiceEmb.data, voiceEmb.shape);
  const result = await flowLmMainSession.run({
    sequence: emptySeq,
    text_embeddings: voiceTensor,
    ...flowState,
  });
  for (let i = 2; i < flowLmMainSession.outputNames.length; i++) {
    const on = flowLmMainSession.outputNames[i];
    if (on.startsWith('out_state_'))
      flowState[`state_${parseInt(on.replace('out_state_', ''))}`] = result[on];
  }
  return flowState;
}

async function ensureVoiceConditioningCached(name, emb, opts = {}) {
  const {force = false, statusText = 'Conditioning voice...'} = opts;
  if (!force && voiceConditioningCache.has(name))
    return voiceConditioningCache.get(name);
  postMessage({type: 'status', status: statusText, state: 'loading'});
  const state = await buildVoiceConditionedState(emb);
  voiceConditioningCache.set(name, state);
  return state;
}

// ---- Generation pipeline ----
async function startGeneration(text, voiceName) {
  isGenerating = true;
  currentLSD = DEFAULT_LSD;
  postMessage({type: 'status', status: 'Generating...', state: 'running'});
  postMessage({type: 'generation_started', data: {time: performance.now()}});
  try {
    const chunks = splitIntoBestSentences(text);
    if (!chunks.length) throw new Error('No text to generate');

    let resolved = currentVoiceName;
    if (
      voiceName &&
      voiceName !== currentVoiceName &&
      predefinedVoices[voiceName]
    ) {
      currentVoiceEmbedding = predefinedVoices[voiceName];
      currentVoiceName = voiceName;
      resolved = voiceName;
      await ensureVoiceConditioningCached(resolved, currentVoiceEmbedding, {
        statusText: `Conditioning voice (${resolved})...`,
      });
    }
    if (!currentVoiceEmbedding || !resolved)
      throw new Error('No voice available');
    if (!voiceConditioningCache.has(resolved))
      throw new Error('Voice cache missing');

    await runPipeline(resolved, chunks);
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

async function runPipeline(voiceName, chunks) {
  let mimiState = initState(mimiDecoderSession, MIMI_DEC_STATE_SHAPES);
  const emptySeq = new ort.Tensor('float32', new Float32Array(0), [1, 0, 32]);
  const emptyTE = new ort.Tensor('float32', new Float32Array(0), [1, 0, 1024]);
  const baseFlow = voiceConditioningCache.get(voiceName);
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
    if (RESET_FLOW_STATE_EACH_CHUNK && ci > 0) flowState = {...baseFlow};
    if (RESET_MIMI_STATE_EACH_CHUNK && ci > 0)
      mimiState = initState(mimiDecoderSession, MIMI_DEC_STATE_SHAPES);

    let isFirstOfChunk = true;
    const tokenIds = tokenizerProcessor.encodeIds(chunks[ci]);
    const txtIn = new ort.Tensor(
      'int64',
      BigInt64Array.from(tokenIds.map((x) => BigInt(x))),
      [1, tokenIds.length]
    );
    const txtCondRes = await textConditionerSession.run({token_ids: txtIn});
    let txtEmb = txtCondRes[textConditionerSession.outputNames[0]];
    if (txtEmb.dims.length === 2)
      txtEmb = new ort.Tensor('float32', txtEmb.data, [
        1,
        txtEmb.dims[0],
        txtEmb.dims[1],
      ]);

    const condRes = await flowLmMainSession.run({
      sequence: emptySeq,
      text_embeddings: txtEmb,
      ...flowState,
    });
    for (let i = 2; i < flowLmMainSession.outputNames.length; i++) {
      const on = flowLmMainSession.outputNames[i];
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

    for (let step = 0; step < MAX_FRAMES; step++) {
      if (!isGenerating) break;
      // Yield every step to prevent CPU starvation of main thread
      if (step > 0) await new Promise((r) => setTimeout(r, 0));

      const st = performance.now();
      const ar = await flowLmMainSession.run({
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

      // Flow matching
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
      const lsd = currentLSD,
        dt = 1.0 / lsd;
      for (let j = 0; j < lsd; j++) {
        const fr = await flowLmFlowSession.run({
          c: cond,
          s: stTensors[lsd][j].s,
          t: stTensors[lsd][j].t,
          x: new ort.Tensor('float32', x, [1, 32]),
        });
        const v = fr['flow_dir'].data;
        for (let k = 0; k < 32; k++) x[k] += v[k] * dt;
        // Yield inside flow matching loop to prevent long CPU monopolization
        if (j < lsd - 1) await new Promise((r) => setTimeout(r, 0));
      }

      latents.push(new Float32Array(x));
      curLatent = new ort.Tensor('float32', x, [1, 1, 32]);
      for (let i = 2; i < flowLmMainSession.outputNames.length; i++) {
        const on = flowLmMainSession.outputNames[i];
        if (on.startsWith('out_state_'))
          flowState[`state_${parseInt(on.replace('out_state_', ''))}`] = ar[on];
      }

      // Decode audio chunks
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
        const dr = await mimiDecoderSession.run({latent: lt, ...mimiState});
        const de = performance.now() - ds;
        totalDecTime += de;
        chunkGenMs += de;
        const audio = new Float32Array(
          dr[mimiDecoderSession.outputNames[0]].data
        );
        for (let i = 1; i < mimiDecoderSession.outputNames.length; i++) {
          mimiState[`state_${i - 1}`] = dr[mimiDecoderSession.outputNames[i]];
        }
        decoded += decSz;
        totalDecoded += decSz;
        const isLast = shouldStop && ci === chunks.length - 1;
        postMessage(
          {
            type: 'audio_chunk',
            data: audio,
            metrics: {
              chunkDuration: audio.length / SAMPLE_RATE,
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
        Math.max(1, Math.floor(CHUNK_GAP_SEC * SAMPLE_RATE))
      );
      postMessage(
        {
          type: 'audio_chunk',
          data: gap,
          metrics: {
            chunkDuration: gap.length / SAMPLE_RATE,
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
  const audioSec = (totalDecoded * SAMPLES_PER_FRAME) / SAMPLE_RATE;
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
