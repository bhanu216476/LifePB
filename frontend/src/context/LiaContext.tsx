import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { speakWithLadyVoice, stopSpeaking } from '../utils/speech';

export type LiaState =
  | 'idle'
  | 'greeting'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'listening'
  | 'celebration'
  | 'goodbye'
  | 'reminder';

interface LiaContextType {
  liaState: LiaState;
  setLiaState: (state: LiaState) => void;
  liaText: string;
  speakLia: (text: string, onComplete?: () => void) => void;
  stopLia: () => void;
}

const LiaContext = createContext<LiaContextType | undefined>(undefined);

export const LiaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [liaState, setLiaState] = useState<LiaState>('idle');
  const [liaText, setLiaText] = useState<string>('');
  const speakTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopLia = () => {
    stopSpeaking();
    if (speakTimeout.current) clearTimeout(speakTimeout.current);
    setLiaState('idle');
    setLiaText('');
  };

  const speakLia = (text: string, onComplete?: () => void) => {
    stopLia();
    setLiaText(text);
    setLiaState('speaking');

    speakWithLadyVoice(text, () => {
      setLiaState('idle');
      if (onComplete) onComplete();
    });

    // Fallback simulation timer if speech synthesis is blocked/not speaking
    const readingTime = Math.max(2000, text.length * 65);
    speakTimeout.current = setTimeout(() => {
      setLiaState(prev => (prev === 'speaking' ? 'idle' : prev));
      if (onComplete) onComplete();
    }, readingTime);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (speakTimeout.current) clearTimeout(speakTimeout.current);
    };
  }, []);

  return (
    <LiaContext.Provider value={{ liaState, setLiaState, liaText, speakLia, stopLia }}>
      {children}
    </LiaContext.Provider>
  );
};

export const useLia = () => {
  const context = useContext(LiaContext);
  if (!context) throw new Error('useLia must be used within a LiaProvider');
  return context;
};
