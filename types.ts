export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    uri: string;
  }>;
  isLoading?: boolean;
  audioData?: string; // Base64 audio
}

export enum AppMode {
  CHAT = 'CHAT',
  IMAGE_GEN = 'IMAGE_GEN',
  VIDEO_GEN = 'VIDEO_GEN',
  IMAGE_EDIT = 'IMAGE_EDIT',
  ANALYZE = 'ANALYZE'
}

export interface ChatConfig {
  useSearch: boolean;
  useThinking: boolean;
  category: 'General' | 'PvM' | 'PvP' | 'Skilling' | 'Diaries';
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}