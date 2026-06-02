"use client";

import { useRef, useState } from "react";

interface BlurBox {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  file: File;
  previewUrl: string;
  onApply: (file: File, previewUrl: string) => void;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function pointerToRatio(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement
) {
  const rect = element.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function pixelateArea(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  box: BlurBox
) {
  const x = Math.round(box.x * image.naturalWidth);
  const y = Math.round(box.y * image.naturalHeight);
  const width = Math.round(box.width * image.naturalWidth);
  const height = Math.round(box.height * image.naturalHeight);

  if (width < 2 || height < 2) return;

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) return;

  sourceCtx.drawImage(image, x, y, width, height, 0, 0, width, height);
  const blockSize = Math.max(24, Math.round(Math.min(width, height) / 4));

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      const sampleX = clamp(bx + Math.floor(blockSize / 2), 0, width - 1);
      const sampleY = clamp(by + Math.floor(blockSize / 2), 0, height - 1);
      const [r, g, b] = sourceCtx.getImageData(sampleX, sampleY, 1, 1).data;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        x + bx,
        y + by,
        Math.min(blockSize, width - bx),
        Math.min(blockSize, height - by)
      );
    }
  }

  ctx.fillStyle = "rgba(128, 128, 128, 0.55)";
  ctx.fillRect(x, y, width, height);
}

async function createBlurredFile(
  file: File,
  previewUrl: string,
  boxes: BlurBox[]
): Promise<File> {
  const image = await loadImage(previewUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("画像の編集に失敗しました");

  ctx.drawImage(image, 0, 0);
  boxes.forEach((box) => pixelateArea(ctx, image, box));

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("画像の保存に失敗しました"));
      },
      type,
      0.92
    );
  });

  const extension = type === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}-blurred.${extension}`, { type });
}

export default function PhotoBlurEditor({ file, previewUrl, onApply, onClose }: Props) {
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<BlurBox[]>([]);
  const [draftBox, setDraftBox] = useState<BlurBox | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const visibleBoxes = draftBox ? [...boxes, draftBox] : boxes;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageAreaRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerToRatio(event, imageAreaRef.current);
    setDragStart(point);
    setDraftBox({ id: Date.now(), x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageAreaRef.current || !dragStart) return;
    const point = pointerToRatio(event, imageAreaRef.current);
    setDraftBox({
      id: Date.now(),
      x: Math.min(dragStart.x, point.x),
      y: Math.min(dragStart.y, point.y),
      width: Math.abs(point.x - dragStart.x),
      height: Math.abs(point.y - dragStart.y),
    });
  };

  const finishDraft = () => {
    if (draftBox && draftBox.width > 0.02 && draftBox.height > 0.02) {
      setBoxes((prev) => [...prev, { ...draftBox, id: Date.now() }]);
    }
    setDraftBox(null);
    setDragStart(null);
  };

  const handleApply = async () => {
    if (boxes.length === 0) {
      onClose();
      return;
    }

    setApplying(true);
    const nextFile = await createBlurredFile(file, previewUrl, boxes);
    onApply(nextFile, URL.createObjectURL(nextFile));
    setApplying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-800">隠したい部分を選択</h3>
              <p className="text-xs text-gray-500">
                車のナンバーや人の顔を少し広めに囲むと、そこだけ強めのモザイクになります。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600"
            >
              閉じる
            </button>
          </div>

          <div
            ref={imageAreaRef}
            className="relative mx-auto max-h-[60vh] touch-none select-none overflow-hidden rounded-lg bg-gray-100"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDraft}
            onPointerCancel={finishDraft}
          >
            <img
              src={previewUrl}
              alt="モザイク編集"
              className="max-h-[60vh] w-full object-contain"
              draggable={false}
            />
            {visibleBoxes.map((box) => (
              <div
                key={box.id}
                className="absolute border-2 border-blue-500 bg-blue-500/25"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                }}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setBoxes((prev) => prev.slice(0, -1))}
              disabled={boxes.length === 0 || applying}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 disabled:opacity-40"
            >
              選択を1つ戻す
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={applying}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {applying ? "処理中..." : "モザイクを反映"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
