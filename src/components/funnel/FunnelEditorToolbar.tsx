import { DevicePreview, Funnel } from '@/types/funnel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Eye, 
  Save, 
  Globe, 
  X,
  Check,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface FunnelEditorToolbarProps {
  funnel: Funnel | null;
  devicePreview: DevicePreview;
  isDirty: boolean;
  isSaving: boolean;
  onDeviceChange: (device: DevicePreview) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPreview: () => void;
  onTogglePublish: () => void;
}

export const FunnelEditorToolbar = ({
  funnel,
  devicePreview,
  isDirty,
  isSaving,
  onDeviceChange,
  onNameChange,
  onSave,
  onPreview,
  onTogglePublish,
}: FunnelEditorToolbarProps) => {
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-background border-b border-border flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/funnels')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        
        <Input
          value={funnel?.name || ''}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-48 h-8 text-sm font-medium"
          placeholder="Funnel name..."
        />

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : isDirty ? (
            <span className="text-destructive">Unsaved changes</span>
          ) : (
            <>
              <Check className="w-3 h-3 text-primary" />
              <span>Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Center section - Device preview */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', devicePreview === 'desktop' && 'bg-background shadow-sm')}
          onClick={() => onDeviceChange('desktop')}
        >
          <Monitor className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', devicePreview === 'tablet' && 'bg-background shadow-sm')}
          onClick={() => onDeviceChange('tablet')}
        >
          <Tablet className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', devicePreview === 'mobile' && 'bg-background shadow-sm')}
          onClick={() => onDeviceChange('mobile')}
        >
          <Smartphone className="w-4 h-4" />
        </Button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>

        <Button
          variant={funnel?.status === 'published' ? 'destructive' : 'default'}
          size="sm"
          onClick={onTogglePublish}
        >
          {funnel?.status === 'published' ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Unpublish
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 mr-2" />
              Publish
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
