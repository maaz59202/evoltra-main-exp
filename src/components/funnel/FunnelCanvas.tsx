import { Widget, DevicePreview } from '@/types/funnel';
import { WidgetRenderer } from './WidgetRenderer';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface FunnelCanvasProps {
  widgets: Widget[];
  selectedWidgetId: string | null;
  devicePreview: DevicePreview;
  isPreview?: boolean;
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
  widgets,
  selectedWidgetId,
  devicePreview,
  isPreview = false,
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
    <div className="flex-1 bg-muted/30 overflow-auto p-8">
      <div
        className={cn(
          'mx-auto bg-background min-h-[600px] shadow-lg transition-all duration-300',
          !isPreview && 'border border-border rounded-lg'
        )}
        style={{ maxWidth: deviceWidths[devicePreview] }}
        onClick={handleCanvasClick}
      >
        <div
          ref={!isPreview ? setNodeRef : undefined}
          className={cn(
            'min-h-[600px] space-y-4 p-4',
            !isPreview && isOver && 'bg-primary/5'
          )}
        >
          {rootWidgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <p className="text-lg font-medium mb-2">Start building your page</p>
              <p className="text-sm">Drag widgets from the left sidebar to get started</p>
            </div>
          ) : (
            renderWidgets(null)
          )}
        </div>
      </div>
    </div>
  );
};
