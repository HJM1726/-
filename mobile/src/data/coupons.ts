/* 交換所(B2C)のクーポンカタログ。
 * 참고앱の教訓: ユーザー間(C2C)のギフト券売買は詐欺・古物営業法リスクが大きいため行わず、
 * 運営が用意したクーポンをポイントで交換する方式にする(참고앱の「모바일 쿠폰 교환」와 동일).
 * 下記はブランド提携前のデモデータ。実際の提供には各社との提携・仕入れが必要。 */

export interface Coupon {
  id: string;
  title: string;
  emoji: string;
  costPt: number;
  value: string; // 参考価値の表示
  note?: string;
}

export const COUPONS: Coupon[] = [
  { id: "c01", title: "コンビニコーヒー無料券", emoji: "☕️", costPt: 600, value: "150円相当" },
  { id: "c02", title: "マックポテトS無料券", emoji: "🍟", costPt: 800, value: "190円相当" },
  { id: "c03", title: "からあげクン無料券", emoji: "🍗", costPt: 1000, value: "250円相当" },
  { id: "c04", title: "おにぎり無料券", emoji: "🍙", costPt: 700, value: "180円相当" },
  { id: "c05", title: "Amazonギフトカード 500円分", emoji: "📦", costPt: 2500, value: "500円", note: "在庫限定・月1回まで" },
];

export function couponOf(id: string): Coupon | undefined {
  return COUPONS.find((c) => c.id === id);
}

/** 交換済みクーポン(ローカル保存用) */
export interface MyCoupon {
  id: string; // 交換ID
  couponId: string;
  exchangedAt: number;
  status: "preparing" | "delivered"; // MVPでは常にpreparing(運営手配中)
}
