// src/lib/voice/pipeline.ts
// B.A.D.D.I.E. Voice Pipeline - Whisper STT + Neural TTS with streaming

export interface VoiceConfig {
  sttModel: string;
  ttsEngine: 'piper' | 'kokoro';
  ttsVoice: string;
  vadThreshold: number;
  sampleRate: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  sttModel: 'turbo',
  ttsEngine: 'kokoro',
  ttsVoice: 'default',
  vadThreshold: 0.5,
  sampleRate: 16000,
};

export interface TranscriptResult {
  text: string;
  language: string;
  confidence: number;
  duration: number;
}

export class VoicePipeline {
  private config: VoiceConfig;
  private isListening = false;

  constructor(config: VoiceConfig = DEFAULT_VOICE_CONFIG) {
    this.config = config;
  }

  async startListening(): Promise<void> {
    this.isListening = true;
    console.log('[Voice] Listening started');
  }

  async stopListening(): Promise<TranscriptResult | null> {
    this.isListening = false;
    console.log('[Voice] Listening stopped');
    return null;
  }

  async speak(text: string): Promise<void> {
    console.log(`[Voice] Speaking: "${text.slice(0, 50)}..."`);
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }
}
