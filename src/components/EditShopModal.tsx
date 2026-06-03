"use client";

import { useState, useRef } from "react";
import {
  SHOP_TAG_OPTIONS,
  formatShopDetails,
  parseShopDetails,
  type ShopTagId,
} from "@/lib/shopTags";
import BusinessHoursInput from "./BusinessHoursInput";
import ClosedDaysInput from "./ClosedDaysInput";
import PhotoBlurEditor from "./PhotoBlurEditor";
import type { ShopFormInput } from "./AddShopModal";

export interface StationShop {
  id: string;
  stationName: string;
  shopName: string;
  category?: string;
  businessHours: string;
  lastOrder?: string;
  closedDays?: string;
  details?: string;
  confirmedAt?: string;
  imageUrl?: string;
  lat: number;
  lng: number;
}

interface Props {
  shop: StationShop;
  onClose: () => void;
  onSave: (id: string, input: ShopFormInput, imageFile: File | null) => Promise<void>;
}

export default function EditShopModal({ shop, onClose, onSave }: Props) {
  const parsedDetails = parseShopDetails(shop.details);
  const [stationName, setStationName] = useState(shop.stationName);
  const [shopName, setShopName] = useState(shop.shopName);
  const [category, setCategory] = useState(shop.category ?? "");
  const [businessHours, setBusinessHours] = useState(shop.businessHours);
  const [lastOrder, setLastOrder] = useState(shop.lastOrder ?? "");
  const [closedDays, setClosedDays] = useState(shop.closedDays ?? "");
  const [confirmedAt, setConfirmedAt] = useState(
    shop.confirmedAt ? shop.confirmedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [memo, setMemo] = useState(parsedDetails.memo);
  const [tagIds, setTagIds] = useState<ShopTagId[]>(parsedDetails.tagIds);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(shop.imageUrl ?? null);
  const [blurEditorOpen, setBlurEditorOpen] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
    setPrivacyChecked(false);
    setImageError(null);
  };

  const handleBlurApply = (file: File, previewUrl: string) => {
    setImageFile(file);
    setPreview(previewUrl);
    setPrivacyChecked(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startBlurEditor = async () => {
    if (imageFile) {
      setBlurEditorOpen(true);
      return;
    }

    if (!shop.imageUrl) return;

    setImageLoading(true);
    setImageError(null);
    try {
      const response = await fetch(shop.imageUrl, { mode: "cors" });
      if (!response.ok) throw new Error("画像を取得できませんでした");
      const blob = await response.blob();
      const type = blob.type || "image/jpeg";
      const extension = type === "image/png" ? "png" : "jpg";
      const file = new File([blob], `current-photo.${extension}`, { type });
      const previewUrl = URL.createObjectURL(file);
      setImageFile(file);
      setPreview(previewUrl);
      setPrivacyChecked(false);
      setBlurEditorOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setImageError("この写真を直接編集できませんでした。写真を選び直してからモザイクしてください。");
    } finally {
      setImageLoading(false);
    }
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
    await onSave(
      shop.id,
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
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">お店の営業時間を編集</h2>
          <p className="text-xs text-gray-400 mb-4">
            位置: {shop.lat.toFixed(5)}, {shop.lng.toFixed(5)}
          </p>
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  maxLength={40}
                />
              </div>
            </div>
            <ClosedDaysInput value={closedDays} onChange={setClosedDays} />
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
                  {(imageFile || shop.imageUrl) && (
                    <button
                      type="button"
                      onClick={startBlurEditor}
                      disabled={imageLoading}
                      className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      {imageLoading ? "写真を準備中..." : "この写真をモザイク編集"}
                    </button>
                  )}
                  {imageError && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {imageError}
                    </p>
                  )}
                  {imageFile && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                      <p className="text-sm font-medium text-amber-900">保存前に必ず確認してください</p>
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
                  )}
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
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="flex-1 bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
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
