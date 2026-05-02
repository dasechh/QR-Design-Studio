import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, IText, FabricImage, Group, Shadow, filters } from "fabric";
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

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const initCanvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    initCanvas.on('selection:created', (e) => setActiveObject(e.selected?.[0] || null));
    initCanvas.on('selection:updated', (e) => setActiveObject(e.selected?.[0] || null));
    initCanvas.on('selection:cleared', () => setActiveObject(null));
    initCanvas.on('object:modified', () => {
      setActiveObject(initCanvas.getActiveObject());
    });

    setCanvas(initCanvas);

    return () => {
      initCanvas.dispose();
    };
  }, []);

  const handleSave = async (title: string) => {
    if (!canvas) return;
    
    try {
      const json = canvas.toJSON();
      const thumbnail = canvas.toDataURL({ format: "png", quality: 0.5, multiplier: 0.25 });
      
      if (currentDesignId) {
        await updateDesign.mutateAsync({
          id: currentDesignId,
          data: { title, canvasData: json, thumbnail }
        });
        toast({ title: "Design updated successfully" });
      } else {
        const res = await createDesign.mutateAsync({
          data: { title, canvasData: json, thumbnail }
        });
        setCurrentDesignId(res.id);
        toast({ title: "Design saved successfully" });
      }
      queryClient.invalidateQueries({ queryKey: getListDesignsQueryKey() });
    } catch (error) {
      toast({ title: "Error saving design", variant: "destructive" });
    }
  };

  const handleLoad = (design: any) => {
    if (!canvas) return;
    canvas.loadFromJSON(design.canvasData).then(() => {
      canvas.renderAll();
      setCurrentDesignId(design.id);
      toast({ title: "Design loaded" });
    });
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Toolbar 
        canvas={canvas} 
        onSave={handleSave}
        onLoad={handleLoad}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden bg-secondary/30">
        <div className="absolute inset-0 pattern-checkerboard opacity-20 pointer-events-none" 
             style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)' }} 
        />
        
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
          <div className="font-semibold text-sm">Untitled Design</div>
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {user.profileImageUrl && (
                <img src={user.profileImageUrl} alt="Avatar" className="w-6 h-6 rounded-full" />
              )}
              <span>{user.firstName || user.email}</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto flex items-center justify-center p-8 z-10">
          <div className="shadow-2xl ring-1 ring-border/50 rounded-sm overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </main>
      </div>

      <PropertiesPanel 
        canvas={canvas} 
        activeObject={activeObject} 
      />
    </div>
  );
}
