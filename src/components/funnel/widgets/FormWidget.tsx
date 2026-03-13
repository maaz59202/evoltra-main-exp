import { FormWidgetProps, Widget, InputWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { InputWidget } from './InputWidget';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  props: FormWidgetProps;
  childWidgets: Widget[];
  isSelected: boolean;
  isPreview?: boolean;
  widgetId: string;
  onSelectWidget?: (id: string) => void;
}

export const FormWidget = ({ props, childWidgets, isSelected, isPreview, widgetId, onSelectWidget }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `form-${widgetId}`,
    data: { containerId: widgetId, acceptsOnly: ['input'] },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      alert(props.successMessage);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      ref={!isPreview ? setNodeRef : undefined}
      className={cn(
        'w-full space-y-4 p-4 rounded-lg border border-border bg-card transition-all',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2',
        !isPreview && isOver && 'bg-primary/10 border-primary'
      )}
    >
      {childWidgets.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          Drag input fields here
        </p>
      ) : (
        childWidgets.map((widget) => (
          <div 
            key={widget.id} 
            onClick={(e) => {
              e.stopPropagation();
              onSelectWidget?.(widget.id);
            }}
          >
            <InputWidget
              props={widget.props as InputWidgetProps}
              isSelected={false}
              isPreview={isPreview}
            />
          </div>
        ))
      )}
      
      <Button 
        type="submit" 
        className="w-full"
        onClick={isPreview ? undefined : (e) => e.preventDefault()}
      >
        {props.submitText}
      </Button>
    </form>
  );
};
