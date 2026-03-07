import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Achievement, ProgressState } from '../models/types';
import { ACHIEVEMENTS } from '../models/constants';

interface AchievementStore {
  // Map: profileId -> array of achievement IDs that are unlocked
  unlocked: Record<string, string[]>;
  checkAndUnlock: (profileId: string, progress: ProgressState, uniqueColors: number) => Achievement[];
  getUnlockedAchievements: (profileId: string) => Achievement[];
  isUnlocked: (profileId: string, achievementId: string) => boolean;
}

export const useAchievementStore = create<AchievementStore>()(
  persist(
    (set, get) => ({
      unlocked: {},

      checkAndUnlock: (profileId: string, progress: ProgressState, uniqueColors: number) => {
        const state = get();
        const alreadyUnlocked = new Set(state.unlocked[profileId] ?? []);
        const newlyUnlocked: Achievement[] = [];

        for (const achievement of ACHIEVEMENTS) {
          if (alreadyUnlocked.has(achievement.id)) continue;

          let earned = false;
          const req = achievement.requirement;

          switch (req.type) {
            case 'first_route':
              earned = progress.totalRoutes >= 1;
              break;
            case 'routes_completed':
              earned = progress.totalRoutes >= req.value;
              break;
            case 'streak_days':
              earned = progress.currentStreak >= req.value;
              break;
            case 'total_moves':
              earned = progress.totalMoves >= req.value;
              break;
            case 'colors_completed':
              earned = uniqueColors >= req.value;
              break;
            case 'difficulty_level':
              // This needs to be checked at route completion time with the actual difficulty
              // For now we skip - it's handled by the route completion flow
              break;
          }

          if (earned) {
            newlyUnlocked.push({ ...achievement, unlockedAt: Date.now() });
          }
        }

        if (newlyUnlocked.length > 0) {
          set((s) => ({
            unlocked: {
              ...s.unlocked,
              [profileId]: [
                ...(s.unlocked[profileId] ?? []),
                ...newlyUnlocked.map((a) => a.id),
              ],
            },
          }));
        }

        return newlyUnlocked;
      },

      getUnlockedAchievements: (profileId: string) => {
        const ids = new Set(get().unlocked[profileId] ?? []);
        return ACHIEVEMENTS.filter((a) => ids.has(a.id));
      },

      isUnlocked: (profileId: string, achievementId: string) => {
        return (get().unlocked[profileId] ?? []).includes(achievementId);
      },
    }),
    {
      name: 'boulder-buddy-achievements',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
