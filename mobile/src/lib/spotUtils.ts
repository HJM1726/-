import { Spot } from "../types";

/* SpotMap.tsx と SpotMap.web.tsx の共有コード。
 * 注意: "./SpotMap" からの値のimportはプラットフォーム解決で自分自身を指すため、
 * 共有する実行時コードは必ずこのモジュールに置くこと。
 */

export interface SpotMapProps {
  spots: Spot[];
  onSelectSpot: (spot: Spot) => void;
  onPickLocation: (coord: { lat: number; lng: number }) => void;
  onMapPress: () => void;
}

export interface SpotMapHandle {
  focusSpot: (spot: Spot) => void;
  locateMe: () => Promise<void>;
}

const NEW_BADGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewSpot(spot: Spot): boolean {
  return spot.createdAt != null && Date.now() - spot.createdAt < NEW_BADGE_MS;
}
