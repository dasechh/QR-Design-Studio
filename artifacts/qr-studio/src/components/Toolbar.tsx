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
import { useToast } from "@/hooks/use-toast";

interface ToolbarProps {
  canvas: Canvas | null;
  activeTool: string;
  onToolChange: (tool: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  onSave: (title: string) => void;
  onLoad: (design: any) => void;
  currentDesignId: number | null;
  currentDesignTitle: string;
}

type Orientation = "vertical" | "horizontal";

export function Toolbar({
  canvas, activeTool, onToolChange, onUndo, onRedo, onNew, onSave, onLoad,
  currentDesignId, currentDesignTitle,
}: ToolbarProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
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
    const t = new IText("Текст", { fontSize: 32, fill: "#222222", fontFamily: "Arial" });
    canvas.add(t);
    canvas.centerObject(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
    toast({ title: "Текст добавлен" });
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (f) => {
        if (!canvas) return;
        const img = await FabricImage.fromURL(f.target?.result as string);
        img.scaleToWidth(Math.min(200, canvas.width * 0.4));
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        toast({ title: "Изображение добавлено" });
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
    canvas.add(img);
    canvas.centerObject(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    setIsQrOpen(false); setQrInput("");
    toast({ title: "QR-код добавлен" });
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
    toast({ title: "Объект скопирован" });
  };

  const remove = () => {
    if (!canvas) return;
    const count = canvas.getActiveObjects().length;
    if (!count) return;
    canvas.getActiveObjects().forEach((o) => canvas.remove(o));
    canvas.discardActiveObject(); canvas.renderAll();
    toast({ title: count === 1 ? "Объект удалён" : `Удалено объектов: ${count}` });
  };

  const flipX = () => {
    const o = canvas?.getActiveObject();
    if (o) { o.set({ flipX: !o.flipX }); canvas?.renderAll(); toast({ title: "Отражено по горизонтали" }); }
  };
  const flipY = () => {
    const o = canvas?.getActiveObject();
    if (o) { o.set({ flipY: !o.flipY }); canvas?.renderAll(); toast({ title: "Отражено по вертикали" }); }
  };
  const bringFront = () => {
    const o = canvas?.getActiveObject();
    if (o && canvas) { canvas.bringObjectToFront(o); canvas.renderAll(); toast({ title: "Перемещено на передний план" }); }
  };
  const sendBack = () => {
    const o = canvas?.getActiveObject();
    if (o && canvas) { canvas.sendObjectToBack(o); canvas.renderAll(); toast({ title: "Перемещено на задний план" }); }
  };
  const exportImage = () => {
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a"); a.href = url; a.download = "design.png"; a.click();
    toast({ title: "PNG экспортирован" });
  };

  // Smart save: skip dialog if design already exists
  const handleSaveClick = () => {
    if (currentDesignId && currentDesignTitle) {
      onSave(currentDesignTitle);
    } else {
      setSaveTitle(currentDesignTitle || "");
      setIsSaveOpen(true);
    }
  };

  const confirmSave = () => {
    if (!saveTitle.trim()) return;
    onSave(saveTitle.trim());
    setIsSaveOpen(false);
    setSaveTitle("");
  };

  const isH = orientation === "horizontal";
  const tooltipSide = isH ? "bottom" : "right";

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
            className={`w-8 h-8 rounded-lg transition-colors shrink-0 ${
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
        <TooltipContent side={tooltipSide} className="text-xs font-medium">{tooltip}</TooltipContent>
      </Tooltip>
    );
  };

  // Divider
  const HSep = () => <div className="w-px h-5 bg-border mx-0.5 self-center shrink-0" />;
  const VSep = () => <div className="col-span-2 h-px bg-border my-0.5" />;
  const Sp   = () => <div className="w-8 h-8" />;

  // Grip handle
  const grip = (
    <div
      className={`flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors shrink-0 ${isH ? "w-6 h-8" : "w-5 h-8"}`}
      onPointerDown={onDragPointerDown}
    >
      {isH ? <GripVertical className="w-3.5 h-3.5" /> : <GripHorizontal className="w-3.5 h-3.5" />}
    </div>
  );

  return (
    <>
      <div
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-1.5">

          {isH ? (
            /* ── HORIZONTAL: single flex row ── */
            <div className="flex flex-row gap-0.5 items-center">
              {grip}
              {btn(LayoutGrid, "Вертикальный режим", () => setOrientation("vertical"))}
              <HSep />

              {btn(MousePointer2, "Выбор (V / Esc)", () => onToolChange("select"), { active: activeTool === "select" })}
              <HSep />

              {btn(Square,   "Прямоугольник",  () => onToolChange("rect"),     { active: activeTool === "rect"     })}
              {btn(Circle,   "Эллипс",         () => onToolChange("ellipse"),  { active: activeTool === "ellipse"  })}
              {btn(Triangle, "Треугольник",    () => onToolChange("triangle"), { active: activeTool === "triangle" })}
              {btn(Minus,    "Линия",          () => onToolChange("line"),     { active: activeTool === "line"     })}
              <HSep />

              {btn(QrCode,    "Добавить QR-код",       () => setIsQrOpen(true))}
              {btn(Type,      "Добавить текст",          addText)}
              {btn(ImagePlus, "Добавить изображение",    addImage)}
              <HSep />

              {btn(Pencil, "Карандаш", () => onToolChange("pencil"), { active: activeTool === "pencil" })}
              <HSep />

              {btn(Copy,            "Дублировать",         duplicate)}
              {btn(Trash2,          "Удалить (Del)",       remove,     { danger: true })}
              {btn(FlipHorizontal2, "Отразить горизонт.",  flipX)}
              {btn(FlipVertical2,   "Отразить вертикал.",  flipY)}
              {btn(BringToFront,    "На передний план",    bringFront)}
              {btn(SendToBack,      "На задний план",      sendBack)}
              <HSep />

              {btn(Undo2, "Отменить (Ctrl+Z)", onUndo)}
              {btn(Redo2, "Повторить (Ctrl+Y)", onRedo)}
              <HSep />

              {btn(FilePlus2, "Новый дизайн",      () => setIsNewOpen(true))}
              {btn(FolderOpen,"Открыть дизайн",    () => setIsLoadOpen(true))}
              {btn(Save,      "Сохранить",          handleSaveClick)}
              {btn(Download,  "Экспортировать PNG", exportImage)}
              <HSep />

              {btn(LogOut, "Выйти", logout, { danger: true })}
            </div>

          ) : (
            /* ── VERTICAL: grip+toggle header + 2-col grid ── */
            <>
              <div className="flex flex-row gap-0.5 mb-0.5">
                {grip}
                {btn(LayoutGrid, "Горизонтальный режим", () => setOrientation("horizontal"))}
              </div>

              <div className="grid grid-cols-2 gap-0.5">
                {btn(MousePointer2, "Выбор (V / Esc)", () => onToolChange("select"), { active: activeTool === "select" })}
                <Sp />

                <VSep />

                {btn(Square,   "Прямоугольник",  () => onToolChange("rect"),     { active: activeTool === "rect"     })}
                {btn(Circle,   "Эллипс",         () => onToolChange("ellipse"),  { active: activeTool === "ellipse"  })}
                {btn(Triangle, "Треугольник",    () => onToolChange("triangle"), { active: activeTool === "triangle" })}
                {btn(Minus,    "Линия",          () => onToolChange("line"),     { active: activeTool === "line"     })}

                <VSep />

                {btn(QrCode,    "Добавить QR-код",       () => setIsQrOpen(true))}
                {btn(Type,      "Добавить текст",          addText)}
                {btn(ImagePlus, "Добавить изображение",    addImage)}
                <Sp />

                <VSep />

                {btn(Pencil, "Карандаш", () => onToolChange("pencil"), { active: activeTool === "pencil" })}
                <Sp />

                <VSep />

                {btn(Copy,            "Дублировать",         duplicate)}
                {btn(Trash2,          "Удалить (Del)",       remove,     { danger: true })}
                {btn(FlipHorizontal2, "Отразить горизонт.",  flipX)}
                {btn(FlipVertical2,   "Отразить вертикал.",  flipY)}
                {btn(BringToFront,    "На передний план",    bringFront)}
                {btn(SendToBack,      "На задний план",      sendBack)}

                <VSep />

                {btn(Undo2, "Отменить (Ctrl+Z)", onUndo)}
                {btn(Redo2, "Повторить (Ctrl+Y)", onRedo)}

                <VSep />

                {btn(FilePlus2, "Новый дизайн",      () => setIsNewOpen(true))}
                {btn(FolderOpen,"Открыть дизайн",    () => setIsLoadOpen(true))}
                {btn(Save,      "Сохранить",          handleSaveClick)}
                {btn(Download,  "Экспортировать PNG", exportImage)}

                <VSep />

                {btn(LogOut, "Выйти", logout, { danger: true })}
                <Sp />
              </div>
            </>
          )}
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

      {/* Save Dialog (only for new designs) */}
      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Сохранить дизайн</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Название дизайна" value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmSave(); }}
              autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveOpen(false)}>Отмена</Button>
            <Button onClick={confirmSave} disabled={!saveTitle.trim()}>Сохранить</Button>
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
              Текущий холст будет очищен. Сначала сохраните дизайн, если нужно.
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
