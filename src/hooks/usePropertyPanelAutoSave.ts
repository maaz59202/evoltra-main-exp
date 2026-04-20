/**
 * usePropertyPanelAutoSave Hook
 * Intercepts property updates and auto-saves to design_components
 */

import { useCallback } from 'react';
import { useDesignComponentContext } from '@/contexts/DesignComponentContext';
import { Widget, WidgetProps } from '@/types/funnel';
import { useToast } from '@/hooks/use-toast';

/**
 * Creates a wrapped onUpdateProps that auto-saves to design_components
 */
export const usePropertyPanelAutoSave = (
  widget: Widget | null,
  onUpdateProps: (widgetId: string, props: Partial<WidgetProps>) => void
) => {
  const { updateComponentDesign, getComponentDesign } = useDesignComponentContext();
  const { toast } = useToast();

  const wrappedUpdateProps = useCallback(
    async (widgetId: string, props: Partial<WidgetProps>) => {
      // Update widget props (original behavior)
      onUpdateProps(widgetId, props);

      // Also update design component if it exists
      const designComponent = getComponentDesign(widgetId);
      if (designComponent) {
        try {
          // Map widget properties to design properties
          const designUpdates: Record<string, any> = {};

          // Text-related properties
          if (props.isBold !== undefined) designUpdates.text_bold = props.isBold;
          if (props.isItalic !== undefined) designUpdates.text_italic = props.isItalic;
          if (props.isUnderline !== undefined) designUpdates.text_underline = props.isUnderline;
          if (props.color !== undefined) designUpdates.text_color = props.color;
          if (props.fontSize !== undefined) designUpdates.font_size = props.fontSize;
          if (props.alignment !== undefined) designUpdates.text_align = props.alignment;

          // Shadow and opacity
          if (props.shadowSize !== undefined) {
            // Map shadow size to blur
            const shadowMap: Record<string, number> = {
              none: 0,
              small: 4,
              medium: 8,
              large: 12,
            };
            designUpdates.shadow_blur = shadowMap[props.shadowSize] || 0;
            designUpdates.shadow_opacity = shadowMap[props.shadowSize] ? 0.2 : 0;
          }
          if (props.opacity !== undefined) designUpdates.opacity = props.opacity;

          // Animation
          if (props.animation?.type !== undefined) {
            designUpdates.animation_type = props.animation.type;
          }
          if (props.animation?.duration !== undefined) {
            designUpdates.animation_duration = props.animation.duration;
          }
          if (props.animation?.delay !== undefined) {
            designUpdates.animation_delay = props.animation.delay;
          }

          // Only save if there are updates
          if (Object.keys(designUpdates).length > 0) {
            await updateComponentDesign(widgetId, designUpdates);
          }
        } catch (error) {
          console.error('Auto-save to design components failed:', error);
          // Don't show error toast for auto-save, just log it
        }
      }
    },
    [onUpdateProps, getComponentDesign, updateComponentDesign, toast]
  );

  return wrappedUpdateProps;
};

/**
 * Map widget properties to design properties
 * Useful for syncing existing widget data to design_components on first load
 */
export const mapWidgetPropsToDesignProps = (widget: Widget): Record<string, any> => {
  const { props } = widget;
  const designProps: Record<string, any> = {};

  if (!props) return designProps;

  // Map all possible properties
  if ((props as any).isBold !== undefined) designProps.text_bold = (props as any).isBold;
  if ((props as any).isItalic !== undefined) designProps.text_italic = (props as any).isItalic;
  if ((props as any).isUnderline !== undefined) designProps.text_underline = (props as any).isUnderline;
  if ((props as any).color !== undefined) designProps.text_color = (props as any).color;
  if ((props as any).fontSize !== undefined) designProps.font_size = (props as any).fontSize;
  if ((props as any).alignment !== undefined) designProps.text_align = (props as any).alignment;
  if ((props as any).opacity !== undefined) designProps.opacity = (props as any).opacity;

  // Shadow size mapping
  if ((props as any).shadowSize !== undefined) {
    const shadowMap: Record<string, number> = {
      none: 0,
      small: 4,
      medium: 8,
      large: 12,
    };
    designProps.shadow_blur = shadowMap[(props as any).shadowSize] || 0;
    designProps.shadow_opacity = shadowMap[(props as any).shadowSize] ? 0.2 : 0;
  }

  // Animation
  if ((props as any).animation?.type !== undefined) {
    designProps.animation_type = (props as any).animation.type;
  }
  if ((props as any).animation?.duration !== undefined) {
    designProps.animation_duration = (props as any).animation.duration;
  }
  if ((props as any).animation?.delay !== undefined) {
    designProps.animation_delay = (props as any).animation.delay;
  }

  return designProps;
};
