import { ButtonWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface Props {
  props: ButtonWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const ButtonWidget = ({ props, isSelected, isPreview }: Props) => {
  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.preventDefault();
    }
  };

  return (
    <div
      className={cn(
        'w-full transition-all',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      <a
        href={props.url}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90',
          props.variant === 'outline' && 'border-2'
        )}
        style={{
          backgroundColor: props.variant === 'outline' ? 'transparent' : props.backgroundColor,
          color: props.variant === 'outline' ? props.backgroundColor : props.textColor,
          borderColor: props.variant === 'outline' ? props.backgroundColor : undefined,
        }}
      >
        {props.text}
      </a>
    </div>
  );
};
