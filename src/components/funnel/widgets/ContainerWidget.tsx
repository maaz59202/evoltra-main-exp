import { ContainerWidgetProps, Widget } from '@/types/funnel';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  id: string;
  props: ContainerWidgetProps;
  children: React.ReactNode;
  isSelected: boolean;
  isPreview?: boolean;
}

export const ContainerWidget = ({ id, props, children, isSelected, isPreview }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `container-${id}`,
    data: { containerId: id },
  });

  return (
    <div
      ref={!isPreview ? setNodeRef : undefined}
      className={cn(
        'w-full min-h-[80px] transition-all',
        !isPreview && isOver && 'ring-2 ring-dashed ring-primary',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        padding: `${props.padding}px`,
        margin: `${props.margin}px`,
        backgroundColor: props.backgroundColor,
        borderRadius: `${props.borderRadius}px`,
      }}
    >
      {children || (
        <div className="flex items-center justify-center h-full min-h-[60px] border-2 border-dashed border-muted-foreground/30 rounded-lg">
          <span className="text-muted-foreground text-sm">Drop widgets here</span>
        </div>
      )}
    </div>
  );
};
