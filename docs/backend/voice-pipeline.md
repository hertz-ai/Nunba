# Voice Pipeline

Nunba has a full voice pipeline: speech-to-text (STT), text-to-speech (TTS), and speaker diarization.

## Overview

```
Microphone → Web Speech API (streaming) → Flask /voice/transcribe (Whisper) → Chat
                                                                                ↓
Speaker ← Browser PocketTTS (English) ← Chat Response ← LLM
           or Piper/VibeVoice (server)
```

## Text-to-Speech (TTS)

### Browser TTS (Default for English)

Nunba uses **PocketTTS** — an ONNX-based TTS engine that runs entirely in the browser. Zero server load, zero latency.

- Enabled by default for English
- No configuration needed
- Works offline

### Server TTS (Non-English or higher quality)

For non-English voices, the server-side Piper TTS is used:

```bash
pip install piper-tts
```

Configure in `.env`:
```bash
TTS_ENGINE=piper
TTS_VOICE=en_US-lessac-medium
```

TTS API endpoints:
- `POST /api/social/tts/quick` — immediate audio for short text
- `POST /api/social/tts/submit` — async job for longer text
- `GET /api/social/tts/status/:taskId` — poll job status

## Speech-to-Text (STT)

### Client-Side (Web Speech API)

For real-time streaming transcription, the frontend uses the browser's Web Speech API. This requires no server-side setup.

### Server-Side (Whisper)

For higher accuracy, Nunba can use OpenAI Whisper on the backend:

```bash
pip install openai-whisper
```

The backend auto-selects the Whisper model based on available VRAM:

| VRAM | Model | Speed |
|------|-------|-------|
| < 2 GB | `tiny` | Fastest |
| 2-4 GB | `base` | Fast |
| 4-8 GB | `small` | Good accuracy |
| 8+ GB | `medium` | Best accuracy |

STT endpoint: `POST /voice/transcribe`

## Speaker Diarization

Identifies who is speaking in multi-speaker audio.

### Setup

Requires a HuggingFace token (for pyannote model access):

```bash
pip install whisperx pyannote.audio
```

1. Get a token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Accept the pyannote model license at [huggingface.co/pyannote/speaker-diarization](https://huggingface.co/pyannote/speaker-diarization-3.1)
3. Set the token: `export HF_TOKEN=hf_...`

### Running

The diarization service runs as a WebSocket sidecar on port 8004, started automatically by `main.py` as a daemon thread.

Endpoint: `POST /voice/diarize`

## Architecture

| Component | Port | Transport | Purpose |
|-----------|------|-----------|---------|
| Browser PocketTTS | — | In-browser | English TTS, zero latency |
| Piper/VibeVoice | 5000 | HTTP | Server-side TTS |
| Whisper STT | 5000 | HTTP | Speech-to-text |
| Diarization | 8004 | WebSocket | Speaker identification |
| Web Speech API | — | In-browser | Streaming STT |
