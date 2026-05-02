import { useRef, useState } from "react";
import { Canvas, IText, FabricImage } from "fabric";
import QRCode from "qrcode";
import {
  QrCode, Type, ImagePlus, Copy, Trash2,
  FlipHorizontal2, FlipVertical2, BringToFront, SendToBack,
  Save, FolderOpen, Download, LogOut, GripVertical, GripHorizontal,
  LayoutGrid,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@workspace/replit-auth-web";
import { useListDesigns } from "@workspace/api-client-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ToolbarProps {
  canvas: Canvas | null;
  onSave: (title: string) => void;
  onLoad: (design: any) => void;
}

type Orientation = "vertical" | "horizontal";

export function Toolbar({ canvas, onSave, onLoad }: ToolbarProps) {
  const { logout } = useAuth();
  const [pos, setPos] = useState({ x: 16, y: 80 });
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, panelX: 0, panelY: 0 });

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [isQrOpen, setIsQrOpen] = useState(false);

  const { data: designs } = useListDesigns({ query: { enabled: isLoadOpen } });

  const onDragHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, panelX: pos.x, panelY: pos.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPos({
      x: dragStart.current.panelX + e.clientX - dragStart.current.mouseX,
      y: dragStart.current.panelY + e.clientY - dragStart.current.mouseY,
    });
  };
  const onPointerUp = () => { isDragging.current = false; };

  const addText = () => {
    if (!canvas) return;
    const text = new IText("Текст", { left: 100, top: 100, fontSize: 32, fill: "#222222", fontFamily: "Arial" });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (f) => {
        const dataUrl = f.target?.result as string;
        const img = await FabricImage.fromURL(dataUrl);
        img.scaleToWidth(200);
        canvas?.add(img);
        canvas?.setActiveObject(img);
        canvas?.renderAll();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addQr = async () => {
    if (!canvas || !qrInput) return;
    const dataUrl = await QRCode.toDataURL(qrInput, { width: 200, margin: 1 });
    const img = await FabricImage.fromURL(dataUrl);
    (img as any).isQR = true;
    (img as any).qrContent = qrInput;
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    setIsQrOpen(false);
    setQrInput("");
  };

  const duplicate = async () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const cloned = await obj.clone(["isQR", "qrContent"]);
    cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
  };

  const remove = () => {
    if (!canvas) return;
    canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const flipX = () => { const o = canvas?.getActiveObject(); if (o) { o.set({ flipX: !o.flipX }); canvas?.renderAll(); } };
  const flipY = () => { const o = canvas?.getActiveObject(); if (o) { o.set({ flipY: !o.flipY }); canvas?.renderAll(); } };
  const bringFront = () => { const o = canvas?.getActiveObject(); if (o && canvas) { canvas.bringObjectToFront(o); canvas.renderAll(); } };
  const sendBack = () => { const o = canvas?.getActiveObject(); if (o && canvas) { canvas.sendObjectToBack(o); canvas.renderAll(); } };

  const exportImage = () => {
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.png";
    a.click();
  };

  const tools = [
    { icon: QrCode, tooltip: "Добавить QR-код", onClick: () => setIsQrOpen(true) },
    { icon: Type, tooltip: "Добавить текст", onClick: addText },
    { icon: ImagePlus, tooltip: "Добавить изображение", onClick: addImage },
    null,
    { icon: Copy, tooltip: "Дублировать", onClick: duplicate },
    { icon: Trash2, tooltip: "Удалить", onClick: remove, danger: true },
    null,
    { icon: FlipHorizontal2, tooltip: "Отразить по горизонтали", onClick: flipX },
    { icon: FlipVertical2, tooltip: "Отразить по вертикали", onClick: flipY },
    { icon: BringToFront, tooltip: "На передний план", onClick: bringFront },
    { icon: SendToBack, tooltip: "На задний план", onClick: sendBack },
    null,
    { icon: FolderOpen, tooltip: "Мои дизайны", onClick: () => setIsLoadOpen(true) },
    { icon: Save, tooltip: "Сохранить дизайн", onClick: () => setIsSaveOpen(true) },
    { icon: Download, tooltip: "Экспортировать PNG", onClick: exportImage },
  ];

  const isH = orientation === "horizontal";
  const GripIcon = isH ? GripHorizontal : GripVertical;
  const tooltipSide = isH ? "bottom" : "right";

  return (
    <>
      <div
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className={`bg-card border border-border rounded-xl shadow-lg flex items-center gap-0.5 p-1.5 ${isH ? "flex-row" : "flex-col"}`}>
          {/* Drag handle */}
          <div
            className={`flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing ${isH ? "h-8 w-6 mr-0.5" : "w-8 h-6 mb-0.5"}`}
            onPointerDown={onDragHandlePointerDown}
          >
            <GripIcon className="w-3.5 h-3.5" />
          </div>

          {/* Orientation toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary"
                onClick={() => setOrientation(isH ? "vertical" : "horizontal")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs font-medium">
              {isH ? "Вертикальный режим" : "Горизонтальный режим"}
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className={isH ? "w-px h-6 bg-border mx-1" : "h-px w-6 bg-border my-1"} />

          {/* Tools */}
          {tools.map((t, i) =>
            t === null ? (
              <div key={`div-${i}`} className={isH ? "w-px h-6 bg-border mx-0.5" : "h-px w-6 bg-border my-0.5"} />
            ) : (
              <Tooltip key={i} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-8 h-8 rounded-lg ${t.danger ? "text-muted-foreground hover:text-red-500 hover:bg-red-50" : "text-muted-foreground hover:text-primary hover:bg-secondary"}`}
                    onClick={t.onClick}
                  >
                    <t.icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={tooltipSide} className="text-xs font-medium">{t.tooltip}</TooltipContent>
              </Tooltip>
            )
          )}

          {/* Divider */}
          <div className={isH ? "w-px h-6 bg-border mx-0.5" : "h-px w-6 bg-border my-0.5"} />

          {/* Logout */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide} className="text-xs font-medium">Выйти</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Добавить QR-код</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Введите URL или текст" value={qrInput} onChange={(e) => setQrInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQr()} autoFocus />
          </div>
          <DialogFooter><Button onClick={addQr} disabled={!qrInput}>Сгенерировать</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Сохранить дизайн</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input placeholder="Название дизайна" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && saveTitle) { onSave(saveTitle); setIsSaveOpen(false); } }} autoFocus />
          </div>
          <DialogFooter>
            <Button onClick={() => { if (saveTitle) { onSave(saveTitle); setIsSaveOpen(false); } }} disabled={!saveTitle}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadOpen} onOpenChange={setIsLoadOpen}>
        <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
          <DialogHeader><DialogTitle>Мои дизайны</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-3 gap-4 pb-4">
              {designs?.map((d) => (
                <div key={d.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary hover:shadow-md cursor-pointer transition-all"
                  onClick={() => { onLoad(d); setIsLoadOpen(false); }}>
                  <div className="aspect-[4/3] bg-muted/50 p-2">
                    {d.thumbnail && <img src={d.thumbnail} alt={d.title} className="w-full h-full object-contain" />}
                  </div>
                  <div className="p-3 border-t border-border">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(d.updatedAt).toLocaleDateString("ru")}</p>
                  </div>
                </div>
              ))}
              {!designs?.length && (
                <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">У вас пока нет сохранённых дизайнов</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
