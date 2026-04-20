import { Monitor, Smartphone, Tablet } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { DevicePreview } from '@/types/funnel';
import { cn } from '@/lib/utils';

interface DeviceSwitcherProps {
  /** Current preview mode */
  devicePreview: DevicePreview;
  /** Callback when device is changed */
  onChange: (device: DevicePreview) => void;
  /** Optional CSS class for styling container */
  className?: string;
}

/**
 * DeviceSwitcher Component
 * 
 * Responsive device switcher for preview modes.
 * Shows three buttons: Desktop, Tablet, Mobile
 * Selected device is highlighted with background.
 * 
 * Returns:
 * - 'desktop': Full width or 100% width (no constraint)
 * - 'tablet': 768px width
 * - 'mobile': 375px width (iPhone-like)
 */
export const DeviceSwitcher = ({ devicePreview, onChange, className }: DeviceSwitcherProps) => {
  return (
    <div className={cn(
      'flex items-center gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1',
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl', devicePreview === 'desktop' && 'bg-background shadow-sm')}
        onClick={() => onChange('desktop')}
        title="Desktop view (100%)"
      >
        <Monitor className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl', devicePreview === 'tablet' && 'bg-background shadow-sm')}
        onClick={() => onChange('tablet')}
        title="Tablet view (768px)"
      >
        <Tablet className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl', devicePreview === 'mobile' && 'bg-background shadow-sm')}
        onClick={() => onChange('mobile')}
        title="Mobile view (375px)"
      >
        <Smartphone className="w-4 h-4" />
      </Button>
    </div>
  );
};
