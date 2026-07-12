import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEYS = {
  points: "binbomap.points",
  claimedChunks: (date: string) => `binbomap.claimedChunks.${date}`,
  loginBonus: (date: string) => `binbomap.loginBonus.${date}`,
  androidSteps: (date: string) => `binbomap.androidSteps.${date}`,
  userSpots: "binbomap.userSpots",
  votes: "binbomap.votes",
  ratings: "binbomap.ratings",
  comments: "binbomap.comments",
  favorites: "binbomap.favorites",
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
