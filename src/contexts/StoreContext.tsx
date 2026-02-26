"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface Store {
  id: string;
  name: string;
}

interface StoreContextType {
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  // Por defecto, asignamos una tienda de prueba para que funcione
  const [selectedStore, setSelectedStore] = useState<Store | null>({
    id: 'demo-store',
    name: 'Mi Tienda Demo'
  });

  return (
    <StoreContext.Provider value={{ selectedStore, setSelectedStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}