import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { dateKey, startOfDay } from "../lib/points";
import { getJSON, setJSON, KEYS } from "../lib/storage";

export type StepsStatus = "loading" | "unavailable" | "denied" | "ok";

/* 今日の歩数を返すフック。
 * iOS: getStepCountAsync で0時からの歩数を直接取得できる。
 * Android: 取得APIがなく watchStepCount(購読開始からの増分)しかないため、
 *          日付キー付きでAsyncStorageに積算する(アプリ起動中のみ計測されるMVP実装)。
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
