/* 歩数ソースの既定実装(iOS / Web用)。
 * iOSはexpo-sensorsのgetStepCountAsyncがモーションコプロセッサの履歴を読むため
 * バックグラウンド計測は既に実現できており、Health Connectは不要。
 * Android専用実装は stepsSource.android.ts(プラットフォーム解決で自動選択)。 */

/** Health Connectから今日の合計歩数を取得。この環境では常にnull(未対応)。 */
export async function readTodayStepsFromHealthConnect(): Promise<number | null> {
  return null;
}
