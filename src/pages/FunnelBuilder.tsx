import { Spinner } from '@/components/ui/spinner';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core';

import { WidgetLibrary } from '@/components/funnel/WidgetLibrary';
import { FunnelCanvas } from '@/components/funnel/FunnelCanvas';
import { PropertiesPanel } from '@/components/funnel/PropertiesPanel';
import { FunnelEditorToolbar } from '@/components/funnel/FunnelEditorToolbar';
import { FunnelCanvas as PreviewCanvas } from '@/components/funnel/FunnelCanvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFunnelEditor } from '@/hooks/useFunnelEditor';
import { useOrganizationPermissions } from '@/hooks/useOrganizationPermissions';
import { WidgetType } from '@/types/funnel';

/**
 * FunnelBuilder Page
 * 
 * Main editor for creating and editing funnels with drag-and-drop interface.
 * Features:
 * - Drag-and-drop widget library to canvas
 * - Real-time property editing via right panel
 * - Device preview (desktop, tablet, mobile)
 * - Auto-save with 30-second interval
 * - Template quick-insert options
 * - Permission-based access control
 * 
 * Layout:
 * 1. Toolbar: Funnel name, save status, device switcher, publish button
 * 2. Left sidebar: Widget library (draggable items and templates)
 * 3. Center canvas: Drag-drop area with preview of funnel blocks
 * 4. Right panel: Property editor for selected widget
 */
const FunnelBuilder = () => {
  const { funnelId } = useParams();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);

  const {
    funnel,
    selectedWidget,
    selectedWidgetId,
    devicePreview,
    isDirty,
    isSaving,
    lastSavedAt,
    isLoading,
    setSelectedWidgetId,
    setDevicePreview,
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
  } = useFunnelEditor(funnelId);
  const { permissions, loading: permissionsLoading } = useOrganizationPermissions(funnel?.workspaceId);
  const canManageFunnels = permissions.manageFunnels;
  const canViewFunnels = permissions.viewFunnels;
  const isReadOnly = !!funnel && canViewFunnels && !canManageFunnels;
  const isBuilderLoading = isLoading || (!!funnel?.workspaceId && permissionsLoading);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!canManageFunnels) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveFunnel();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [canManageFunnels, saveFunnel]);

  useEffect(() => {
    if (!isBuilderLoading && funnel && !canManageFunnels && !canViewFunnels) {
      navigate('/funnels', { replace: true });
    }
  }, [canManageFunnels, canViewFunnels, funnel, isBuilderLoading, navigate]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canManageFunnels) return;
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.isNew) {
      const widgetType = activeData.type as WidgetType;
      const containerId = overData?.containerId || null;
      addWidget(widgetType, containerId);
    } else {
      const activeWidget = activeData?.widget;
      if (activeWidget) {
        if (overData?.containerId !== undefined) {
          moveToContainer(activeWidget.id, overData.containerId);
        } else if (over.id !== active.id && typeof over.id === 'string') {
          reorderWidgets(active.id as string, over.id);
        }
      }
    }
  };

  if (isBuilderLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading funnel...</p>
        </div>
      </div>
    );
  }

  if (!funnel && !isBuilderLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Funnel not found</p>
          <button
            onClick={() => navigate('/funnels')}
            className="text-primary hover:underline"
          >
            Go back to funnels
          </button>
        </div>
      </div>
    );
  }

  if (isReadOnly) {
    return (
      <div className="h-screen flex flex-col bg-muted/30">
        <div className="border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Funnel preview
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{funnel?.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You can review this funnel, but only workspace owners and admins can edit it.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/funnels')}
                className="rounded-xl border border-border/70 bg-background px-4 py-2 text-sm hover:bg-accent"
              >
                Back to funnels
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Open preview
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <PreviewCanvas
            widgets={funnel?.widgets || []}
            selectedWidgetId={null}
            devicePreview={devicePreview}
            isPreview={true}
            getChildWidgets={getChildWidgets}
            onSelectWidget={() => {}}
            onDeleteWidget={() => {}}
            onDuplicateWidget={() => {}}
          />
        </div>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-6xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>Preview: {funnel?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto bg-background">
              <PreviewCanvas
                widgets={funnel?.widgets || []}
                selectedWidgetId={null}
                devicePreview={devicePreview}
                isPreview={true}
                getChildWidgets={getChildWidgets}
                onSelectWidget={() => {}}
                onDeleteWidget={() => {}}
                onDuplicateWidget={() => {}}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-muted/30">
        <FunnelEditorToolbar
          funnel={funnel}
          devicePreview={devicePreview}
          isDirty={isDirty}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          onDeviceChange={setDevicePreview}
          onNameChange={updateFunnelName}
          onSave={saveFunnel}
          onPreview={() => setShowPreview(true)}
          onTogglePublish={togglePublish}
        />

        <div className="flex flex-1 overflow-hidden">
          <WidgetLibrary
            onAddWidget={(type) => addWidget(type, null)}
            onInsertTemplate={insertTemplate}
            isCollapsed={isLibraryCollapsed}
            onToggleCollapse={() => setIsLibraryCollapsed((current) => !current)}
          />

          <FunnelCanvas
            widgets={funnel?.widgets || []}
            selectedWidgetId={selectedWidgetId}
            devicePreview={devicePreview}
            onQuickAdd={() => addWidget('section', null)}
            onQuickTemplate={() => insertTemplate('hero')}
            getChildWidgets={getChildWidgets}
            onSelectWidget={setSelectedWidgetId}
            onDeleteWidget={deleteWidget}
            onDuplicateWidget={duplicateWidget}
          />

          <PropertiesPanel
            widget={selectedWidget}
            onUpdateProps={updateWidgetProps}
          />
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {funnel?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background">
            <PreviewCanvas
              widgets={funnel?.widgets || []}
              selectedWidgetId={null}
              devicePreview={devicePreview}
              isPreview={true}
              getChildWidgets={getChildWidgets}
              onSelectWidget={() => {}}
              onDeleteWidget={() => {}}
              onDuplicateWidget={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default FunnelBuilder;
