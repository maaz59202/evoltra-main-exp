/**
 * Design Component Types & Utilities
 * Central location for component type definitions and helper functions
 */

/**
 * Supported animation effect types
 */
export const ANIMATION_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide In' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'spin', label: 'Spin' },
  { value: 'pulse', label: 'Pulse' },
] as const;

/**
 * Supported timing functions for animations
 */
export const ANIMATION_TIMING_FUNCTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'linear', label: 'Linear' },
] as const;

/**
 * Supported text alignment options
 */
export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
] as const;

/**
 * Supported vertical alignment options
 */
export const VERTICAL_ALIGN_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

/**
 * Supported distribution options
 */
export const DISTRIBUTION_OPTIONS = [
  { value: 'space-evenly', label: 'Space Evenly' },
  { value: 'space-between', label: 'Space Between' },
  { value: 'space-around', label: 'Space Around' },
] as const;

/**
 * Visibility condition operators
 */
export const VISIBILITY_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'between', label: 'Between' },
] as const;

/**
 * Visibility condition field types
 */
export const VISIBILITY_FIELDS = [
  { value: 'action', label: 'User Action' },
  { value: 'formValue', label: 'Form Value' },
  { value: 'deviceType', label: 'Device Type' },
  { value: 'timestamp', label: 'Time' },
] as const;

/**
 * Convert numeric opacity value (0-100) to CSS value (0-1)
 */
export function opacityToCSS(opacity: number): string {
  return `${Math.round((opacity / 100) * 100) / 100}`;
}

/**
 * Convert CSS opacity value (0-1) to percentage (0-100)
 */
export function opacityToPercent(opacity: number): number {
  return Math.round(opacity * 100);
}

/**
 * Generate CSS animation keyframes based on animation type
 */
export function generateAnimationKeyframes(
  animationType: string
): string {
  switch (animationType) {
    case 'fade':
      return `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
    case 'slide':
      return `
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
    case 'bounce':
      return `
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `;
    case 'spin':
      return `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
    case 'pulse':
      return `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
    default:
      return '';
  }
}

/**
 * Build CSS animation string from component data
 */
export function buildAnimationCSS(
  animationType?: string,
  duration = 300,
  delay = 0,
  timingFunction = 'ease'
): string {
  if (!animationType || animationType === 'none') return '';

  return `
    animation: ${animationType} ${duration}ms ${timingFunction} ${delay}ms forwards;
  `;
}

/**
 * Build CSS shadow string from component data
 */
export function buildShadowCSS(
  blur = 0,
  spread = 0,
  offsetX = 0,
  offsetY = 0,
  opacity = 0,
  color = '#000000'
): string {
  if (opacity === 0) return 'none';

  const rgbaColor = hexToRgba(color, opacity);
  return `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${rgbaColor}`;
}

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Convert rgba to hex (ignoring alpha)
 */
export function rgbaToHex(rgba: string): string {
  const match = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';

  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

/**
 * Evaluate visibility condition against data context
 */
export function evaluateVisibilityCondition(
  condition: {
    operator: string;
    field: string;
    value: any;
    value2?: any;
  },
  context: Record<string, any>
): boolean {
  const fieldValue = context[condition.field];

  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    case 'between':
      return (
        Number(fieldValue) >= Number(condition.value) &&
        Number(fieldValue) <= Number(condition.value2)
      );
    default:
      return true;
  }
}

/**
 * Check if component should be visible based on all visibility conditions
 */
export function isComponentVisible(
  visibilityConditions: Array<any> = [],
  context: Record<string, any> = {}
): boolean {
  // No conditions means always visible
  if (!visibilityConditions || visibilityConditions.length === 0) {
    return true;
  }

  // All conditions must be true (AND logic)
  return visibilityConditions.every((condition) =>
    evaluateVisibilityCondition(condition, context)
  );
}

/**
 * Generate inline styles from design component properties
 */
export function generateComponentStyles(component: {
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  shadow_blur?: number;
  shadow_spread?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  shadow_opacity?: number;
  shadow_color?: string;
  text_bold?: boolean;
  text_italic?: boolean;
  text_underline?: boolean;
  text_color?: string;
  font_size?: number;
  font_family?: string;
  line_height?: number;
  letter_spacing?: number;
  text_align?: string;
  vertical_align?: string;
  animation_type?: string;
  animation_duration?: number;
  animation_delay?: number;
  animation_timing_function?: string;
}): React.CSSProperties {
  const styles: React.CSSProperties = {
    position: 'absolute',
  };

  // Layout
  if (component.position_x !== undefined) styles.left = `${component.position_x}px`;
  if (component.position_y !== undefined) styles.top = `${component.position_y}px`;
  if (component.width !== undefined) styles.width = `${component.width}px`;
  if (component.height !== undefined) styles.height = `${component.height}px`;

  // Transform
  if (component.rotation || 0 > 0) {
    styles.transform = `rotate(${component.rotation}deg)`;
  }

  // Opacity
  if (component.opacity !== undefined) {
    styles.opacity = component.opacity;
  }

  // Shadow
  if (component.shadow_opacity && component.shadow_opacity > 0) {
    styles.boxShadow = buildShadowCSS(
      component.shadow_blur,
      component.shadow_spread,
      component.shadow_offset_x,
      component.shadow_offset_y,
      component.shadow_opacity,
      component.shadow_color
    );
  }

  // Text styles
  if (component.text_bold) styles.fontWeight = 'bold';
  if (component.text_italic) styles.fontStyle = 'italic';
  if (component.text_underline) styles.textDecoration = 'underline';
  if (component.text_color) styles.color = component.text_color;
  if (component.font_size) styles.fontSize = `${component.font_size}px`;
  if (component.font_family) styles.fontFamily = component.font_family;
  if (component.line_height) styles.lineHeight = component.line_height;
  if (component.letter_spacing) styles.letterSpacing = `${component.letter_spacing}px`;
  if (component.text_align) styles.textAlign = component.text_align as any;
  if (component.vertical_align) {
    styles.display = 'flex';
    styles.alignItems = component.vertical_align;
  }

  // Animation
  if (component.animation_type && component.animation_type !== 'none') {
    styles.animation = buildAnimationCSS(
      component.animation_type,
      component.animation_duration,
      component.animation_delay,
      component.animation_timing_function
    ) as any;
  }

  return styles;
}
