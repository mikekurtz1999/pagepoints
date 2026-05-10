import { create } from 'zustand';
import type { RankProfile } from '../types/rank.types';

interface RankState {
  rankProfile: RankProfile | null;
  isLoading: boolean;
  setRankProfile: (profile: RankProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useRankStore = create<RankState>((set) => ({
  rankProfile: null,
  isLoading: false,
  setRankProfile: (profile) => set({ rankProfile: profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ rankProfile: null, isLoading: false }),
}));
