/**
 * Visibility condition utilities for widgets
 * Determines if a widget should be visible based on visibility rules and query parameters
 */

import { VisibilityCondition } from '@/types/funnel';

/**
 * Get query parameters from URL as an object
 */
export const getQueryParams = (): Record<string, string | string[]> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const params: Record<string, string | string[]> = {};
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.forEach((value, key) => {
    if (params[key]) {
      // Convert to array if multiple values
      const existing = params[key];
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing as string, value];
    } else {
      params[key] = value;
    }
  });

  return params;
};

/**
 * Check if a widget should be visible based on visibility condition
 */
export const isWidgetVisible = (condition?: VisibilityCondition): boolean => {
  // Default: always visible
  if (!condition || condition.type === 'always' || !condition.type) {
    return true;
  }

  // Hidden
  if (condition.type === 'hidden') {
    return false;
  }

  // Query parameter based visibility
  if (condition.type === 'queryParam') {
    const { paramName, paramValue } = condition;

    if (!paramName) {
      return true; // No parameter name, show by default
    }

    const queryParams = getQueryParams();
    const actualValue = queryParams[paramName];

    if (!actualValue) {
      return false; // Parameter not present
    }

    // If paramValue is specified, check if it matches
    if (paramValue) {
      if (Array.isArray(actualValue)) {
        return actualValue.includes(paramValue);
      } else {
        return actualValue === paramValue;
      }
    }

    // If paramValue is not specified, show if parameter exists
    return true;
  }

  return true;
};

/**
 * Get visibility condition from widget props
 */
export const getWidgetVisibility = (visibility?: VisibilityCondition): boolean => {
  return isWidgetVisible(visibility);
};
