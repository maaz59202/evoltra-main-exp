import { useState, useCallback, useEffect, useRef } from 'react';

import {
  DevicePreview,
  Funnel,
  Widget,
  WidgetProps,
  WidgetType,
  getDefaultPropsForType,
} from '@/types/funnel';
import { useFunnels } from './useFunnels';

const generateId = () => crypto.randomUUID();
const AUTO_SAVE_INTERVAL = 30000;

export type FunnelTemplatePreset = 'hero' | 'leadCapture' | 'cta' | 'thankYou';

const createTemplateWidgets = (template: FunnelTemplatePreset, startingOrder: number): Widget[] => {
  const sectionId = generateId();
  const sectionBase = {
    id: sectionId,
    type: 'section' as const,
    order: startingOrder,
    parentId: null,
  };

  switch (template) {
    case 'hero': {
      const headingId = generateId();
      const textId = generateId();
      const buttonId = generateId();
      return [
        {
          ...sectionBase,
          props: {
            backgroundType: 'gradient',
            backgroundColor: '#111827',
            gradientFrom: '#0f172a',
            gradientTo: '#1d4ed8',
            paddingY: 88,
          },
        },
        {
          id: headingId,
          type: 'heading',
          order: 0,
          parentId: sectionId,
          props: {
            content: 'Turn attention into action',
            level: 'h1',
            fontSize: 52,
            color: '#ffffff',
            alignment: 'center',
          },
        },
        {
          id: textId,
          type: 'text',
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Build a clear offer, capture leads, and guide visitors toward one strong next step.',
            fontSize: 18,
            fontWeight: 'normal',
            color: '#dbeafe',
            alignment: 'center',
          },
        },
        {
          id: buttonId,
          type: 'button',
          order: 2,
          parentId: sectionId,
          props: {
            text: 'Get Started',
            url: '#',
            variant: 'primary',
            backgroundColor: '#ffffff',
            textColor: '#0f172a',
          },
        },
      ];
    }

    case 'leadCapture': {
      const headingId = generateId();
      const textId = generateId();
      const formId = generateId();
      const nameFieldId = generateId();
      const emailFieldId = generateId();
      return [
        {
          ...sectionBase,
          props: {
            backgroundType: 'solid',
            backgroundColor: '#f8fafc',
            paddingY: 72,
          },
        },
        {
          id: headingId,
          type: 'heading',
          order: 0,
          parentId: sectionId,
          props: {
            content: 'Get the next update first',
            level: 'h2',
            fontSize: 40,
            color: '#0f172a',
            alignment: 'center',
          },
        },
        {
          id: textId,
          type: 'text',
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Collect names and emails in one simple block without sending people through a maze.',
            fontSize: 17,
            fontWeight: 'normal',
            color: '#475569',
            alignment: 'center',
          },
        },
        {
          id: formId,
          type: 'form',
          order: 2,
          parentId: sectionId,
          props: {
            submitText: 'Join the list',
            successMessage: 'Thanks - your details are in.',
            fields: [nameFieldId, emailFieldId],
          },
        },
        {
          id: nameFieldId,
          type: 'input',
          order: 0,
          parentId: formId,
          props: {
            inputType: 'text',
            placeholder: 'Jane Smith',
            required: true,
            label: 'Full name',
          },
        },
        {
          id: emailFieldId,
          type: 'input',
          order: 1,
          parentId: formId,
          props: {
            inputType: 'email',
            placeholder: 'jane@company.com',
            required: true,
            label: 'Email address',
          },
        },
      ];
    }

    case 'cta': {
      const containerId = generateId();
      const headingId = generateId();
      const textId = generateId();
      const buttonId = generateId();
      return [
        {
          id: containerId,
          type: 'container',
          order: startingOrder,
          parentId: null,
          props: {
            padding: 32,
            margin: 0,
            backgroundColor: '#111827',
            borderRadius: 24,
          },
        },
        {
          id: headingId,
          type: 'heading',
          order: 0,
          parentId: containerId,
          props: {
            content: 'Ready to move?',
            level: 'h2',
            fontSize: 34,
            color: '#ffffff',
            alignment: 'left',
          },
        },
        {
          id: textId,
          type: 'text',
          order: 1,
          parentId: containerId,
          props: {
            content: 'Use one sharp CTA block to close the page without adding more clutter.',
            fontSize: 16,
            fontWeight: 'normal',
            color: '#cbd5e1',
            alignment: 'left',
          },
        },
        {
          id: buttonId,
          type: 'button',
          order: 2,
          parentId: containerId,
          props: {
            text: 'Book a call',
            url: '#',
            variant: 'primary',
            backgroundColor: '#8b5cf6',
            textColor: '#ffffff',
          },
        },
      ];
    }

    case 'thankYou': {
      const headingId = generateId();
      const textId = generateId();
      return [
        {
          ...sectionBase,
          props: {
            backgroundType: 'solid',
            backgroundColor: '#ecfeff',
            paddingY: 72,
          },
        },
        {
          id: headingId,
          type: 'heading',
          order: 0,
          parentId: sectionId,
          props: {
            content: 'You are all set',
            level: 'h2',
            fontSize: 38,
            color: '#0f172a',
            alignment: 'center',
          },
        },
        {
          id: textId,
          type: 'text',
          order: 1,
          parentId: sectionId,
          props: {
            content: 'We received your details and will be in touch shortly. You can customize this message for your post-submit state.',
            fontSize: 17,
            fontWeight: 'normal',
            color: '#155e75',
            alignment: 'center',
          },
        },
      ];
    }
  }
};

