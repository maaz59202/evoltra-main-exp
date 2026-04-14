import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Monitor,
  Save,
  Smartphone,
  Tablet,
  Wand2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DevicePreview, Funnel } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface FunnelEditorToolbarProps {
  funnel: Funnel | null;
  devicePreview: DevicePreview;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
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
  lastSavedAt,
  onDeviceChange,
  onNameChange,
  onSave,
  onPreview,
  onTogglePublish,
}: FunnelEditorToolbarProps) => {
  const navigate = useNavigate();

  const saveLabel = isSaving
    ? 'Saving...'
    : isDirty
      ? 'Unsaved changes'
      : lastSavedAt
        ? `Saved ${formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}`
        : 'All changes saved';

  return (
    <div className="border-b border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/funnels')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              Funnel builder
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={funnel?.name || ''}
                onChange={(e) => onNameChange(e.target.value)}
                className="h-10 w-[260px] rounded-xl border-border/70 bg-background/60 text-base font-semibold"
                placeholder="Funnel name..."
              />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{saveLabel}</span>
                  </>
                ) : isDirty ? (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    <span>{saveLabel}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>{saveLabel}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 rounded-xl', devicePreview === 'desktop' && 'bg-background shadow-sm')}
            onClick={() => onDeviceChange('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 rounded-xl', devicePreview === 'tablet' && 'bg-background shadow-sm')}
            onClick={() => onDeviceChange('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9 rounded-xl', devicePreview === 'mobile' && 'bg-background shadow-sm')}
            onClick={() => onDeviceChange('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {funnel?.status === 'published' && funnel?.publishedUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(funnel.publishedUrl, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View live
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onSave} disabled={!isDirty || isSaving} className="rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>

          <Button variant="outline" size="sm" onClick={onPreview} className="rounded-xl">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          <Button
            variant={funnel?.status === 'published' ? 'destructive' : 'default'}
            size="sm"
            onClick={onTogglePublish}
            className={cn('rounded-xl', funnel?.status !== 'published' && 'gradient-primary text-white')}
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
    </div>
  );
};
