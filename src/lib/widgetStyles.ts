/**
 * Widget styling utilities for common visual effects
 */

import { ShadowSize } from '@/types/funnel';

export const getShadowStyle = (shadowSize?: ShadowSize): string => {
  switch (shadowSize) {
    case 'sm':
      return '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    case 'md':
      return '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    case 'lg':
      return '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    case 'xl':
      return '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    case 'none':
    default:
      return 'none';
  }
};

export const getOpacityStyle = (opacity?: number): number => {
  return opacity !== undefined ? opacity / 100 : 1;
};
