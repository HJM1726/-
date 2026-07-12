export const colors = {
  bg: "#f7f6f3",
  surface: "#ffffff",
  text: "#26251f",
  textSub: "#6f6d64",
  border: "#e3e1da",
  primary: "#d9542b",
  primaryDark: "#b83f1c",
  primarySoft: "#fdf0eb",
  free: "#2f8f5b",
  coin: "#d9542b",
  mid: "#d99a2b",
  high: "#8a6d3b",
  point: "#2b7bd9",
};

export function priceColor(price: number): string {
  if (price === 0) return colors.free;
  if (price <= 500) return colors.coin;
  if (price <= 800) return colors.mid;
  return colors.high;
}
