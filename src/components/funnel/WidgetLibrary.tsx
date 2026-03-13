import { 
  Type, 
  Heading1, 
  Image, 
  MousePointer2, 
  FormInput, 
  FileText, 
  Square, 
  Rows3, 
  Space 
} from 'lucide-react';
import { WidgetType } from '@/types/funnel';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface WidgetItemProps {
  type: WidgetType;
  label: string;
  icon: React.ReactNode;
}

const DraggableWidgetItem = ({ type, label, icon }: WidgetItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${type}`,
    data: { type, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card cursor-grab transition-all',
        'hover:border-primary hover:bg-accent',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );
};

const widgets: WidgetItemProps[] = [
  { type: 'heading', label: 'Heading', icon: <Heading1 className="w-5 h-5" /> },
  { type: 'text', label: 'Text', icon: <Type className="w-5 h-5" /> },
  { type: 'image', label: 'Image', icon: <Image className="w-5 h-5" /> },
  { type: 'button', label: 'Button', icon: <MousePointer2 className="w-5 h-5" /> },
  { type: 'input', label: 'Input', icon: <FormInput className="w-5 h-5" /> },
  { type: 'form', label: 'Form', icon: <FileText className="w-5 h-5" /> },
  { type: 'container', label: 'Container', icon: <Square className="w-5 h-5" /> },
  { type: 'section', label: 'Section', icon: <Rows3 className="w-5 h-5" /> },
  { type: 'spacer', label: 'Spacer', icon: <Space className="w-5 h-5" /> },
];

export const WidgetLibrary = () => {
  return (
    <div className="w-64 bg-background border-r border-border p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm text-foreground mb-4">Widgets</h3>
      <div className="grid grid-cols-2 gap-2">
        {widgets.map((widget) => (
          <DraggableWidgetItem key={widget.type} {...widget} />
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <h3 className="font-semibold text-sm text-foreground mb-3">Templates</h3>
        <div className="space-y-2">
          <button className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
            🎯 Hero Section
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
            📝 Lead Capture
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
            ✨ CTA Block
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded-lg border border-border hover:bg-accent transition-colors">
            🙏 Thank You
          </button>
        </div>
      </div>
    </div>
  );
};
