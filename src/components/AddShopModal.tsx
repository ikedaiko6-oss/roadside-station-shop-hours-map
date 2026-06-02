"use client";

import { useState, useRef, useEffect } from "react";
import { SHOP_TAG_OPTIONS, formatShopDetails, type ShopTagId } from "@/lib/shopTags";
import BusinessHoursInput from "./BusinessHoursInput";
import PhotoBlurEditor from "./PhotoBlurEditor";

export interface ShopFormInput {
  stationName: string;
  shopName: string;
  category: string;
  businessHours: string;
  lastOrder: string;
  closedDays: string;
  confirmedAt: string;
  details: string;
}

interface Props {
  lat: number;
  lng: number;
  initialStationName?: string;
  onClose: () => void;
  onSave: (input: ShopFormInput, imageFile: File | null) => Promise<boolean>;
}

function getRoadsideStationName(name: string | undefined): string {
  const normalized = name?.replace(/\s+/g, " ").trim() ?? "";
  if (!normalized.includes("道の駅")) return "";
  return normalized;
}

export default function AddShopModal({ lat, lng, initialStationName = "", onClose, onSave }: Props) {
  const [stationName, setStationName] = useState(initialStationName);
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [lastOrder, setLastOrder] = useState("");
  const [closedDays, setClosedDays] = useState("");
  const [confirmedAt, setConfirmedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationMemo, setLocationMemo] = useState("");
  const [memo, setMemo] = useState("");
  const [tagIds, setTagIds] = useState<ShopTagId[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blurEditorOpen, setBlurEditorOpen] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [addressLoading, setAddressLoading] = useState(true);
  const [stationLookupLoading, setStationLookupLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    let pendingLookups = 0;

    const finishLookup = () => {
      pendingLookups -= 1;
      if (pendingLookups <= 0 && !cancelled) {
        setAddressLoading(false);
        setStationLookupLoading(false);
      }
    };

    const applyStationName = (name: string | undefined) => {
      const nextName = getRoadsideStationName(name);
      if (!nextName || cancelled) return;
      setStationName((prev) => (prev.trim() ? prev : nextName));
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const googleMaps = (window as any).google?.maps;
      if (!googleMaps) {
        queueMicrotask(() => {
          if (!cancelled) {
            setAddressLoading(false);
            setStationLookupLoading(false);
          }
        });
        return () => {
          cancelled = true;
        };
      }

      pendingLookups += 1;
      const geocoder = new googleMaps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results: any[], status: string) => {
          if (cancelled) return;
          if (status === "OK" && results?.[0]) {
            let address: string = results[0].formatted_address;
            address = address.replace(/^日本、〒\d{3}-\d{4}\s*/, "").replace(/^日本、/, "");
            const nextMemo = `場所メモ: ${address}`;
            setLocationMemo(nextMemo);
            setMemo((prev) => (prev.trim() ? prev : nextMemo));
            const stationResult = results.find((result) =>
              getRoadsideStationName(result?.name || result?.formatted_address)
            );
            applyStationName(stationResult?.name || stationResult?.formatted_address);
          }
          finishLookup();
        }
      );

      if (googleMaps.places?.PlacesService) {
        pendingLookups += 1;
        const service = new googleMaps.places.PlacesService(document.createElement("div"));
        service.nearbySearch(
          {
            location: new googleMaps.LatLng(lat, lng),
            radius: 800,
            keyword: "道の駅",
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (results: any[], status: string) => {
            if (!cancelled && status === googleMaps.places.PlacesServiceStatus.OK && results?.length) {
              const station = results.find((result) => getRoadsideStationName(result?.name)) ?? results[0];
              applyStationName(station?.name);
            }
            finishLookup();
          }
        );
      }
    } catch {
      queueMicrotask(() => {
        if (!cancelled) {
          setAddressLoading(false);
          setStationLookupLoading(false);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
    setPrivacyChecked(false);
  };

  const handleBlurApply = (file: File, previewUrl: string) => {
    setImageFile(file);
    setPreview(previewUrl);
    setPrivacyChecked(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleTag = (id: ShopTagId) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]
    );
  };

  const canSubmit =
    stationName.trim() &&
    shopName.trim() &&
    businessHours.trim() &&
    confirmedAt &&
    (!imageFile || privacyChecked);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    const saved = await onSave(
      {
        stationName: stationName.trim(),
        shopName: shopName.trim(),
        category: category.trim(),
        businessHours: businessHours.trim(),
        lastOrder: lastOrder.trim(),
        closedDays: closedDays.trim(),
        confirmedAt,
        details: formatShopDetails(tagIds, memo),
      },
      imageFile
    );
    setSaving(false);
    if (!saved) return;

    setSavedOnce(true);
    setShopName("");
    setCategory("");
    setBusinessHours("");
    setLastOrder("");
    setMemo(locationMemo);
    setTagIds([]);
    setImageFile(null);
    setPreview(null);
    setPrivacyChecked(false);
    setBlurEditorOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">お店の営業時間を登録</h2>
          <p className="text-xs text-gray-400 mb-4">
            位置: {lat.toFixed(5)}, {lng.toFixed(5)}
            {addressLoading || stationLookupLoading ? " / 周辺情報を確認中..." : ""}
          </p>
          {savedOnce && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              登録しました。続けて同じ道の駅のお店を追加できます。
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  道の駅名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="例：道の駅 〇〇"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={80}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  店名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="例：食堂、直売所、パン工房"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={80}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ（任意）</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="例：食堂、カフェ、直売所"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={40}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  現地確認日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={confirmedAt}
                  onChange={(e) => setConfirmedAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
            <BusinessHoursInput value={businessHours} onChange={setBusinessHours} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ラストオーダー</label>
                <input
                  type="text"
                  value={lastOrder}
                  onChange={(e) => setLastOrder(e.target.value)}
                  placeholder="例：16:30"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={40}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">定休日</label>
                <input
                  type="text"
                  value={closedDays}
                  onChange={(e) => setClosedDays(e.target.value)}
                  placeholder="例：水曜"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={80}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">特徴タグ（任意）</label>
              <div className="grid grid-cols-2 gap-2">
                {SHOP_TAG_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={tagIds.includes(option.id)}
                      onChange={() => toggleTag(option.id)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">補足メモ（任意）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例：祝日は時間変更あり。売り切れ次第終了。"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={2}
                maxLength={240}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">営業時間表の写真（任意）</label>
              {preview ? (
                <div className="space-y-2">
                  <div className="relative">
                    <img
                      src={preview}
                      alt="プレビュー"
                      className="w-full h-36 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setPreview(null);
                        setPrivacyChecked(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
                    >
                      x
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlurEditorOpen(true)}
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    写真の一部を隠す
                  </button>
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">投稿前に必ず確認してください</p>
                    <p className="mt-1 text-xs text-amber-800">
                      人の顔、車のナンバー、個人情報が写っている場合はモザイクしてください。
                    </p>
                    <label className="mt-2 flex items-start gap-2 text-sm text-amber-950">
                      <input
                        type="checkbox"
                        checked={privacyChecked}
                        onChange={(e) => setPrivacyChecked(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-amber-600"
                      />
                      <span>写り込みを確認しました。必要な部分は隠しました。</span>
                    </label>
                  </div>
                </div>
              ) : (
                <label className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-sm text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition flex items-center justify-center gap-2 cursor-pointer">
                  写真を追加
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                {savedOnce ? "終了" : "キャンセル"}
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {saving ? "登録中..." : "登録する"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {blurEditorOpen && imageFile && preview && (
        <PhotoBlurEditor
          file={imageFile}
          previewUrl={preview}
          onApply={handleBlurApply}
          onClose={() => setBlurEditorOpen(false)}
        />
      )}
    </div>
  );
}
