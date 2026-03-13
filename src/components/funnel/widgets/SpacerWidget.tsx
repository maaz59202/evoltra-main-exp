import { SpacerWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  props: SpacerWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const SpacerWidget = ({ props, isSelected, isPreview }: Props) => {
  return (
    <div
      className={cn(
        'w-full transition-all relative',
        !isPreview && 'bg-muted/30 border border-dashed border-muted-foreground/30',
        !isPreview && isSelected && 'ring-2 ring-primary'
      )}
      style={{ height: `${props.height}px` }}
    >
      {!isPreview && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {props.height}px
        </span>
      )}
    </div>
  );
};
