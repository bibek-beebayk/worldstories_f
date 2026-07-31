import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface ImmersiveReaderContextValue {
  isImmersiveReaderActive: boolean;
  setIsImmersiveReaderActive: (active: boolean) => void;
}

const ImmersiveReaderContext = createContext<ImmersiveReaderContextValue | undefined>(undefined);

export function ImmersiveReaderProvider({ children }: { children: ReactNode }) {
  const [isImmersiveReaderActive, setActive] = useState(false);

  const setIsImmersiveReaderActive = useCallback((active: boolean) => setActive(active), []);

  const value = useMemo(
    () => ({ isImmersiveReaderActive, setIsImmersiveReaderActive }),
    [isImmersiveReaderActive, setIsImmersiveReaderActive]
  );

  return <ImmersiveReaderContext.Provider value={value}>{children}</ImmersiveReaderContext.Provider>;
}

export function useImmersiveReader() {
  const context = useContext(ImmersiveReaderContext);
  if (!context) {
    throw new Error("useImmersiveReader must be used within an ImmersiveReaderProvider");
  }
  return context;
}
