import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, DragEndEvent, pointerWithin } from '@dnd-kit/core';
import { useFunnelEditor } from '@/hooks/useFunnelEditor';
import { WidgetLibrary } from '@/components/funnel/WidgetLibrary';
import { FunnelCanvas } from '@/components/funnel/FunnelCanvas';
import { PropertiesPanel } from '@/components/funnel/PropertiesPanel';
import { FunnelEditorToolbar } from '@/components/funnel/FunnelEditorToolbar';
import { WidgetType } from '@/types/funnel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FunnelCanvas as PreviewCanvas } from '@/components/funnel/FunnelCanvas';
import { Loader2 } from 'lucide-react';

const FunnelBuilder = () => {
  const { funnelId } = useParams();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const {
    funnel,
    selectedWidget,
    selectedWidgetId,
    devicePreview,
    isDirty,
    isSaving,
    isLoading,
    setSelectedWidgetId,
    setDevicePreview,
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
  } = useFunnelEditor(funnelId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // If dragging from library (new widget)
    if (activeData?.isNew) {
      const widgetType = activeData.type as WidgetType;
      const containerId = overData?.containerId || null;
      addWidget(widgetType, containerId);
    } else {
      // Reordering existing widgets
      const activeWidget = activeData?.widget;
      if (activeWidget) {
        // Check if dropping into a container
        if (overData?.containerId !== undefined) {
          moveToContainer(activeWidget.id, overData.containerId);
        } else if (over.id !== active.id && typeof over.id === 'string') {
          reorderWidgets(active.id as string, over.id);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading funnel...</p>
        </div>
      </div>
    );
  }

  if (!funnel && !isLoading) {
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

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-muted/30">
        <FunnelEditorToolbar
          funnel={funnel}
          devicePreview={devicePreview}
          isDirty={isDirty}
          isSaving={isSaving}
          onDeviceChange={setDevicePreview}
          onNameChange={updateFunnelName}
          onSave={saveFunnel}
          onPreview={() => setShowPreview(true)}
          onTogglePublish={togglePublish}
        />

        <div className="flex-1 flex overflow-hidden">
          <WidgetLibrary />
          
          <FunnelCanvas
            widgets={funnel?.widgets || []}
            selectedWidgetId={selectedWidgetId}
            devicePreview={devicePreview}
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

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {funnel?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-background">
            <FunnelCanvas
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
