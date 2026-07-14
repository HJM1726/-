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

// 地域ジャンプ用の主要都市
export interface Region {
  id: string;
  label: string;
  lat: number;
  lng: number;
}
export const REGIONS: Region[] = [
  { id: "tokyo", label: "東京", lat: 35.6895, lng: 139.7005 },
  { id: "kyoto", label: "京都", lat: 35.0038, lng: 135.7585 },
  { id: "osaka", label: "大阪", lat: 34.6687, lng: 135.5013 },
];

// サンプルデータ(東京・京都・大阪の中心部)。座標・価格・評価はデモ用の概算値。
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

  // ---- 京都中心部 ----
  { id: "s16", name: "餃子の王将 四条大宮店", category: "men", price: 750, lat: 35.0031, lng: 135.7472, menu: "餃子+ラーメンセット", hours: "11:00-22:00", comment: "王将1号店(発祥の地)。京都学生の聖地", up: 58, down: 3, rating: 4.4, ratingCount: 35 },
  { id: "s17", name: "なか卯 四条烏丸店", category: "don", price: 490, lat: 35.0039, lng: 135.7597, menu: "親子丼(並)", hours: "24時間営業", comment: "京都発祥チェーン。親子丼490円", up: 31, down: 4, rating: 4.0, ratingCount: 16 },
  { id: "s18", name: "サイゼリヤ 河原町三条店", category: "teishoku", price: 500, lat: 35.0089, lng: 135.7685, menu: "ランチセット", hours: "11:00-23:00", comment: "観光地価格の京都で貴重な500円ランチ", up: 27, down: 2, rating: 4.2, ratingCount: 13 },
  { id: "s19", name: "京都大学 中央食堂", category: "teishoku", price: 550, lat: 35.0262, lng: 135.7808, menu: "日替わり定食", hours: "8:00-21:00(学外者も利用可)", comment: "学食は誰でも入れる。安くて量が多い", up: 44, down: 1, rating: 4.5, ratingCount: 22 },
  { id: "s20", name: "フレスコ 河原町店(半額弁当)", category: "bento", price: 300, lat: 35.0102, lng: 135.7690, menu: "半額シール弁当", hours: "24時間営業", comment: "21時以降に弁当半額シール。京都の一人暮らしの味方", up: 39, down: 2, rating: 4.3, ratingCount: 11 },
  { id: "s21", name: "鴨川デルタ", category: "free", price: 0, lat: 35.0300, lng: 135.7727, hours: "終日", comment: "無料。飛び石と芝生。コンビニ飯を持って集合", up: 71, down: 1, rating: 4.8, ratingCount: 48 },
  { id: "s22", name: "京都御苑", category: "free", price: 0, lat: 35.0254, lng: 135.7621, hours: "終日(御所参観は9:00-16:00)", comment: "入園無料。広大な芝生でピクニック", up: 42, down: 1, rating: 4.6, ratingCount: 25 },

  // ---- 大阪中心部 ----
  { id: "s23", name: "松屋 なんば店", category: "don", price: 430, lat: 34.6654, lng: 135.5010, menu: "牛めし(並)", hours: "24時間営業", comment: "ミナミで朝まで開いてる安定の松屋", up: 24, down: 3, rating: 3.9, ratingCount: 12 },
  { id: "s24", name: "たこ焼道楽わなか 千日前本店", category: "pan", price: 600, lat: 34.6633, lng: 135.5063, menu: "たこ焼き8個", hours: "10:30-23:00", comment: "大阪の粉もんで一食完結。行列でも回転速い", up: 49, down: 5, rating: 4.3, ratingCount: 29 },
  { id: "s25", name: "スーパー玉出 天下茶屋店", category: "bento", price: 300, lat: 34.6402, lng: 135.4938, menu: "激安弁当", hours: "24時間営業", comment: "大阪名物の激安スーパー。1円セールは伝説", up: 53, down: 6, rating: 4.0, ratingCount: 19 },
  { id: "s26", name: "自由軒 難波本店", category: "don", price: 900, lat: 34.6660, lng: 135.5023, menu: "名物カレー", hours: "11:20-20:00(月休)", comment: "創業1910年。生卵のせ混ぜカレー", up: 36, down: 7, rating: 4.1, ratingCount: 24 },
  { id: "s27", name: "サイゼリヤ 梅田店", category: "teishoku", price: 500, lat: 34.7025, lng: 135.4959, menu: "ランチセット", hours: "11:00-23:00", comment: "キタで500円ランチ。学生で常に混雑", up: 22, down: 2, rating: 4.1, ratingCount: 10 },
  { id: "s28", name: "大阪城公園", category: "free", price: 0, lat: 34.6873, lng: 135.5262, hours: "終日(天守閣は有料)", comment: "公園は無料。芝生で弁当ピクニック", up: 47, down: 2, rating: 4.5, ratingCount: 31 },
  { id: "s29", name: "中之島公園", category: "free", price: 0, lat: 34.6939, lng: 135.5063, hours: "終日", comment: "無料。川沿いでテイクアウト飯が捗る", up: 33, down: 1, rating: 4.4, ratingCount: 17 },
];
