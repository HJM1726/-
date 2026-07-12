import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getJSON, setJSON, KEYS } from "../lib/storage";

interface PointsValue {
  balance: number;
  addPoints: (amount: number) => Promise<void>;
}

const PointsContext = createContext<PointsValue>({
  balance: 0,
  addPoints: async () => {},
});

export function PointsProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    getJSON<number>(KEYS.points, 0).then(setBalance);
  }, []);

  const addPoints = useCallback(async (amount: number) => {
    setBalance((prev) => {
      const next = prev + amount;
      void setJSON(KEYS.points, next);
      return next;
    });
  }, []);

  return <PointsContext.Provider value={{ balance, addPoints }}>{children}</PointsContext.Provider>;
}

export function usePoints(): PointsValue {
  return useContext(PointsContext);
}
