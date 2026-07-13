/* チリツモ抽選(참고앱の「티끌드로우」相当)。
 * ポイントを消費して応募し、締切後に抽選。MVPでは応募までをローカルで動かし、
 * 実際の抽選・賞品発送はサーバー対応後(景品表示法の確認も必要)。
 */

export interface Raffle {
  id: string;
  title: string;
  emoji: string;
  costPt: number; // 1回の応募に必要なポイント
  maxEntries: number; // 1人あたりの応募上限
  seedEntrants: number; // デモ用の参加者数
  winners: number;
  endsAt: number; // epoch ms
}

export interface WinnerFeedItem {
  id: string;
  title: string;
  emoji: string;
  winner: string; // マスク済みの表示名
  status: string;
  agoHours: number;
}

/* 次の指定曜日の23:59:59(常に未来になるよう、当日なら翌週) */
function upcoming(dayOfWeek: number, hour = 23, minute = 59): number {
  const now = new Date();
  let diff = (dayOfWeek - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, hour, minute, 59);
  return end.getTime();
}

export const RAFFLES: Raffle[] = [
  {
    id: "r01",
    title: "マクドナルド バーガーセット",
    emoji: "🍔",
    costPt: 100,
    maxEntries: 3,
    seedEntrants: 29,
    winners: 1,
    endsAt: upcoming(0), // 日曜締切
  },
  {
    id: "r02",
    title: "スタバ ドリンクチケット",
    emoji: "🧋",
    costPt: 80,
    maxEntries: 3,
    seedEntrants: 41,
    winners: 2,
    endsAt: upcoming(3), // 水曜締切
  },
];

// デモ用の当選フィード。本番はサーバーから配信。
export const WINNER_FEED: WinnerFeedItem[] = [
  { id: "w01", title: "マクドナルド バーガーセット", emoji: "🍔", winner: "ペ*", status: "受取受付", agoHours: 2 },
  { id: "w02", title: "サイバーガーセット", emoji: "🍔", winner: "セ*", status: "発送完了", agoHours: 8 },
  { id: "w03", title: "コンビニコーヒー無料券", emoji: "☕️", winner: "ミ****", status: "発送完了", agoHours: 26 },
];

export function formatCountdown(endsAt: number, now: number): string {
  const diff = Math.max(endsAt - now, 0);
  const days = Math.floor(diff / (24 * 3600_000));
  const hours = Math.floor((diff % (24 * 3600_000)) / 3600_000);
  const min = Math.floor((diff % 3600_000) / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  const hh = String(hours).padStart(2, "0");
  const mm = String(min).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return days > 0 ? `${days}日 ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}
