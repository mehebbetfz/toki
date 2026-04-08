import { create } from 'zustand';

interface SocialState {
  following: Set<string>;
  favorites: Set<string>;
  likedPosts: Set<string>;
  follow: (userId: string) => void;
  unfollow: (userId: string) => void;
  toggleFavorite: (userId: string) => void;
  toggleLike: (postId: string) => void;
  isFollowing: (userId: string) => boolean;
  isFavorite: (userId: string) => boolean;
  isLiked: (postId: string) => boolean;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  following: new Set(['mock1', 'mock3', 'mock6']), // демо-данные
  favorites: new Set(['mock2', 'mock5']),
  likedPosts: new Set(),

  follow: (id) => set(s => ({ following: new Set([...s.following, id]) })),
  unfollow: (id) => set(s => { const n = new Set(s.following); n.delete(id); return { following: n }; }),
  toggleFavorite: (id) => set(s => {
    const n = new Set(s.favorites);
    n.has(id) ? n.delete(id) : n.add(id);
    return { favorites: n };
  }),
  toggleLike: (id) => set(s => {
    const n = new Set(s.likedPosts);
    n.has(id) ? n.delete(id) : n.add(id);
    return { likedPosts: n };
  }),
  isFollowing: (id) => get().following.has(id),
  isFavorite: (id) => get().favorites.has(id),
  isLiked: (id) => get().likedPosts.has(id),
}));
