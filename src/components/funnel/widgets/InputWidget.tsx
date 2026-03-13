import { InputWidgetProps } from '@/types/funnel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  props: InputWidgetProps;
  isSelected: boolean;
  isPreview?: boolean;
}

export const InputWidget = ({ props, isSelected, isPreview }: Props) => {
  return (
    <div
      className={cn(
        'w-full space-y-2 transition-all',
        !isPreview && isSelected && 'ring-2 ring-primary ring-offset-2 rounded-lg p-1'
      )}
    >
      <Label>
        {props.label}
        {props.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type={props.inputType}
        placeholder={props.placeholder}
        required={props.required}
        disabled={!isPreview}
      />
    </div>
  );
};
