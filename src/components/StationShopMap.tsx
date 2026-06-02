"use client";

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

type LatLng = { lat: number; lng: number };
type Point = { x: number; y: number };

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

function latLngToPoint(pos: LatLng, zoom: number): Point {
  const sinLat = Math.sin((clamp(pos.lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  const size = worldSize(zoom);
  return {
    x: ((pos.lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size,
  };
}

function pointToLatLng(point: Point, zoom: number): LatLng {
  const size = worldSize(zoom);
  const lng = (point.x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / size;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function formatDate(value: string | undefined): string {
  if (!value) return "未確認";
  return new Date(value).toLocaleDateString("ja-JP");
}

function getInitialCenter(shops: StationShopRecord[]): LatLng {
  if (shops.length === 0) return DEFAULT_CENTER;
  return {
    lat: shops.reduce((sum, shop) => sum + shop.lat, 0) / shops.length,
    lng: shops.reduce((sum, shop) => sum + shop.lng, 0) / shops.length,
  };
}

function useMapSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function TileLayer({
  center,
  zoom,
  width,
  height,
}: {
  center: LatLng;
  zoom: number;
  width: number;
  height: number;
}) {
  const centerPoint = latLngToPoint(center, zoom);
  const topLeft = { x: centerPoint.x - width / 2, y: centerPoint.y - height / 2 };
  const maxTile = 2 ** zoom;
  const minX = Math.floor(topLeft.x / TILE_SIZE);
  const maxX = Math.floor((topLeft.x + width) / TILE_SIZE);
  const minY = Math.floor(topLeft.y / TILE_SIZE);
  const maxY = Math.floor((topLeft.y + height) / TILE_SIZE);
  const tiles = [];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (y < 0 || y >= maxTile) continue;
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - topLeft.x,
        top: y * TILE_SIZE - topLeft.y,
      });
    }
  }

  return (
    <>
      {tiles.map((tile) => (
        <img
          key={tile.key}
          src={tile.url}
          alt=""
          draggable={false}
          className="absolute h-64 w-64 select-none"
          style={{ left: tile.left, top: tile.top }}
        />
      ))}
    </>
  );
}

function ShopPopup({
  shop,
  canManage,
  onClose,
  onUpdate,
  onDelete,
}: {
  shop: StationShopRecord;
  canManage: boolean;
  onClose: () => void;
  onUpdate: (id: string, input: ShopFormInput, imageFile: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const parsedDetails = parseShopDetails(shop.details);

  const handleDelete = async () => {
    if (!confirm("このお店情報を削除しますか？")) return;
    setDeleting(true);
    await onDelete(shop.id);
    setDeleting(false);
    onClose();
  };

  const handleEditSave = async (id: string, input: ShopFormInput, imageFile: File | null) => {
    await onUpdate(id, input, imageFile);
    setEditing(false);
    onClose();
  };

  return (
    <>
      <div
        className="w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-emerald-700">{shop.stationName}</p>
            <p className="text-sm font-bold text-gray-900">{shop.shopName}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-gray-500 hover:bg-gray-100"
            aria-label="閉じる"
          >
            x
          </button>
        </div>
        {shop.imageUrl && (
          <>
            <img
              src={shop.imageUrl}
              alt={shop.shopName}
              className="mt-2 h-28 w-full cursor-zoom-in rounded-lg object-cover"
              onClick={() => setFullscreen(true)}
            />
            {shop.photoUploadedAt && (
              <p className="mt-1 text-xs text-gray-400">写真投稿日: {formatDate(shop.photoUploadedAt)}</p>
            )}
          </>
        )}
        {shop.category && <p className="mt-1 text-xs text-gray-500">{shop.category}</p>}
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
            <button onClick={() => setEditing(true)} className="text-xs text-emerald-600 hover:text-emerald-800">
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

      {editing && <EditShopModal shop={shop} onClose={() => setEditing(false)} onSave={handleEditSave} />}

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

export default function StationShopMap({
  shops,
  isLoggedIn,
  currentUserId,
  isAdmin,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const size = useMapSize(mapRef);
  const [center, setCenter] = useState<LatLng>(() => getInitialCenter(shops));
  const [zoom, setZoom] = useState(13);
  const [pendingPos, setPendingPos] = useState<LatLng | null>(null);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const dragRef = useRef<{ start: Point; centerPoint: Point; moved: boolean } | null>(null);

  const topLeft = useMemo(() => {
    const centerPoint = latLngToPoint(center, zoom);
    return { x: centerPoint.x - size.width / 2, y: centerPoint.y - size.height / 2 };
  }, [center, size.height, size.width, zoom]);

  const toScreenPoint = useCallback(
    (pos: LatLng): Point => {
      const p = latLngToPoint(pos, zoom);
      return { x: p.x - topLeft.x, y: p.y - topLeft.y };
    },
    [topLeft, zoom]
  );

  const eventToLatLng = useCallback(
    (clientX: number, clientY: number): LatLng | null => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return pointToLatLng(
        { x: topLeft.x + clientX - rect.left, y: topLeft.y + clientY - rect.top },
        zoom
      );
    },
    [topLeft, zoom]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      start: { x: event.clientX, y: event.clientY },
      centerPoint: latLngToPoint(center, zoom),
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    setCenter(pointToLatLng({ x: drag.centerPoint.x - dx, y: drag.centerPoint.y - dy }, zoom));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved && isLoggedIn) {
      const pos = eventToLatLng(event.clientX, event.clientY);
      if (pos) setPendingPos(pos);
    }
  };

  const stopMapGesture = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((current) => clamp(current + (event.deltaY < 0 ? 1 : -1), MIN_ZOOM, MAX_ZOOM));
  };

  const handleZoom = (nextZoom: number) => {
    setZoom(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM));
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentPos(next);
      setCenter(next);
      setZoom(16);
    });
  };

  const handleSave = async (input: ShopFormInput, imageFile: File | null) => {
    if (!pendingPos) return;
    await onAdd(pendingPos.lat, pendingPos.lng, input, imageFile);
    setPendingPos(null);
  };

  const selectedShop = shops.find((shop) => shop.id === selectedShopId);
  const selectedPoint = selectedShop ? toScreenPoint({ lat: selectedShop.lat, lng: selectedShop.lng }) : null;

  return (
    <div
      ref={mapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-[#d8e4dd]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onWheel={handleWheel}
    >
      <TileLayer center={center} zoom={zoom} width={size.width} height={size.height} />

      {shops.map((shop) => {
        const point = toScreenPoint({ lat: shop.lat, lng: shop.lng });
        return (
          <button
            key={shop.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: point.x, top: point.y }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedShopId(shop.id);
            }}
            aria-label={`${shop.stationName} ${shop.shopName}`}
          >
            <img src="/marker-station-shop.svg" alt="" className="h-11 w-11 cursor-pointer drop-shadow" />
          </button>
        );
      })}

      {currentPos && (
        <div
          className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow-lg"
          style={{ left: toScreenPoint(currentPos).x, top: toScreenPoint(currentPos).y }}
        />
      )}

      {selectedShop && selectedPoint && (
        <div
          className="absolute z-20 -translate-x-1/2"
          style={{
            left: clamp(selectedPoint.x, 160, Math.max(160, size.width - 160)),
            top: clamp(selectedPoint.y - 190, 12, Math.max(12, size.height - 330)),
          }}
        >
          <ShopPopup
            shop={selectedShop}
            canManage={isAdmin || (!!currentUserId && selectedShop.userId === currentUserId)}
            onClose={() => setSelectedShopId(null)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}

      <div
        className="absolute right-4 top-4 z-30 flex flex-col overflow-hidden rounded-lg bg-white shadow-lg"
        onPointerDown={stopMapGesture}
        onPointerUp={stopMapGesture}
        onClick={stopMapGesture}
      >
        <button
          type="button"
          className="grid h-14 w-14 touch-manipulation place-items-center text-3xl font-semibold leading-none hover:bg-gray-50 active:bg-gray-100"
          onClick={(event) => {
            event.stopPropagation();
            handleZoom(zoom + 1);
          }}
          aria-label="拡大"
        >
          +
        </button>
        <button
          type="button"
          className="grid h-14 w-14 touch-manipulation place-items-center border-t border-gray-100 text-3xl font-semibold leading-none hover:bg-gray-50 active:bg-gray-100"
          onClick={(event) => {
            event.stopPropagation();
            handleZoom(zoom - 1);
          }}
          aria-label="縮小"
        >
          -
        </button>
      </div>

      <button
        type="button"
        onPointerDown={stopMapGesture}
        onPointerUp={stopMapGesture}
        onClick={(event) => {
          event.stopPropagation();
          handleLocate();
        }}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+3.25rem)] right-4 z-30 min-h-14 min-w-[96px] touch-manipulation rounded-full bg-white px-5 text-sm font-semibold shadow-lg transition hover:bg-gray-50 active:bg-gray-100"
      >
        現在地
      </button>

      <p className="absolute bottom-1 left-2 z-20 rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-600">
        © OpenStreetMap contributors
      </p>

      {pendingPos && (
        <AddShopModal
          lat={pendingPos.lat}
          lng={pendingPos.lng}
          onClose={() => setPendingPos(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
