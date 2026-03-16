/* eslint-disable */
import React, { useState, useRef, useCallback } from 'react';

/**
 * HARTSpeechPlayer — plays the HART OS speech in the user's selected language.
 *
 * Audio files are pre-synthesized MP3s served from /hartos_speech_audio/.
 * Based on language selected in LightYourHART or sidebar.
 */

// Map language codes to speech audio filenames
const LANG_TO_AUDIO = {
  en: 'hartos_speech_english.mp3',
  hi: 'hartos_speech_hindi.mp3',
  ta: 'hartos_speech_tamil.mp3',
  te: 'hartos_speech_telugu.mp3',
  es: 'hartos_speech_spanish.mp3',
  fr: 'hartos_speech_french.mp3',
  ar: 'hartos_speech_arabic.mp3',
  zh: 'hartos_speech_mandarin.mp3',
  ja: 'hartos_speech_japanese.mp3',
  ko: 'hartos_speech_korean.mp3',
  de: 'hartos_speech_german.mp3',
  pt: 'hartos_speech_portuguese.mp3',
  ru: 'hartos_speech_russian.mp3',
  sw: 'hartos_speech_swahili.mp3',
  bn: 'hartos_speech_bengali.mp3',
  ur: 'hartos_speech_urdu.mp3',
  it: 'hartos_speech_italian.mp3',
  tr: 'hartos_speech_turkish.mp3',
};

const LANG_LABELS = {
  en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
  es: 'Spanish', fr: 'French', ar: 'Arabic', zh: 'Mandarin',
  ja: 'Japanese', ko: 'Korean', de: 'German', pt: 'Portuguese',
  ru: 'Russian', sw: 'Swahili', bn: 'Bengali', ur: 'Urdu',
  it: 'Italian', tr: 'Turkish',
};

export default function HARTSpeechPlayer({ language = 'en', variant = 'button', audioBasePath = '/hartos_speech_audio' }) {
  const [playing, setPlaying] = useState(false);
  const [selectedLang, setSelectedLang] = useState(language);
  const audioRef = useRef(null);

  const play = useCallback(() => {
    const file = LANG_TO_AUDIO[selectedLang] || LANG_TO_AUDIO['en'];
    const url = `${audioBasePath}/${file}`;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.volume = 0.9;
    audio.play().catch(() => {});
    setPlaying(true);

    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
  }, [selectedLang, audioBasePath]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlaying(false);
  }, []);

  // Minimal inline button variant (for LightYourHART overlay)
  if (variant === 'inline') {
    return (
      <button
        onClick={playing ? stop : play}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 20,
          cursor: 'pointer',
          fontSize: 14,
          opacity: 0.8,
        }}
      >
        {playing ? 'Stop' : `Hear HART OS speak ${LANG_LABELS[selectedLang] || 'English'}`}
      </button>
    );
  }

  // Sidebar variant (for Nunba /local)
  if (variant === 'sidebar') {
    return (
      <div style={{ padding: '8px 12px' }}>
        <select
          value={selectedLang}
          onChange={(e) => { setSelectedLang(e.target.value); stop(); }}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #444',
            background: '#1a1b1e',
            color: '#ccc',
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          {Object.entries(LANG_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
        <button
          onClick={playing ? stop : play}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: 6,
            border: 'none',
            background: playing ? '#dc2626' : '#2563eb',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {playing ? 'Stop Speech' : 'Hear HART OS Speech'}
        </button>
      </div>
    );
  }

  // Default button variant
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <select
        value={selectedLang}
        onChange={(e) => { setSelectedLang(e.target.value); stop(); }}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #666',
          background: 'transparent',
          color: 'inherit',
          fontSize: 14,
        }}
      >
        {Object.entries(LANG_LABELS).map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      <button
        onClick={playing ? stop : play}
        style={{
          padding: '10px 24px',
          borderRadius: 24,
          border: 'none',
          background: playing ? '#dc2626' : '#2563eb',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {playing ? 'Stop' : 'Hear HART OS Speech'}
      </button>
    </div>
  );
}

export { LANG_TO_AUDIO, LANG_LABELS };
