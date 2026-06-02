export const SHOP_TAG_OPTIONS = [
  { id: "restaurant", label: "食堂" },
  { id: "cafe", label: "カフェ" },
  { id: "market", label: "直売所" },
  { id: "souvenir", label: "売店" },
  { id: "bakery", label: "パン" },
  { id: "sweets", label: "スイーツ" },
  { id: "takeout", label: "テイクアウト" },
  { id: "hot_spring", label: "温泉" },
  { id: "hours_photo", label: "営業時間表あり" },
  { id: "last_order_checked", label: "LO確認済み" },
] as const;

export type ShopTagId = (typeof SHOP_TAG_OPTIONS)[number]["id"];

const tagLabels = new Map<ShopTagId, string>(
  SHOP_TAG_OPTIONS.map((option) => [option.id, option.label])
);
const tagIdsByLabel = new Map<string, ShopTagId>(
  SHOP_TAG_OPTIONS.map((option) => [option.label, option.id])
);

export function parseShopDetails(details: string | undefined): {
  memo: string;
  tagIds: ShopTagId[];
  tagLabels: string[];
} {
  const lines = (details ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const tagLine = lines.find((line) => line.startsWith("タグ:"));
  const tagIds = tagLine
    ? tagLine
        .replace(/^タグ:\s*/, "")
        .split(",")
        .map((label) => tagIdsByLabel.get(label.trim()))
        .filter((id): id is ShopTagId => Boolean(id))
    : [];
  const memoLines = lines
    .filter((line) => !line.startsWith("タグ:"))
    .map((line) => line.replace(/^メモ:\s*/, ""));

  return {
    memo: memoLines.join("\n"),
    tagIds,
    tagLabels: tagIds.map((id) => tagLabels.get(id) ?? id),
  };
}

export function formatShopDetails(tagIds: ShopTagId[], memo: string): string {
  const uniqueTagIds = Array.from(new Set(tagIds));
  const labels = uniqueTagIds
    .map((id) => tagLabels.get(id))
    .filter((label): label is string => Boolean(label));
  const parts = [];

  if (labels.length > 0) {
    parts.push(`タグ: ${labels.join(", ")}`);
  }

  const trimmedMemo = memo.trim();
  if (trimmedMemo) {
    parts.push(`メモ: ${trimmedMemo}`);
  }

  return parts.join("\n");
}
