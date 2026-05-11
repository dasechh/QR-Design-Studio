import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, IText, FabricImage, Shadow, Rect, Ellipse, Line, Triangle, PencilBrush } from "fabric";
import QRCode from "qrcode";
import { useAuth } from "@workspace/replit-auth-web";
import { useCreateDesign, useUpdateDesign, getListDesignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toolbar } from "@/components/Toolbar";
import { PropertiesPanel } from "@/components/PropertiesPanel";

interface EditorProps {
  initialDesign?: any | null;
  onBack: () => void;
}

export default function Editor({ initialDesign, onBack }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(initialDesign?.id ?? null);

  // Tool state
  const [activeTool, setActiveTool] = useState("select");
  const [penColor, setPenColor] = useState("#1e293b");
  const [penSize, setPenSize] = useState(8);
  const [shapeColor, setShapeColor] = useState("#3b82f6");

  // Stable refs for canvas event handlers (avoid stale closures)
  const activeToolRef = useRef("select");
  const penColorRef = useRef("#1e293b");
  const penSizeRef = useRef(8);
  const shapeColorRef = useRef("#3b82f6");

  // Shape drawing state
  const isDrawingShape = useRef(false);
  const shapeStart = useRef({ x: 0, y: 0 });
  const currentShape = useRef<any>(null);

  // Eraser state
  const isEraserDown = useRef(false);

  // History
  const historyStack = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const isLoadingHistory = useRef(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const createDesign = useCreateDesign();
  const updateDesign = useUpdateDesign();

  // Sync refs with state
  useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { penColorRef.current = penColor; }, [penColor]);
  useEffect(() => { penSizeRef.current = penSize; }, [penSize]);
  useEffect(() => { shapeColorRef.current = shapeColor; }, [shapeColor]);

  const pushHistory = useCallback((c: Canvas) => {
    if (isLoadingHistory.current) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const state = JSON.stringify(c.toJSON(["isQR", "qrContent"]));
      const current = historyStack.current[historyIndex.current];
      if (current === state) return;
      historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
      historyStack.current.push(state);
      if (historyStack.current.length > 60) historyStack.current.shift();
      historyIndex.current = historyStack.current.length - 1;
    }, 250);
  }, []);

  // Canvas initialization — runs once
  useEffect(() => {
    if (!canvasRef.current) return;

    const c = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });

    // ── Selection events ────────────────────────────────────────────────────
    c.on("selection:created", (e) => setActiveObject(e.selected?.[0] ?? null));
    c.on("selection:updated", (e) => setActiveObject(e.selected?.[0] ?? null));
    c.on("selection:cleared", () => setActiveObject(null));

    // ── History tracking ────────────────────────────────────────────────────
    c.on("object:added", () => pushHistory(c));
    c.on("object:modified", () => pushHistory(c));
    c.on("object:removed", () => pushHistory(c));
    c.on("path:created", () => pushHistory(c));

    // ── Mouse:down — shape drawing + eraser ─────────────────────────────────
    c.on("mouse:down", (opt: any) => {
      const tool = activeToolRef.current;

      // Eraser: delete the object under cursor
      if (tool === "eraser") {
        isEraserDown.current = true;
        if (opt.target) {
          c.remove(opt.target);
          c.discardActiveObject();
          c.renderAll();
        }
        return;
      }

      // Shape drawing
      if (!["rect", "ellipse", "line", "triangle"].includes(tool)) return;

      isDrawingShape.current = true;
      // Fabric.js 7 uses scenePoint for canvas-space coordinates
      const p = opt.scenePoint;
      shapeStart.current = { x: p.x, y: p.y };
      const color = shapeColorRef.current;

      let shape: any;
      if (tool === "rect") {
        shape = new Rect({ left: p.x, top: p.y, width: 1, height: 1, fill: color, strokeWidth: 0 });
      } else if (tool === "ellipse") {
        shape = new Ellipse({ left: p.x, top: p.y, rx: 1, ry: 1, fill: color, strokeWidth: 0 });
      } else if (tool === "triangle") {
        shape = new Triangle({ left: p.x, top: p.y, width: 1, height: 1, fill: color, strokeWidth: 0 });
      } else if (tool === "line") {
        shape = new Line([p.x, p.y, p.x, p.y], { stroke: color, strokeWidth: 3, fill: "" });
      }

      if (shape) {
        c.add(shape);
        currentShape.current = shape;
        c.renderAll();
      }
    });

    // ── Mouse:move — resize shape + eraser sweep ────────────────────────────
    c.on("mouse:move", (opt: any) => {
      const tool = activeToolRef.current;

      // Eraser sweep: remove objects the mouse passes over while pressed
      if (tool === "eraser" && isEraserDown.current && opt.target) {
        c.remove(opt.target);
        c.discardActiveObject();
        c.renderAll();
        return;
      }

      // Shape drawing resize
      if (!isDrawingShape.current || !currentShape.current) return;
      const p = opt.scenePoint;
      const { x: sx, y: sy } = shapeStart.current;
      const w = Math.abs(p.x - sx);
      const h = Math.abs(p.y - sy);
      const shape = currentShape.current;

      if (tool === "rect" || tool === "triangle") {
        shape.set({ left: Math.min(p.x, sx), top: Math.min(p.y, sy), width: Math.max(2, w), height: Math.max(2, h) });
      } else if (tool === "ellipse") {
        shape.set({ left: Math.min(p.x, sx), top: Math.min(p.y, sy), rx: Math.max(1, w / 2), ry: Math.max(1, h / 2) });
      } else if (tool === "line") {
        shape.set({ x2: p.x, y2: p.y });
      }
      c.renderAll();
    });

    // ── Mouse:up — finalize shape or eraser ─────────────────────────────────
    c.on("mouse:up", () => {
      isEraserDown.current = false;

      if (!isDrawingShape.current) return;
      isDrawingShape.current = false;

      if (currentShape.current) {
        c.setActiveObject(currentShape.current);
        setActiveObject(currentShape.current);
        currentShape.current = null;
      }

      // Auto-return to select tool after drawing a shape
      activeToolRef.current = "select";
      setActiveTool("select");
      c.skipTargetFind = false;
      c.selection = true;
      c.defaultCursor = "default";
      c.hoverCursor = "move";
      c.forEachObject((obj) => { obj.selectable = true; obj.evented = true; });
      c.renderAll();
    });

    setCanvas(c);

    // Load initial design if provided
    if (initialDesign?.canvasData) {
      isLoadingHistory.current = true;
      c.loadFromJSON(initialDesign.canvasData).then(() => {
        c.renderAll();
        isLoadingHistory.current = false;
        const state = JSON.stringify(c.toJSON(["isQR", "qrContent"]));
        historyStack.current = [state];
        historyIndex.current = 0;
      });
    } else {
      const state = JSON.stringify(c.toJSON(["isQR", "qrContent"]));
      historyStack.current = [state];
      historyIndex.current = 0;
    }

    return () => { c.dispose(); };
  }, []); // run once

  // Update pencil brush settings live when they change
  useEffect(() => {
    if (!canvas || activeTool !== "pencil") return;
    const brush = canvas.freeDrawingBrush as PencilBrush | null;
    if (brush) { brush.color = penColor; brush.width = penSize; }
  }, [penColor, penSize, activeTool, canvas]);

  // ── Tool switching ──────────────────────────────────────────────────────────
  const handleToolChange = useCallback((tool: string) => {
    activeToolRef.current = tool;
    setActiveTool(tool);
    if (!canvas) return;

    // Reset everything to select mode first
    canvas.isDrawingMode = false;
    canvas.skipTargetFind = false;
    canvas.selection = true;
    canvas.defaultCursor = "default";
    canvas.hoverCursor = "move";
    canvas.forEachObject((obj) => { obj.selectable = true; obj.evented = true; });
    canvas.discardActiveObject();
    canvas.renderAll();

    if (tool === "pencil") {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = penColorRef.current;
      brush.width = penSizeRef.current;
      canvas.freeDrawingBrush = brush;

    } else if (tool === "eraser") {
      // Object-level eraser: find targets normally, don't allow selection/move
      canvas.selection = false;
      canvas.forEachObject((obj) => {
        obj.selectable = false;  // Don't allow select/move
        obj.evented = true;      // But DO allow detection as mouse target
      });
      canvas.defaultCursor = "cell";
      canvas.hoverCursor = "cell";

    } else if (["rect", "ellipse", "line", "triangle"].includes(tool)) {
      // Shape drawing: skip target finding so clicks don't select existing objects
      canvas.skipTargetFind = true;
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
      canvas.hoverCursor = "crosshair";
      canvas.forEachObject((obj) => { obj.selectable = false; obj.evented = false; });
    }
    // "select" is the default reset state above
  }, [canvas]);

  // ── History ──────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (!canvas || historyIndex.current <= 0) return;
    isLoadingHistory.current = true;
    historyIndex.current--;
    const state = historyStack.current[historyIndex.current];
    canvas.loadFromJSON(JSON.parse(state)).then(() => {
      canvas.renderAll();
      canvas.discardActiveObject();
      setActiveObject(null);
      isLoadingHistory.current = false;
    });
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas || historyIndex.current >= historyStack.current.length - 1) return;
    isLoadingHistory.current = true;
    historyIndex.current++;
    const state = historyStack.current[historyIndex.current];
    canvas.loadFromJSON(JSON.parse(state)).then(() => {
      canvas.renderAll();
      canvas.discardActiveObject();
      setActiveObject(null);
      isLoadingHistory.current = false;
    });
  }, [canvas]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.key === "Delete" || e.key === "Backspace") && canvas) {
        canvas.getActiveObjects().forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
      if (e.ctrlKey && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "Z"))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") handleToolChange("select");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvas, undo, redo, handleToolChange]);

  // ── Design operations ─────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    setCurrentDesignId(null);
    setActiveObject(null);
    const state = JSON.stringify(canvas.toJSON(["isQR", "qrContent"]));
    historyStack.current = [state];
    historyIndex.current = 0;
  }, [canvas]);

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
    isLoadingHistory.current = true;
    canvas.loadFromJSON(design.canvasData).then(() => {
      canvas.renderAll();
      setCurrentDesignId(design.id);
      canvas.discardActiveObject();
      setActiveObject(null);
      isLoadingHistory.current = false;
      const state = JSON.stringify(canvas.toJSON(["isQR", "qrContent"]));
      historyStack.current = [state];
      historyIndex.current = 0;
      toast({ title: "Дизайн загружен" });
    });
  };

  const handleQrUpdate = async (oldObj: any, newContent: string) => {
    if (!canvas) return;
    try {
      const dataUrl = await QRCode.toDataURL(newContent, { width: 200, margin: 1 });
      const img = await FabricImage.fromURL(dataUrl);
      img.set({
        left: oldObj.left, top: oldObj.top,
        scaleX: oldObj.scaleX, scaleY: oldObj.scaleY,
        angle: oldObj.angle,
        shadow: oldObj.shadow ? new Shadow(oldObj.shadow) : undefined,
        opacity: oldObj.opacity,
      });
      (img as any).isQR = true;
      (img as any).qrContent = newContent;
      canvas.remove(oldObj);
      canvas.add(img);
      canvas.setActiveObject(img);
      setActiveObject(img);
      canvas.renderAll();
    } catch {
      toast({ title: "Ошибка обновления QR", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span className="text-lg leading-none group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Главное меню</span>
          </button>
          {user && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {user.profileImageUrl && (
                <img src={user.profileImageUrl} alt="Avatar" className="w-7 h-7 rounded-full ring-2 ring-border" />
              )}
              <span>{user.firstName || user.email}</span>
            </div>
          )}
        </header>

        {/* Canvas area */}
        <main className="flex-1 overflow-auto flex items-center justify-center p-8 bg-background">
          <div className="shadow-xl ring-1 ring-border rounded-sm overflow-hidden">
            <canvas ref={canvasRef} />
          </div>
        </main>

        <Toolbar
          canvas={canvas}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onUndo={undo}
          onRedo={redo}
          onNew={handleNew}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      </div>

      <PropertiesPanel
        canvas={canvas}
        activeObject={activeObject}
        activeTool={activeTool}
        penColor={penColor}
        onPenColorChange={setPenColor}
        penSize={penSize}
        onPenSizeChange={setPenSize}
        shapeColor={shapeColor}
        onShapeColorChange={setShapeColor}
        onQrUpdate={handleQrUpdate}
      />
    </div>
  );
}
