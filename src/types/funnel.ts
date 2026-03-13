// Funnel Builder Types

export type WidgetType = 
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'input'
  | 'form'
  | 'container'
  | 'section'
  | 'spacer';

export interface BaseWidget {
  id: string;
  type: WidgetType;
  order: number;
  parentId: string | null; // null = root level, otherwise container/section id
}

export interface TextWidgetProps {
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  color: string;
  alignment: 'left' | 'center' | 'right';
}

export interface HeadingWidgetProps {
  content: string;
  level: 'h1' | 'h2' | 'h3';
  fontSize: number;
  color: string;
  alignment: 'left' | 'center' | 'right';
}

export interface ImageWidgetProps {
  src: string;
  alt: string;
  width: string;
  height: string;
  borderRadius: number;
  alignment: 'left' | 'center' | 'right';
}

export interface ButtonWidgetProps {
  text: string;
  url: string;
  variant: 'primary' | 'secondary' | 'outline';
  backgroundColor: string;
  textColor: string;
  icon?: string;
}

export interface InputWidgetProps {
  inputType: 'text' | 'email' | 'phone';
  placeholder: string;
  required: boolean;
  label: string;
}

export interface FormWidgetProps {
  submitText: string;
  successMessage: string;
  fields: string[]; // IDs of input widgets inside
}

export interface ContainerWidgetProps {
  padding: number;
  margin: number;
  backgroundColor: string;
  borderRadius: number;
}

export interface SectionWidgetProps {
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor: string;
  gradientFrom?: string;
  gradientTo?: string;
  backgroundImage?: string;
  paddingY: number;
}

export interface SpacerWidgetProps {
  height: number;
}

export type WidgetProps = 
  | TextWidgetProps
  | HeadingWidgetProps
  | ImageWidgetProps
  | ButtonWidgetProps
  | InputWidgetProps
  | FormWidgetProps
  | ContainerWidgetProps
  | SectionWidgetProps
  | SpacerWidgetProps;

export interface Widget extends BaseWidget {
  props: WidgetProps;
}

export interface Funnel {
  id: string;
  name: string;
  status: 'draft' | 'published';
  workspaceId: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
  publishedUrl?: string;
}

export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

export interface FunnelEditorState {
  funnel: Funnel | null;
  selectedWidgetId: string | null;
  devicePreview: DevicePreview;
  isDirty: boolean;
  isSaving: boolean;
}

// Default widget props factories
export const getDefaultTextProps = (): TextWidgetProps => ({
  content: 'Enter your text here...',
  fontSize: 16,
  fontWeight: 'normal',
  color: '#000000',
  alignment: 'left',
});

export const getDefaultHeadingProps = (): HeadingWidgetProps => ({
  content: 'Your Heading',
  level: 'h2',
  fontSize: 32,
  color: '#000000',
  alignment: 'center',
});

export const getDefaultImageProps = (): ImageWidgetProps => ({
  src: '/placeholder.svg',
  alt: 'Image description',
  width: '100%',
  height: 'auto',
  borderRadius: 8,
  alignment: 'center',
});

export const getDefaultButtonProps = (): ButtonWidgetProps => ({
  text: 'Click Here',
  url: '#',
  variant: 'primary',
  backgroundColor: '#3b82f6',
  textColor: '#ffffff',
});

export const getDefaultInputProps = (): InputWidgetProps => ({
  inputType: 'text',
  placeholder: 'Enter value...',
  required: false,
  label: 'Label',
});

export const getDefaultFormProps = (): FormWidgetProps => ({
  submitText: 'Submit',
  successMessage: 'Thank you for submitting!',
  fields: [],
});

export const getDefaultContainerProps = (): ContainerWidgetProps => ({
  padding: 16,
  margin: 0,
  backgroundColor: 'transparent',
  borderRadius: 8,
});

export const getDefaultSectionProps = (): SectionWidgetProps => ({
  backgroundType: 'solid',
  backgroundColor: '#ffffff',
  paddingY: 48,
});

export const getDefaultSpacerProps = (): SpacerWidgetProps => ({
  height: 32,
});

export const getDefaultPropsForType = (type: WidgetType): WidgetProps => {
  switch (type) {
    case 'text': return getDefaultTextProps();
    case 'heading': return getDefaultHeadingProps();
    case 'image': return getDefaultImageProps();
    case 'button': return getDefaultButtonProps();
    case 'input': return getDefaultInputProps();
    case 'form': return getDefaultFormProps();
    case 'container': return getDefaultContainerProps();
    case 'section': return getDefaultSectionProps();
    case 'spacer': return getDefaultSpacerProps();
  }
};
