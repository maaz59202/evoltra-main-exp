import { Widget, WidgetProps, TextWidgetProps, HeadingWidgetProps, ImageWidgetProps, ButtonWidgetProps, InputWidgetProps, FormWidgetProps, ColumnsWidgetProps, ContainerWidgetProps, SectionWidgetProps, SpacerWidgetProps } from '@/types/funnel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlignmentButtons, 
  FontSizeSlider, 
  FontWeightSelect, 
  ColorInput, 
  TextContentArea,
  TextInput,
  PropertySection,
  OpacityControl,
  LineHeightControl,
  LetterSpacingControl,
  BorderWidthControl,
  BorderColorInput,
  BorderStyleSelect,
  ShadowControl
} from './PropertyControls';

/**
 * PropertiesPanel Component
 * 
 * Right-side panel for editing properties of the selected widget.
 * Displays widget-specific controls (font size, color, content, etc).
 * 
 * Features:
 * - Context-aware property rendering based on widget type
 * - Font controls: size (slider), weight (select), color (color picker)
 * - Text alignment buttons (left, center, right)
 * - Layout controls: padding, margin, gap, columns
 * - Background controls: solid color, gradient, image
 * - Responsive controls for mobile-specific behavior
 * 
 * When no widget is selected: shows placeholder "Select a widget to edit..."
 * 
 * Supported widget types:
 * - text, heading, image, button, input, form
 * - columns, container, section, spacer
 * 
 * Each widget type has its own property editor sub-component.
 */
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
            <PropertySection title="Typography">
              <FontSizeSlider value={props.fontSize} onChange={(v) => updateProp('fontSize', v)} min={12} max={48} />
              <FontWeightSelect value={props.fontWeight} onChange={(v) => updateProp('fontWeight', v)} />
              <LineHeightControl value={props.lineHeight ?? 14} onChange={(v) => updateProp('lineHeight', v)} />
              <LetterSpacingControl value={props.letterSpacing ?? 0} onChange={(v) => updateProp('letterSpacing', v)} />
            </PropertySection>
            <PropertySection title="Appearance">
              <ColorInput value={props.color} onChange={(v) => updateProp('color', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
              <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
            </PropertySection>
          </>
        );
      }

      case 'heading': {
        const props = widget.props as HeadingWidgetProps;
        return (
          <>
            <TextInput 
              label="Content"
              value={props.content}
              onChange={(e) => updateProp('content', e)}
            />
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
            <PropertySection title="Typography">
              <FontSizeSlider value={props.fontSize} onChange={(v) => updateProp('fontSize', v)} min={16} max={72} />
              <LineHeightControl value={props.lineHeight ?? 16} onChange={(v) => updateProp('lineHeight', v)} />
              <LetterSpacingControl value={props.letterSpacing ?? 0} onChange={(v) => updateProp('letterSpacing', v)} />
            </PropertySection>
            <PropertySection title="Appearance">
              <ColorInput value={props.color} onChange={(v) => updateProp('color', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
              <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
            </PropertySection>
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
            <PropertySection title="Image Source">
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
            </PropertySection>
            <PropertySection title="Size & Layout">
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
              <AlignmentButtons value={props.alignment} onChange={(value) => updateProp('alignment', value)} />
            </PropertySection>
            <PropertySection title="Styling">
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
              <BorderWidthControl value={props.borderWidth ?? 0} onChange={(v) => updateProp('borderWidth', v)} />
              <BorderColorInput value={props.borderColor ?? '#000000'} onChange={(v) => updateProp('borderColor', v)} />
              <BorderStyleSelect value={props.borderStyle ?? 'solid'} onChange={(v) => updateProp('borderStyle', v)} />
              <ShadowControl value={props.shadowBlur ?? 0} onChange={(v) => updateProp('shadowBlur', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
            </PropertySection>
          </>
        );
      }

      case 'button': {
        const props = widget.props as ButtonWidgetProps;
        return (
          <>
            <PropertySection title="Button Content">
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
            </PropertySection>
            <PropertySection title="Style">
              <div className="space-y-2">
                <Label>Button Variant</Label>
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
            </PropertySection>
            <PropertySection title="Appearance">
              <div className="space-y-2">
                <Label>Border Radius ({props.borderRadius ?? 8}px)</Label>
                <Slider
                  value={[props.borderRadius ?? 8]}
                  onValueChange={([v]) => updateProp('borderRadius', v)}
                  min={0}
                  max={32}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Padding ({props.padding ?? 12}px)</Label>
                <Slider
                  value={[props.padding ?? 12]}
                  onValueChange={([v]) => updateProp('padding', v)}
                  min={0}
                  max={32}
                  step={1}
                />
              </div>
              <ShadowControl value={props.shadowBlur ?? 0} onChange={(v) => updateProp('shadowBlur', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
              <AlignmentButtons
                value={props.alignment ?? 'left'}
                onChange={(value) => updateProp('alignment', value)}
              />
            </PropertySection>
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
            <PropertySection title="Layout">
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
            </PropertySection>
            <PropertySection title="Spacing">
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
            </PropertySection>
            <PropertySection title="Appearance">
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
              <BorderWidthControl value={props.borderWidth ?? 0} onChange={(v) => updateProp('borderWidth', v)} />
              <BorderColorInput value={props.borderColor ?? '#000000'} onChange={(v) => updateProp('borderColor', v)} />
              <BorderStyleSelect value={props.borderStyle ?? 'solid'} onChange={(v) => updateProp('borderStyle', v)} />
              <ShadowControl value={props.shadowBlur ?? 0} onChange={(v) => updateProp('shadowBlur', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
            </PropertySection>
          </>
        );
      }

      case 'container': {
        const props = widget.props as ContainerWidgetProps;
        return (
          <>
            <PropertySection title="Spacing">
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
            </PropertySection>
            <PropertySection title="Appearance">
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
              <BorderWidthControl value={props.borderWidth ?? 0} onChange={(v) => updateProp('borderWidth', v)} />
              <BorderColorInput value={props.borderColor ?? '#000000'} onChange={(v) => updateProp('borderColor', v)} />
              <BorderStyleSelect value={props.borderStyle ?? 'solid'} onChange={(v) => updateProp('borderStyle', v)} />
              <ShadowControl value={props.shadowBlur ?? 0} onChange={(v) => updateProp('shadowBlur', v)} />
              <OpacityControl value={props.opacity ?? 1} onChange={(v) => updateProp('opacity', v)} />
            </PropertySection>
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
