/**
 * Alignment and Distribution utilities for multi-selected widgets
 * Provides functions to align and distribute widgets horizontally and vertically
 */

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionType = 'horizontal' | 'vertical';

export interface WidgetBounds {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * Align selected widgets horizontally or vertically
 */
export function alignWidgets(bounds: WidgetBounds[], alignment: AlignmentType): Record<string, { margin?: number }> {
  const result: Record<string, { margin?: number }> = {};

  if (alignment === 'left') {
    const leftmost = Math.min(...bounds.map(b => b.left));
    bounds.forEach(b => {
      result[b.id] = { margin: leftmost - b.left };
    });
  } else if (alignment === 'center') {
    const centerX = (Math.min(...bounds.map(b => b.left)) + Math.max(...bounds.map(b => b.right))) / 2;
    bounds.forEach(b => {
      const offset = centerX - (b.left + b.width / 2);
      result[b.id] = { margin: offset };
    });
  } else if (alignment === 'right') {
    const rightmost = Math.max(...bounds.map(b => b.right));
    bounds.forEach(b => {
      result[b.id] = { margin: rightmost - b.right };
    });
  } else if (alignment === 'top') {
    const topmost = Math.min(...bounds.map(b => b.top));
    bounds.forEach(b => {
      result[b.id] = { margin: topmost - b.top };
    });
  } else if (alignment === 'middle') {
    const centerY = (Math.min(...bounds.map(b => b.top)) + Math.max(...bounds.map(b => b.bottom))) / 2;
    bounds.forEach(b => {
      const offset = centerY - (b.top + b.height / 2);
      result[b.id] = { margin: offset };
    });
  } else if (alignment === 'bottom') {
    const bottommost = Math.max(...bounds.map(b => b.bottom));
    bounds.forEach(b => {
      result[b.id] = { margin: bottommost - b.bottom };
    });
  }

  return result;
}

/**
 * Distribute widgets evenly with equal spacing
 */
export function distributeWidgets(
  bounds: WidgetBounds[],
  distribution: DistributionType
): Record<string, { margin?: number }> {
  const result: Record<string, { margin?: number }> = {};
  
  if (bounds.length < 3) {
    return result; // Need at least 3 widgets to distribute
  }

  if (distribution === 'horizontal') {
    const sorted = [...bounds].sort((a, b) => a.left - b.left);
    const leftmost = sorted[0];
    const rightmost = sorted[sorted.length - 1];
    
    const totalSpace = rightmost.right - leftmost.left;
    const totalWidthOfWidgets = sorted.reduce((sum, b) => sum + b.width, 0);
    const totalGapSpace = totalSpace - totalWidthOfWidgets;
    const gapBetweenWidgets = totalGapSpace / (sorted.length - 1);
    
    let accumulatedX = leftmost.left;
    sorted.forEach((b, index) => {
      if (index === 0) {
        result[b.id] = { margin: 0 };
      } else {
        accumulatedX += sorted[index - 1].width + gapBetweenWidgets;
        result[b.id] = { margin: accumulatedX - b.left };
      }
    });
  } else if (distribution === 'vertical') {
    const sorted = [...bounds].sort((a, b) => a.top - b.top);
    const topmost = sorted[0];
    const bottommost = sorted[sorted.length - 1];
    
    const totalSpace = bottommost.bottom - topmost.top;
    const totalHeightOfWidgets = sorted.reduce((sum, b) => sum + b.height, 0);
    const totalGapSpace = totalSpace - totalHeightOfWidgets;
    const gapBetweenWidgets = totalGapSpace / (sorted.length - 1);
    
    let accumulatedY = topmost.top;
    sorted.forEach((b, index) => {
      if (index === 0) {
        result[b.id] = { margin: 0 };
      } else {
        accumulatedY += sorted[index - 1].height + gapBetweenWidgets;
        result[b.id] = { margin: accumulatedY - b.top };
      }
    });
  }

  return result;
}
