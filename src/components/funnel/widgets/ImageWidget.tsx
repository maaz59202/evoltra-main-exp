import { ImageWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  props: ImageWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const ImageWidget = ({ props, isSelected, isPreview }: Props) => {
  return (
    <div
      className={cn(
        'w-full transition-all',
        props.alignment === 'center' && 'flex justify-center',
        props.alignment === 'right' && 'flex justify-end',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <img
        src={props.src}
        alt={props.alt}
        loading="lazy"
        style={{
          width: props.width,
          height: props.height,
          borderRadius: `${props.borderRadius}px`,
        }}
        className="max-w-full object-cover"
      />
    </div>
  );
};
