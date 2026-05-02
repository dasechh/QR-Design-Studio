import { useEffect, useRef, useState } from "react";
import { Canvas, IText, FabricImage, Shadow, filters } from "fabric";
import QRCode from "qrcode";
import { useAuth } from "@workspace/replit-auth-web";
import { useCreateDesign, useUpdateDesign, useListDesigns, getListDesignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Toolbar } from "@/components/Toolbar";
import { PropertiesPanel } from "@/components/PropertiesPanel";

export default function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);

  const createDesign = useCreateDesign();
  const updateDesign = useUpdateDesign();

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });

    const refresh = () => {
      const obj = initCanvas.getActiveObject();
      setActiveObject(obj ? Object.assign(Object.create(Object.getPrototypeOf(obj)), obj) : null);
    };

    initCanvas.on("selection:created", refresh);
    initCanvas.on("selection:updated", refresh);
    initCanvas.on("selection:cleared", () => setActiveObject(null));
    initCanvas.on("object:modified", refresh);
    initCanvas.on("object:scaling", refresh);

    setCanvas(initCanvas);
    return () => { initCanvas.dispose(); };
  }, []);

  const refreshActive = () => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    setActiveObject(obj ? Object.assign(Object.create(Object.getPrototypeOf(obj)), obj) : null);
  };

  const handleSave = async (title: string) => {
    if (!canvas) return;
    try {
      const json = canvas.toJSON(["isQR", "qrContent"]);
      const thumbnail = canvas.toDataURL({ format: "png", quality: 0.5, multiplier: 0.25 });
      if (currentDesignId) {
        await updateDesign.mutateAsync({ id: currentDesignId, data: { title, canvasData: json, thumbnail } });
        toast({ title: "Дизайн обновлён" });
      } else {
        const res = await createDesign.mutateAsync({ data: { title, canvasData: json, thumbnail } });
        setCurrentDesignId(res.id);
        toast({ title: "Дизайн сохранён" });
      }
      queryClient.invalidateQueries({ queryKey: getListDesignsQueryKey() });
    } catch {
      toast({ title: "Ошибка при сохранении", variant: "destructive" });
    }
  };

  const handleLoad = (design: any) => {
    if (!canvas) return;
    canvas.loadFromJSON(design.canvasData).then(() => {
      canvas.renderAll();
      setCurrentDesignId(design.id);
      toast({ title: "Дизайн загружен" });
    });
  };

  const handleQrUpdate = async (oldObj: any, newContent: string) => {
    if (!canvas) return;
    try {
      const dataUrl = await QRCode.toDataURL(newContent, { width: 200, margin: 1 });
      const img = await FabricImage.fromURL(dataUrl);
      img.set({
        left: oldObj.left,
        top: oldObj.top,
        scaleX: oldObj.scaleX,
        scaleY: oldObj.scaleY,
        angle: oldObj.angle,
        shadow: oldObj.shadow ? new Shadow(oldObj.shadow) : undefined,
        opacity: oldObj.opacity,
        flipX: oldObj.flipX,
        flipY: oldObj.flipY,
      });
      (img as any).isQR = true;
      (img as any).qrContent = newContent;
      canvas.remove(oldObj);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      refreshActive();
    } catch {
      toast({ title: "Ошибка обновления QR", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
          <div className="font-semibold text-sm text-foreground">QR Studio</div>
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {user.profileImageUrl && (
                <img src={user.profileImageUrl} alt="Avatar" className="w-7 h-7 rounded-full ring-2 ring-border" />
              )}
              <span>{user.firstName || user.email}</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto flex items-center justify-center p-8 z-10 bg-background">
          <div className="shadow-xl ring-1 ring-border rounded-sm overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </main>

        <Toolbar
          canvas={canvas}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      </div>

      <PropertiesPanel
        canvas={canvas}
        activeObject={activeObject}
        onQrUpdate={handleQrUpdate}
        onRefresh={refreshActive}
      />
    </div>
  );
}
