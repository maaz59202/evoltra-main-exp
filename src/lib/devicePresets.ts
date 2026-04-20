/**
 * Device Display Presets
 * Industry-standard responsive dimensions for modern editor
 * Inspired by Figma, Canva, and ConvertFlow
 */

export type DevicePreset = 
  | '4k'           // 3840px - Ultra-wide 4K monitor
  | 'laptop-l'     // 1920px - Large laptop/desktop
  | 'laptop'       // 1280px - Standard laptop
  | 'tablet'       // 768px - iPad / tablet
  | 'mobile-l'     // 480px - Large mobile (iPhone 11/12 Pro)
  | 'mobile-m'     // 375px - Medium mobile (iPhone SE/12/13)
  | 'mobile-s';    // 320px - Small mobile (iPhone SE 1st gen)

export interface DeviceDimensions {
  width: number;
  height: number;
  label: string;
  icon: string; // Lucide icon name
  category: 'desktop' | 'tablet' | 'mobile';
}

/**
 * Device dimension specifications with aspect ratio recommendations
 */
export const DEVICE_DIMENSIONS: Record<DevicePreset, DeviceDimensions> = {
  '4k': {
    width: 3840,
    height: 2160,
    label: '4K Monitor',
    icon: 'monitor',
    category: 'desktop',
  },
  'laptop-l': {
    width: 1920,
    height: 1080,
    label: 'Laptop L',
    icon: 'laptop',
    category: 'desktop',
  },
  'laptop': {
    width: 1280,
    height: 800,
    label: 'Laptop',
    icon: 'laptop',
    category: 'desktop',
  },
  'tablet': {
    width: 768,
    height: 1024,
    label: 'Tablet',
    icon: 'tablet',
    category: 'tablet',
  },
  'mobile-l': {
    width: 480,
    height: 820,
    label: 'Mobile L',
    icon: 'smartphone',
    category: 'mobile',
  },
  'mobile-m': {
    width: 375,
    height: 812,
    label: 'Mobile M',
    icon: 'smartphone',
    category: 'mobile',
  },
  'mobile-s': {
    width: 320,
    height: 568,
    label: 'Mobile S',
    icon: 'smartphone',
    category: 'mobile',
  },
};

/**
 * Get CSS width string for responsive canvas
 * Includes padding/gutter in editor UI
 */
export const getCanvasWidth = (preset: DevicePreset): string => {
  const dims = DEVICE_DIMENSIONS[preset];
  // Leave 16px gutter on each side for visual padding
  return `${dims.width}px`;
};

/**
 * Common zoom/scale levels for editor (as percentages)
 */
export const ZOOM_LEVELS = [25, 33, 50, 66, 75, 80, 90, 100, 110, 125, 150, 200] as const;

/**
 * Default zoom level for each preset (auto-fit to viewport)
 */
export const DEFAULT_ZOOM_BY_PRESET: Record<DevicePreset, number> = {
  '4k': 25,
  'laptop-l': 50,
  'laptop': 75,
  'tablet': 90,
  'mobile-l': 100,
  'mobile-m': 100,
  'mobile-s': 100,
};
