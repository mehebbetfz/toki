import { create } from 'zustand';

export interface Story {
  id: string;
  userId: string;
  uri: string;
  type: 'image' | 'video';
  createdAt: number; // Date.now()
}

const TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

// ─── Demo stories for mock users ─────────────────────────────────────────────
const now = Date.now();
const DEMO_STORIES: Story[] = [
  { id: 'ds1',  userId: 'mock1',  uri: 'https://picsum.photos/seed/story1/800/1400',  type: 'image', createdAt: now - 2 * 3600_000 },
  { id: 'ds2',  userId: 'mock1',  uri: 'https://picsum.photos/seed/story2/800/1400',  type: 'image', createdAt: now - 1 * 3600_000 },
  { id: 'ds3',  userId: 'mock3',  uri: 'https://picsum.photos/seed/story3/800/1400',  type: 'image', createdAt: now - 3 * 3600_000 },
  { id: 'ds4',  userId: 'mock6',  uri: 'https://picsum.photos/seed/story4/800/1400',  type: 'image', createdAt: now - 0.5 * 3600_000 },
  { id: 'ds5',  userId: 'mock2',  uri: 'https://picsum.photos/seed/story5/800/1400',  type: 'image', createdAt: now - 5 * 3600_000 },
  { id: 'ds6',  userId: 'mock8',  uri: 'https://picsum.photos/seed/story6/800/1400',  type: 'image', createdAt: now - 4 * 3600_000 },
  { id: 'ds7',  userId: 'mock10', uri: 'https://picsum.photos/seed/story7/800/1400',  type: 'image', createdAt: now - 10 * 3600_000 },
];

interface StoriesState {
  stories: Story[];
  viewed: Set<string>; // story ids already viewed by me
  addStory: (uri: string, type: 'image' | 'video', myUserId: string) => void;
  markViewed: (storyId: string) => void;
  getActiveStories: () => Story[];                      // not expired
  getStoriesForUser: (userId: string) => Story[];
  hasUnviewed: (userId: string) => boolean;
  purgeExpired: () => void;
}

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: DEMO_STORIES,
  viewed: new Set<string>(),

  addStory: (uri, type, myUserId) => {
    const story: Story = { id: `story_${Date.now()}`, userId: myUserId, uri, type, createdAt: Date.now() };
    set(s => ({ stories: [story, ...s.stories] }));
  },

  markViewed: (id) => set(s => ({ viewed: new Set([...s.viewed, id]) })),

  getActiveStories: () => {
    const { stories } = get();
    return stories.filter(s => Date.now() - s.createdAt < TTL);
  },

  getStoriesForUser: (userId) => {
    const { stories } = get();
    return stories.filter(s => s.userId === userId && Date.now() - s.createdAt < TTL);
  },

  hasUnviewed: (userId) => {
    const { stories, viewed } = get();
    return stories.some(s => s.userId === userId && !viewed.has(s.id) && Date.now() - s.createdAt < TTL);
  },

  purgeExpired: () => set(s => ({ stories: s.stories.filter(x => Date.now() - x.createdAt < TTL) })),
}));