export const useFunnelEditor = (funnelId?: string) => {
  const { useFunnel, updateFunnel, createFunnel } = useFunnels();
  const { data: loadedFunnel, isLoading: isLoadingFunnel } = useFunnel(funnelId);

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedFunnel && hasLoadedRef.current !== loadedFunnel.id) {
      setFunnel(loadedFunnel);
      setIsDirty(false);
      setLastSavedAt(loadedFunnel.updatedAt);
      hasLoadedRef.current = loadedFunnel.id;
    }
  }, [loadedFunnel]);

  useEffect(() => {
    if (funnelId !== hasLoadedRef.current) {
      setFunnel(null);
      setSelectedWidgetId(null);
      setIsDirty(false);
    }
  }, [funnelId]);

  const createNewFunnel = useCallback(async (name: string, organizationId: string) => {
    const newFunnel = await createFunnel({ name, organizationId });
    setFunnel(newFunnel);
    setIsDirty(false);
    setLastSavedAt(newFunnel.updatedAt);
    return newFunnel;
  }, [createFunnel]);

  const addWidget = useCallback((type: WidgetType, parentId: string | null = null) => {
    if (!funnel) return null;

    const siblingWidgets = funnel.widgets.filter((widget) => widget.parentId === parentId);
    const maxOrder = siblingWidgets.length > 0 ? Math.max(...siblingWidgets.map((widget) => widget.order)) : -1;

    const newWidget: Widget = {
      id: generateId(),
      type,
      order: maxOrder + 1,
      parentId,
      props: getDefaultPropsForType(type),
    };

    setFunnel((prev) => {
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

  const insertTemplate = useCallback((template: FunnelTemplatePreset) => {
    if (!funnel) return [];

    const rootWidgets = funnel.widgets.filter((widget) => widget.parentId === null);
    const maxOrder = rootWidgets.length > 0 ? Math.max(...rootWidgets.map((widget) => widget.order)) : -1;
    const newWidgets = createTemplateWidgets(template, maxOrder + 1);

    setFunnel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: [...prev.widgets, ...newWidgets],
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedWidgetId(newWidgets[0]?.id ?? null);
    setIsDirty(true);
    return newWidgets;
  }, [funnel]);

  const updateWidgetProps = useCallback((widgetId: string, props: Partial<WidgetProps>) => {
    setFunnel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === widgetId
            ? { ...widget, props: { ...widget.props, ...props } as WidgetProps }
            : widget,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const deleteWidget = useCallback((widgetId: string) => {
    setFunnel((prev) => {
      if (!prev) return prev;

      const childIds = prev.widgets.filter((widget) => widget.parentId === widgetId).map((widget) => widget.id);
      const idsToDelete = [widgetId, ...childIds];

      return {
        ...prev,
        widgets: prev.widgets.filter((widget) => !idsToDelete.includes(widget.id)),
        updatedAt: new Date().toISOString(),
      };
    });

    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
    setIsDirty(true);
  }, [selectedWidgetId]);

  const duplicateWidget = useCallback((widgetId: string) => {
    if (!funnel) return null;

    const widget = funnel.widgets.find((item) => item.id === widgetId);
    if (!widget) return null;

    const siblingWidgets = funnel.widgets.filter((item) => item.parentId === widget.parentId);
    const maxOrder = Math.max(...siblingWidgets.map((item) => item.order));

    const newWidget: Widget = {
      ...widget,
      id: generateId(),
      order: maxOrder + 1,
    };

    setFunnel((prev) => {
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

  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setFunnel((prev) => {
      if (!prev) return prev;

      const activeWidget = prev.widgets.find((widget) => widget.id === activeId);
      const overWidget = prev.widgets.find((widget) => widget.id === overId);

      if (!activeWidget || !overWidget) return prev;

      const newWidgets = prev.widgets.map((widget) => {
        if (widget.id === activeId) return { ...widget, order: overWidget.order };
        if (widget.id === overId) return { ...widget, order: activeWidget.order };
        return widget;
      });

      return {
        ...prev,
        widgets: newWidgets,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const moveToContainer = useCallback((widgetId: string, containerId: string | null) => {
    setFunnel((prev) => {
      if (!prev) return prev;

      const containerWidgets = prev.widgets.filter((widget) => widget.parentId === containerId);
      const maxOrder = containerWidgets.length > 0 ? Math.max(...containerWidgets.map((widget) => widget.order)) : -1;

      return {
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === widgetId
            ? { ...widget, parentId: containerId, order: maxOrder + 1 }
            : widget,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const getChildWidgets = useCallback((parentId: string | null) => {
    if (!funnel) return [];
    return funnel.widgets
      .filter((widget) => widget.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }, [funnel]);

  const selectedWidget = funnel?.widgets.find((widget) => widget.id === selectedWidgetId) || null;

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
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      console.error('Error saving funnel:', error);
    } finally {
      setIsSaving(false);
    }
  }, [funnel, updateFunnel]);

  const updateFunnelName = useCallback((name: string) => {
    setFunnel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const togglePublish = useCallback(async () => {
    if (!funnel) return;

    const newStatus = funnel.status === 'draft' ? 'published' : 'draft';
    const publishedUrl = newStatus === 'published' ? `/f/${funnel.id}` : undefined;
    const updatedAt = new Date().toISOString();

    setFunnel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: newStatus,
        publishedUrl,
        updatedAt,
      };
    });

    setIsSaving(true);
    try {
      await updateFunnel({
        id: funnel.id,
        updates: {
          status: newStatus,
          publishedUrl,
        },
      });
      setIsDirty(false);
      setLastSavedAt(updatedAt);
    } catch (error) {
      console.error('Error updating funnel publish status:', error);
      setFunnel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: funnel.status,
          publishedUrl: funnel.publishedUrl,
          updatedAt: funnel.updatedAt,
        };
      });
    } finally {
      setIsSaving(false);
    }
  }, [funnel, updateFunnel]);

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
    lastSavedAt,
    isLoading: isLoadingFunnel,
    setSelectedWidgetId,
    setDevicePreview,
    createNewFunnel,
    addWidget,
    insertTemplate,
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
