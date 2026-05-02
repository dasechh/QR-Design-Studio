import { useEffect, useState } from "react";
import { Canvas, Shadow, FabricImage, filters } from "fabric";
import QRCode from "qrcode";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Strikethrough } from "lucide-react";

interface PropertiesPanelProps {
  canvas: Canvas | null;
  activeObject: any;
  onQrUpdate: (oldObj: any, newContent: string) => Promise<void>;
  onRefresh: () => void;
}

const FONT_FAMILIES = [
  "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana",
  "Helvetica", "Tahoma", "Trebuchet MS", "Impact", "Palatino Linotype",
];

const STROKE_DASHES: Record<string, number[] | undefined> = {
  solid: undefined,
  dashed: [12, 6],
  dotted: [3, 6],
};

function Row({ label, children, value }: { label: string; children: React.ReactNode; value?: string | number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        {value !== undefined && <span className="text-xs text-muted-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-8 h-8 rounded-lg border border-border overflow-hidden shrink-0 shadow-sm">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
      />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">{children}</p>;
}

export function PropertiesPanel({ canvas, activeObject, onQrUpdate, onRefresh }: PropertiesPanelProps) {
  const isText = activeObject?.type === "i-text" || activeObject?.type === "text";
  const isImage = activeObject?.type === "image";
  const isRect = activeObject?.type === "rect";
  const isQR = !!(activeObject as any)?.isQR;

  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [fill, setFillState] = useState("#000000");
  const [opacity, setOpacity] = useState(100);
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeDash, setStrokeDash] = useState<"solid" | "dashed" | "dotted">("solid");
  const [rx, setRx] = useState(0);

  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowBlur, setShadowBlur] = useState(10);
  const [shadowX, setShadowX] = useState(5);
  const [shadowY, setShadowY] = useState(5);

  const [filterBrightness, setFilterBrightness] = useState(0);
  const [filterContrast, setFilterContrast] = useState(0);
  const [filterSaturation, setFilterSaturation] = useState(0);
  const [filterBlur, setFilterBlur] = useState(0);
  const [filterGrayscale, setFilterGrayscale] = useState(false);
  const [filterSepia, setFilterSepia] = useState(false);

  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState(32);
  const [fontBold, setFontBold] = useState(false);
  const [fontItalic, setFontItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [linethrough, setLinethrough] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  const [lineHeight, setLineHeight] = useState(1.16);
  const [charSpacing, setCharSpacing] = useState(0);
  const [textFill, setTextFill] = useState("#000000");

  const [qrContent, setQrContent] = useState("");
  const [qrUpdating, setQrUpdating] = useState(false);

  useEffect(() => {
    if (!activeObject) return;

    setPos({
      x: Math.round(activeObject.left || 0),
      y: Math.round(activeObject.top || 0),
      w: Math.round((activeObject.width || 0) * (activeObject.scaleX || 1)),
      h: Math.round((activeObject.height || 0) * (activeObject.scaleY || 1)),
    });

    const fillVal = activeObject.fill || "#000000";
    setFillState(typeof fillVal === "string" ? fillVal : "#000000");
    setOpacity(Math.round((activeObject.opacity ?? 1) * 100));
    setStroke(activeObject.stroke || "#000000");
    setStrokeWidth(activeObject.strokeWidth || 0);

    const dash = activeObject.strokeDashArray;
    if (!dash || dash.length === 0) setStrokeDash("solid");
    else if (dash[0] <= 3) setStrokeDash("dotted");
    else setStrokeDash("dashed");

    setRx(activeObject.rx || 0);

    const shadow = activeObject.shadow;
    setShadowEnabled(!!shadow);
    setShadowColor(shadow?.color || "#000000");
    setShadowBlur(shadow?.blur ?? 10);
    setShadowX(shadow?.offsetX ?? 5);
    setShadowY(shadow?.offsetY ?? 5);

    if (isImage) {
      const flist: any[] = (activeObject as any).filters || [];
      let br = 0, co = 0, sa = 0, bl = 0, gs = false, se = false;
      for (const f of flist) {
        if (f.type === "Brightness") br = f.brightness ?? 0;
        if (f.type === "Contrast") co = f.contrast ?? 0;
        if (f.type === "Saturation") sa = f.saturation ?? 0;
        if (f.type === "Blur") bl = f.blur ?? 0;
        if (f.type === "Grayscale") gs = true;
        if (f.type === "Sepia") se = true;
      }
      setFilterBrightness(br);
      setFilterContrast(co);
      setFilterSaturation(sa);
      setFilterBlur(bl);
      setFilterGrayscale(gs);
      setFilterSepia(se);
    }

    if (isText) {
      setFontFamily(activeObject.fontFamily || "Arial");
      setFontSize(activeObject.fontSize || 32);
      setFontBold(activeObject.fontWeight === "bold");
      setFontItalic(activeObject.fontStyle === "italic");
      setUnderline(!!activeObject.underline);
      setLinethrough(!!activeObject.linethrough);
      setTextAlign(activeObject.textAlign || "left");
      setLineHeight(activeObject.lineHeight ?? 1.16);
      setCharSpacing(activeObject.charSpacing ?? 0);
      const tf = activeObject.fill;
      setTextFill(typeof tf === "string" ? tf : "#000000");
    }

    if (isQR) {
      setQrContent((activeObject as any).qrContent || "");
    }
  }, [activeObject?.top, activeObject?.left, activeObject?.scaleX, activeObject?.scaleY, activeObject]);

  const update = (key: string, val: any) => {
    if (!activeObject || !canvas) return;
    activeObject.set(key as any, val);
    canvas.renderAll();
    onRefresh();
  };

  const applyShadow = (color: string, blur: number, x: number, y: number, enabled: boolean) => {
    if (!activeObject || !canvas) return;
    activeObject.set("shadow", enabled ? new Shadow({ color, blur, offsetX: x, offsetY: y }) : null);
    canvas.renderAll();
    onRefresh();
  };

  const applyFilters = (opts: {
    brightness?: number; contrast?: number; saturation?: number;
    blur?: number; grayscale?: boolean; sepia?: boolean;
  }) => {
    if (!activeObject || !canvas || !isImage) return;
    const br = opts.brightness ?? filterBrightness;
    const co = opts.contrast ?? filterContrast;
    const sa = opts.saturation ?? filterSaturation;
    const bl = opts.blur ?? filterBlur;
    const gs = opts.grayscale ?? filterGrayscale;
    const se = opts.sepia ?? filterSepia;

    const flist: any[] = [];
    if (gs) flist.push(new filters.Grayscale());
    if (se) flist.push(new filters.Sepia());
    if (br !== 0) flist.push(new filters.Brightness({ brightness: br }));
    if (co !== 0) flist.push(new filters.Contrast({ contrast: co }));
    if (sa !== 0) flist.push(new filters.Saturation({ saturation: sa }));
    if (bl > 0) flist.push(new filters.Blur({ blur: bl }));

    (activeObject as FabricImage).filters = flist;
    (activeObject as FabricImage).applyFilters();
    canvas.renderAll();
  };

  const applyStrokeDash = (style: "solid" | "dashed" | "dotted") => {
    if (!activeObject || !canvas) return;
    const arr = STROKE_DASHES[style];
    activeObject.set("strokeDashArray", arr ?? null);
    canvas.renderAll();
    onRefresh();
  };

  const handleQrUpdate = async () => {
    if (!qrContent.trim()) return;
    setQrUpdating(true);
    try {
      await onQrUpdate(activeObject, qrContent);
    } finally {
      setQrUpdating(false);
    }
  };

  if (!activeObject) {
    return (
      <div className="w-72 bg-card border-l border-border shrink-0 flex flex-col items-center justify-center text-center text-muted-foreground p-6 z-20">
        <div className="text-3xl mb-3">✦</div>
        <p className="text-sm font-medium text-foreground mb-1">Нет выбранного объекта</p>
        <p className="text-xs text-muted-foreground">Нажмите на элемент на холсте чтобы редактировать его свойства</p>
      </div>
    );
  }

  return (
    <div className="w-72 bg-card border-l border-border shrink-0 flex flex-col overflow-y-auto z-20">
      <div className="px-4 py-3 border-b border-border">
        <p className="font-semibold text-sm">Свойства</p>
        <p className="text-xs text-muted-foreground capitalize">{activeObject.type}</p>
      </div>

      <div className="p-4 space-y-5 text-sm">

        {/* Transform */}
        <div>
          <SectionTitle>Положение и размер</SectionTitle>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: "X", key: "x", val: pos.x, set: (v: number) => { setPos(p => ({ ...p, x: v })); update("left", v); } },
              { label: "Y", key: "y", val: pos.y, set: (v: number) => { setPos(p => ({ ...p, y: v })); update("top", v); } },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input type="number" value={val} onChange={(e) => set(parseInt(e.target.value) || 0)} className="h-7 text-xs bg-background" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">W</Label>
              <Input type="number" value={pos.w} readOnly className="h-7 text-xs bg-muted/50 opacity-60" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">H</Label>
              <Input type="number" value={pos.h} readOnly className="h-7 text-xs bg-muted/50 opacity-60" />
            </div>
          </div>
        </div>

        <Separator />

        {/* Fill */}
        {!isImage && (
          <>
            <div>
              <SectionTitle>{isText ? "Цвет текста" : "Заливка"}</SectionTitle>
              <div className="flex items-center gap-3 mt-2">
                <ColorSwatch
                  value={isText ? textFill : fill}
                  onChange={(v) => {
                    if (isText) { setTextFill(v); update("fill", v); }
                    else { setFillState(v); update("fill", v); }
                  }}
                />
                <Input
                  type="text"
                  value={isText ? textFill : fill}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isText) { setTextFill(v); update("fill", v); }
                    else { setFillState(v); update("fill", v); }
                  }}
                  className="h-7 text-xs bg-background font-mono"
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Opacity */}
        <Row label="Непрозрачность" value={`${opacity}%`}>
          <Slider
            value={[opacity]} min={0} max={100} step={1}
            onValueChange={([v]) => { setOpacity(v); update("opacity", v / 100); }}
          />
        </Row>

        <Separator />

        {/* Stroke */}
        <div>
          <SectionTitle>Обводка</SectionTitle>
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <ColorSwatch value={stroke} onChange={(v) => { setStroke(v); update("stroke", v); }} />
              <div className="flex-1">
                <Slider
                  value={[strokeWidth]} min={0} max={30} step={1}
                  onValueChange={([v]) => { setStrokeWidth(v); update("strokeWidth", v); }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-5 text-right">{strokeWidth}</span>
            </div>
            <Select value={strokeDash} onValueChange={(v: any) => { setStrokeDash(v); applyStrokeDash(v); }}>
              <SelectTrigger className="h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Сплошная</SelectItem>
                <SelectItem value="dashed">Штриховая</SelectItem>
                <SelectItem value="dotted">Точечная</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Border Radius */}
        {(isRect) && (
          <>
            <Separator />
            <Row label="Скругление углов" value={rx}>
              <Slider
                value={[rx]} min={0} max={150} step={1}
                onValueChange={([v]) => { setRx(v); activeObject.set({ rx: v, ry: v }); canvas?.renderAll(); onRefresh(); }}
              />
            </Row>
          </>
        )}

        <Separator />

        {/* Shadow */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Тень</SectionTitle>
            <Switch
              checked={shadowEnabled}
              onCheckedChange={(v) => {
                setShadowEnabled(v);
                applyShadow(shadowColor, shadowBlur, shadowX, shadowY, v);
              }}
            />
          </div>
          {shadowEnabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ColorSwatch
                  value={shadowColor}
                  onChange={(v) => { setShadowColor(v); applyShadow(v, shadowBlur, shadowX, shadowY, true); }}
                />
                <Label className="text-xs text-muted-foreground">Цвет тени</Label>
              </div>
              <Row label="Размытие" value={shadowBlur}>
                <Slider value={[shadowBlur]} min={0} max={60} step={1}
                  onValueChange={([v]) => { setShadowBlur(v); applyShadow(shadowColor, v, shadowX, shadowY, true); }} />
              </Row>
              <Row label="Смещение X" value={shadowX}>
                <Slider value={[shadowX]} min={-50} max={50} step={1}
                  onValueChange={([v]) => { setShadowX(v); applyShadow(shadowColor, shadowBlur, v, shadowY, true); }} />
              </Row>
              <Row label="Смещение Y" value={shadowY}>
                <Slider value={[shadowY]} min={-50} max={50} step={1}
                  onValueChange={([v]) => { setShadowY(v); applyShadow(shadowColor, shadowBlur, shadowX, v, true); }} />
              </Row>
            </div>
          )}
        </div>

        {/* Filters (images only) */}
        {isImage && (
          <>
            <Separator />
            <div>
              <SectionTitle>Фильтры</SectionTitle>
              <div className="space-y-3 mt-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-20 shrink-0">Оттенки серого</Label>
                  <Switch checked={filterGrayscale} onCheckedChange={(v) => {
                    setFilterGrayscale(v);
                    applyFilters({ grayscale: v });
                  }} />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-20 shrink-0">Сепия</Label>
                  <Switch checked={filterSepia} onCheckedChange={(v) => {
                    setFilterSepia(v);
                    applyFilters({ sepia: v });
                  }} />
                </div>
                <Row label="Яркость" value={Math.round(filterBrightness * 100)}>
                  <Slider value={[filterBrightness * 100]} min={-100} max={100} step={1}
                    onValueChange={([v]) => {
                      const val = v / 100;
                      setFilterBrightness(val);
                      applyFilters({ brightness: val });
                    }} />
                </Row>
                <Row label="Контраст" value={Math.round(filterContrast * 100)}>
                  <Slider value={[filterContrast * 100]} min={-100} max={100} step={1}
                    onValueChange={([v]) => {
                      const val = v / 100;
                      setFilterContrast(val);
                      applyFilters({ contrast: val });
                    }} />
                </Row>
                <Row label="Насыщенность" value={Math.round(filterSaturation * 100)}>
                  <Slider value={[filterSaturation * 100]} min={-100} max={100} step={1}
                    onValueChange={([v]) => {
                      const val = v / 100;
                      setFilterSaturation(val);
                      applyFilters({ saturation: val });
                    }} />
                </Row>
                <Row label="Размытие" value={Math.round(filterBlur * 100)}>
                  <Slider value={[filterBlur * 100]} min={0} max={100} step={1}
                    onValueChange={([v]) => {
                      const val = v / 100;
                      setFilterBlur(val);
                      applyFilters({ blur: val });
                    }} />
                </Row>
              </div>
            </div>
          </>
        )}

        {/* QR Content */}
        {isQR && (
          <>
            <Separator />
            <div>
              <SectionTitle>QR-код</SectionTitle>
              <div className="space-y-2 mt-2">
                <Input
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder="URL или текст"
                  className="h-7 text-xs bg-background"
                  onKeyDown={(e) => e.key === "Enter" && handleQrUpdate()}
                />
                <Button size="sm" className="w-full h-7 text-xs" onClick={handleQrUpdate} disabled={qrUpdating || !qrContent.trim()}>
                  {qrUpdating ? "Обновление..." : "Обновить QR-код"}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Text Properties */}
        {isText && (
          <>
            <Separator />
            <div>
              <SectionTitle>Текст</SectionTitle>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Шрифт</Label>
                  <Select value={fontFamily} onValueChange={(v) => { setFontFamily(v); update("fontFamily", v); }}>
                    <SelectTrigger className="h-7 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Размер</Label>
                  <Input
                    type="number"
                    value={fontSize}
                    min={4} max={400}
                    onChange={(e) => { const v = parseInt(e.target.value) || 12; setFontSize(v); update("fontSize", v); }}
                    className="h-7 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Начертание</Label>
                  <div className="flex gap-1">
                    {[
                      { icon: Bold, key: "bold", active: fontBold, onClick: () => { const v = !fontBold; setFontBold(v); update("fontWeight", v ? "bold" : "normal"); } },
                      { icon: Italic, key: "italic", active: fontItalic, onClick: () => { const v = !fontItalic; setFontItalic(v); update("fontStyle", v ? "italic" : "normal"); } },
                      { icon: Underline, key: "underline", active: underline, onClick: () => { const v = !underline; setUnderline(v); update("underline", v); } },
                      { icon: Strikethrough, key: "strike", active: linethrough, onClick: () => { const v = !linethrough; setLinethrough(v); update("linethrough", v); } },
                    ].map(({ icon: Icon, key, active, onClick }) => (
                      <Button
                        key={key}
                        variant={active ? "default" : "outline"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={onClick}
                      >
                        <Icon className="w-3 h-3" />
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Выравнивание</Label>
                  <ToggleGroup
                    type="single"
                    value={textAlign}
                    onValueChange={(v) => { if (v) { setTextAlign(v); update("textAlign", v); } }}
                    className="justify-start gap-1"
                  >
                    {[
                      { value: "left", icon: AlignLeft },
                      { value: "center", icon: AlignCenter },
                      { value: "right", icon: AlignRight },
                      { value: "justify", icon: AlignJustify },
                    ].map(({ value, icon: Icon }) => (
                      <ToggleGroupItem key={value} value={value} className="h-7 w-7 p-0">
                        <Icon className="w-3 h-3" />
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <Row label="Межстрочный интервал" value={lineHeight.toFixed(2)}>
                  <Slider
                    value={[lineHeight * 100]} min={80} max={300} step={1}
                    onValueChange={([v]) => {
                      const val = v / 100;
                      setLineHeight(val);
                      update("lineHeight", val);
                    }}
                  />
                </Row>

                <Row label="Межбуквенный интервал" value={charSpacing}>
                  <Slider
                    value={[charSpacing]} min={-200} max={800} step={10}
                    onValueChange={([v]) => { setCharSpacing(v); update("charSpacing", v); }}
                  />
                </Row>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
