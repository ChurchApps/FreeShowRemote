// FreeShow Remote App Types

export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  isConnected: boolean;
  lastConnected?: Date;
}

export interface ShowOption {
  id: string;
  title: string;
  description: string;
  port: number;
  icon: string;
  color: string;
}

export interface Show {
  id: string;
  name: string;
  items: ShowItem[];
  currentIndex: number;
}

export interface ShowItem {
  id: string;
  type: 'slide' | 'song' | 'video' | 'audio' | 'timer';
  title: string;
  content?: string;
  duration?: number;
  isActive?: boolean;
}

// FreeShow API Response Types
export interface FreeShowShow {
  id: string;
  name: string;
  category?: string;
  slides?: FreeShowSlide[];
  layouts?: { [key: string]: FreeShowLayout };
  meta?: {
    created?: string;
    modified?: string;
    version?: string;
  };
}

export interface FreeShowSlide {
  id: string;
  group?: string;
  color?: string;
  settings?: {
    background?: string;
    transition?: string;
  };
  notes?: string;
  items?: FreeShowSlideItem[];
}

export interface FreeShowSlideItem {
  id: string;
  type: 'text' | 'media';
  lines?: FreeShowTextLine[];
  src?: string;
  style?: string;
}

export interface FreeShowTextLine {
  text?: FreeShowTextItem[];
}

export interface FreeShowTextItem {
  value?: string;
  style?: string;
}

export interface FreeShowLayout {
  id: string;
  name: string;
  notes?: string;
  slides: { [key: string]: FreeShowLayoutSlide };
}

export interface FreeShowLayoutSlide {
  id: string;
  background?: string;
  items?: { [key: string]: FreeShowLayoutItem };
}

export interface FreeShowLayoutItem {
  style?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    opacity?: number;
  };
}

export interface FreeShowOutput {
  slide?: FreeShowSlide;
  slideIndex?: number;
  showId?: string;
  layoutId?: string;
}

export interface RemoteAction {
  type: 'next' | 'previous' | 'goto' | 'play' | 'pause' | 'stop';
  payload?: any;
}

export type RootStackParamList = {
  Home: undefined;
  Connect: undefined;
  Remote: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Interface: undefined;
  Connect: undefined;
};
