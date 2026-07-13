import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEYS = {
  points: "binbomap.points",
  claimedMilestones: (date: string) => `binbomap.claimedMilestones.${date}`,
  loginBonus: (date: string) => `binbomap.loginBonus.${date}`,
  roulette: (date: string) => `binbomap.roulette.${date}`,
  chest: (date: string) => `binbomap.chest.${date}`,
  androidSteps: (date: string) => `binbomap.androidSteps.${date}`,
  raffleEntries: "binbomap.raffleEntries",
  userSpots: "binbomap.userSpots",
  votes: "binbomap.votes",
  ratings: "binbomap.ratings",
  comments: "binbomap.comments",
  favorites: "binbomap.favorites",
  guideQuiz: "binbomap.guideQuiz",
  guideRead: "binbomap.guideRead",
  giftListings: "binbomap.giftListings",
  giftTrades: "binbomap.giftTrades",
};

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
