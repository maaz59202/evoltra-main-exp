import { Widget, WidgetProps, TextWidgetProps, HeadingWidgetProps, ImageWidgetProps, ButtonWidgetProps, InputWidgetProps, FormWidgetProps, ColumnsWidgetProps, ContainerWidgetProps, SectionWidgetProps, SpacerWidgetProps } from '@/types/funnel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignLeft, AlignCenter, AlignRight } from '@/components/ui/icons';

interface PropertiesPanelProps {
  widget: Widget | null;
  onUpdateProps: (widgetId: string, props: Partial<WidgetProps>) => void;
}

export const PropertiesPanel = ({ widget, onUpdateProps }: PropertiesPanelProps) => {
  if (!widget) {
    return (
      <div className="w-72 bg-background border-l border-border p-4">
        <p className="text-muted-foreground text-sm text-center mt-8">
          Select a widget to edit its properties
        </p>
      </div>
    );
  }

  const updateProp = (key: string, value: any) => {
    onUpdateProps(widget.id, { [key]: value });
  };

  const AlignmentButtons = ({
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

  const renderProperties = () => {
    switch (widget.type) {
      case 'text': {
        const props = widget.props as TextWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={props.content}
                onChange={(e) => updateProp('content', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Font Size ({props.fontSize}px)</Label>
              <Slider
                value={[props.fontSize]}
                onValueChange={([v]) => updateProp('fontSize', v)}
                min={12}
                max={48}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Font Weight</Label>
              <Select value={props.fontWeight} onValueChange={(v) => updateProp('fontWeight', v)}>
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
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={props.color}
                onChange={(e) => updateProp('color', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
          </>
        );
      }

      case 'heading': {
        const props = widget.props as HeadingWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Content</Label>
              <Input
                value={props.content}
                onChange={(e) => updateProp('content', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={props.level} onValueChange={(v) => updateProp('level', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Font Size ({props.fontSize}px)</Label>
              <Slider
                value={[props.fontSize]}
                onValueChange={([v]) => updateProp('fontSize', v)}
                min={16}
                max={72}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={props.color}
                onChange={(e) => updateProp('color', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
          </>
        );
      }

      case 'image': {
        const props = widget.props as ImageWidgetProps;
        
        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              updateProp('src', reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };
        
        return (
          <>
            <div className="space-y-2">
              <Label>Upload Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Or enter a URL below
              </p>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={props.src}
                onChange={(e) => updateProp('src', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <Input
                value={props.alt}
                onChange={(e) => updateProp('alt', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Width</Label>
              <Input
                value={props.width}
                onChange={(e) => updateProp('width', e.target.value)}
                placeholder="100% or 300px"
              />
            </div>
            <div className="space-y-2">
              <Label>Height</Label>
              <Input
                value={props.height}
                onChange={(e) => updateProp('height', e.target.value)}
                placeholder="auto or 200px"
              />
            </div>
            <div className="space-y-2">
              <Label>Border Radius ({props.borderRadius}px)</Label>
              <Slider
                value={[props.borderRadius]}
                onValueChange={([v]) => updateProp('borderRadius', v)}
                min={0}
                max={32}
                step={1}
              />
            </div>
            <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
          </>
        );
      }

      case 'button': {
        const props = widget.props as ButtonWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Button Text</Label>
              <Input
                value={props.text}
                onChange={(e) => updateProp('text', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={props.url}
                onChange={(e) => updateProp('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={props.variant} onValueChange={(v) => updateProp('variant', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={props.backgroundColor}
                onChange={(e) => updateProp('backgroundColor', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label>Text Color</Label>
              <Input
                type="color"
                value={props.textColor}
                onChange={(e) => updateProp('textColor', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <AlignmentButtons
              value={props.alignment ?? 'left'}
              onChange={(value) => updateProp('alignment', value)}
            />
          </>
        );
      }

      case 'input': {
        const props = widget.props as InputWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={props.label}
                onChange={(e) => updateProp('label', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Input Type</Label>
              <Select value={props.inputType} onValueChange={(v) => updateProp('inputType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={props.placeholder}
                onChange={(e) => updateProp('placeholder', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={props.required}
                onCheckedChange={(v) => updateProp('required', v)}
              />
            </div>
          </>
        );
      }

      case 'form': {
        const props = widget.props as FormWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Submit Button Text</Label>
              <Input
                value={props.submitText}
                onChange={(e) => updateProp('submitText', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Success Message</Label>
              <Textarea
                value={props.successMessage}
                onChange={(e) => updateProp('successMessage', e.target.value)}
                rows={2}
              />
            </div>
          </>
        );
      }

      case 'columns': {
        const props = widget.props as ColumnsWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Columns</Label>
              <Select value={String(props.columns)} onValueChange={(v) => updateProp('columns', Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 columns</SelectItem>
                  <SelectItem value="3">3 columns</SelectItem>
                  <SelectItem value="4">4 columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gap ({props.gap}px)</Label>
              <Slider
                value={[props.gap]}
                onValueChange={([v]) => updateProp('gap', v)}
                min={8}
                max={48}
                step={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Inner Padding ({props.padding}px)</Label>
              <Slider
                value={[props.padding]}
                onValueChange={([v]) => updateProp('padding', v)}
                min={0}
                max={48}
                step={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Outer Margin ({props.margin}px)</Label>
              <Slider
                value={[props.margin]}
                onValueChange={([v]) => updateProp('margin', v)}
                min={0}
                max={64}
                step={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={props.backgroundColor === 'transparent' ? '#ffffff' : props.backgroundColor}
                onChange={(e) => updateProp('backgroundColor', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label>Border Radius ({props.borderRadius}px)</Label>
              <Slider
                value={[props.borderRadius]}
                onValueChange={([v]) => updateProp('borderRadius', v)}
                min={0}
                max={32}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Vertical Align</Label>
              <Select value={props.verticalAlign} onValueChange={(v) => updateProp('verticalAlign', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Stack on Mobile</Label>
              <Switch
                checked={props.stackOnMobile}
                onCheckedChange={(v) => updateProp('stackOnMobile', v)}
              />
            </div>
          </>
        );
      }

      case 'container': {
        const props = widget.props as ContainerWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Padding ({props.padding}px)</Label>
              <Slider
                value={[props.padding]}
                onValueChange={([v]) => updateProp('padding', v)}
                min={0}
                max={64}
                step={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Margin ({props.margin}px)</Label>
              <Slider
                value={[props.margin]}
                onValueChange={([v]) => updateProp('margin', v)}
                min={0}
                max={64}
                step={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Background Color</Label>
              <Input
                type="color"
                value={props.backgroundColor === 'transparent' ? '#ffffff' : props.backgroundColor}
                onChange={(e) => updateProp('backgroundColor', e.target.value)}
                className="h-10 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label>Border Radius ({props.borderRadius}px)</Label>
              <Slider
                value={[props.borderRadius]}
                onValueChange={([v]) => updateProp('borderRadius', v)}
                min={0}
                max={32}
                step={1}
              />
            </div>
          </>
        );
      }

      case 'section': {
        const props = widget.props as SectionWidgetProps;
        return (
          <>
            <div className="space-y-2">
              <Label>Background Type</Label>
              <Select value={props.backgroundType} onValueChange={(v) => updateProp('backgroundType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {props.backgroundType === 'solid' && (
              <div className="space-y-2">
                <Label>Background Color</Label>
                <Input
                  type="color"
                  value={props.backgroundColor}
                  onChange={(e) => updateProp('backgroundColor', e.target.value)}
                  className="h-10 p-1"
                />
              </div>
            )}
            {props.backgroundType === 'gradient' && (
              <>
                <div className="space-y-2">
                  <Label>Gradient From</Label>
                  <Input
                    type="color"
                    value={props.gradientFrom || '#ffffff'}
                    onChange={(e) => updateProp('gradientFrom', e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gradient To</Label>
                  <Input
                    type="color"
                    value={props.gradientTo || '#000000'}
                    onChange={(e) => updateProp('gradientTo', e.target.value)}
                    className="h-10 p-1"
                  />
                </div>
              </>
            )}
            {props.backgroundType === 'image' && (
              <div className="space-y-2">
                <Label>Background Image URL</Label>
                <Input
                  value={props.backgroundImage || ''}
                  onChange={(e) => updateProp('backgroundImage', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Vertical Padding ({props.paddingY}px)</Label>
              <Slider
                value={[props.paddingY]}
                onValueChange={([v]) => updateProp('paddingY', v)}
                min={16}
                max={128}
                step={8}
              />
            </div>
          </>
        );
      }

      case 'spacer': {
        const props = widget.props as SpacerWidgetProps;
        return (
          <div className="space-y-2">
            <Label>Height ({props.height}px)</Label>
            <Slider
              value={[props.height]}
              onValueChange={([v]) => updateProp('height', v)}
              min={8}
              max={200}
              step={8}
            />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="w-72 bg-background border-l border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm capitalize">{widget.type} Properties</h3>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-4">
          {renderProperties()}
        </div>
      </ScrollArea>
    </div>
  );
};
