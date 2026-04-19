import { useDroppable } from '@dnd-kit/core';

import { ColumnsWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  id: string;
  props: ColumnsWidgetProps;
  children: React.ReactNode;
  isSelected: boolean;
  isPreview?: boolean;
}

export const ColumnsWidget = ({ id, props, children, isSelected, isPreview }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `columns-${id}`,
    data: { containerId: id },
  });

  const columnsClass =
    props.columns === 4
      ? props.stackOnMobile
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-4'
      : props.columns === 3
        ? props.stackOnMobile
          ? 'grid-cols-1 md:grid-cols-3'
          : 'grid-cols-3'
        : props.stackOnMobile
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-2';

  const alignClass =
    props.verticalAlign === 'center'
      ? 'items-center'
      : props.verticalAlign === 'end'
        ? 'items-end'
        : 'items-start';

  return (
    <div
      ref={!isPreview ? setNodeRef : undefined}
      className={cn(
        'w-full min-h-[120px] transition-all',
        !isPreview && isOver && 'ring-2 ring-dashed ring-primary',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2',
      )}
      style={{
        padding: `${props.padding}px`,
        margin: `${props.margin}px`,
        backgroundColor: props.backgroundColor,
        borderRadius: `${props.borderRadius}px`,
      }}
    >
      {children ? (
        <div className={cn('grid w-full', columnsClass, alignClass)} style={{ gap: `${props.gap}px` }}>
          {children}
        </div>
      ) : (
        <div
          className={cn(
            'grid min-h-[120px] rounded-xl border-2 border-dashed border-muted-foreground/30 p-4',
            columnsClass,
            alignClass,
          )}
          style={{ gap: `${props.gap}px` }}
        >
          {Array.from({ length: props.columns }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[80px] items-center justify-center rounded-lg border border-border/50 bg-muted/20 text-center text-sm text-muted-foreground"
            >
              Drop content into column {index + 1}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
