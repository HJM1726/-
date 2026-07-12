import { Category, Spot } from "../types";

export const CATEGORIES: Category[] = [
  { id: "teishoku", label: "定食・食堂", emoji: "🍱" },
  { id: "men", label: "麺類", emoji: "🍜" },
  { id: "don", label: "丼・カレー", emoji: "🍛" },
  { id: "bento", label: "弁当・惣菜", emoji: "🍙" },
  { id: "pan", label: "パン・軽食", emoji: "🥐" },
  { id: "free", label: "無料スポット", emoji: "🆓" },
];

export function categoryOf(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

// サンプルデータ(東京中心)。座標・価格・評価はデモ用の概算値。
// 本番ではユーザー投稿 + 審査済みデータに置き換える。
export const SAMPLE_SPOTS: Spot[] = [
  { id: "s01", name: "名代 富士そば 新宿店", category: "men", price: 480, lat: 35.6906, lng: 139.7004, menu: "かけそば", hours: "24時間営業", comment: "24時間営業でいつでも安い", up: 42, down: 3, rating: 4.1, ratingCount: 18 },
  { id: "s02", name: "松屋 渋谷店", category: "don", price: 430, lat: 35.6586, lng: 139.7005, menu: "牛めし(並)", hours: "24時間営業", comment: "味噌汁無料が神", up: 38, down: 5, rating: 4.0, ratingCount: 22 },
  { id: "s03", name: "日高屋 池袋東口店", category: "men", price: 420, lat: 35.7295, lng: 139.7146, menu: "中華そば", hours: "10:30-23:00", comment: "餃子とセットでも700円台", up: 29, down: 4, rating: 3.8, ratingCount: 15 },
  { id: "s04", name: "すき家 秋葉原駅前店", category: "don", price: 450, lat: 35.6997, lng: 139.7714, menu: "牛丼(並)", hours: "24時間営業", comment: "朝食セットも安い", up: 25, down: 2, rating: 3.9, ratingCount: 12 },
  { id: "s05", name: "サイゼリヤ 上野店", category: "teishoku", price: 500, lat: 35.7089, lng: 139.7753, menu: "ランチセット", hours: "11:00-22:00", comment: "ミラノ風ドリア300円", up: 51, down: 1, rating: 4.5, ratingCount: 31 },
  { id: "s06", name: "しんぱち食堂 新宿店", category: "teishoku", price: 790, lat: 35.6938, lng: 139.7034, menu: "炭火焼き魚定食", hours: "7:00-23:00", comment: "ご飯おかわり無料", up: 33, down: 6, rating: 4.2, ratingCount: 14 },
  { id: "s07", name: "スーパーの半額弁当(ライフ 神田和泉町店)", category: "bento", price: 300, lat: 35.6988, lng: 139.7756, menu: "半額弁当", hours: "9:30-24:00", comment: "20時以降は弁当半額シールが出る", up: 47, down: 2, rating: 4.6, ratingCount: 9 },
  { id: "s08", name: "山田うどん食堂 大森店", category: "men", price: 400, lat: 35.5883, lng: 139.7278, menu: "かけうどん", hours: "6:00-23:00", comment: "パンチ(もつ煮)も安い", up: 18, down: 3, rating: 3.7, ratingCount: 8 },
  { id: "s09", name: "カレーショップC&C 新宿本店", category: "don", price: 550, lat: 35.6896, lng: 139.6995, menu: "ポークカレー", hours: "10:00-22:30", comment: "提供が速い", up: 22, down: 4, rating: 3.9, ratingCount: 11 },
  { id: "s10", name: "まいばすけっと 100円パンコーナー", category: "pan", price: 100, lat: 35.665, lng: 139.7101, menu: "菓子パン各種", hours: "7:00-24:00", comment: "朝ごはんに", up: 15, down: 1, rating: 3.6, ratingCount: 6 },
  { id: "s11", name: "東京都庁 展望室", category: "free", price: 0, lat: 35.6896, lng: 139.6921, hours: "9:30-22:00(北展望室)", comment: "無料で東京一望。デートにも使える", up: 64, down: 2, rating: 4.7, ratingCount: 40 },
  { id: "s12", name: "皇居東御苑", category: "free", price: 0, lat: 35.6864, lng: 139.7563, hours: "9:00-17:00(月・金休園)", comment: "入園無料。弁当持参でピクニック", up: 40, down: 1, rating: 4.5, ratingCount: 21 },
  { id: "s13", name: "上野恩賜公園", category: "free", price: 0, lat: 35.7148, lng: 139.7737, hours: "5:00-23:00", comment: "無料。ベンチで半額弁当を食べる聖地", up: 35, down: 2, rating: 4.4, ratingCount: 26 },
  { id: "s14", name: "やよい軒 神保町店", category: "teishoku", price: 890, lat: 35.6959, lng: 139.7575, menu: "しょうが焼定食", hours: "10:00-23:00", comment: "ご飯おかわり自由", up: 27, down: 5, rating: 4.1, ratingCount: 17 },
  { id: "s15", name: "小諸そば 日本橋店", category: "men", price: 460, lat: 35.6813, lng: 139.7744, menu: "二枚もり", hours: "7:00-20:00", comment: "そばつゆが上品", up: 19, down: 2, rating: 3.8, ratingCount: 10 },
];
