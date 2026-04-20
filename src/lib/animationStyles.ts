/**
 * Animation utilities for widgets
 * Provides CSS-in-JS animation styles based on animation type
 */

import { AnimationType, AnimationProps } from '@/types/funnel';

/**
 * Get CSS keyframe animations
 */
const getKeyframes = (type: AnimationType): string => {
  switch (type) {
    case 'fadeIn':
      return `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;
    case 'slideInUp':
      return `
        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
    case 'slideInDown':
      return `
        @keyframes slideInDown {
          from { 
            opacity: 0;
            transform: translateY(-30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
    case 'slideInLeft':
      return `
        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
    case 'slideInRight':
      return `
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
    case 'scaleIn':
      return `
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `;
    case 'bounce':
      return `
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-10px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-5px); }
        }
      `;
    case 'pulse':
      return `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
    default:
      return '';
  }
};

/**
 * Get animation style object from AnimationProps
 */
export const getAnimationStyle = (animation?: AnimationProps): React.CSSProperties => {
  if (!animation || animation.type === 'none' || !animation.type) {
    return {};
  }

  const duration = animation.duration || 600; // default 600ms
  const delay = animation.delay || 0;

  return {
    animation: `${animation.type} ${duration}ms ease-in-out ${delay}ms forwards`,
  };
};

/**
 * Get animation name for CSS
 */
export const getAnimationName = (type?: AnimationType): string => {
  return type && type !== 'none' ? type : '';
};

/**
 * Get animation timing
 */
export const getAnimationTiming = (
  duration: number = 600,
  delay: number = 0
): string => {
  return `${duration}ms ease-in-out ${delay}ms`;
};

/**
 * Inject keyframes into document head
 */
export const injectAnimationKeyframes = (type: AnimationType) => {
  if (type === 'none' || !type) return;

  const styleId = `animation-keyframes-${type}`;
  if (document.getElementById(styleId)) {
    return; // Already injected
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = getKeyframes(type);
  document.head.appendChild(style);
};

/**
 * Ensure all animation keyframes are available
 */
export const ensureAnimationKeyframes = () => {
  const animations: AnimationType[] = ['fadeIn', 'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight', 'scaleIn', 'bounce', 'pulse'];
  animations.forEach(injectAnimationKeyframes);
};
