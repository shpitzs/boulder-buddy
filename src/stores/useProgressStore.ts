import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DifficultyLevel, ProgressState } from '../models/types';
import { LEVEL_THRESHOLDS, XP_PER_ROUTE, XP_BONUS_FIRST_ROUTE, xpStreakBonus } from '../models/constants';

const DEFAULT_PROGRESS: ProgressState = {
  xp: 0,
  level: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalRoutes: 0,
  totalMoves: 0,
  lastClimbDate: null,
};

function calculateLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

function isSameDay(d1: string, d2: string): boolean {
  return d1.slice(0, 10) === d2.slice(0, 10);
}

function isConsecutiveDay(prev: string, current: string): boolean {
  const prevDate = new Date(prev);
  const currDate = new Date(current);
  const diff = currDate.getTime() - prevDate.getTime();
  return diff > 0 && diff <= 86400000 * 1.5; // allow some slack
}

interface ProgressStore {
  progress: Record<string, ProgressState>;
  getProgress: (profileId: string) => ProgressState;
  completeRoute: (profileId: string, difficulty: DifficultyLevel, moveCount: number) => { xpEarned: number; newLevel: boolean; oldLevel: number };
  addXP: (profileId: string, amount: number) => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      getProgress: (profileId: string) => {
        return get().progress[profileId] ?? { ...DEFAULT_PROGRESS };
      },

      completeRoute: (profileId: string, difficulty: DifficultyLevel, moveCount: number) => {
        const state = get();
        const prev = state.progress[profileId] ?? { ...DEFAULT_PROGRESS };
        const today = new Date().toISOString();

        // Calculate streak
        let newStreak = prev.currentStreak;
        if (prev.lastClimbDate) {
          if (isSameDay(prev.lastClimbDate, today)) {
            // Same day, streak unchanged
          } else if (isConsecutiveDay(prev.lastClimbDate, today)) {
            newStreak += 1;
          } else {
            newStreak = 1; // streak broken, start new
          }
        } else {
          newStreak = 1; // first climb
        }

        // Calculate XP
        let xpEarned = XP_PER_ROUTE[difficulty];
        if (prev.totalRoutes === 0) xpEarned += XP_BONUS_FIRST_ROUTE;
        xpEarned += xpStreakBonus(newStreak);

        const newXP = prev.xp + xpEarned;
        const oldLevel = prev.level;
        const newLevel = calculateLevel(newXP);

        const updated: ProgressState = {
          xp: newXP,
          level: newLevel,
          currentStreak: newStreak,
          longestStreak: Math.max(prev.longestStreak, newStreak),
          totalRoutes: prev.totalRoutes + 1,
          totalMoves: prev.totalMoves + moveCount,
          lastClimbDate: today,
        };

        set((s) => ({
          progress: { ...s.progress, [profileId]: updated },
        }));

        return { xpEarned, newLevel: newLevel > oldLevel, oldLevel };
      },

      addXP: (profileId: string, amount: number) => {
        set((s) => {
          const prev = s.progress[profileId] ?? { ...DEFAULT_PROGRESS };
          const newXP = prev.xp + amount;
          return {
            progress: {
              ...s.progress,
              [profileId]: {
                ...prev,
                xp: newXP,
                level: calculateLevel(newXP),
              },
            },
          };
        });
      },
    }),
    {
      name: 'boulder-buddy-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
