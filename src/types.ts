export type ContentType = 'HERO' | 'HUB' | 'HELP' | 'Misto';
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Facebook' | 'Stories' | 'Live' | 'Blog';

export interface ContentFormat {
  id: string;
  name: string;
  description: string;
  pilar: 'Formato' | 'Intenção' | 'Abordagem';
}

export interface Post {
  id: string;
  title: string;
  platform: Platform;
  format: string;
  type: ContentType;
  date: string; // ISO format
  time: string;
  notes?: string;
  color?: string;
}

export interface WeeklyDay {
  content: string;
  format: string;
  time: string;
}

export interface Client {
  id: string;
  name: string;
  avatar?: string;
  strategy: UserStrategy;
  posts: Post[];
  modeling: {
    heroQty: number;
    hubQty: number;
    helpQty: number;
    mistoQty: number;
    adherenceQty: number;
    depthQty: number;
    order: string[];
    group: string[];
    postedDays: number;
    currentPlatform: string;
    observations?: string;
    weeklySchedule: {
      [key: string]: WeeklyDay;
    };
  };
}

export interface UserStrategy {
  id: string;
  primaryNetwork: string;
  secondaryNetworks: string[];
  tertiaryNetworks: string[];
  contentFormats: { name: string; desc: string }[];
}
