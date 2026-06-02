"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";
import type { ShopFormInput } from "@/components/AddShopModal";
import type { StationShopRecord } from "@/components/StationShopMap";

const StationShopMap = dynamic(() => import("@/components/StationShopMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-400">地図を読み込み中...</p>
    </div>
  ),
});

const SHOP_SELECT =
  "id, station_name, shop_name, category, business_hours, last_order, closed_days, details, latitude, longitude, user_id, image_url, photo_uploaded_at, confirmed_at, created_at";

const DEMO_SHOPS: StationShopRecord[] = [
  {
    id: "demo-restaurant",
    stationName: "道の駅サンプル",
    shopName: "食堂サンプル",
    category: "食堂",
    businessHours: "11:00-15:00",
    lastOrder: "14:30",
    closedDays: "水曜",
    details: "タグ: 食堂, LO確認済み\nメモ: デモ表示です。実際の営業時間ではありません。",
    lat: 35.6812,
    lng: 139.7671,
    confirmedAt: "2026-06-02",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "demo-market",
    stationName: "道の駅サンプル",
    shopName: "直売所サンプル",
    category: "直売所",
    businessHours: "9:00-17:00",
    closedDays: "年末年始",
    details: "タグ: 直売所, 営業時間表あり\nメモ: デモ表示です。投稿フォームと地図表示の確認用です。",
    lat: 35.684,
    lng: 139.764,
    confirmedAt: "2026-06-02",
    createdAt: "2026-06-02T00:00:00.000Z",
  },
];

interface Props {
  shops: StationShopRecord[];
  user: User | null;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(raw: string | null | undefined): string {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const normalizedLocal = local.split("+")[0].replace(/\./g, "");
    return `${normalizedLocal}@gmail.com`;
  }
  return email;
}

