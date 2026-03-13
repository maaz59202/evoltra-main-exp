import { TextWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  props: TextWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const TextWidget = ({ props, isSelected, isPreview }: Props) => {
  return (
    <p
      className={cn(
        'w-full transition-all',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        fontSize: `${props.fontSize}px`,
        fontWeight: props.fontWeight === 'normal' ? 400 : props.fontWeight === 'medium' ? 500 : props.fontWeight === 'semibold' ? 600 : 700,
        color: props.color,
        textAlign: props.alignment,
      }}
    >
      {props.content}
    </p>
  );
};
