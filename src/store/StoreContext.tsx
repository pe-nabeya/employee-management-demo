// React context and hook for accessing the data store.
// Provides a single store instance to all components and triggers re-renders on change.

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { DataStore } from './DataStore';
import { LocalStorageStore } from './LocalStorageStore';
import type { AppData } from '../types';

interface StoreContextValue {
  store: DataStore;
  data: AppData;
  refresh: () => void;
  resetData: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState<DataStore>(() => new LocalStorageStore());
  const [data, setData] = useState<AppData>(() => store.getAll());

  const refresh = useCallback(() => {
    setData(store.getAll());
  }, [store]);

  const resetData = useCallback(() => {
    store.resetToInitial();
    setData(store.getAll());
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, data, refresh, resetData }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
