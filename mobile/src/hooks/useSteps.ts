import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { dateKey, startOfDay } from "../lib/points";
import { readTodayStepsFromHealthConnect } from "../lib/stepsSource";
import { getJSON, setJSON, KEYS } from "../lib/storage";

export type StepsStatus = "loading" | "unavailable" | "denied" | "ok";

/* 今日の歩数を返すフック。
 * iOS: getStepCountAsync で0時からの歩数を直接取得(バックグラウンド分も含まれる)。
 * Android: まずHealth Connect(OS常時計測、dev buildのみ)を試し、
 *          使えない環境(Expo Go等)は watchStepCount の日次積算にフォールバック。
 */
export function useTodaySteps(): { steps: number; status: StepsStatus } {
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState<StepsStatus>("loading");
  const lastWatchCount = useRef(0);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const available = await Pedometer.isAvailableAsync().catch(() => false);
      if (!available) {
        if (!cancelled) setStatus("unavailable");
        return;
      }
      const perm = await Pedometer.requestPermissionsAsync();
      if (perm.status !== "granted") {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (cancelled) return;
      setStatus("ok");

      if (Platform.OS === "ios") {
        const refresh = async () => {
          try {
            const res = await Pedometer.getStepCountAsync(startOfDay(), new Date());
            if (!cancelled) setSteps(res.steps);
          } catch {
            // HealthKit側の一時エラーは無視して次のポーリングに任せる
          }
        };
        await refresh();
        poll = setInterval(refresh, 10_000);
        sub = Pedometer.watchStepCount(() => void refresh());
      } else {
        // 1) Health Connect(バックグラウンド計測込み)を試す
        const hcSteps = await readTodayStepsFromHealthConnect();
        if (hcSteps != null) {
          if (cancelled) return;
          setSteps(hcSteps);
          poll = setInterval(async () => {
            const latest = await readTodayStepsFromHealthConnect();
            if (latest != null && !cancelled) setSteps(latest);
          }, 30_000);
          return;
        }
        // 2) フォールバック: フォアグラウンド積算(Expo Go等)
        const today = dateKey();
        let stored = await getJSON<number>(KEYS.androidSteps(today), 0);
        if (!cancelled) setSteps(stored);
        lastWatchCount.current = 0;
        sub = Pedometer.watchStepCount((result) => {
          const delta = result.steps - lastWatchCount.current;
          lastWatchCount.current = result.steps;
          if (delta <= 0) return;
          stored += delta;
          void setJSON(KEYS.androidSteps(dateKey()), stored);
          if (!cancelled) setSteps(stored);
        });
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      if (poll) clearInterval(poll);
    };
  }, []);

  return { steps, status };
}
