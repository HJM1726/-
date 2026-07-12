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
  comment?: string;
  up: number;
  down: number;
}

export type VoteDir = "up" | "down";
export type VoteMap = Record<string, VoteDir>;
