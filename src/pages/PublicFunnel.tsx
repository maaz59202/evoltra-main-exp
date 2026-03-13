import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funnel, Widget, InputWidgetProps } from '@/types/funnel';
import { FunnelCanvas } from '@/components/funnel/FunnelCanvas';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Database row type
interface FunnelRow {
  id: string;
  name: string;
  status: string;
  organization_id: string | null;
  widgets: Widget[];
  published_url: string | null;
  created_at: string;
  updated_at: string;
}

const rowToFunnel = (row: FunnelRow): Funnel => ({
  id: row.id,
  name: row.name,
  status: row.status as 'draft' | 'published',
  workspaceId: row.organization_id || '',
  widgets: row.widgets || [],
  publishedUrl: row.published_url || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const PublicFunnel = () => {
  const { funnelId } = useParams();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: funnel, isLoading, error } = useQuery({
    queryKey: ['public-funnel', funnelId],
    queryFn: async () => {
      if (!funnelId) return null;
      
      const { data, error } = await supabase
        .from('funnels' as any)
        .select('*')
        .eq('id', funnelId)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return rowToFunnel(data as unknown as FunnelRow);
    },
    enabled: !!funnelId,
  });

  const submitLead = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const { error } = await supabase
        .from('leads' as any)
        .insert({
          funnel_id: funnelId,
          organization_id: funnel?.workspaceId || null,
          data,
          source_url: window.location.href,
        });

      if (error) throw error;

      // Send email notification (fire and forget - don't block on this)
      if (funnel?.workspaceId) {
        supabase.functions.invoke('notify-lead', {
          body: {
            leadData: data,
            funnelId: funnelId,
            funnelName: funnel.name,
            organizationId: funnel.workspaceId,
            sourceUrl: window.location.href,
          },
        }).catch((notifyError) => {
          console.log('Failed to send notification:', notifyError);
        });
      }
    },
    onSuccess: () => {
      toast.success(getSuccessMessage());
      setFormData({});
    },
    onError: (error) => {
      console.error('Error submitting lead:', error);
      toast.error('Failed to submit form. Please try again.');
    },
  });

  const getSuccessMessage = () => {
    if (!funnel) return 'Thank you for submitting!';
    const formWidget = funnel.widgets.find(w => w.type === 'form');
    if (formWidget && 'successMessage' in formWidget.props) {
      return (formWidget.props as any).successMessage;
    }
    return 'Thank you for submitting!';
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await submitLead.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChildWidgets = (parentId: string | null) => {
    if (!funnel) return [];
    return funnel.widgets
      .filter(w => w.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">This page doesn't exist or is not published.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicFunnelRenderer
        funnel={funnel}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        getChildWidgets={getChildWidgets}
      />
    </div>
  );
};

interface PublicFunnelRendererProps {
  funnel: Funnel;
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  getChildWidgets: (parentId: string | null) => Widget[];
}

const PublicFunnelRenderer = ({
  funnel,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  getChildWidgets,
}: PublicFunnelRendererProps) => {
  const renderWidget = (widget: Widget): React.ReactNode => {
    const childWidgets = getChildWidgets(widget.id);

    switch (widget.type) {
      case 'heading': {
        const props = widget.props as any;
        const Tag = props.level as keyof JSX.IntrinsicElements;
        return (
          <Tag
            key={widget.id}
            style={{
              fontSize: `${props.fontSize}px`,
              color: props.color,
              textAlign: props.alignment,
            }}
            className="font-bold"
          >
            {props.content}
          </Tag>
        );
      }

      case 'text': {
        const props = widget.props as any;
        return (
          <p
            key={widget.id}
            style={{
              fontSize: `${props.fontSize}px`,
              fontWeight: props.fontWeight,
              color: props.color,
              textAlign: props.alignment,
            }}
          >
            {props.content}
          </p>
        );
      }

      case 'image': {
        const props = widget.props as any;
        return (
          <div
            key={widget.id}
            className={`w-full ${props.alignment === 'center' ? 'flex justify-center' : props.alignment === 'right' ? 'flex justify-end' : ''}`}
          >
            <img
              src={props.src}
              alt={props.alt}
              style={{
                width: props.width,
                height: props.height,
                borderRadius: `${props.borderRadius}px`,
              }}
              className="max-w-full object-cover"
            />
          </div>
        );
      }

      case 'button': {
        const props = widget.props as any;
        return (
          <a
            key={widget.id}
            href={props.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: props.backgroundColor,
              color: props.textColor,
            }}
          >
            {props.text}
          </a>
        );
      }

      case 'form': {
        const props = widget.props as any;
        return (
          <form
            key={widget.id}
            onSubmit={onSubmit}
            className="w-full space-y-4 p-4 rounded-lg border border-border bg-card"
          >
            {childWidgets.map((child) => renderWidget(child))}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : props.submitText}
            </button>
          </form>
        );
      }

      case 'input': {
        const props = widget.props as InputWidgetProps;
        const inputId = `input-${widget.id}`;
        return (
          <div key={widget.id} className="space-y-2">
            <label htmlFor={inputId} className="text-sm font-medium">
              {props.label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <input
              id={inputId}
              type={props.inputType}
              placeholder={props.placeholder}
              required={props.required}
              value={formData[props.label] || ''}
              onChange={(e) => setFormData({ ...formData, [props.label]: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        );
      }

      case 'section': {
        const props = widget.props as any;
        let bgStyle: React.CSSProperties = { paddingTop: props.paddingY, paddingBottom: props.paddingY };
        
        if (props.backgroundType === 'solid') {
          bgStyle.backgroundColor = props.backgroundColor;
        } else if (props.backgroundType === 'gradient') {
          bgStyle.background = `linear-gradient(to bottom, ${props.gradientFrom}, ${props.gradientTo})`;
        } else if (props.backgroundType === 'image') {
          bgStyle.backgroundImage = `url(${props.backgroundImage})`;
          bgStyle.backgroundSize = 'cover';
          bgStyle.backgroundPosition = 'center';
        }

        return (
          <section key={widget.id} style={bgStyle} className="w-full">
            <div className="max-w-4xl mx-auto px-4 space-y-4">
              {childWidgets.map((child) => renderWidget(child))}
            </div>
          </section>
        );
      }

      case 'container': {
        const props = widget.props as any;
        return (
          <div
            key={widget.id}
            style={{
              padding: props.padding,
              margin: props.margin,
              backgroundColor: props.backgroundColor,
              borderRadius: `${props.borderRadius}px`,
            }}
            className="w-full space-y-4"
          >
            {childWidgets.map((child) => renderWidget(child))}
          </div>
        );
      }

      case 'spacer': {
        const props = widget.props as any;
        return <div key={widget.id} style={{ height: props.height }} />;
      }

      default:
        return null;
    }
  };

  const rootWidgets = getChildWidgets(null);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {rootWidgets.map((widget) => renderWidget(widget))}
    </div>
  );
};

export default PublicFunnel;
