import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlignLeft, AlignCenter, AlignRight } from '@/components/ui/icons';

/**
 * Shared property control components for PropertiesPanel
 * These can be reused across different widget type editors
 */

export const AlignmentButtons = ({
  value,
  onChange,
}: {
  value: 'left' | 'center' | 'right';
  onChange: (value: 'left' | 'center' | 'right') => void;
}) => (
  <div className="space-y-2">
    <Label>Alignment</Label>
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === 'left' || nextValue === 'center' || nextValue === 'right') {
          onChange(nextValue);
        }
      }}
      className="justify-start"
    >
      <ToggleGroupItem value="left" aria-label="Align left">
        <AlignLeft className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Align center">
        <AlignCenter className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Align right">
        <AlignRight className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
);

export const FontSizeSlider = ({
  value,
  onChange,
  min = 12,
  max = 48,
  label = 'Font Size',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) => (
  <div className="space-y-2">
    <Label>
      {label} ({value}px)
    </Label>
    <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} />
  </div>
);

export const FontWeightSelect = ({
  value,
  onChange,
  label = 'Font Weight',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="normal">Normal</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="semibold">Semibold</SelectItem>
        <SelectItem value="bold">Bold</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export const ColorInput = ({
  value,
  onChange,
  label = 'Color',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 p-1" />
  </div>
);

export const TextContentArea = ({
  value,
  onChange,
  label = 'Content',
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  rows?: number;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
  </div>
);

export const TextInput = ({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    {label && <Label>{label}</Label>}
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

export const PropertySection = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4">
    {title && <h3 className="font-semibold text-sm text-foreground">{title}</h3>}
    {children}
  </div>
);
