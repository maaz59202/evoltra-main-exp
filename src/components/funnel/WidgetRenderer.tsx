import { Widget, WidgetProps, TextWidgetProps, HeadingWidgetProps, ImageWidgetProps, ButtonWidgetProps, InputWidgetProps, FormWidgetProps, ColumnsWidgetProps, ContainerWidgetProps, SectionWidgetProps, SpacerWidgetProps } from '@/types/funnel';
import { TextWidget } from './widgets/TextWidget';
import { HeadingWidget } from './widgets/HeadingWidget';
import { ImageWidget } from './widgets/ImageWidget';
import { ButtonWidget } from './widgets/ButtonWidget';
import { InputWidget } from './widgets/InputWidget';
import { FormWidget } from './widgets/FormWidget';
import { ColumnsWidget } from './widgets/ColumnsWidget';
import { ContainerWidget } from './widgets/ContainerWidget';
import { SectionWidget } from './widgets/SectionWidget';
import { SpacerWidget } from './widgets/SpacerWidget';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Trash2, Copy, GripVertical } from '@/components/ui/icons';

interface WidgetRendererProps {
  widget: Widget;
  childWidgets: Widget[];
  isSelected: boolean;
  isPreview?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  renderChildren: (parentId: string) => React.ReactNode;
}

export const WidgetRenderer = ({
  widget,
  childWidgets,
  isSelected,
  isPreview = false,
  onSelect,
  onDelete,
  onDuplicate,
  renderChildren,
}: WidgetRendererProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: widget.id,
    data: { widget, isNew: false },
    disabled: isPreview,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPreview) {
      onSelect(widget.id);
    }
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'text':
        return <TextWidget props={widget.props as TextWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      case 'heading':
        return <HeadingWidget props={widget.props as HeadingWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      case 'image':
        return <ImageWidget props={widget.props as ImageWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      case 'button':
        return <ButtonWidget props={widget.props as ButtonWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      case 'input':
        return <InputWidget props={widget.props as InputWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      case 'form':
        return (
          <FormWidget
            props={widget.props as FormWidgetProps}
            childWidgets={childWidgets}
            isSelected={isSelected}
            isPreview={isPreview}
            widgetId={widget.id}
            onSelectWidget={onSelect}
          />
        );
      case 'columns':
        return (
          <ColumnsWidget
            id={widget.id}
            props={widget.props as ColumnsWidgetProps}
            isSelected={isSelected}
            isPreview={isPreview}
          >
            {renderChildren(widget.id)}
          </ColumnsWidget>
        );
      case 'container':
        return (
          <ContainerWidget
            id={widget.id}
            props={widget.props as ContainerWidgetProps}
            isSelected={isSelected}
            isPreview={isPreview}
          >
            {renderChildren(widget.id)}
          </ContainerWidget>
        );
      case 'section':
        return (
          <SectionWidget
            id={widget.id}
            props={widget.props as SectionWidgetProps}
            isSelected={isSelected}
            isPreview={isPreview}
          >
            {renderChildren(widget.id)}
          </SectionWidget>
        );
      case 'spacer':
        return <SpacerWidget props={widget.props as SpacerWidgetProps} isSelected={isSelected} isPreview={isPreview} />;
      default:
        return null;
    }
  };

  if (isPreview) {
    return <div className="w-full">{renderWidget()}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        'relative group w-full',
        isDragging && 'opacity-50'
      )}
    >
      {/* Widget controls */}
      {isSelected && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 bg-primary text-primary-foreground rounded-t-md px-2 py-1 text-xs z-10">
          <span {...listeners} {...attributes} className="cursor-grab hover:cursor-grabbing">
            <GripVertical className="w-3 h-3" />
          </span>
          <span className="capitalize">{widget.type}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(widget.id); }}
            className="p-1 hover:bg-primary-foreground/20 rounded"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(widget.id); }}
            className="p-1 hover:bg-destructive rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {renderWidget()}
    </div>
  );
};
