import { SectionWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  id: string;
  props: SectionWidgetProps;
  children: React.ReactNode;
  isSelected: boolean;
  isPreview?: boolean;
}

export const SectionWidget = ({ id, props, children, isSelected, isPreview }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${id}`,
    data: { containerId: id },
  });

  const getBackgroundStyle = () => {
    if (props.backgroundType === 'gradient' && props.gradientFrom && props.gradientTo) {
      return {
        background: `linear-gradient(180deg, ${props.gradientFrom}, ${props.gradientTo})`,
      };
    }
    if (props.backgroundType === 'image' && props.backgroundImage) {
      return {
        backgroundImage: `url(${props.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {
      backgroundColor: props.backgroundColor,
    };
  };

  return (
    <section
      ref={!isPreview ? setNodeRef : undefined}
      className={cn(
        'w-full transition-all',
        !isPreview && isOver && 'ring-2 ring-dashed ring-primary',
        !isPreview && isSelected && 'ring-2 ring-primary'
      )}
      style={{
        ...getBackgroundStyle(),
        paddingTop: `${props.paddingY}px`,
        paddingBottom: `${props.paddingY}px`,
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {children || (
          <div className="flex items-center justify-center min-h-[100px] border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <span className="text-muted-foreground text-sm">Drop widgets here</span>
          </div>
        )}
      </div>
    </section>
  );
};
