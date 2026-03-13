import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Funnel, 
  Widget, 
  WidgetType, 
  WidgetProps,
  DevicePreview,
  getDefaultPropsForType 
} from '@/types/funnel';
import { useFunnels } from './useFunnels';

const generateId = () => crypto.randomUUID();

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const useFunnelEditor = (funnelId?: string) => {
  const { useFunnel, updateFunnel, createFunnel } = useFunnels();
  const { data: loadedFunnel, isLoading: isLoadingFunnel } = useFunnel(funnelId);
  
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef<string | null>(null);

  // Sync loaded funnel to local state - only once per funnelId
  useEffect(() => {
    if (loadedFunnel && hasLoadedRef.current !== loadedFunnel.id) {
      setFunnel(loadedFunnel);
      setIsDirty(false);
      hasLoadedRef.current = loadedFunnel.id;
    }
  }, [loadedFunnel]);

  // Reset state when funnelId changes
  useEffect(() => {
    if (funnelId !== hasLoadedRef.current) {
      setFunnel(null);
      setSelectedWidgetId(null);
      setIsDirty(false);
    }
  }, [funnelId]);

  // Create a new funnel
  const createNewFunnel = useCallback(async (name: string, organizationId: string) => {
    const newFunnel = await createFunnel({ name, organizationId });
    setFunnel(newFunnel);
    setIsDirty(false);
    return newFunnel;
  }, [createFunnel]);

  // Add a widget to the canvas
  const addWidget = useCallback((type: WidgetType, parentId: string | null = null) => {
    if (!funnel) return null;

    const siblingWidgets = funnel.widgets.filter(w => w.parentId === parentId);
    const maxOrder = siblingWidgets.length > 0 
      ? Math.max(...siblingWidgets.map(w => w.order)) 
      : -1;

    const newWidget: Widget = {
      id: generateId(),
      type,
      order: maxOrder + 1,
      parentId,
      props: getDefaultPropsForType(type),
    };

    setFunnel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: [...prev.widgets, newWidget],
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
    setSelectedWidgetId(newWidget.id);
    return newWidget;
  }, [funnel]);

  // Update widget properties
  const updateWidgetProps = useCallback((widgetId: string, props: Partial<WidgetProps>) => {
    setFunnel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map(w => 
          w.id === widgetId 
            ? { ...w, props: { ...w.props, ...props } as WidgetProps }
            : w
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  // Delete a widget
  const deleteWidget = useCallback((widgetId: string) => {
    setFunnel(prev => {
      if (!prev) return prev;
      
      // Also delete children if it's a container/section
      const childIds = prev.widgets
        .filter(w => w.parentId === widgetId)
        .map(w => w.id);
      
      const idsToDelete = [widgetId, ...childIds];
      
      return {
        ...prev,
        widgets: prev.widgets.filter(w => !idsToDelete.includes(w.id)),
        updatedAt: new Date().toISOString(),
      };
    });
    
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
    setIsDirty(true);
  }, [selectedWidgetId]);

  // Duplicate a widget
  const duplicateWidget = useCallback((widgetId: string) => {
    if (!funnel) return null;
    
    const widget = funnel.widgets.find(w => w.id === widgetId);
    if (!widget) return null;

    const siblingWidgets = funnel.widgets.filter(w => w.parentId === widget.parentId);
    const maxOrder = Math.max(...siblingWidgets.map(w => w.order));

    const newWidget: Widget = {
      ...widget,
      id: generateId(),
      order: maxOrder + 1,
    };

    setFunnel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: [...prev.widgets, newWidget],
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
    setSelectedWidgetId(newWidget.id);
    return newWidget;
  }, [funnel]);

  // Reorder widgets
  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setFunnel(prev => {
      if (!prev) return prev;
      
      const activeWidget = prev.widgets.find(w => w.id === activeId);
      const overWidget = prev.widgets.find(w => w.id === overId);
      
      if (!activeWidget || !overWidget) return prev;
      
      // Simple swap of order values
      const newWidgets = prev.widgets.map(w => {
        if (w.id === activeId) return { ...w, order: overWidget.order };
        if (w.id === overId) return { ...w, order: activeWidget.order };
        return w;
      });

      return {
        ...prev,
        widgets: newWidgets,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  // Move widget to a container
  const moveToContainer = useCallback((widgetId: string, containerId: string | null) => {
    setFunnel(prev => {
      if (!prev) return prev;
      
      const containerWidgets = prev.widgets.filter(w => w.parentId === containerId);
      const maxOrder = containerWidgets.length > 0 
        ? Math.max(...containerWidgets.map(w => w.order)) 
        : -1;

      return {
        ...prev,
        widgets: prev.widgets.map(w => 
          w.id === widgetId 
            ? { ...w, parentId: containerId, order: maxOrder + 1 }
            : w
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  // Get widgets for a specific parent (for rendering)
  const getChildWidgets = useCallback((parentId: string | null) => {
    if (!funnel) return [];
    return funnel.widgets
      .filter(w => w.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }, [funnel]);

  // Get selected widget
  const selectedWidget = funnel?.widgets.find(w => w.id === selectedWidgetId) || null;

  // Save funnel to database
  const saveFunnel = useCallback(async () => {
    if (!funnel) return;
    
    setIsSaving(true);
    try {
      await updateFunnel({
        id: funnel.id,
        updates: {
          name: funnel.name,
          status: funnel.status,
          widgets: funnel.widgets,
          publishedUrl: funnel.publishedUrl,
        },
      });
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving funnel:', error);
    } finally {
      setIsSaving(false);
    }
  }, [funnel, updateFunnel]);

  // Update funnel name
  const updateFunnelName = useCallback((name: string) => {
    setFunnel(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        name,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  // Toggle publish status
  const togglePublish = useCallback(() => {
    setFunnel(prev => {
      if (!prev) return prev;
      const newStatus = prev.status === 'draft' ? 'published' : 'draft';
      return {
        ...prev,
        status: newStatus,
        publishedUrl: newStatus === 'published' ? `/f/${prev.id}` : undefined,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isDirty && funnel) {
      autoSaveRef.current = setTimeout(() => {
        saveFunnel();
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [isDirty, funnel, saveFunnel]);

  return {
    funnel,
    selectedWidget,
    selectedWidgetId,
    devicePreview,
    isDirty,
    isSaving,
    isLoading: isLoadingFunnel,
    setSelectedWidgetId,
    setDevicePreview,
    createNewFunnel,
    addWidget,
    updateWidgetProps,
    deleteWidget,
    duplicateWidget,
    reorderWidgets,
    moveToContainer,
    getChildWidgets,
    saveFunnel,
    updateFunnelName,
    togglePublish,
  };
};
