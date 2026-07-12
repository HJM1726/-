export type CategoryId = "teishoku" | "men" | "don" | "bento" | "pan" | "free";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
}

export interface Spot {
  id: string;
  name: string;
  category: CategoryId;
  price: number; // 円。0 = 無料スポット
  lat: number;
  lng: number;
  menu?: string; // メニュー名(例:かけそば)
  hours?: string; // 営業時間
  comment?: string;
  up: number;
  down: number;
  rating?: number; // 平均評価(サンプル用の初期値)
  ratingCount?: number;
  createdAt?: number; // epoch ms(ユーザー投稿。7日以内は new バッジ)
}

export type VoteDir = "up" | "down";
export type VoteMap = Record<string, VoteDir>;
export type RatingMap = Record<string, number>; // spotId -> 自分の星(1-5)

export interface SpotComment {
  id: string;
  text: string;
  at: number; // epoch ms
}
export type CommentMap = Record<string, SpotComment[]>;
