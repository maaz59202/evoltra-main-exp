import {
  ChevronLeft,
  ChevronRight,
  Columns2,
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
} from '@/components/ui/icons';
import { useDraggable } from '@dnd-kit/core';

import { Button } from '@/components/ui/button';
import { FunnelTemplatePreset } from '@/hooks/useFunnelEditor';
import { WidgetType } from '@/types/funnel';
import { cn } from '@/lib/utils';

/**
 * WidgetLibrary Component
 * 
 * Left sidebar containing draggable widgets and template presets.
 * Supports collapsible state to maximize canvas space.
 * 
 * Two display modes:
 * 1. Expanded (320px): Shows cards with descriptions, icons, quick-add buttons
 * 2. Collapsed (76px): Shows compact icon-only buttons with tooltips
 * 
 * Features:
 * - Drag-and-drop widgets from library to canvas (via dnd-kit)
 * - Quick-add buttons (+ icon) for direct insertion without dragging
 * - Template presets (hero, lead capture, CTA, thank you) for common sections
 * - Visual hover feedback (border, shadow, color changes)
 * - Cursor feedback (grab/grabbing icons)
 * 
 * Available widgets:
 * - Content: text, heading, image
 * - Forms: input, form, button
 * - Layout: section, container, columns, spacer
 * 
 * Available templates:
 * - hero: Headline + subtext + CTA
 * - leadCapture: Form with name/email fields
 * - cta: Dark container with heading and button
 * - thankYou: Light section with confirmation message
 */
interface WidgetItemProps {
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ReactNode;
  onAdd?: (type: WidgetType) => void;
  compact?: boolean;
}

const DraggableWidgetItem = ({ type, label, description, icon, onAdd, compact = false }: WidgetItemProps) => {
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
        'group relative flex cursor-grab rounded-2xl border border-border/60 bg-card/80 transition-all',
        compact ? 'min-h-[64px] items-center justify-center p-2.5' : 'min-h-[112px] flex-col gap-2 p-3.5',
        'hover:border-primary/40 hover:bg-accent/40 hover:shadow-lg',
        isDragging && 'cursor-grabbing opacity-50',
      )}
      title={compact ? label : undefined}
    >
      <div className={cn('flex items-center justify-between', compact && 'w-full justify-center')}>
        <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-muted-foreground transition-colors group-hover:text-primary">
          {icon}
        </div>
        {!compact && (
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
        )}
      </div>
      {!compact && (
        <div className="space-y-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      )}
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
  { type: 'columns', label: 'Columns', description: 'Split content into 2, 3, or 4 responsive columns.', icon: <Columns2 className="w-5 h-5" /> },
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const WidgetLibrary = ({
  onAddWidget,
  onInsertTemplate,
  isCollapsed,
  onToggleCollapse,
}: WidgetLibraryProps) => {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col border-r border-border/60 bg-background/95 transition-all duration-200',
        isCollapsed ? 'w-[76px]' : 'w-[320px]',
      )}
    >
      <div className="border-b border-border/60 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            {!isCollapsed && 'Builder library'}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-xl"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto', isCollapsed ? 'px-2 py-3' : 'px-4 py-4')}>
        {!isCollapsed && (
          <div className="mb-5">
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
        )}

        <div>
          {!isCollapsed && (
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Core widgets
            </div>
          )}
          <div className={cn('gap-3', isCollapsed ? 'grid grid-cols-1' : 'grid grid-cols-2')}>
            {widgets.map((widget) => (
              <DraggableWidgetItem key={widget.type} {...widget} onAdd={onAddWidget} compact={isCollapsed} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
