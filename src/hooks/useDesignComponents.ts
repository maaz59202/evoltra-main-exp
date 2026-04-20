import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DesignComponent {
  id?: string;
  funnel_id: string;
  organization_id: string;
  component_type: string;
  component_name: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  shadow_blur?: number;
  shadow_spread?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  shadow_opacity?: number;
  shadow_color?: string;
  opacity?: number;
  text_bold?: boolean;
  text_italic?: boolean;
  text_underline?: boolean;
  text_color?: string;
  font_size?: number;
  font_family?: string;
  text_align?: string;
  animation_type?: string;
  animation_duration?: number;
  animation_delay?: number;
  animation_timing_function?: string;
  visibility_conditions?: Record<string, any>[];
}

interface UseDesignComponentsReturn {
  loading: boolean;
  components: DesignComponent[];
  saveComponent: (component: DesignComponent) => Promise<void>;
  batchUpdateComponents: (components: DesignComponent[]) => Promise<void>;
  deleteComponent: (componentId: string) => Promise<void>;
  fetchComponents: (funnelId: string) => Promise<void>;
  error: string | null;
}

export function useDesignComponents(): UseDesignComponentsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState<DesignComponent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': user?.id ? `Bearer ${user.id}` : '',
    };
  }, [user?.id]);

  const fetchComponents = useCallback(async (funnelId: string) => {
    if (!funnelId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/functions/v1/design-components?funnel_id=${funnelId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch components: ${response.statusText}`);
      }

      const { data } = await response.json();
      setComponents(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch components';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, toast]);

  const saveComponent = useCallback(
    async (component: DesignComponent) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/functions/v1/design-components', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(component),
        });

        if (!response.ok) {
          throw new Error(`Failed to save component: ${response.statusText}`);
        }

        const { data } = await response.json();
        
        if (component.id) {
          // Update existing in local state
          setComponents((prev) =>
            prev.map((c) => (c.id === component.id ? data[0] : c))
          );
        } else {
          // Add new component
          setComponents((prev) => [...prev, data[0]]);
        }

        toast({
          title: 'Success',
          description: 'Component saved successfully',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save component';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, toast]
  );

  const batchUpdateComponents = useCallback(
    async (componentsToUpdate: DesignComponent[]) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/functions/v1/design-components', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            funnel_id: componentsToUpdate[0]?.funnel_id,
            components: componentsToUpdate,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update components: ${response.statusText}`);
        }

        // Refresh components from server
        if (componentsToUpdate[0]?.funnel_id) {
          await fetchComponents(componentsToUpdate[0].funnel_id);
        }

        toast({
          title: 'Success',
          description: 'Components updated successfully',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update components';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, fetchComponents, toast]
  );

  const deleteComponent = useCallback(
    async (componentId: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/functions/v1/design-components?component_id=${componentId}`,
          {
            method: 'DELETE',
            headers: getAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to delete component: ${response.statusText}`);
        }

        setComponents((prev) => prev.filter((c) => c.id !== componentId));

        toast({
          title: 'Success',
          description: 'Component deleted successfully',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete component';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders, toast]
  );

  return {
    loading,
    components,
    saveComponent,
    batchUpdateComponents,
    deleteComponent,
    fetchComponents,
    error,
  };
}
