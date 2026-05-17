import { useEffect, useState } from "react";
import { Canvas, Shadow, FabricImage, filters } from "fabric";
import QRCodeStyling from "qr-code-styling";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough, Crop } from "lucide-react";
import { CropDialog } from "@/components/CropDialog";

interface Props {
  canvas: Canvas | null;
  activeObject: any;
  activeTool: string;
  penColor: string;
  onPenColorChange: (v: string) => void;
  penSize: number;
  onPenSizeChange: (v: number) => void;
  shapeColor: string;
  onShapeColorChange: (v: string) => void;
}

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Helvetica", "Tahoma", "Impact", "Palatino Linotype", "Trebuchet MS"];
const SHAPE_TOOLS = ["rect", "ellipse", "line", "triangle"];

const DOT_STYLES = [
  { value: "square",         label: "Квадрат" },
  { value: "rounded",        label: "Закруглённый" },
  { value: "dots",           label: "Круглый" },
  { value: "extra-rounded",  label: "Мягкий" },
  { value: "classy",         label: "Элегантный" },
  { value: "classy-rounded", label: "Элег. закруглённый" },
];
const CORNER_STYLES = [
  { value: "square",        label: "Квадрат" },
  { value: "extra-rounded", label: "Закруглённый" },
  { value: "dot",           label: "Круглый" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const hexToRgba = (hex: string, opacity: number): string => {
  if (opacity >= 100) return hex;
  const h = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${(opacity / 100).toFixed(2)})`;
};

const parseHexAlpha = (color: string): [hex: string, opacity: number] => {
  if (!color || color === "transparent") return ["#000000", 0];
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) {
    const hex = "#" + [m[1], m[2], m[3]].map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
    const a = m[4] !== undefined ? Math.round(parseFloat(m[4]) * 100) : 100;
    return [hex, a];
  }
  if (color.startsWith("#")) return [color.slice(0, 7), 100];
  return ["#000000", 100];
};

async function generateStyledQR(content: string, opts: {
  dotColor: string; dotStyle: string; bgColor: string;
  cornerColor: string; cornerStyle: string;
}): Promise<string> {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;left:-9999px;top:-9999px;visibility:hidden";
  document.body.appendChild(div);
  try {
    const qr = new QRCodeStyling({
      width: 300,
      height: 300,
      type: "canvas",
      data: content,
      dotsOptions: { color: opts.dotColor, type: opts.dotStyle as any },
      backgroundOptions: { color: opts.bgColor },
      cornersSquareOptions: { color: opts.cornerColor, type: opts.cornerStyle as any },
      cornersDotOptions: { color: opts.cornerColor },
      qrOptions: { errorCorrectionLevel: "H" },
    });
    qr.append(div);
    await new Promise((r) => setTimeout(r, 250));
    const canvas = div.querySelector("canvas") as HTMLCanvasElement;
    return canvas?.toDataURL("image/png") ?? "";
  } finally {
    document.body.removeChild(div);
  }
}

// ── UI atoms ─────────────────────────────────────────────────────────────────
function Divider() { return <div className="h-px bg-border -mx-4" />; }
function Sec({ title }: { title: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md border border-border overflow-hidden shrink-0 cursor-pointer">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer" />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs font-mono bg-muted/40 flex-1" maxLength={7} />
    </div>
  );
}

function NumBox({ label, value, onChange, min = -9999, max = 9999, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Lbl>{label}</Lbl>
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-full rounded-md border border-border bg-muted/40 text-xs text-center px-1 focus:outline-none focus:ring-1 focus:ring-ring" />
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Lbl>{label}</Lbl>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {step < 1 ? value.toFixed(2) : Math.round(value)}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function PropertiesPanel({
  canvas, activeObject, activeTool,
  penColor, onPenColorChange, penSize, onPenSizeChange,
  shapeColor, onShapeColorChange,
}: Props) {
  const isText  = activeObject?.type === "i-text" || activeObject?.type === "text";
  const isImage = activeObject?.type === "image";
  const isRect  = activeObject?.type === "rect";
  const isQR    = !!(activeObject as any)?.isQR;

  const apply = (key: string, val: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key as any, val);
    canvas.renderAll();
  };

  // ── State ────────────────────────────────────────────────────────────────
  const [fill, setFill]               = useState("#3b82f6");
  const [fillOpacity, setFillOpacity] = useState(100);
  const [opacity, setOpacity]         = useState(100);
  const [stroke, setStroke]           = useState("#000000");
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeDash, setStrokeDash]   = useState<"solid" | "dashed" | "dotted">("solid");
  const [rx, setRx]                   = useState(0);
  const [shadowOn, setShadowOn]       = useState(false);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur]   = useState(10);
  const [shadowX, setShadowX]         = useState(5);
  const [shadowY, setShadowY]         = useState(5);

  // Basic image filters
  const [fBr, setFBr] = useState(0);
  const [fCo, setFCo] = useState(0);
  const [fSa, setFSa] = useState(0);
  const [fBl, setFBl] = useState(0);
  const [fGs, setFGs] = useState(false);
  const [fSe, setFSe] = useState(false);
  // Extended image filters
  const [fIn, setFIn] = useState(false);   // Invert
  const [fHu, setFHu] = useState(0);       // HueRotation (-180 to 180 degrees)
  const [fVi, setFVi] = useState(0);       // Vibrance (-100 to 100)
  const [fNo, setFNo] = useState(0);       // Noise (0-300)
  const [fSh, setFSh] = useState(false);   // Sharpen (Convolute)
  const [fPx, setFPx] = useState(0);       // Pixelate (0-30)

  // Text state
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize]     = useState(32);
  const [bold, setBold]             = useState(false);
  const [italic, setItalic]         = useState(false);
  const [uline, setUline]           = useState(false);
  const [strike, setStrike]         = useState(false);
  const [align, setAlign]           = useState("left");
  const [lh, setLh]                 = useState(1.16);
  const [cs, setCs]                 = useState(0);

  // QR content
  const [qrContent, setQrContent]   = useState("");
  const [qrBusy, setQrBusy]         = useState(false);

  // QR styling
  const [qrDotColor,    setQrDotColor]    = useState("#000000");
  const [qrDotStyle,    setQrDotStyle]    = useState("square");
  const [qrBgColor,     setQrBgColor]     = useState("#ffffff");
  const [qrCornerColor, setQrCornerColor] = useState("#000000");
  const [qrCornerStyle, setQrCornerStyle] = useState("square");

  // Crop dialog
  const [cropOpen, setCropOpen] = useState(false);

  // ── Sync from active object ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeObject) return;

    const rawFill = typeof activeObject.fill === "string" ? activeObject.fill : "#3b82f6";
    const [fillHex, fillA] = parseHexAlpha(rawFill);
    setFill(fillHex);
    setFillOpacity(fillA);

    setOpacity(Math.round((activeObject.opacity ?? 1) * 100));

    const rawStroke = activeObject.stroke || "#000000";
    const [strokeHex, strokeA] = parseHexAlpha(rawStroke);
    setStroke(strokeHex);
    setStrokeOpacity(strokeA);

    setStrokeWidth(activeObject.strokeWidth || 0);
    const dash = activeObject.strokeDashArray;
    setStrokeDash(!dash?.length ? "solid" : dash[0] <= 3 ? "dotted" : "dashed");
    setRx(activeObject.rx || 0);

    const sh = activeObject.shadow;
    setShadowOn(!!sh);
    if (sh) {
      setShadowColor(sh.color || "#000000");
      setShadowBlur(sh.blur ?? 10);
      setShadowX(sh.offsetX ?? 5);
      setShadowY(sh.offsetY ?? 5);
    }

    if (isImage) {
      const fl: any[] = (activeObject as any).filters || [];
      setFBr(0); setFCo(0); setFSa(0); setFBl(0);
      setFGs(false); setFSe(false);
      setFIn(false); setFHu(0); setFVi(0); setFNo(0); setFSh(false); setFPx(0);
      for (const f of fl) {
        if (f.type === "Brightness")   setFBr(f.brightness ?? 0);
        if (f.type === "Contrast")     setFCo(f.contrast ?? 0);
        if (f.type === "Saturation")   setFSa(f.saturation ?? 0);
        if (f.type === "Blur")         setFBl(f.blur ?? 0);
        if (f.type === "Grayscale")    setFGs(true);
        if (f.type === "Sepia")        setFSe(true);
        if (f.type === "Invert")       setFIn(true);
        if (f.type === "HueRotation")  setFHu(Math.round((f.rotation ?? 0) * 180 / Math.PI));
        if (f.type === "Vibrance")     setFVi(Math.round((f.vibrance ?? 0) * 100));
        if (f.type === "Noise")        setFNo(f.noise ?? 0);
        if (f.type === "Convolute")    setFSh(true);
        if (f.type === "Pixelate")     setFPx(f.blocksize ?? 0);
      }
    }

    if (isText) {
      const rawTFill = typeof activeObject.fill === "string" ? activeObject.fill : "#000000";
      const [tfHex, tfA] = parseHexAlpha(rawTFill);
      setFill(tfHex);
      setFillOpacity(tfA);
      setFontFamily(activeObject.fontFamily || "Arial");
      setFontSize(activeObject.fontSize || 32);
      setBold(activeObject.fontWeight === "bold");
      setItalic(activeObject.fontStyle === "italic");
      setUline(!!activeObject.underline);
      setStrike(!!activeObject.linethrough);
      setAlign(activeObject.textAlign || "left");
      setLh(activeObject.lineHeight ?? 1.16);
      setCs(activeObject.charSpacing ?? 0);
    }

    if (isQR) {
      setQrContent((activeObject as any).qrContent || "");
      setQrDotColor((activeObject as any).qrDotColor || "#000000");
      setQrDotStyle((activeObject as any).qrDotStyle || "square");
      setQrBgColor((activeObject as any).qrBgColor || "#ffffff");
      setQrCornerColor((activeObject as any).qrCornerColor || "#000000");
      setQrCornerStyle((activeObject as any).qrCornerStyle || "square");
    }
  }, [activeObject]);

  // ── Apply helpers ─────────────────────────────────────────────────────────
  const applyFill = (hex = fill, op = fillOpacity) => {
    if (!activeObject || !canvas) return;
    activeObject.set("fill", hexToRgba(hex, op));
    canvas.renderAll();
  };

  const applyStroke = (hex = stroke, op = strokeOpacity) => {
    if (!activeObject || !canvas) return;
    activeObject.set("stroke", hexToRgba(hex, op));
    canvas.renderAll();
  };

  const applyFilters = (opts: {
    br?: number; co?: number; sa?: number; bl?: number;
    gs?: boolean; se?: boolean;
    in?: boolean; hu?: number; vi?: number; no?: number; sh?: boolean; px?: number;
  }) => {
    if (!activeObject || !canvas || !isImage) return;
    const B  = opts.br  ?? fBr;
    const C  = opts.co  ?? fCo;
    const S  = opts.sa  ?? fSa;
    const BL = opts.bl  ?? fBl;
    const G  = opts.gs  ?? fGs;
    const SE = opts.se  ?? fSe;
    const IN = opts.in  ?? fIn;
    const HU = opts.hu  ?? fHu;
    const VI = opts.vi  ?? fVi;
    const NO = opts.no  ?? fNo;
    const SH = opts.sh  ?? fSh;
    const PX = opts.px  ?? fPx;

    const list: any[] = [];
    if (G)    list.push(new filters.Grayscale());
    if (SE)   list.push(new filters.Sepia());
    if (IN)   list.push(new filters.Invert());
    if (SH)   list.push(new filters.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }));
    if (B !== 0)  list.push(new filters.Brightness({ brightness: B }));
    if (C !== 0)  list.push(new filters.Contrast({ contrast: C }));
    if (S !== 0)  list.push(new filters.Saturation({ saturation: S }));
    if (HU !== 0) list.push(new (filters as any).HueRotation({ rotation: HU * Math.PI / 180 }));
    if (VI !== 0) list.push(new (filters as any).Vibrance({ vibrance: VI / 100 }));
    if (BL > 0)   list.push(new filters.Blur({ blur: BL }));
    if (NO > 0)   list.push(new (filters as any).Noise({ noise: NO }));
    if (PX > 1)   list.push(new (filters as any).Pixelate({ blocksize: PX }));

    (activeObject as FabricImage).filters = list;
    (activeObject as FabricImage).applyFilters();
    canvas.renderAll();
  };

  const applyShadow = (color = shadowColor, blur = shadowBlur, x = shadowX, y = shadowY, on = shadowOn) => {
    if (!activeObject || !canvas) return;
    activeObject.set("shadow", on ? new Shadow({ color, blur, offsetX: x, offsetY: y }) : null);
    canvas.renderAll();
  };

  // ── QR generation & update ────────────────────────────────────────────────
  const updateQR = async (newContent = qrContent, opts?: {
    dotColor?: string; dotStyle?: string; bgColor?: string;
    cornerColor?: string; cornerStyle?: string;
  }) => {
    if (!canvas || !activeObject || !newContent.trim()) return;
    const dotColor    = opts?.dotColor    ?? qrDotColor;
    const dotStyle    = opts?.dotStyle    ?? qrDotStyle;
    const bgColor     = opts?.bgColor     ?? qrBgColor;
    const cornerColor = opts?.cornerColor ?? qrCornerColor;
    const cornerStyle = opts?.cornerStyle ?? qrCornerStyle;

    setQrBusy(true);
    try {
      const dataUrl = await generateStyledQR(newContent, {
        dotColor, dotStyle, bgColor, cornerColor, cornerStyle,
      });
      const img = await FabricImage.fromURL(dataUrl);
      img.set({
        left: activeObject.left,
        top: activeObject.top,
        scaleX: activeObject.scaleX,
        scaleY: activeObject.scaleY,
        angle: activeObject.angle,
        opacity: activeObject.opacity,
      });
      if (activeObject.shadow) {
        img.set({ shadow: new Shadow(activeObject.shadow) });
      }
      (img as any).isQR          = true;
      (img as any).qrContent     = newContent;
      (img as any).qrDotColor    = dotColor;
      (img as any).qrDotStyle    = dotStyle;
      (img as any).qrBgColor     = bgColor;
      (img as any).qrCornerColor = cornerColor;
      (img as any).qrCornerStyle = cornerStyle;

      canvas.remove(activeObject);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    } finally {
      setQrBusy(false);
    }
  };

  // ── No object selected ────────────────────────────────────────────────────
  if (!activeObject) {
    const isShapeTool = SHAPE_TOOLS.includes(activeTool);
    const isPencil = activeTool === "pencil";

    if (isShapeTool || isPencil) {
      const toolNames: Record<string, string> = {
        pencil: "Карандаш",
        rect: "Прямоугольник", ellipse: "Эллипс",
        triangle: "Треугольник", line: "Линия",
      };
      return (
        <div className="w-64 bg-card border-l border-border shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Настройки инструмента</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{toolNames[activeTool]}</p>
          </div>
          <div className="p-4 space-y-4">
            {isPencil && (
              <>
                <div className="space-y-2">
                  <Sec title="Цвет кисти" />
                  <ColorPicker value={penColor} onChange={onPenColorChange} />
                </div>
                <Divider />
                <SliderRow label="Толщина кисти" value={penSize} min={1} max={50} onChange={onPenSizeChange} />
              </>
            )}
            {isShapeTool && (
              <div className="space-y-2">
                <Sec title={activeTool === "line" ? "Цвет линии" : "Цвет заливки"} />
                <ColorPicker value={shapeColor} onChange={onShapeColorChange} />
                <p className="text-xs text-muted-foreground pt-1">
                  Кликните и перетяните на холсте чтобы нарисовать фигуру
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="w-64 bg-card border-l border-border shrink-0 flex flex-col items-center justify-center text-center p-6">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
          <span className="text-lg">✦</span>
        </div>
        <p className="text-sm font-medium mb-1">Нет выбранного объекта</p>
        <p className="text-xs text-muted-foreground leading-relaxed">Нажмите на элемент на холсте</p>
      </div>
    );
  }

  // ── Object selected ───────────────────────────────────────────────────────
  return (
    <>
      <CropDialog
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        fabricImage={isImage ? (activeObject as FabricImage) : null}
        canvas={canvas}
      />

      <div className="w-64 bg-card border-l border-border shrink-0 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <p className="font-semibold text-sm">Свойства</p>
          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{activeObject.type}</p>
        </div>

        <div className="flex flex-col gap-4 p-4 text-sm">

          {/* ── Fill ── */}
          {!isImage && (
            <>
              <div className="space-y-2.5">
                <Sec title={isText ? "Цвет текста" : "Заливка"} />
                <ColorPicker value={fill}
                  onChange={(v) => { setFill(v); applyFill(v, fillOpacity); }} />
                <SliderRow label="Непрозрачность заливки" value={fillOpacity} min={0} max={100}
                  onChange={(v) => { setFillOpacity(v); applyFill(fill, v); }} />
              </div>
              <Divider />
            </>
          )}

          {/* ── Object opacity ── */}
          <SliderRow label="Прозрачность объекта" value={opacity} min={0} max={100}
            onChange={(v) => { setOpacity(v); apply("opacity", v / 100); }} />

          <Divider />

          {/* ── Stroke ── */}
          <div className="space-y-2.5">
            <Sec title="Обводка" />
            <ColorPicker value={stroke}
              onChange={(v) => { setStroke(v); applyStroke(v, strokeOpacity); }} />
            <SliderRow label="Непрозрачность обводки" value={strokeOpacity} min={0} max={100}
              onChange={(v) => { setStrokeOpacity(v); applyStroke(stroke, v); }} />
            <div className="flex items-center gap-2">
              <Lbl>Толщина</Lbl>
              <div className="flex-1">
                <Slider value={[strokeWidth]} min={0} max={30} step={1}
                  onValueChange={([v]) => { setStrokeWidth(v); apply("strokeWidth", v); }} />
              </div>
              <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">{strokeWidth}</span>
            </div>
            <Select value={strokeDash} onValueChange={(v: any) => {
              setStrokeDash(v);
              apply("strokeDashArray", v === "dashed" ? [12, 6] : v === "dotted" ? [3, 6] : null);
            }}>
              <SelectTrigger className="h-7 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Сплошная</SelectItem>
                <SelectItem value="dashed">Штриховая</SelectItem>
                <SelectItem value="dotted">Точечная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Border radius (rect only) ── */}
          {isRect && (
            <>
              <Divider />
              <SliderRow label="Скругление углов" value={rx} min={0} max={200}
                onChange={(v) => { setRx(v); activeObject.set({ rx: v, ry: v }); canvas?.renderAll(); }} />
            </>
          )}

          <Divider />

          {/* ── Shadow ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Sec title="Тень" />
              <Switch checked={shadowOn} onCheckedChange={(v) => { setShadowOn(v); applyShadow(shadowColor, shadowBlur, shadowX, shadowY, v); }} />
            </div>
            {shadowOn && (
              <div className="space-y-3">
                <ColorPicker value={shadowColor} onChange={(v) => { setShadowColor(v); applyShadow(v); }} />
                <div className="grid grid-cols-3 gap-2">
                  <NumBox label="Размытие" value={shadowBlur} min={0} max={100}
                    onChange={(v) => { setShadowBlur(v); applyShadow(shadowColor, v, shadowX, shadowY); }} />
                  <NumBox label="Смещ. X" value={shadowX} min={-100} max={100}
                    onChange={(v) => { setShadowX(v); applyShadow(shadowColor, shadowBlur, v, shadowY); }} />
                  <NumBox label="Смещ. Y" value={shadowY} min={-100} max={100}
                    onChange={(v) => { setShadowY(v); applyShadow(shadowColor, shadowBlur, shadowX, v); }} />
                </div>
              </div>
            )}
          </div>

          {/* ── Image filters + crop ── */}
          {isImage && (
            <>
              <Divider />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Sec title="Фото" />
                  <Button
                    size="sm" variant="outline"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => setCropOpen(true)}
                  >
                    <Crop className="w-3 h-3" />
                    Обрезать
                  </Button>
                </div>

                {/* Toggle filters */}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {[
                    { label: "Ч/б",       val: fGs, set: setFGs, key: "gs" },
                    { label: "Сепия",     val: fSe, set: setFSe, key: "se" },
                    { label: "Инверт.",   val: fIn, set: setFIn, key: "in" },
                    { label: "Резкость",  val: fSh, set: setFSh, key: "sh" },
                  ].map(({ label, val, set, key }) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                      <Switch checked={val} className="scale-75"
                        onCheckedChange={(v) => { set(v); applyFilters({ [key]: v }); }} />
                      <Lbl>{label}</Lbl>
                    </label>
                  ))}
                </div>

                {/* Slider filters */}
                {([
                  { label: "Яркость",      val: fBr, set: setFBr, key: "br", min: -100, max: 100, scale: 100 },
                  { label: "Контраст",     val: fCo, set: setFCo, key: "co", min: -100, max: 100, scale: 100 },
                  { label: "Насыщен.",     val: fSa, set: setFSa, key: "sa", min: -100, max: 100, scale: 100 },
                  { label: "Оттенок",      val: fHu, set: setFHu, key: "hu", min: -180, max: 180, scale: 1  },
                  { label: "Вибрантность", val: fVi, set: setFVi, key: "vi", min: -100, max: 100, scale: 1  },
                  { label: "Размытие",     val: fBl, set: setFBl, key: "bl", min: 0,    max: 100,  scale: 100 },
                  { label: "Шум",          val: fNo, set: setFNo, key: "no", min: 0,    max: 300,  scale: 1  },
                  { label: "Пикселизация", val: fPx, set: setFPx, key: "px", min: 0,    max: 30,   scale: 1  },
                ] as any[]).map(({ label, val, set, key, min, max, scale }) => {
                  const display = Math.round(val * scale);
                  return (
                    <SliderRow key={key} label={label} value={display} min={min} max={max}
                      onChange={(v) => { const n = v / scale; set(n); applyFilters({ [key]: n }); }} />
                  );
                })}
              </div>
            </>
          )}

          {/* ── QR content & styling ── */}
          {isQR && (
            <>
              <Divider />
              <div className="space-y-3">
                <Sec title="QR-код — содержимое" />
                <Input
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder="URL или текст"
                  className="h-7 text-xs bg-muted/40"
                  onKeyDown={(e) => { if (e.key === "Enter" && !qrBusy) updateQR(); }}
                />
                <Button
                  size="sm" className="w-full h-7 text-xs"
                  disabled={qrBusy || !qrContent.trim()}
                  onClick={() => updateQR()}
                >
                  {qrBusy ? "Генерация..." : "Обновить содержимое"}
                </Button>
              </div>

              <Divider />

              <div className="space-y-3">
                <Sec title="QR-код — оформление" />

                <div className="space-y-1.5">
                  <Lbl>Цвет точек</Lbl>
                  <ColorPicker value={qrDotColor} onChange={setQrDotColor} />
                </div>

                <div className="space-y-1.5">
                  <Lbl>Стиль точек</Lbl>
                  <Select value={qrDotStyle} onValueChange={setQrDotStyle}>
                    <SelectTrigger className="h-7 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOT_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Lbl>Цвет фона</Lbl>
                  <ColorPicker value={qrBgColor} onChange={setQrBgColor} />
                </div>

                <div className="space-y-1.5">
                  <Lbl>Цвет угловых блоков</Lbl>
                  <ColorPicker value={qrCornerColor} onChange={setQrCornerColor} />
                </div>

                <div className="space-y-1.5">
                  <Lbl>Стиль угловых блоков</Lbl>
                  <Select value={qrCornerStyle} onValueChange={setQrCornerStyle}>
                    <SelectTrigger className="h-7 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CORNER_STYLES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  size="sm" className="w-full h-7 text-xs"
                  disabled={qrBusy || !qrContent.trim()}
                  onClick={() => updateQR(qrContent, {
                    dotColor: qrDotColor, dotStyle: qrDotStyle,
                    bgColor: qrBgColor,
                    cornerColor: qrCornerColor, cornerStyle: qrCornerStyle,
                  })}
                >
                  {qrBusy ? "Генерация..." : "Применить оформление"}
                </Button>
              </div>
            </>
          )}

          {/* ── Text properties ── */}
          {isText && (
            <>
              <Divider />
              <div className="space-y-3">
                <Sec title="Текст" />
                <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); apply("fontFamily", v); }}>
                  <SelectTrigger className="h-7 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Lbl>Размер</Lbl>
                  <input type="number" value={fontSize} min={4} max={400}
                    onChange={(e) => { const v = parseInt(e.target.value) || 12; setFontSize(v); apply("fontSize", v); }}
                    className="h-7 w-16 rounded-md border border-border bg-muted/40 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring ml-auto" />
                </div>
                <div className="flex gap-1">
                  {([
                    { I: Bold,          a: bold,   fn: () => { const v = !bold;   setBold(v);   apply("fontWeight",  v ? "bold"   : "normal"); } },
                    { I: Italic,        a: italic, fn: () => { const v = !italic; setItalic(v); apply("fontStyle",   v ? "italic" : "normal"); } },
                    { I: Underline,     a: uline,  fn: () => { const v = !uline;  setUline(v);  apply("underline",   v); } },
                    { I: Strikethrough, a: strike, fn: () => { const v = !strike; setStrike(v); apply("linethrough", v); } },
                  ]).map(({ I, a, fn }, idx) => (
                    <Button key={idx} variant={a ? "default" : "outline"} size="icon" className="h-7 flex-1 p-0" onClick={fn}>
                      <I className="w-3 h-3" />
                    </Button>
                  ))}
                </div>
                <ToggleGroup type="single" value={align}
                  onValueChange={(v) => { if (v) { setAlign(v); apply("textAlign", v); } }}
                  className="justify-start gap-1">
                  {[
                    { v: "left",    I: AlignLeft    },
                    { v: "center",  I: AlignCenter  },
                    { v: "right",   I: AlignRight   },
                    { v: "justify", I: AlignJustify },
                  ].map(({ v, I }) => (
                    <ToggleGroupItem key={v} value={v} className="h-7 flex-1 p-0">
                      <I className="w-3 h-3" />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <div className="grid grid-cols-2 gap-2">
                  <NumBox label="Межстрочный" value={parseFloat(lh.toFixed(2))} min={0.5} max={5} step={0.01}
                    onChange={(v) => { setLh(v); apply("lineHeight", v); }} />
                  <NumBox label="Межбуквенный" value={cs} min={-500} max={1000} step={10}
                    onChange={(v) => { setCs(v); apply("charSpacing", v); }} />
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
