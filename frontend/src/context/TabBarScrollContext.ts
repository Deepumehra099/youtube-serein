import { createContext, useContext } from 'react';

export const TabBarScrollContext = createContext<(hidden: boolean) => void>(() => {});

export function useTabBarScroll() {
  return useContext(TabBarScrollContext);
}
