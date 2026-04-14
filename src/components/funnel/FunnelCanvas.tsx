import { useDroppable } from '@dnd-kit/core';

import { DevicePreview, Widget } from '@/types/funnel';
import { cn } from '@/lib/utils';
import { WidgetRenderer } from './WidgetRenderer';

interface FunnelCanvasProps {
  widgets: Widget[];
  selectedWidgetId: string | null;
  devicePreview: DevicePreview;
  isPreview?: boolean;
  onQuickAdd?: () => void;
  onQuickTemplate?: () => void;
  getChildWidgets: (parentId: string | null) => Widget[];
  onSelectWidget: (id: string | null) => void;
  onDeleteWidget: (id: string) => void;
  onDuplicateWidget: (id: string) => void;
}

const deviceWidths: Record<DevicePreview, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export const FunnelCanvas = ({
  selectedWidgetId,
  devicePreview,
  isPreview = false,
  onQuickAdd,
  onQuickTemplate,
  getChildWidgets,
  onSelectWidget,
  onDeleteWidget,
  onDuplicateWidget,
}: FunnelCanvasProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: { containerId: null },
  });

  const rootWidgets = getChildWidgets(null);

  const renderWidgets = (parentId: string | null): React.ReactNode => {
    const widgets = getChildWidgets(parentId);

    if (widgets.length === 0) return null;

    return widgets.map((widget) => (
      <WidgetRenderer
        key={widget.id}
        widget={widget}
        childWidgets={getChildWidgets(widget.id)}
        isSelected={selectedWidgetId === widget.id}
        isPreview={isPreview}
        onSelect={onSelectWidget}
        onDelete={onDeleteWidget}
        onDuplicate={onDuplicateWidget}
        renderChildren={renderWidgets}
      />
    ));
  };

  const handleCanvasClick = () => {
    if (!isPreview) {
      onSelectWidget(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.08),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.06),transparent)] p-8">
      <div
        className={cn(
          'mx-auto min-h-[720px] bg-background shadow-[0_30px_80px_rgba(2,6,23,0.20)] transition-all duration-300',
          !isPreview && 'rounded-[28px] border border-border/60',
        )}
        style={{ maxWidth: deviceWidths[devicePreview] }}
        onClick={handleCanvasClick}
      >
        <div
          ref={!isPreview ? setNodeRef : undefined}
          className={cn(
            'min-h-[720px] space-y-4 p-5',
            !isPreview && isOver && 'bg-primary/5',
          )}
        >
          {rootWidgets.length === 0 ? (
            <div className="flex h-[520px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 px-6 text-center">
              <p className="mb-2 text-2xl font-semibold text-foreground">Start with structure, not guesswork</p>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Drop widgets from the left, click to add them instantly, or start from a ready-made section so you are not composing every page from scratch.
              </p>
              {!isPreview && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickTemplate?.();
                    }}
                    className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    Insert hero section
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickAdd?.();
                    }}
                    className="rounded-2xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    Add a section block
                  </button>
                </div>
              )}
            </div>
          ) : (
            renderWidgets(null)
          )}
        </div>
      </div>
    </div>
  );
};
