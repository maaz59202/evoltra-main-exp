import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Widget } from '@/types/funnel';

/**
 * LayersPanel Component
 *
 * Hierarchical tree view of all widgets in the funnel.
 * Features:
 * - Shows parent-child relationships with indentation
 * - Expand/collapse containers and sections
 * - Click to select widget
 * - Visibility toggle (eye icon) per widget (TODO: backend support)
 * - Lock toggle (lock icon) per widget (TODO: backend support)
 * - Visual feedback for selected widget (border highlight)
 * - Right-click context menu (TODO: delete, duplicate, duplicate, move to)
 *
 * Props:
 * - widgets: All widgets in the funnel
 * - selectedWidgetId: Currently selected widget ID
 * - onSelectWidget: Callback when widget is clicked
 * - getChildWidgets: Function to fetch children of a widget
 */

interface LayersPanelProps {
  widgets: Widget[];
  selectedWidgetId: string | null;
  onSelectWidget: (id: string) => void;
  getChildWidgets: (parentId: string | null) => Widget[];
}

const getWidgetLabel = (widget: Widget): string => {
  const props = widget.props as any;
  switch (widget.type) {
    case 'text':
      return `Text: "${props.content?.substring(0, 30) || 'Empty'}..."`;
    case 'heading':
      return `Heading: "${props.content?.substring(0, 30) || 'Empty'}..."`;
    case 'image':
      return `Image: ${props.alt || 'Untitled'}`;
    case 'button':
      return `Button: "${props.text || 'Click me'}"`;
    case 'form':
      return `Form: "${props.submitText || 'Submit'}"`;
    case 'input':
      return `Input: ${props.label || 'Untitled'}`;
    case 'section':
      return 'Section';
    case 'container':
      return 'Container';
    case 'columns':
      return `Columns (${props.columns || 2})`;
    case 'spacer':
      return `Spacer (${props.height || 16}px)`;
    default:
      return widget.type;
  }
};

const getWidgetIcon = (type: Widget['type']): string => {
  switch (type) {
    case 'text':
      return '📝';
    case 'heading':
      return 'H';
    case 'image':
      return '🖼️';
    case 'button':
      return '🔘';
    case 'form':
      return '📋';
    case 'input':
      return '⌨️';
    case 'section':
      return '📦';
    case 'container':
      return '📦';
    case 'columns':
      return '⬅️➡️';
    case 'spacer':
      return '⬇️';
    default:
      return '✨';
  }
};

interface LayerItemProps {
  widget: Widget;
  selectedWidgetId: string | null;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onSelectWidget: (id: string) => void;
  getChildWidgets: (parentId: string | null) => Widget[];
  expandedIds: Set<string>;
}

const LayerItem = ({
  widget,
  selectedWidgetId,
  level,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onSelectWidget,
  getChildWidgets,
  expandedIds,
}: LayerItemProps) => {
  const children = getChildWidgets(widget.id);
  const isSelected = selectedWidgetId === widget.id;

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer',
          'hover:bg-accent/50 transition-colors',
          isSelected && 'bg-primary/10 border border-primary/30'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelectWidget(widget.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(widget.id);
            }}
            className="p-0.5 hover:bg-accent rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <span className="text-sm font-medium flex-shrink-0">{getWidgetIcon(widget.type)}</span>

        <span className="text-xs flex-1 truncate text-muted-foreground">
          {getWidgetLabel(widget)}
        </span>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 hover:bg-accent rounded flex-shrink-0">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <LayerItem
              key={child.id}
              widget={child}
              selectedWidgetId={selectedWidgetId}
              level={level + 1}
              hasChildren={getChildWidgets(child.id).length > 0}
              isExpanded={expandedIds.has(child.id)}
              onToggleExpand={onToggleExpand}
              onSelectWidget={onSelectWidget}
              getChildWidgets={getChildWidgets}
              expandedIds={expandedIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LayersPanel = ({
  widgets,
  selectedWidgetId,
  onSelectWidget,
  getChildWidgets,
}: LayersPanelProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const rootWidgets = getChildWidgets(null);

  return (
    <div className="w-72 bg-background border-l border-border/60 p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Layers</h3>

      <div className="space-y-1">
        {rootWidgets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No widgets added yet</p>
        ) : (
          rootWidgets.map((widget) => (
            <LayerItem
              key={widget.id}
              widget={widget}
              selectedWidgetId={selectedWidgetId}
              level={0}
              hasChildren={getChildWidgets(widget.id).length > 0}
              isExpanded={expandedIds.has(widget.id)}
              onToggleExpand={toggleExpand}
              onSelectWidget={onSelectWidget}
              getChildWidgets={getChildWidgets}
              expandedIds={expandedIds}
            />
          ))
        )}
      </div>
    </div>
  );
};
