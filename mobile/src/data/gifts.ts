/* ギフト券マーケットのデータ定義。
 * 現金でのC2C売買は詐欺・法規制(古物営業法など)のリスクが大きいため、
 * アプリ内ポイント(チリツモ)を通貨とする設計。交換(物々交換)出品にも対応。
 * MVPではサンプル出品+ローカル保存。本番はサーバー+エスクロー(コード預かり)が必須。
 */

export type GiftBrandId =
  | "amazon"
  | "apple"
  | "google"
  | "starbucks"
  | "quo"
  | "tosho"
  | "conbini"
  | "gurume";

export interface GiftBrand {
  id: GiftBrandId;
  label: string;
  emoji: string;
}

export type ListingType = "sell" | "exchange";

export interface GiftListing {
  id: string;
  brand: GiftBrandId;
  faceValue: number; // 額面(円)
  type: ListingType;
  pricePt?: number; // type=sell: 販売価格(pt)
  wants?: string; // type=exchange: 交換希望の内容
  note?: string;
  seller: string;
  mine?: boolean;
  createdAt: number;
}

/* 出品の取引状態(サンプル出品にも適用できるようIDで別管理) */
export type TradeState = "requested" | "traded";

export const GIFT_BRANDS: GiftBrand[] = [
  { id: "amazon", label: "Amazonギフトカード", emoji: "📦" },
  { id: "apple", label: "Appleギフトカード", emoji: "🍎" },
  { id: "google", label: "Google Play", emoji: "🎮" },
  { id: "starbucks", label: "スタバカード", emoji: "☕️" },
  { id: "quo", label: "QUOカード", emoji: "💳" },
  { id: "tosho", label: "図書カード", emoji: "📚" },
  { id: "conbini", label: "コンビニ商品券", emoji: "🏪" },
  { id: "gurume", label: "グルメ券", emoji: "🍽" },
];

export function giftBrandOf(id: string): GiftBrand | undefined {
  return GIFT_BRANDS.find((b) => b.id === id);
}

const DAY = 24 * 60 * 60 * 1000;

// サンプル出品(デモ用)。本番ではサーバーから取得する。
export const SAMPLE_LISTINGS: GiftListing[] = [
  { id: "m01", brand: "amazon", faceValue: 500, type: "sell", pricePt: 450, note: "バイト先でもらったけど使わないので", seller: "匿名の節約家A", createdAt: Date.now() - 1 * DAY },
  { id: "m02", brand: "starbucks", faceValue: 1000, type: "sell", pricePt: 850, note: "プレゼントでもらったけどコーヒー飲めない…", seller: "匿名の節約家B", createdAt: Date.now() - 2 * DAY },
  { id: "m03", brand: "quo", faceValue: 500, type: "exchange", wants: "図書カード500円分と交換したい", seller: "匿名の節約家C", createdAt: Date.now() - 3 * DAY },
  { id: "m04", brand: "google", faceValue: 1000, type: "sell", pricePt: 900, note: "課金やめました", seller: "匿名の節約家D", createdAt: Date.now() - 3 * DAY },
  { id: "m05", brand: "tosho", faceValue: 1000, type: "exchange", wants: "Amazonギフト券なら額面同等でOK", seller: "匿名の節約家E", createdAt: Date.now() - 5 * DAY },
  { id: "m06", brand: "conbini", faceValue: 500, type: "sell", pricePt: 430, note: "セブン&アイ共通商品券。おつりも出ます", seller: "匿名の節約家F", createdAt: Date.now() - 6 * DAY },
  { id: "m07", brand: "gurume", faceValue: 500, type: "sell", pricePt: 420, note: "ジェフグルメカード。ほぼ全国のファミレスで使える", seller: "匿名の節約家G", createdAt: Date.now() - 7 * DAY },
  { id: "m08", brand: "apple", faceValue: 1500, type: "exchange", wants: "Google Playギフト同額 or 1,300pt", seller: "匿名の節約家H", createdAt: Date.now() - 8 * DAY },
];
