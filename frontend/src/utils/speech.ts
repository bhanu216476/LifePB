/**
 * LifeOS AI — Voice Assistant Utility
 * Uses Web Speech API with Indian English female voice preference.
 * Priority: Microsoft Heera > Google English India > Priya > en-IN > en-GB female > generic female
 * Inspired by the warm, expressive South Indian English accent.
 */

export type VoiceProfile = 'indian' | 'standard';

let activeVoiceProfile: VoiceProfile = 'indian';

export const setVoiceProfile = (profile: VoiceProfile) => {
  activeVoiceProfile = profile;
};

const INDIAN_ENGLISH_VOICE_PRIORITIES = [
  'microsoft heera',        // Windows: Crisp Indian English female (best match)
  'microsoft priya',        // Windows: Indian English female variant
  'google हिन्दी',           // Chrome: Hindi Indian
  'google english india',   // Chrome: Indian English
  'heera',                  // Short match fallback
  'priya',                  // Short match fallback
  'raveena',                // macOS Indian English female
  'veena',                  // macOS Indian female
  'lekha',                  // macOS Hindi female
  'en-in',                  // Any en-IN locale voice
];

const STANDARD_FEMALE_VOICE_PRIORITIES = [
  'microsoft zira',
  'zira',
  'samantha',
  'google us english',
  'karen',
  'victoria',
  'hazel',
  'moira',
  'tessa',
  'fiona',
];

const pickBestVoice = (): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  const priorities = activeVoiceProfile === 'indian'
    ? [...INDIAN_ENGLISH_VOICE_PRIORITIES, ...STANDARD_FEMALE_VOICE_PRIORITIES]
    : [...STANDARD_FEMALE_VOICE_PRIORITIES, ...INDIAN_ENGLISH_VOICE_PRIORITIES];

  for (const keyword of priorities) {
    const match = voices.find(v => v.name.toLowerCase().includes(keyword));
    if (match) return match;
  }

  // Fallback: any en-IN voice
  const enIN = voices.find(v => v.lang === 'en-IN');
  if (enIN) return enIN;

  // Fallback: any female-sounding voice by lang
  const enVoice = voices.find(v => v.lang.startsWith('en'));
  return enVoice || null;
};

export const speakWithLadyVoice = (text: string, onEnd?: () => void) => {
  if (!('speechSynthesis' in window)) {
    console.warn('[LifeOS AI] Speech synthesis not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const doSpeak = () => {
    const voice = pickBestVoice();

    if (voice) {
      utterance.voice = voice;
      console.log(`[LifeOS AI Voice] Using: "${voice.name}" (${voice.lang})`);
    }

    // Voice properties tuned for warm Indian English female tone
    utterance.rate = activeVoiceProfile === 'indian' ? 0.96 : 1.05;
    utterance.pitch = activeVoiceProfile === 'indian' ? 1.08 : 1.1;
    utterance.volume = 1.0;

    if (onEnd) utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  };

  // Chrome loads voices asynchronously
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = doSpeak;
  } else {
    doSpeak();
  }
};

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/** Returns a list of all available voices (for debug UI) */
export const listAvailableVoices = (): SpeechSynthesisVoice[] => {
  return window.speechSynthesis.getVoices();
};
