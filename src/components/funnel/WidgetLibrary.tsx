import {
  FileText,
  FormInput,
  Heading1,
  Image,
  LayoutTemplate,
  MousePointer2,
  Plus,
  Rows3,
  Space,
  Sparkles,
  Square,
  Type,
} from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FunnelTemplatePreset } from '@/hooks/useFunnelEditor';
import { WidgetType } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface WidgetItemProps {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  onAdd?: (type: WidgetType) => void;
}

const DraggableWidgetItem = ({ type, label, description, icon, onAdd }: WidgetItemProps) => {
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
        'group relative flex min-h-[112px] cursor-grab flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-3.5 transition-all',
        'hover:border-primary/40 hover:bg-accent/40 hover:shadow-lg',
        isDragging && 'cursor-grabbing opacity-50',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-muted-foreground transition-colors group-hover:text-primary">
          {icon}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAdd?.(type);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

const widgets: WidgetItemProps[] = [
  { type: 'heading', label: 'Heading', description: 'Section titles and hero headlines.', icon: <Heading1 className="w-5 h-5" /> },
  { type: 'text', label: 'Text', description: 'Support copy, detail, and body content.', icon: <Type className="w-5 h-5" /> },
  { type: 'image', label: 'Image', description: 'Screenshots, product shots, and visuals.', icon: <Image className="w-5 h-5" /> },
  { type: 'button', label: 'Button', description: 'Primary CTAs and outbound links.', icon: <MousePointer2 className="w-5 h-5" /> },
  { type: 'input', label: 'Input', description: 'One field for text, email, or phone.', icon: <FormInput className="w-5 h-5" /> },
  { type: 'form', label: 'Form', description: 'A container for lead capture inputs.', icon: <FileText className="w-5 h-5" /> },
  { type: 'container', label: 'Container', description: 'Wrap content with spacing and styling.', icon: <Square className="w-5 h-5" /> },
  { type: 'section', label: 'Section', description: 'A full-width block with background control.', icon: <Rows3 className="w-5 h-5" /> },
  { type: 'spacer', label: 'Spacer', description: 'Breathing room between stacked blocks.', icon: <Space className="w-5 h-5" /> },
];

const templates: { id: FunnelTemplatePreset; label: string; description: string }[] = [
  { id: 'hero', label: 'Hero section', description: 'Headline, support copy, and one strong CTA.' },
  { id: 'leadCapture', label: 'Lead capture', description: 'A complete signup block with fields and submit button.' },
  { id: 'cta', label: 'CTA block', description: 'A compact call-to-action panel near the bottom of the page.' },
  { id: 'thankYou', label: 'Thank-you section', description: 'A clean completion state after signup or purchase.' },
];

interface WidgetLibraryProps {
  onAddWidget: (type: WidgetType) => void;
  onInsertTemplate: (template: FunnelTemplatePreset) => void;
}

export const WidgetLibrary = ({ onAddWidget, onInsertTemplate }: WidgetLibraryProps) => {
  return (
    <div className="w-[320px] shrink-0 border-r border-border/60 bg-background/95">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <LayoutTemplate className="h-4 w-4 text-primary" />
          Builder library
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Blocks and templates</h3>
            <p className="text-sm text-muted-foreground">Drag widgets in, or click once to place them on the page.</p>
          </div>
          <Badge variant="outline" className="rounded-full border-border/70 bg-background/60 px-3 py-1 text-xs">
            {widgets.length} widgets
          </Badge>
        </div>
      </div>

      <div className="h-[calc(100vh-81px)] overflow-y-auto px-5 py-5">
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick sections
          </div>
          <div className="space-y-2.5">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onInsertTemplate(template.id)}
                className="w-full rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-accent/40"
              >
                <div className="text-sm font-medium text-foreground">{template.label}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Core widgets
          </div>
          <div className="grid grid-cols-2 gap-3">
            {widgets.map((widget) => (
              <DraggableWidgetItem key={widget.type} {...widget} onAdd={onAddWidget} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
