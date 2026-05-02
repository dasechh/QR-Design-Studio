import { useEffect, useState } from "react";
import { Canvas, Shadow } from "fabric";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface PropertiesPanelProps {
  canvas: Canvas | null;
  activeObject: any;
}

export function PropertiesPanel({ canvas, activeObject }: PropertiesPanelProps) {
  const [props, setProps] = useState({
    x: 0, y: 0, w: 0, h: 0, opacity: 100,
    stroke: '#000000', strokeWidth: 0, rx: 0,
    shadowEnabled: false, shadowColor: '#000000', shadowBlur: 10, shadowX: 5, shadowY: 5
  });

  useEffect(() => {
    if (!activeObject) return;
    setProps({
      x: Math.round(activeObject.left || 0),
      y: Math.round(activeObject.top || 0),
      w: Math.round((activeObject.width || 0) * (activeObject.scaleX || 1)),
      h: Math.round((activeObject.height || 0) * (activeObject.scaleY || 1)),
      opacity: Math.round((activeObject.opacity ?? 1) * 100),
      stroke: activeObject.stroke || '#000000',
      strokeWidth: activeObject.strokeWidth || 0,
      rx: activeObject.rx || 0,
      shadowEnabled: !!activeObject.shadow,
      shadowColor: activeObject.shadow?.color || '#000000',
      shadowBlur: activeObject.shadow?.blur || 10,
      shadowX: activeObject.shadow?.offsetX || 5,
      shadowY: activeObject.shadow?.offsetY || 5,
    });
  }, [activeObject]);

  const updateProp = (key: string, val: any) => {
    if (!activeObject || !canvas) return;
    
    if (key === 'x') activeObject.set('left', val);
    if (key === 'y') activeObject.set('top', val);
    if (key === 'opacity') activeObject.set('opacity', val / 100);
    if (key === 'stroke') activeObject.set('stroke', val);
    if (key === 'strokeWidth') activeObject.set('strokeWidth', val);
    if (key === 'rx') { activeObject.set('rx', val); activeObject.set('ry', val); }
    
    if (key.startsWith('shadow')) {
      const p = { ...props, [key]: val };
      if (p.shadowEnabled) {
        activeObject.set('shadow', new Shadow({
          color: p.shadowColor,
          blur: p.shadowBlur,
          offsetX: p.shadowX,
          offsetY: p.shadowY
        }));
      } else {
        activeObject.set('shadow', null);
      }
    }

    setProps(prev => ({ ...prev, [key]: val }));
    canvas.renderAll();
  };

  if (!activeObject) {
    return (
      <div className="w-[280px] bg-card border-l border-border shrink-0 flex flex-col p-6 items-center justify-center text-center text-muted-foreground z-20">
        <p className="text-sm">Выберите объект на холсте для редактирования свойств</p>
      </div>
    );
  }

  return (
    <div className="w-[280px] bg-card border-l border-border shrink-0 flex flex-col overflow-y-auto z-20">
      <div className="p-4 border-b border-border font-semibold text-sm">
        Свойства
      </div>
      
      <div className="p-4 space-y-6 text-sm">
        {/* Position & Size */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">X</Label>
            <Input type="number" value={props.x} onChange={e => updateProp('x', parseInt(e.target.value))} className="h-8 bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Y</Label>
            <Input type="number" value={props.y} onChange={e => updateProp('y', parseInt(e.target.value))} className="h-8 bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">W</Label>
            <Input type="number" value={props.w} readOnly className="h-8 bg-background opacity-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">H</Label>
            <Input type="number" value={props.h} readOnly className="h-8 bg-background opacity-50" />
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Opacity */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Непрозрачность</Label>
            <span className="text-xs text-muted-foreground">{props.opacity}%</span>
          </div>
          <Slider 
            value={[props.opacity]} 
            min={0} max={100} step={1}
            onValueChange={v => updateProp('opacity', v[0])} 
          />
        </div>

        <Separator className="bg-border" />

        {/* Stroke */}
        <div className="space-y-4">
          <Label>Обводка</Label>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-border overflow-hidden shrink-0">
              <input type="color" value={props.stroke} onChange={e => updateProp('stroke', e.target.value)} className="w-[150%] h-[150%] -m-1 cursor-pointer" />
            </div>
            <div className="flex-1">
              <Slider 
                value={[props.strokeWidth]} min={0} max={20} step={1}
                onValueChange={v => updateProp('strokeWidth', v[0])}
              />
            </div>
            <span className="text-xs text-muted-foreground w-4 text-right">{props.strokeWidth}</span>
          </div>
        </div>

        {/* Border Radius (Rect only, simplified) */}
        {activeObject.type === 'rect' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Скругление углов</Label>
              <span className="text-xs text-muted-foreground">{props.rx}</span>
            </div>
            <Slider 
              value={[props.rx]} min={0} max={100} step={1}
              onValueChange={v => updateProp('rx', v[0])} 
            />
          </div>
        )}

        <Separator className="bg-border" />

        {/* Shadow */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Тень</Label>
            <Switch checked={props.shadowEnabled} onCheckedChange={v => updateProp('shadowEnabled', v)} />
          </div>
          
          {props.shadowEnabled && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded border border-border overflow-hidden shrink-0">
                  <input type="color" value={props.shadowColor} onChange={e => updateProp('shadowColor', e.target.value)} className="w-[150%] h-[150%] -m-1 cursor-pointer" />
                </div>
                <Label className="text-xs text-muted-foreground">Цвет тени</Label>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><Label className="text-xs">Размытие</Label><span className="text-xs text-muted-foreground">{props.shadowBlur}</span></div>
                <Slider value={[props.shadowBlur]} min={0} max={50} step={1} onValueChange={v => updateProp('shadowBlur', v[0])} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><Label className="text-xs">Смещение X</Label><span className="text-xs text-muted-foreground">{props.shadowX}</span></div>
                <Slider value={[props.shadowX]} min={-50} max={50} step={1} onValueChange={v => updateProp('shadowX', v[0])} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><Label className="text-xs">Смещение Y</Label><span className="text-xs text-muted-foreground">{props.shadowY}</span></div>
                <Slider value={[props.shadowY]} min={-50} max={50} step={1} onValueChange={v => updateProp('shadowY', v[0])} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
