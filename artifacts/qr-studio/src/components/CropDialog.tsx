import { useState, useRef, useEffect } from "react";
import { Canvas, FabricImage } from "fabric";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  fabricImage: FabricImage | null;
  canvas: Canvas | null;
}

interface CropBox { x: number; y: number; w: number; h: number; }

const MAX_W = 580;
const MAX_H = 380;

export function CropDialog({ open, onClose, fabricImage, canvas }: Props) {
  const [src, setSrc] = useState("");
  const [preview, setPreview] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [ready, setReady] = useState(false);

  const drawing = useRef(false);
  const startPt = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load image source when dialog opens
  useEffect(() => {
    if (!open || !fabricImage) return;
    setReady(false);
    const el = (fabricImage as any)._element as HTMLImageElement;
    if (el?.src) {
      setSrc(el.src);
    }
  }, [open, fabricImage]);

  const onImgLoad = () => {
    if (!imgRef.current || !fabricImage) return;
    const natW = imgRef.current.naturalWidth;
    const natH = imgRef.current.naturalHeight;
    setNatural({ w: natW, h: natH });

    const scale = Math.min(MAX_W / natW, MAX_H / natH, 1);
    const pw = Math.round(natW * scale);
    const ph = Math.round(natH * scale);
    setPreview({ w: pw, h: ph });

    // Show current crop as initial selection
    const cx = (fabricImage.cropX ?? 0) * scale;
    const cy = (fabricImage.cropY ?? 0) * scale;
    const cw = Math.min((fabricImage.width ?? natW), natW) * scale;
    const ch = Math.min((fabricImage.height ?? natH), natH) * scale;
    setCrop({ x: cx, y: cy, w: cw, h: ch });
    setReady(true);
  };

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const getXY = (e: React.MouseEvent): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const r = containerRef.current.getBoundingClientRect();
    return {
      x: clamp(e.clientX - r.left, 0, preview.w),
      y: clamp(e.clientY - r.top, 0, preview.h),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getXY(e);
    startPt.current = pt;
    drawing.current = true;
    setCrop({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current) return;
    const pt = getXY(e);
    const sx = startPt.current.x, sy = startPt.current.y;
    setCrop({ x: Math.min(pt.x, sx), y: Math.min(pt.y, sy), w: Math.abs(pt.x - sx), h: Math.abs(pt.y - sy) });
  };

  const onMouseUp = () => { drawing.current = false; };

  const handleApply = () => {
    if (!fabricImage || !canvas || !natural.w || crop.w < 4 || crop.h < 4) return;
    const sx = natural.w / preview.w;
    const sy = natural.h / preview.h;
    fabricImage.set({
      cropX: Math.round(crop.x * sx),
      cropY: Math.round(crop.y * sy),
      width: Math.round(crop.w * sx),
      height: Math.round(crop.h * sy),
    });
    canvas.renderAll();
    canvas.fire("object:modified", { target: fabricImage } as any);
    onClose();
  };

  const handleReset = () => {
    if (!fabricImage || !canvas || !natural.w) return;
    fabricImage.set({ cropX: 0, cropY: 0, width: natural.w, height: natural.h });
    canvas.renderAll();
    canvas.fire("object:modified", { target: fabricImage } as any);
    onClose();
  };

  const cropW = Math.round(crop.w * (natural.w / (preview.w || 1)));
  const cropH = Math.round(crop.h * (natural.h / (preview.h || 1)));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Обрезка изображения</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Нажмите и перетяните чтобы выбрать область. Текущий выбор: {cropW} × {cropH} пикс.
        </p>

        <div className="flex justify-center my-2 overflow-hidden rounded-md bg-[#111]">
          {src && (
            <div
              ref={containerRef}
              className="relative cursor-crosshair select-none"
              style={{ width: preview.w || MAX_W, height: preview.h || MAX_H }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <img
                ref={imgRef}
                src={src}
                onLoad={onImgLoad}
                style={{ width: preview.w, height: preview.h, display: "block", userSelect: "none" }}
                draggable={false}
                alt="crop preview"
              />

              {/* Overlay darkening outside the crop box */}
              {ready && crop.w > 2 && crop.h > 2 && (
                <>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: crop.y, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: crop.y + crop.h, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: crop.y, left: 0, width: crop.x, height: crop.h, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: crop.y, left: crop.x + crop.w, right: 0, height: crop.h, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />

                  {/* Crop border + rule-of-thirds */}
                  <div style={{ position: "absolute", top: crop.y, left: crop.x, width: crop.w, height: crop.h, border: "2px solid white", pointerEvents: "none", boxSizing: "border-box" }}>
                    {/* Rule of thirds guides */}
                    {[33.3, 66.6].map((p) => (
                      <div key={`h${p}`} style={{ position: "absolute", top: `${p}%`, left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.35)" }} />
                    ))}
                    {[33.3, 66.6].map((p) => (
                      <div key={`v${p}`} style={{ position: "absolute", left: `${p}%`, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.35)" }} />
                    ))}
                    {/* Corner handles */}
                    {[
                      { top: -3, left: -3 }, { top: -3, right: -3 },
                      { bottom: -3, left: -3 }, { bottom: -3, right: -3 },
                    ].map((s, i) => (
                      <div key={i} style={{ position: "absolute", width: 10, height: 10, background: "white", ...s }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>Сбросить обрезку</Button>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleApply} disabled={crop.w < 4 || crop.h < 4}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