function mapShopRow(row: Record<string, unknown>): StationShopRecord {
  return {
    id: row.id as string,
    stationName: (row.station_name as string) ?? "",
    shopName: (row.shop_name as string) ?? "",
    category: (row.category as string) ?? "",
    businessHours: (row.business_hours as string) ?? "",
    lastOrder: (row.last_order as string) ?? "",
    closedDays: (row.closed_days as string) ?? "",
    details: (row.details as string) ?? "",
    lat: row.latitude as number,
    lng: row.longitude as number,
    imageUrl: (row.image_url as string) ?? undefined,
    photoUploadedAt: (row.photo_uploaded_at as string) ?? undefined,
    confirmedAt: (row.confirmed_at as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    userId: (row.user_id as string) ?? "",
  };
}

function toTokyoDateKey(date: string | Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function toPayload(input: ShopFormInput): Record<string, unknown> {
  return {
    station_name: input.stationName,
    shop_name: input.shopName,
    category: input.category || null,
    business_hours: input.businessHours,
    last_order: input.lastOrder || null,
    closed_days: input.closedDays || null,
    confirmed_at: input.confirmedAt,
    details: input.details,
  };
}

export default function HomeClient({ shops: initialShops, user }: Props) {
  const supabaseConfigured = isSupabaseConfigured();
  const [shops, setShops] = useState(() =>
    supabaseConfigured ? initialShops : DEMO_SHOPS
  );
  const [toast, setToast] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [currentUserId, setCurrentUserId] = useState<string | null>(user?.id ?? null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(
    normalizeEmail(user?.email) || null
  );
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const defaultAdminEmails = useMemo(() => ["ikedaiko1@gmail.com"], []);
  const adminEmails = useMemo(
    () =>
      Array.from(
        new Set(
          [...defaultAdminEmails, ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)].map((v) =>
            normalizeEmail(v)
          )
        )
      ),
    [defaultAdminEmails]
  );
  const adminUserIds = useMemo(
    () => parseCsv(process.env.NEXT_PUBLIC_ADMIN_USER_IDS),
    []
  );
  const isLoggedIn = !!currentUserId;
  const todayCount = useMemo(() => {
    const todayKey = toTokyoDateKey(new Date());
    return shops.filter((shop) => shop.createdAt && toTokyoDateKey(shop.createdAt) === todayKey).length;
  }, [shops]);
  const stationCount = useMemo(
    () => new Set(shops.map((shop) => shop.stationName).filter(Boolean)).size,
    [shops]
  );
  const isAdmin = useMemo(() => {
    const email = normalizeEmail(currentUserEmail);
    const userId = currentUserId?.toLowerCase() ?? "";
    const localPart = email.split("@")[0] ?? "";
    return (
      adminEmails.includes(email) ||
      adminUserIds.includes(userId) ||
      localPart === "ikedaiko1"
    );
  }, [adminEmails, adminUserIds, currentUserEmail, currentUserId]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

    const applyUser = (nextUser: User | null) => {
      setCurrentUserId(nextUser?.id ?? null);
      const metadataEmail = (nextUser?.user_metadata?.email as string | undefined) ?? null;
      setCurrentUserEmail(normalizeEmail(nextUser?.email ?? metadataEmail) || null);
    };

    supabase.auth.getUser().then(({ data }) => {
      applyUser(data.user);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

    supabase
      .from("roadside_station_shops")
      .select(SHOP_SELECT)
      .order("confirmed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          showToast("お店情報の取得に失敗しました: " + error.message);
          return;
        }
        setShops(((data as unknown as Record<string, unknown>[]) ?? []).map(mapShopRow));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseConfigured]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!supabaseConfigured) {
      showToast("Supabase環境変数が未設定です");
      return null;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      showToast("ログインが必要です");
      return null;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${authUser.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("station-shop-photos")
      .upload(path, file);
    if (error) {
      showToast("画像のアップロードに失敗しました: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("station-shop-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = useCallback(
    async (lat: number, lng: number, input: ShopFormInput, imageFile: File | null) => {
      if (!supabaseConfigured) {
        showToast("Supabase環境変数が未設定です");
        return false;
      }

      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) return false;
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("roadside_station_shops")
        .insert({
          ...toPayload(input),
          latitude: lat,
          longitude: lng,
          user_id: currentUserId,
          image_url: imageUrl,
          ...(imageUrl ? { photo_uploaded_at: now } : {}),
        })
        .select(SHOP_SELECT)
        .single();

      if (error) {
        showToast("登録に失敗しました: " + error.message);
        return false;
      }
      if (data) {
        setShops((prev) => [mapShopRow(data as unknown as Record<string, unknown>), ...prev]);
        showToast("お店の営業時間を登録しました");
        return true;
      }
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, currentUserId, supabaseConfigured]
  );

  const handleUpdate = useCallback(
    async (id: string, input: ShopFormInput, imageFile: File | null) => {
      if (!supabaseConfigured) {
        showToast("Supabase環境変数が未設定です");
        return;
      }

      let imageUrl: string | undefined;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (!uploaded) return;
        imageUrl = uploaded;
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = toPayload(input);
      if (imageUrl) {
        updatePayload.image_url = imageUrl;
        updatePayload.photo_uploaded_at = now;
      }

      const { data, error } = await supabase
        .from("roadside_station_shops")
        .update(updatePayload)
        .eq("id", id)
        .select(SHOP_SELECT)
        .single();

      if (error) {
        showToast("更新に失敗しました: " + error.message);
        return;
      }
      if (data) {
        const updated = mapShopRow(data as unknown as Record<string, unknown>);
        setShops((prev) => prev.map((shop) => (shop.id === id ? updated : shop)));
        showToast("更新しました");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, supabaseConfigured]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!supabaseConfigured) {
        showToast("Supabase環境変数が未設定です");
        return;
      }

      const { error } = await supabase.from("roadside_station_shops").delete().eq("id", id);
      if (error) {
        showToast("削除に失敗しました: " + error.message);
        return;
      }
      setShops((prev) => prev.filter((shop) => shop.id !== id));
      showToast("削除しました");
    },
    [supabase, showToast, supabaseConfigured]
  );

  const handleSignOut = async () => {
    if (!supabaseConfigured) return;
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 flex h-dvh min-h-dvh flex-col overflow-hidden bg-white">
      <header className="z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-white px-3 py-2 shadow-sm sm:gap-3 sm:px-4 sm:py-3">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xl">駅</span>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-base sm:text-lg truncate">道の駅お店時間マップ</h1>
            <p className="hidden sm:block text-[11px] text-gray-500">
              道の駅全体ではなく、入っているお店の営業時間を集める地図
            </p>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            店 {shops.length}件
          </span>
          <span className="hidden sm:inline text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            駅 {stationCount}件
          </span>
          <span className="hidden md:inline text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            今日 {todayCount}件
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {authLoading ? (
            <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5">
              確認中...
            </span>
          ) : isLoggedIn ? (
            <>
              <span className="text-xs text-gray-500 hidden lg:block">
                {currentUserEmail ?? user?.email ?? ""}
              </span>
              {isAdmin && (
                <span className="text-[10px] text-purple-700 bg-purple-100 border border-purple-200 rounded-full px-2 py-0.5">
                  管理者
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-500 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition font-medium"
            >
              ログインして投稿
            </button>
          )}
        </div>
      </header>

      {isLoggedIn && (
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-1.5 text-xs text-emerald-700 text-center">
          地図をタップ・クリックして、道の駅内のお店の営業時間を登録できます
        </div>
      )}

      {!supabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-xs text-amber-800 text-center">
          デモ表示中です。Supabase環境変数を設定すると、投稿・ログイン・データ取得が使えます
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <StationShopMap
          shops={shops}
          isLoggedIn={isLoggedIn}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
        <a
          href="/privacy"
          className="absolute bottom-1 right-2 z-30 rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-600 hover:underline"
        >
          プライバシー
        </a>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
