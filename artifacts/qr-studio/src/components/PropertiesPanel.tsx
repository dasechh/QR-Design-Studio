import { useEffect, useState } from "react";
import { Canvas, Shadow, FabricImage, filters } from "fabric";
import { Label } from "@/components/ui/label";
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
  onQrUpdate: (oldObj: any, newContent: string) => Promise<void>;
}

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Helvetica", "Tahoma", "Impact", "Palatino Linotype", "Trebuchet MS"];

function Divider() {
  return <div className="h-px bg-border -mx-4" />;
}

function Section({ title }: { title: string }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>;
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md border border-border overflow-hidden shrink-0 shadow-sm cursor-pointer">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-none outline-none" />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs font-mono bg-muted/40 border-border flex-1" maxLength={7} />
    </div>
  );
}

function NumBox({ label, value, onChange, min = -9999, max = 9999, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Lbl>{label}</Lbl>
      <input
        type="number"
        value={value}
        min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-full rounded-md border border-border bg-muted/40 text-xs text-center px-1 focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function PropertiesPanel({ canvas, activeObject, onQrUpdate }: Props) {
  const isText = activeObject?.type === "i-text" || activeObject?.type === "text";
  const isImage = activeObject?.type === "image";
  const isRect = activeObject?.type === "rect";
  const isQR = !!(activeObject as any)?.isQR;

  const apply = (key: string, val: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key as any, val);
    canvas.renderAll();
  };

  // ── Fill ─────────────────────────────────────────────────────────────────
  const [fill, setFill] = useState("#000000");
  const [opacity, setOpacity] = useState(100);

  // ── Stroke ────────────────────────────────────────────────────────────────
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeDash, setStrokeDash] = useState<"solid" | "dashed" | "dotted">("solid");

  // ── Border radius ─────────────────────────────────────────────────────────
  const [rx, setRx] = useState(0);

  // ── Shadow ────────────────────────────────────────────────────────────────
  const [shadowOn, setShadowOn] = useState(false);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState(10);
  const [shadowX, setShadowX] = useState(5);
  const [shadowY, setShadowY] = useState(5);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [fBr, setFBr] = useState(0);
  const [fCo, setFCo] = useState(0);
  const [fSa, setFSa] = useState(0);
  const [fBl, setFBl] = useState(0);
  const [fGs, setFGs] = useState(false);
  const [fSe, setFSe] = useState(false);

  // ── Text ──────────────────────────────────────────────────────────────────
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [uline, setUline] = useState(false);
  const [strike, setStrike] = useState(false);
  const [align, setAlign] = useState("left");
  const [lh, setLh] = useState(1.16);
  const [cs, setCs] = useState(0);

  // ── QR ────────────────────────────────────────────────────────────────────
  const [qrContent, setQrContent] = useState("");
  const [qrBusy, setQrBusy] = useState(false);

  // Sync state only when a different object is selected
  useEffect(() => {
    if (!activeObject) return;

    const f = activeObject.fill;
    setFill(typeof f === "string" ? f : "#000000");
    setOpacity(Math.round((activeObject.opacity ?? 1) * 100));
    setStroke(activeObject.stroke || "#000000");
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
      const flist: any[] = (activeObject as any).filters || [];
      setFBr(0); setFCo(0); setFSa(0); setFBl(0); setFGs(false); setFSe(false);
      for (const f of flist) {
        if (f.type === "Brightness") setFBr(f.brightness ?? 0);
        if (f.type === "Contrast") setFCo(f.contrast ?? 0);
        if (f.type === "Saturation") setFSa(f.saturation ?? 0);
        if (f.type === "Blur") setFBl(f.blur ?? 0);
        if (f.type === "Grayscale") setFGs(true);
        if (f.type === "Sepia") setFSe(true);
      }
    }

    if (isText) {
      setFontFamily(activeObject.fontFamily || "Arial");
      setFontSize(activeObject.fontSize || 32);
      setBold(activeObject.fontWeight === "bold");
      setItalic(activeObject.fontStyle === "italic");
      setUline(!!activeObject.underline);
      setStrike(!!activeObject.linethrough);
      setAlign(activeObject.textAlign || "left");
      setLh(activeObject.lineHeight ?? 1.16);
      setCs(activeObject.charSpacing ?? 0);
      const tf = activeObject.fill;
      setFill(typeof tf === "string" ? tf : "#000000");
    }

    if (isQR) setQrContent((activeObject as any).qrContent || "");
  }, [activeObject]); // intentionally only re-runs when object identity changes

  const applyFilters = (opts: { br?: number; co?: number; sa?: number; bl?: number; gs?: boolean; se?: boolean }) => {
    if (!activeObject || !canvas) return;
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

  if (!activeObject) {
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

  return (
    <div className="w-64 bg-card border-l border-border shrink-0 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <p className="font-semibold text-sm">Свойства</p>
        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{activeObject.type}</p>
      </div>

      <div className="flex flex-col gap-4 p-4 text-sm">

        {/* ── Fill / Color ── */}
        {!isImage && (
          <>
            <div className="space-y-2">
              <Section title={isText ? "Цвет текста" : "Заливка"} />
              <ColorPicker value={fill} onChange={(v) => { setFill(v); apply("fill", v); }} />
            </div>
            <Divider />
          </>
        )}

        {/* ── Opacity ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Section title="Непрозрачность" />
            <span className="text-xs font-medium text-foreground">{opacity}%</span>
          </div>
          <Slider value={[opacity]} min={0} max={100} step={1}
            onValueChange={([v]) => { setOpacity(v); apply("opacity", v / 100); }} />
        </div>

        <Divider />

        {/* ── Stroke ── */}
        <div className="space-y-2.5">
          <Section title="Обводка" />
          <ColorPicker value={stroke} onChange={(v) => { setStroke(v); apply("stroke", v); }} />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Slider value={[strokeWidth]} min={0} max={30} step={1}
                onValueChange={([v]) => { setStrokeWidth(v); apply("strokeWidth", v); }} />
            </div>
            <span className="text-xs text-muted-foreground w-4 text-right">{strokeWidth}</span>
          </div>
          <Select value={strokeDash} onValueChange={(v: any) => {
            setStrokeDash(v);
            const arr = v === "dashed" ? [12, 6] : v === "dotted" ? [3, 6] : null;
            apply("strokeDashArray", arr);
          }}>
            <SelectTrigger className="h-7 text-xs bg-muted/40 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Сплошная</SelectItem>
              <SelectItem value="dashed">Штриховая</SelectItem>
              <SelectItem value="dotted">Точечная</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Border Radius ── */}
        {isRect && (
          <>
            <Divider />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Section title="Скругление" />
                <span className="text-xs font-medium text-foreground">{rx}</span>
              </div>
              <Slider value={[rx]} min={0} max={200} step={1}
                onValueChange={([v]) => { setRx(v); activeObject.set({ rx: v, ry: v }); canvas?.renderAll(); }} />
            </div>
          </>
        )}

        <Divider />

        {/* ── Shadow ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Section title="Тень" />
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
              <Section title="Фильтры" />
              <div className="flex gap-3">
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
                { label: "Яркость", val: fBr, set: setFBr, key: "br" },
                { label: "Контраст", val: fCo, set: setFCo, key: "co" },
                { label: "Насыщен.", val: fSa, set: setFSa, key: "sa" },
                { label: "Размытие", val: fBl, set: setFBl, key: "bl", min: 0, max: 1 },
              ] as any[]).map(({ label, val, set, key, min = -1, max = 1 }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Lbl>{label}</Lbl>
                    <span className="text-[10px] text-muted-foreground">{Math.round(val * 100)}</span>
                  </div>
                  <Slider
                    value={[Math.round(val * 100)]}
                    min={Math.round(min * 100)}
                    max={Math.round(max * 100)}
                    step={1}
                    onValueChange={([v]) => {
                      const n = v / 100;
                      set(n);
                      applyFilters({ [key]: n });
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── QR Content ── */}
        {isQR && (
          <>
            <Divider />
            <div className="space-y-2">
              <Section title="QR-код" />
              <Input value={qrContent} onChange={(e) => setQrContent(e.target.value)}
                placeholder="URL или текст" className="h-7 text-xs bg-muted/40 border-border"
                onKeyDown={(e) => e.key === "Enter" && !qrBusy && handleQR()} />
              <Button size="sm" className="w-full h-7 text-xs" disabled={qrBusy || !qrContent.trim()}
                onClick={handleQR}>
                {qrBusy ? "Обновление..." : "Обновить QR"}
              </Button>
            </div>
          </>
        )}

        {/* ── Text ── */}
        {isText && (
          <>
            <Divider />
            <div className="space-y-3">
              <Section title="Текст" />

              <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); apply("fontFamily", v); }}>
                <SelectTrigger className="h-7 text-xs bg-muted/40 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                  ))}
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
                  { Icon: Bold, active: bold, onClick: () => { const v = !bold; setBold(v); apply("fontWeight", v ? "bold" : "normal"); } },
                  { Icon: Italic, active: italic, onClick: () => { const v = !italic; setItalic(v); apply("fontStyle", v ? "italic" : "normal"); } },
                  { Icon: Underline, active: uline, onClick: () => { const v = !uline; setUline(v); apply("underline", v); } },
                  { Icon: Strikethrough, active: strike, onClick: () => { const v = !strike; setStrike(v); apply("linethrough", v); } },
                ]).map(({ Icon, active, onClick }, idx) => (
                  <Button key={idx} variant={active ? "default" : "outline"} size="icon" className="h-7 w-7 flex-1" onClick={onClick}>
                    <Icon className="w-3 h-3" />
                  </Button>
                ))}
              </div>

              <ToggleGroup type="single" value={align}
                onValueChange={(v) => { if (v) { setAlign(v); apply("textAlign", v); } }}
                className="justify-start gap-1">
                {[
                  { v: "left", I: AlignLeft },
                  { v: "center", I: AlignCenter },
                  { v: "right", I: AlignRight },
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
