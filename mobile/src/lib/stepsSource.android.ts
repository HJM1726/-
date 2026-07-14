/* Android: Health Connect経由でOSが常時計測している歩数を読む。
 * これによりアプリを閉じていても今日の歩数が正しく取れる(参고앱・トリマと同方式)。
 * 前提: dev build(expo prebuild)+ Android 14以降はOS内蔵、13以前はHealth Connectアプリ。
 * Expo Goにはネイティブモジュールが無いため、失敗時はnullを返して
 * 呼び出し側(useSteps)がフォアグラウンド計測へフォールバックする。 */
import { startOfDay } from "./points";

let unavailable = false;

export async function readTodayStepsFromHealthConnect(): Promise<number | null> {
  if (unavailable) return null;
  try {
    // Expo Go / モジュール未リンク環境ではrequire自体が失敗する
    const hc = require("react-native-health-connect") as typeof import("react-native-health-connect");
    const initialized = await hc.initialize();
    if (!initialized) {
      unavailable = true;
      return null;
    }
    const granted = await hc.requestPermission([{ accessType: "read", recordType: "Steps" }]);
    if (!granted.some((p) => p.recordType === "Steps")) {
      unavailable = true;
      return null;
    }
    const { records } = await hc.readRecords("Steps", {
      timeRangeFilter: {
        operator: "between",
        startTime: startOfDay().toISOString(),
        endTime: new Date().toISOString(),
      },
    });
    return records.reduce((sum, r) => sum + r.count, 0);
  } catch {
    unavailable = true;
    return null;
  }
}
