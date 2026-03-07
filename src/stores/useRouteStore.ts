import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedRoute } from '../models/types';

interface RouteStore {
  routes: SavedRoute[];
  saveRoute: (route: SavedRoute) => void;
  getRoutesByProfile: (profileId: string) => SavedRoute[];
  getRouteById: (id: string) => SavedRoute | undefined;
  getUniqueColors: (profileId: string) => string[];
}

export const useRouteStore = create<RouteStore>()(
  persist(
    (set, get) => ({
      routes: [],

      saveRoute: (route: SavedRoute) =>
        set((state) => ({
          routes: [route, ...state.routes],
        })),

      getRoutesByProfile: (profileId: string) =>
        get().routes.filter((r) => r.profileId === profileId),

      getRouteById: (id: string) =>
        get().routes.find((r) => r.id === id),

      getUniqueColors: (profileId: string) => {
        const routes = get().routes.filter((r) => r.profileId === profileId);
        return [...new Set(routes.map((r) => r.targetColor))];
      },
    }),
    {
      name: 'boulder-buddy-routes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
