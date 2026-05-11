import { useEffect, useState } from "react";
import { Canvas, Shadow, FabricImage, filters } from "fabric";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough } from "lucide-react";

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
  onQrUpdate: (oldObj: any, newContent: string) => Promise<void>;
}

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Helvetica", "Tahoma", "Impact", "Palatino Linotype", "Trebuchet MS"];
const SHAPE_TOOLS = ["rect", "ellipse", "line", "triangle"];

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── UI atoms ───────────────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
export function PropertiesPanel({
  canvas, activeObject, activeTool,
  penColor, onPenColorChange, penSize, onPenSizeChange,
  shapeColor, onShapeColorChange, onQrUpdate,
}: Props) {
  const isText = activeObject?.type === "i-text" || activeObject?.type === "text";
  const isImage = activeObject?.type === "image";
  const isRect = activeObject?.type === "rect";
  const isQR = !!(activeObject as any)?.isQR;

  const apply = (key: string, val: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key as any, val);
    canvas.renderAll();
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [fill, setFill] = useState("#3b82f6");
  const [fillOpacity, setFillOpacity] = useState(100);
  const [opacity, setOpacity] = useState(100);
  const [stroke, setStroke] = useState("#000000");
  const [strokeOpacity, setStrokeOpacity] = useState(100);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeDash, setStrokeDash] = useState<"solid" | "dashed" | "dotted">("solid");
  const [rx, setRx] = useState(0);
  const [shadowOn, setShadowOn] = useState(false);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState(10);
  const [shadowX, setShadowX] = useState(5);
  const [shadowY, setShadowY] = useState(5);
  const [fBr, setFBr] = useState(0);
  const [fCo, setFCo] = useState(0);
  const [fSa, setFSa] = useState(0);
  const [fBl, setFBl] = useState(0);
  const [fGs, setFGs] = useState(false);
  const [fSe, setFSe] = useState(false);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [uline, setUline] = useState(false);
  const [strike, setStrike] = useState(false);
  const [align, setAlign] = useState("left");
  const [lh, setLh] = useState(1.16);
  const [cs, setCs] = useState(0);
  const [qrContent, setQrContent] = useState("");
  const [qrBusy, setQrBusy] = useState(false);

  // ── Sync from active object ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeObject) return;

    // Fill + fill opacity
    const rawFill = typeof activeObject.fill === "string" ? activeObject.fill : "#3b82f6";
    const [fillHex, fillA] = parseHexAlpha(rawFill);
    setFill(fillHex);
    setFillOpacity(fillA);

    // Object-level opacity
    setOpacity(Math.round((activeObject.opacity ?? 1) * 100));

    // Stroke + stroke opacity
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
      setFBr(0); setFCo(0); setFSa(0); setFBl(0); setFGs(false); setFSe(false);
      for (const f of fl) {
        if (f.type === "Brightness") setFBr(f.brightness ?? 0);
        if (f.type === "Contrast") setFCo(f.contrast ?? 0);
        if (f.type === "Saturation") setFSa(f.saturation ?? 0);
        if (f.type === "Blur") setFBl(f.blur ?? 0);
        if (f.type === "Grayscale") setFGs(true);
        if (f.type === "Sepia") setFSe(true);
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

    if (isQR) setQrContent((activeObject as any).qrContent || "");
  }, [activeObject]);

  // ── Apply helpers ──────────────────────────────────────────────────────────
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

  const applyFilters = (opts: { br?: number; co?: number; sa?: number; bl?: number; gs?: boolean; se?: boolean }) => {
    if (!activeObject || !canvas || !isImage) return;
    const B = opts.br ?? fBr, C = opts.co ?? fCo, S = opts.sa ?? fSa, BL = opts.bl ?? fBl;
    const G = opts.gs ?? fGs, SE = opts.se ?? fSe;
    const list: any[] = [];
    if (G) list.push(new filters.Grayscale());
    if (SE) list.push(new filters.Sepia());
    if (B !== 0) list.push(new filters.Brightness({ brightness: B }));
    if (C !== 0) list.push(new filters.Contrast({ contrast: C }));
    if (S !== 0) list.push(new filters.Saturation({ saturation: S }));
    if (BL > 0) list.push(new filters.Blur({ blur: BL }));
    (activeObject as FabricImage).filters = list;
    (activeObject as FabricImage).applyFilters();
    canvas.renderAll();
  };

  const applyShadow = (color = shadowColor, blur = shadowBlur, x = shadowX, y = shadowY, on = shadowOn) => {
    if (!activeObject || !canvas) return;
    activeObject.set("shadow", on ? new Shadow({ color, blur, offsetX: x, offsetY: y }) : null);
    canvas.renderAll();
  };

  // ── No object selected ─────────────────────────────────────────────────────
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

  // ── Object selected ────────────────────────────────────────────────────────
  return (
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

        {/* ── Filters (images) ── */}
        {isImage && (
          <>
            <Divider />
            <div className="space-y-3">
              <Sec title="Фильтры" />
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={fGs} onCheckedChange={(v) => { setFGs(v); applyFilters({ gs: v }); }} className="scale-75" />
                  <Lbl>Серый</Lbl>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={fSe} onCheckedChange={(v) => { setFSe(v); applyFilters({ se: v }); }} className="scale-75" />
                  <Lbl>Сепия</Lbl>
                </label>
              </div>
              {([
                { label: "Яркость",    val: fBr, set: setFBr, key: "br", min: -100, max: 100 },
                { label: "Контраст",   val: fCo, set: setFCo, key: "co", min: -100, max: 100 },
                { label: "Насыщен.",   val: fSa, set: setFSa, key: "sa", min: -100, max: 100 },
                { label: "Размытие",   val: fBl, set: setFBl, key: "bl", min: 0,    max: 100 },
              ] as any[]).map(({ label, val, set, key, min, max }) => (
                <SliderRow key={key} label={label} value={Math.round(val * 100)} min={min} max={max}
                  onChange={(v) => { const n = v / 100; set(n); applyFilters({ [key]: n }); }} />
              ))}
            </div>
          </>
        )}

        {/* ── QR content ── */}
        {isQR && (
          <>
            <Divider />
            <div className="space-y-2">
              <Sec title="QR-код" />
              <Input value={qrContent} onChange={(e) => setQrContent(e.target.value)}
                placeholder="URL или текст" className="h-7 text-xs bg-muted/40"
                onKeyDown={(e) => e.key === "Enter" && !qrBusy && handleQR()} />
              <Button size="sm" className="w-full h-7 text-xs" disabled={qrBusy || !qrContent.trim()} onClick={handleQR}>
                {qrBusy ? "Обновление..." : "Обновить QR"}
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
                  { I: Bold,          a: bold,   fn: () => { const v = !bold;   setBold(v);   apply("fontWeight", v ? "bold"   : "normal"); } },
                  { I: Italic,        a: italic, fn: () => { const v = !italic; setItalic(v); apply("fontStyle",  v ? "italic" : "normal"); } },
                  { I: Underline,     a: uline,  fn: () => { const v = !uline;  setUline(v);  apply("underline",  v); } },
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
  );

  async function handleQR() {
    if (!qrContent.trim()) return;
    setQrBusy(true);
    try { await onQrUpdate(activeObject, qrContent); }
    finally { setQrBusy(false); }
  }
}
