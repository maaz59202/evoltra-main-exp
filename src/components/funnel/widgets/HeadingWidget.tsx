import { HeadingWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  props: HeadingWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const HeadingWidget = ({ props, isSelected, isPreview }: Props) => {
  const Tag = props.level;
  
  return (
    <Tag
      className={cn(
        'w-full transition-all font-bold',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        fontSize: `${props.fontSize}px`,
        color: props.color,
        textAlign: props.alignment,
      }}
    >
      {props.content}
    </Tag>
  );
};
