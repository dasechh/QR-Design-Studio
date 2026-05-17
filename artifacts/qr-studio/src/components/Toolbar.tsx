import { useRef, useState } from "react";
import { Canvas, IText, FabricImage } from "fabric";
import QRCode from "qrcode";
import {
  QrCode, Type, ImagePlus, Copy, Trash2,
  FlipHorizontal2, FlipVertical2, BringToFront, SendToBack,
  Save, FolderOpen, Download, LogOut,
  GripVertical, GripHorizontal, LayoutGrid,
  Square, Circle, Minus, Triangle, Pencil,
  Undo2, Redo2, FilePlus2, MousePointer2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";
import { useListDesigns } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ToolbarProps {
  canvas: Canvas | null;
  activeTool: string;
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onSave: (title: string) => void;
  onLoad: (design: any) => void;
}

type Orientation = "vertical" | "horizontal";

export function Toolbar({ canvas, activeTool, onToolChange, onUndo, onRedo, onNew, onSave, onLoad }: ToolbarProps) {
  const { logout } = useAuth();
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [isQrOpen, setIsQrOpen] = useState(false);

  const { data: designs } = useListDesigns({ query: { enabled: isLoadOpen } });

  const onDragPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panelX: pos.x, panelY: pos.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPos({ x: dragStart.current.panelX + e.clientX - dragStart.current.mouseX, y: dragStart.current.panelY + e.clientY - dragStart.current.mouseY });
  };
  const onPointerUp = () => { isDragging.current = false; };

  // ── Canvas operations ──────────────────────────────────────────────────────
  const addText = () => {
    if (!canvas) return;
    const t = new IText("Текст", { left: 100, top: 100, fontSize: 32, fill: "#222222", fontFamily: "Arial" });
    canvas.add(t); canvas.setActiveObject(t); canvas.renderAll();
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (f) => {
        const img = await FabricImage.fromURL(f.target?.result as string);
        img.scaleToWidth(200);
        canvas?.add(img); canvas?.setActiveObject(img); canvas?.renderAll();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addQr = async () => {
    if (!canvas || !qrInput) return;
    const dataUrl = await QRCode.toDataURL(qrInput, { width: 300, margin: 1 });
    const img = await FabricImage.fromURL(dataUrl);
    (img as any).isQR            = true;
    (img as any).qrContent       = qrInput;
    (img as any).qrDotColor      = "#000000";
    (img as any).qrDotStyle      = "square";
    (img as any).qrBgColor       = "#ffffff";
    (img as any).qrCornerColor   = "#000000";
    (img as any).qrCornerStyle   = "square";
    img.scaleToWidth(200);
    canvas.add(img); canvas.setActiveObject(img); canvas.renderAll();
    setIsQrOpen(false); setQrInput("");
  };

  const duplicate = async () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject(); if (!obj) return;
    const cloned = await obj.clone([
      "isQR", "qrContent", "qrDotColor", "qrDotStyle",
      "qrBgColor", "qrCornerColor", "qrCornerStyle",
    ]);
    cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
    canvas.add(cloned); canvas.setActiveObject(cloned); canvas.renderAll();
  };

  const remove = () => {
    if (!canvas) return;
    canvas.getActiveObjects().forEach((o) => canvas.remove(o));
    canvas.discardActiveObject(); canvas.renderAll();
  };

  const flipX = () => { const o = canvas?.getActiveObject(); if (o) { o.set({ flipX: !o.flipX }); canvas?.renderAll(); } };
  const flipY = () => { const o = canvas?.getActiveObject(); if (o) { o.set({ flipY: !o.flipY }); canvas?.renderAll(); } };
  const bringFront = () => { const o = canvas?.getActiveObject(); if (o && canvas) { canvas.bringObjectToFront(o); canvas.renderAll(); } };
  const sendBack = () => { const o = canvas?.getActiveObject(); if (o && canvas) { canvas.sendObjectToBack(o); canvas.renderAll(); } };
  const exportImage = () => {
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a"); a.href = url; a.download = "design.png"; a.click();
  };

  const isH = orientation === "horizontal";
  const side = isH ? "bottom" : "right";

  // ── Button factory ─────────────────────────────────────────────────────────
  const btn = (
    icon: React.ElementType,
    tooltip: string,
    onClick: () => void,
    opts?: { active?: boolean; danger?: boolean }
  ) => {
    const Icon = icon;
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon"
            className={`w-8 h-8 rounded-lg transition-colors ${
              opts?.active
                ? "bg-primary/15 text-primary hover:bg-primary/20 ring-1 ring-primary/30"
                : opts?.danger
                  ? "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  : "text-muted-foreground hover:text-primary hover:bg-secondary"
            }`}
            onClick={onClick}
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="text-xs font-medium">{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  // ── Grid layout helpers ────────────────────────────────────────────────────
  const Div = ({ k }: { k: string }) => (
    <div key={k} className={isH
      ? "w-px h-5 bg-border mx-0.5 self-center shrink-0"
      : "col-span-2 h-px bg-border my-0.5"
    } />
  );
  // Empty spacer — fills the "odd" slot only in vertical 2-col grid
  const Sp = () => isH ? null : <div className="w-8 h-8" />;

  // Single row in horizontal; 2-col grid in vertical
  const gridCls = isH
    ? "flex flex-row gap-0.5 items-center"
    : "grid grid-cols-2 gap-0.5";

  return (
    <>
      <div
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-1.5">
          {/* Drag handle + orient toggle — always a 2-slot header row */}
          <div className={`flex ${isH ? "flex-col" : "flex-row"} gap-0.5 ${isH ? "mb-0" : "mb-0.5"}`}>
            <div
              className={`flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors ${isH ? "w-8 h-5" : "w-5 h-8"}`}
              onPointerDown={onDragPointerDown}
            >
              {isH ? <GripVertical className="w-3.5 h-3.5" /> : <GripHorizontal className="w-3.5 h-3.5" />}
            </div>
            {btn(LayoutGrid, isH ? "Вертикальный режим" : "Горизонтальный режим",
              () => setOrientation(isH ? "vertical" : "horizontal"))}
          </div>

          {/* Main 2-column / 2-row grid */}
          <div className={gridCls}>

            {/* ── SELECT ── */}
            {btn(MousePointer2, "Выбор (V / Esc)", () => onToolChange("select"), { active: activeTool === "select" })}
            <Sp />

            <Div k="d0" />

            {/* ── SHAPES ── */}
            {btn(Square,   "Прямоугольник",  () => onToolChange("rect"),     { active: activeTool === "rect"     })}
            {btn(Circle,   "Эллипс",         () => onToolChange("ellipse"),  { active: activeTool === "ellipse"  })}
            {btn(Triangle, "Треугольник",    () => onToolChange("triangle"), { active: activeTool === "triangle" })}
            {btn(Minus,    "Линия",          () => onToolChange("line"),     { active: activeTool === "line"     })}

            <Div k="d1" />

            {/* ── OBJECTS ── */}
            {btn(QrCode,    "Добавить QR-код",       () => setIsQrOpen(true))}
            {btn(Type,      "Добавить текст",          addText)}
            {btn(ImagePlus, "Добавить изображение",    addImage)}
            <Sp />

            <Div k="d2" />

            {/* ── PENCIL ── */}
            {btn(Pencil, "Карандаш", () => onToolChange("pencil"), { active: activeTool === "pencil" })}
            <Sp />

            <Div k="d3" />

            {/* ── EDIT ── */}
            {btn(Copy,            "Дублировать",         duplicate)}
            {btn(Trash2,          "Удалить (Del)",       remove,     { danger: true })}
            {btn(FlipHorizontal2, "Отразить горизонт.",  flipX)}
            {btn(FlipVertical2,   "Отразить вертикал.",  flipY)}
            {btn(BringToFront,    "На передний план",    bringFront)}
            {btn(SendToBack,      "На задний план",      sendBack)}

            <Div k="d4" />

            {/* ── HISTORY ── */}
            {btn(Undo2, "Отменить (Ctrl+Z)", onUndo)}
            {btn(Redo2, "Повторить (Ctrl+Y)", onRedo)}

            <Div k="d5" />

            {/* ── FILE ── */}
            {btn(FilePlus2, "Новый дизайн",      () => setIsNewOpen(true))}
            {btn(FolderOpen,"Открыть дизайн",    () => setIsLoadOpen(true))}
            {btn(Save,      "Сохранить",          () => setIsSaveOpen(true))}
            {btn(Download,  "Экспортировать PNG", exportImage)}

            <Div k="d6" />

            {/* ── ACCOUNT ── */}
            {btn(LogOut, "Выйти", logout, { danger: true })}
            <Sp />

          </div>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Добавить QR-код</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Введите URL или текст" value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addQr()} autoFocus />
          </div>
          <DialogFooter><Button onClick={addQr} disabled={!qrInput}>Сгенерировать</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Сохранить дизайн</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Название дизайна" value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saveTitle) { onSave(saveTitle); setIsSaveOpen(false); setSaveTitle(""); } }}
              autoFocus />
          </div>
          <DialogFooter>
            <Button onClick={() => { if (saveTitle) { onSave(saveTitle); setIsSaveOpen(false); setSaveTitle(""); } }} disabled={!saveTitle}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={isLoadOpen} onOpenChange={setIsLoadOpen}>
        <DialogContent className="sm:max-w-2xl h-[580px] flex flex-col">
          <DialogHeader><DialogTitle>Открыть дизайн</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-3 gap-3 pb-4">
              {designs?.map((d) => (
                <div key={d.id}
                  className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary hover:shadow-md cursor-pointer transition-all"
                  onClick={() => { onLoad(d); setIsLoadOpen(false); }}>
                  <div className="aspect-[4/3] bg-muted/50 p-2">
                    {d.thumbnail && <img src={d.thumbnail} alt={d.title} className="w-full h-full object-contain" />}
                  </div>
                  <div className="p-2.5 border-t border-border">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(d.updatedAt).toLocaleDateString("ru")}</p>
                  </div>
                </div>
              ))}
              {!designs?.length && (
                <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
                  Нет сохранённых дизайнов
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New Design Confirm */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый дизайн</DialogTitle>
            <DialogDescription>
              Текущий холст будет очищен. Сначала сохраните дизайн, если хотите его сохранить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Отмена</Button>
            <Button onClick={() => { onNew(); setIsNewOpen(false); }}>Очистить холст</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
