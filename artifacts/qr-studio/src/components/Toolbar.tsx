import { useState } from "react";
import { Canvas, IText, FabricImage } from "fabric";
import QRCode from "qrcode";
import { 
  MousePointer2, QrCode, Type, ImagePlus, Copy, Trash2, 
  FlipHorizontal2, FlipVertical2, BringToFront, SendToBack, 
  Save, FolderOpen, Download, LogOut 
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

export function Toolbar({ canvas, onSave, onLoad }: ToolbarProps) {
  const { logout } = useAuth();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const { data: designs } = useListDesigns({ query: { enabled: isLoadOpen } });

  const addText = () => {
    if (!canvas) return;
    const text = new IText("Текст", { left: 100, top: 100, fontSize: 32, fill: '#000000' });
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
        try {
          const img = await FabricImage.fromURL(dataUrl);
          img.scaleToWidth(200);
          canvas?.add(img);
          canvas?.setActiveObject(img);
          canvas?.renderAll();
        } catch (e) {
          console.error(e);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const addQr = async () => {
    if (!canvas || !qrInput) return;
    try {
      const dataUrl = await QRCode.toDataURL(qrInput, { width: 200, margin: 1 });
      const img = await FabricImage.fromURL(dataUrl);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setIsQrOpen(false);
      setQrInput("");
    } catch (e) {
      console.error(e);
    }
  };

  const duplicate = async () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const cloned = await obj.clone();
    cloned.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
  };

  const remove = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const flipX = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set({ flipX: !obj.flipX });
      canvas.renderAll();
    }
  };

  const flipY = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      obj.set({ flipY: !obj.flipY });
      canvas.renderAll();
    }
  };

  const bringFront = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.bringObjectToFront(obj);
      canvas.renderAll();
    }
  };

  const sendBack = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) {
      canvas.sendObjectToBack(obj);
      canvas.renderAll();
    }
  };

  const exportImage = () => {
    if (!canvas) return;
    const url = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.png";
    a.click();
  };

  const tools = [
    { icon: MousePointer2, tooltip: "Выбрать", onClick: () => canvas?.discardActiveObject().renderAll() },
    { icon: QrCode, tooltip: "Добавить QR-код", onClick: () => setIsQrOpen(true) },
    { icon: Type, tooltip: "Добавить текст", onClick: addText },
    { icon: ImagePlus, tooltip: "Добавить изображение", onClick: addImage },
    { divider: true },
    { icon: Copy, tooltip: "Дублировать", onClick: duplicate },
    { icon: Trash2, tooltip: "Удалить", onClick: remove },
    { icon: FlipHorizontal2, tooltip: "Отразить по горизонтали", onClick: flipX },
    { icon: FlipVertical2, tooltip: "Отразить по вертикали", onClick: flipY },
    { icon: BringToFront, tooltip: "На передний план", onClick: bringFront },
    { icon: SendToBack, tooltip: "На задний план", onClick: sendBack },
    { divider: true },
    { icon: FolderOpen, tooltip: "Мои дизайны", onClick: () => setIsLoadOpen(true) },
    { icon: Save, tooltip: "Сохранить дизайн", onClick: () => setIsSaveOpen(true) },
    { icon: Download, tooltip: "Экспортировать как PNG", onClick: exportImage },
  ];

  return (
    <>
      <div className="w-12 bg-card border-r border-border flex flex-col items-center py-4 gap-2 z-20 shrink-0">
        {tools.map((t, i) => 
          t.divider ? (
            <div key={`div-${i}`} className="w-8 h-px bg-border my-2" />
          ) : (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-secondary hover:text-primary" onClick={t.onClick}>
                  <t.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover text-popover-foreground border-border text-xs font-semibold">
                {t.tooltip}
              </TooltipContent>
            </Tooltip>
          )
        )}
        <div className="flex-1" />
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-popover text-popover-foreground border-border text-xs font-semibold">
            Выйти
          </TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить QR-код</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Введите URL или текст" 
              value={qrInput} 
              onChange={e => setQrInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && addQr()}
            />
          </div>
          <DialogFooter>
            <Button onClick={addQr}>Сгенерировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить дизайн</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="Название дизайна" 
              value={saveTitle} 
              onChange={e => setSaveTitle(e.target.value)} 
              onKeyDown={e => {
                if (e.key === 'Enter' && saveTitle) {
                  onSave(saveTitle);
                  setIsSaveOpen(false);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (saveTitle) {
                onSave(saveTitle);
                setIsSaveOpen(false);
              }
            }}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadOpen} onOpenChange={setIsLoadOpen}>
        <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Мои дизайны</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-3 gap-4 pb-4">
              {designs?.map(d => (
                <div 
                  key={d.id} 
                  className="group relative rounded-lg border border-border bg-card overflow-hidden hover:border-primary cursor-pointer transition-colors"
                  onClick={() => {
                    onLoad(d);
                    setIsLoadOpen(false);
                  }}
                >
                  <div className="aspect-[4/3] bg-muted/50 p-2">
                    {d.thumbnail && <img src={d.thumbnail} alt={d.title} className="w-full h-full object-contain" />}
                  </div>
                  <div className="p-3 bg-card border-t border-border">
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(d.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {!designs?.length && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  У вас пока нет сохраненных дизайнов
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
