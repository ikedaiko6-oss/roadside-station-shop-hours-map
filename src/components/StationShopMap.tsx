"use client";

import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  useAdvancedMarkerRef,
  useMap,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddShopModal, { type ShopFormInput } from "./AddShopModal";
import EditShopModal, { type StationShop } from "./EditShopModal";
import { parseShopDetails } from "@/lib/shopTags";

export interface StationShopRecord extends StationShop {
  photoUploadedAt?: string;
  createdAt?: string;
  userId?: string;
}

interface Props {
  shops: StationShopRecord[];
  isLoggedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  onAdd: (lat: number, lng: number, input: ShopFormInput, imageFile: File | null) => Promise<void>;
  onUpdate: (id: string, input: ShopFormInput, imageFile: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const GOOGLE_MAP_LIBRARIES = ["places"];

function formatDate(value: string | undefined): string {
  if (!value) return "未確認";
  return new Date(value).toLocaleDateString("ja-JP");
}

function getInitialCenter(shops: StationShopRecord[]) {
  if (shops.length === 0) return { lat: 35.6812, lng: 139.7671 };
  return {
    lat: shops.reduce((sum, shop) => sum + shop.lat, 0) / shops.length,
    lng: shops.reduce((sum, shop) => sum + shop.lng, 0) / shops.length,
  };
}

function getDistanceMeters(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearbyStationName(shops: StationShopRecord[], pos: { lat: number; lng: number }) {
  const nearest = shops
    .filter((shop) => shop.stationName.trim())
    .map((shop) => ({
      stationName: shop.stationName,
      distance: getDistanceMeters(pos, { lat: shop.lat, lng: shop.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest && nearest.distance <= 1000 ? nearest.stationName : "";
}

function ShopMarker({
  shop,
  canManage,
  onUpdate,
  onDelete,
}: {
  shop: StationShopRecord;
  canManage: boolean;
  onUpdate: (id: string, input: ShopFormInput, imageFile: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const parsedDetails = parseShopDetails(shop.details);

  const handleDelete = async () => {
    if (!confirm("このお店情報を削除しますか？")) return;
    setDeleting(true);
    await onDelete(shop.id);
    setDeleting(false);
    setOpen(false);
  };

  const handleEditSave = async (id: string, input: ShopFormInput, imageFile: File | null) => {
    await onUpdate(id, input, imageFile);
    setEditing(false);
    setOpen(false);
  };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: shop.lat, lng: shop.lng }}
        onClick={() => setOpen(true)}
      >
        <img
          src="/marker-station-shop.svg"
          alt="道の駅のお店"
          className="h-11 w-11 cursor-pointer select-none drop-shadow"
          draggable={false}
        />
      </AdvancedMarker>

      {open && (
        <InfoWindow anchor={marker} onClose={() => setOpen(false)} pixelOffset={[0, -8]}>
          <div className="w-[260px] p-1">
            {shop.imageUrl && (
              <>
                <img
                  src={shop.imageUrl}
                  alt={shop.shopName}
                  className="mb-2 h-28 w-full cursor-zoom-in rounded-lg object-cover"
                  onClick={() => setFullscreen(true)}
                />
                {shop.photoUploadedAt && (
                  <p className="mb-2 text-xs text-gray-400">写真投稿日: {formatDate(shop.photoUploadedAt)}</p>
                )}
              </>
            )}
            <p className="text-[11px] font-medium text-emerald-700">{shop.stationName}</p>
            <p className="text-sm font-bold text-gray-900">{shop.shopName}</p>
            {shop.category && <p className="mt-0.5 text-xs text-gray-500">{shop.category}</p>}
            <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2">
              <p className="text-sm font-bold text-emerald-900">{shop.businessHours}</p>
              <div className="mt-1 space-y-0.5 text-xs text-emerald-800">
                {shop.lastOrder && <p>LO: {shop.lastOrder}</p>}
                {shop.closedDays && <p>休み: {shop.closedDays}</p>}
                <p>確認日: {formatDate(shop.confirmedAt)}</p>
              </div>
            </div>
            {parsedDetails.tagLabels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {parsedDetails.tagLabels.map((label) => (
                  <span key={label} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                    {label}
                  </span>
                ))}
              </div>
            )}
            {parsedDetails.memo && (
              <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">{parsedDetails.memo}</p>
            )}
            {canManage && (
              <div className="mt-2 flex items-center gap-3 border-t border-gray-100 pt-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setEditing(true);
                  }}
                  className="text-xs text-emerald-600 transition hover:text-emerald-800"
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-500 transition hover:text-red-700 disabled:opacity-50"
                >
                  {deleting ? "削除中..." : "削除"}
                </button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {editing && (
        <EditShopModal shop={shop} onClose={() => setEditing(false)} onSave={handleEditSave} />
      )}

      {fullscreen && shop.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setFullscreen(false)}
        >
          <img src={shop.imageUrl} alt={shop.shopName} className="max-h-full max-w-full object-contain" />
          <button
            className="absolute right-4 top-4 text-3xl leading-none text-white"
            onClick={() => setFullscreen(false)}
          >
            x
          </button>
        </div>
      )}
    </>
  );
}

function CurrentLocationTracker() {
  const map = useMap();
  const watchIdRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      hasCenteredRef.current = false;
      setTracking(false);
      setLocating(false);
      return;
    }

    setLocating(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!hasCenteredRef.current) {
          map?.panTo(next);
          map?.setZoom(16);
          hasCenteredRef.current = true;
        }
        setCurrentPos(next);
        setLocating(false);
        setTracking(true);
      },
      () => {
        setLocating(false);
        setTracking(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        hasCenteredRef.current = false;
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  return (
    <>
      {currentPos && (
        <AdvancedMarker position={currentPos}>
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute h-8 w-8 rounded-full bg-blue-500/20" />
            <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
          </div>
        </AdvancedMarker>
      )}
      <button
        type="button"
        onClick={handleLocate}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+3.25rem)] right-4 z-10 min-h-14 min-w-[112px] touch-manipulation rounded-full bg-white px-5 text-sm font-semibold shadow-lg transition hover:bg-gray-50 active:bg-gray-100"
        title={tracking ? "現在地追跡を停止" : "現在地追跡を開始"}
      >
        {locating ? "取得中..." : tracking ? "追跡中" : "現在地"}
      </button>
    </>
  );
}

function GoogleMapInner({
  shops,
  isLoggedIn,
  currentUserId,
  isAdmin,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [pendingPos, setPendingPos] = useState<{ lat: number; lng: number } | null>(null);
  const center = useMemo(() => getInitialCenter(shops), [shops]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      if (!isLoggedIn || !event.detail.latLng) return;
      setPendingPos({ lat: event.detail.latLng.lat, lng: event.detail.latLng.lng });
    },
    [isLoggedIn]
  );

  const handleSave = async (input: ShopFormInput, imageFile: File | null) => {
    if (!pendingPos) return;
    await onAdd(pendingPos.lat, pendingPos.lng, input, imageFile);
    setPendingPos(null);
  };

  return (
    <>
      <Map
        mapId="roadside-station-shop-map"
        defaultCenter={center}
        defaultZoom={shops.length > 0 ? 13 : 8}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        className="h-full w-full"
        onClick={handleMapClick}
      >
        {shops.map((shop) => (
          <ShopMarker
            key={shop.id}
            shop={shop}
            canManage={isAdmin || (!!currentUserId && shop.userId === currentUserId)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
        <CurrentLocationTracker />
      </Map>

      {pendingPos && (
        <AddShopModal
          lat={pendingPos.lat}
          lng={pendingPos.lng}
          initialStationName={getNearbyStationName(shops, pendingPos)}
          onClose={() => setPendingPos(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

export default function StationShopMap(props: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 px-6 text-center text-sm text-gray-500">
        Google Maps APIキーが未設定です。
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="ja" region="JP" libraries={GOOGLE_MAP_LIBRARIES}>
      <GoogleMapInner {...props} />
    </APIProvider>
  );
}
