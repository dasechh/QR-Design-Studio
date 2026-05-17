import { useState, useRef, useEffect } from "react";
import { Canvas, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  fabricImage: FabricImage | null;
  canvas: Canvas | null;
}

interface CropBox { x: number; y: number; w: number; h: number; }

const MAX_W = 640;
const MAX_H = 420;

/** Get the original full-size src from a FabricImage via multiple fallbacks */
function getImageSrc(img: FabricImage): string {
  const f = img as any;
  // Fabric 7 public method
  if (typeof f.getSrc === "function") {
    const s = f.getSrc();
    if (s) return s;
  }
  // Internal element (should always be set after fromURL / loadFromJSON)
  if (f._element?.src) return f._element.src;
  if (f._originalElement?.src) return f._originalElement.src;
  // Serialised src property stored in object
  if (f.src) return f.src;
  return "";
}

export function CropDialog({ open, onClose, fabricImage, canvas }: Props) {
  const [src, setSrc]         = useState("");
  const [preview, setPreview] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [crop, setCrop]       = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [ready, setReady]     = useState(false);

  const drawing    = useRef(false);
  const startPt    = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef       = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!open || !fabricImage) return;
    setReady(false);
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
    const s = getImageSrc(fabricImage);
    setSrc(s);
  }, [open, fabricImage]);

  const onImgLoad = () => {
    if (!imgRef.current || !fabricImage) return;
    const natW = imgRef.current.naturalWidth;
    const natH = imgRef.current.naturalHeight;
    if (!natW || !natH) return;
    setNatural({ w: natW, h: natH });
    const scale = Math.min(MAX_W / natW, MAX_H / natH, 1);
    const pw = Math.round(natW * scale);
    const ph = Math.round(natH * scale);
    setPreview({ w: pw, h: ph });

    // Restore existing crop region (if any) as initial selection
    const cropX = fabricImage.cropX ?? 0;
    const cropY = fabricImage.cropY ?? 0;
    // width/height on a cropped FabricImage is the cropped pixel size
    // Use the smaller of the stored width and the natural width
    const cropW = Math.min(fabricImage.width ?? natW, natW);
    const cropH = Math.min(fabricImage.height ?? natH, natH);
    setCrop({
      x: cropX * scale,
      y: cropY * scale,
      w: cropW * scale,
      h: cropH * scale,
    });
    setReady(true);
  };

  const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));

  const getXY = (e: MouseEvent): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const r = containerRef.current.getBoundingClientRect();
    return {
      x: clamp(e.clientX - r.left, 0, preview.w),
      y: clamp(e.clientY - r.top,  0, preview.h),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = { x: clamp(e.clientX - containerRef.current!.getBoundingClientRect().left, 0, preview.w), y: clamp(e.clientY - containerRef.current!.getBoundingClientRect().top, 0, preview.h) };
    startPt.current = pt;
    drawing.current = true;
    setCrop({ x: pt.x, y: pt.y, w: 0, h: 0 });

    const onMove = (ev: MouseEvent) => {
      if (!drawing.current) return;
      ev.preventDefault();
      const cur = getXY(ev);
      const sx = startPt.current.x, sy = startPt.current.y;
      setCrop({ x: Math.min(cur.x, sx), y: Math.min(cur.y, sy), w: Math.abs(cur.x - sx), h: Math.abs(cur.y - sy) });
    };
    const onUp = () => {
      drawing.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleApply = () => {
    if (!fabricImage || !canvas || !natural.w || crop.w < 4 || crop.h < 4) return;
    const sx = natural.w / preview.w;
    const sy = natural.h / preview.h;
    fabricImage.set({
      cropX:  Math.round(crop.x * sx),
      cropY:  Math.round(crop.y * sy),
      width:  Math.round(crop.w * sx),
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ userSelect: "none" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ width: Math.max((preview.w || MAX_W) + 48, 420), maxWidth: "calc(100vw - 32px)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Обрезка изображения</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none px-1">×</button>
        </div>

        <p className="text-xs text-muted-foreground -mt-1">
          Нажмите и потяните чтобы выбрать область.
          {crop.w >= 4 && crop.h >= 4 ? ` Выбрано: ${cropW} × ${cropH} пкс.` : " Область не выбрана."}
        </p>

        <div className="flex justify-center rounded-lg overflow-hidden bg-[#111] border border-border">
          {src ? (
            <div
              ref={containerRef}
              className="relative"
              style={{ width: preview.w || MAX_W, height: preview.h || MAX_H, cursor: "crosshair" }}
              onMouseDown={onMouseDown}
            >
              <img
                ref={imgRef}
                src={src}
                onLoad={onImgLoad}
                style={{ width: preview.w || "auto", height: preview.h || "auto", display: "block" }}
                draggable={false}
                alt="crop"
              />

              {ready && crop.w > 2 && crop.h > 2 && (
                <>
                  {/* Dark overlay around crop region */}
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:crop.y, background:"rgba(0,0,0,0.6)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", top:crop.y+crop.h, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.6)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", top:crop.y, left:0, width:crop.x, height:crop.h, background:"rgba(0,0,0,0.6)", pointerEvents:"none" }} />
                  <div style={{ position:"absolute", top:crop.y, left:crop.x+crop.w, right:0, height:crop.h, background:"rgba(0,0,0,0.6)", pointerEvents:"none" }} />
                  {/* Crop frame */}
                  <div style={{ position:"absolute", top:crop.y, left:crop.x, width:crop.w, height:crop.h, border:"2px solid white", boxSizing:"border-box", pointerEvents:"none" }}>
                    {[33.3, 66.6].map(p => <div key={`h${p}`} style={{ position:"absolute", top:`${p}%`, left:0, right:0, height:1, background:"rgba(255,255,255,0.4)" }} />)}
                    {[33.3, 66.6].map(p => <div key={`v${p}`} style={{ position:"absolute", left:`${p}%`, top:0, bottom:0, width:1, background:"rgba(255,255,255,0.4)" }} />)}
                    {[{top:-4,left:-4},{top:-4,right:-4},{bottom:-4,left:-4},{bottom:-4,right:-4}].map((s,i)=>(
                      <div key={i} style={{ position:"absolute", width:8, height:8, background:"white", borderRadius:1, ...s }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ width:MAX_W, height:180 }}>
              Загрузка изображения…
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>Сбросить обрезку</Button>
          <Button variant="outline" size="sm" onClick={onClose}>Отмена</Button>
          <Button size="sm" onClick={handleApply} disabled={crop.w < 4 || crop.h < 4}>Применить</Button>
        </div>
      </div>
    </div>
  );
}
