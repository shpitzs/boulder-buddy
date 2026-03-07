import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClimberProfile } from '../models/types';

interface ProfileStore {
  profiles: ClimberProfile[];
  activeProfileId: string | null;
  addProfile: (name: string, heightCm: number) => string;
  setActiveProfile: (id: string) => void;
  updateProfile: (id: string, updates: Partial<ClimberProfile>) => void;
  getActiveProfile: () => ClimberProfile | null;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      addProfile: (name: string, heightCm: number) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const profile: ClimberProfile = {
          id,
          name,
          heightCm,
          avatarId: 'default',
          avatarGear: [],
          createdAt: Date.now(),
        };
        set((state) => ({
          profiles: [...state.profiles, profile],
          activeProfileId: state.activeProfileId ?? id,
        }));
        return id;
      },

      setActiveProfile: (id: string) => set({ activeProfileId: id }),

      updateProfile: (id: string, updates: Partial<ClimberProfile>) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        return profiles.find((p) => p.id === activeProfileId) ?? null;
      },
    }),
    {
      name: 'boulder-buddy-profiles',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
