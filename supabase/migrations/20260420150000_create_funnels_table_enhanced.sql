-- Create funnels table for the enhanced funnel builder (post-Puck removal)
-- This table stores funnel metadata and widget configuration as JSONB
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Widgets stored as JSONB array
  -- Schema: Array of Widget objects with type, id, order, parentId, and widget-specific props
  -- Supported widget types: text, heading, image, button, input, form, columns, container, section, spacer
  widgets JSONB DEFAULT '[]'::jsonb,
  
  -- Publishing metadata
  published_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  unpublished_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  template_name TEXT,
  
  CONSTRAINT funnels_organization_id_name_unique UNIQUE (organization_id, name)
);

-- Create indexes for common queries
CREATE INDEX idx_funnels_organization_id ON public.funnels(organization_id);
CREATE INDEX idx_funnels_status ON public.funnels(status);
CREATE INDEX idx_funnels_created_at ON public.funnels(created_at DESC);
CREATE INDEX idx_funnels_updated_at ON public.funnels(updated_at DESC);
CREATE INDEX idx_funnels_published_url ON public.funnels(published_url) WHERE published_url IS NOT NULL;

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view funnels"
ON public.funnels FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "Org members with edit role can create funnels"
ON public.funnels FOR INSERT
TO authenticated
WITH CHECK (
  public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor'])
);

CREATE POLICY "Org members with edit role can update funnels"
ON public.funnels FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));

CREATE POLICY "Org members with admin role can delete funnels"
ON public.funnels FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));

-- Create updated_at trigger for funnels
CREATE TRIGGER update_funnels_updated_at
    BEFORE UPDATE ON public.funnels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function to get funnel with all details
CREATE OR REPLACE FUNCTION public.get_funnel_with_details(p_funnel_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  organization_id UUID,
  widgets JSONB,
  published_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.status,
    f.organization_id,
    f.widgets,
    f.published_url,
    f.published_at,
    f.created_at,
    f.updated_at
  FROM public.funnels f
  WHERE f.id = p_funnel_id
    AND public.is_org_member(f.organization_id);
END;
$$;

-- Create RPC function to update funnel widgets in batch
CREATE OR REPLACE FUNCTION public.update_funnel_widgets(
  p_funnel_id UUID,
  p_widgets JSONB
)
RETURNS public.funnels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funnel public.funnels;
BEGIN
  -- Check permissions
  SELECT f INTO v_funnel FROM public.funnels f
  WHERE f.id = p_funnel_id
    AND public.has_org_role(f.organization_id, ARRAY['owner', 'admin', 'editor']);
  
  IF v_funnel.id IS NULL THEN
    RAISE EXCEPTION 'Funnel not found or permission denied';
  END IF;
  
  -- Update widgets
  UPDATE public.funnels
  SET 
    widgets = p_widgets,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_funnel_id
  RETURNING * INTO v_funnel;
  
  RETURN v_funnel;
END;
$$;

-- Create RPC function to publish a funnel
CREATE OR REPLACE FUNCTION public.publish_funnel(
  p_funnel_id UUID,
  p_published_url TEXT
)
RETURNS public.funnels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funnel public.funnels;
BEGIN
  -- Check permissions
  SELECT f INTO v_funnel FROM public.funnels f
  WHERE f.id = p_funnel_id
    AND public.has_org_role(f.organization_id, ARRAY['owner', 'admin']);
  
  IF v_funnel.id IS NULL THEN
    RAISE EXCEPTION 'Funnel not found or permission denied';
  END IF;
  
  -- Update funnel status
  UPDATE public.funnels
  SET 
    status = 'published',
    published_url = p_published_url,
    published_at = now(),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_funnel_id
  RETURNING * INTO v_funnel;
  
  RETURN v_funnel;
END;
$$;

-- Create RPC function to unpublish a funnel
CREATE OR REPLACE FUNCTION public.unpublish_funnel(p_funnel_id UUID)
RETURNS public.funnels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funnel public.funnels;
BEGIN
  -- Check permissions
  SELECT f INTO v_funnel FROM public.funnels f
  WHERE f.id = p_funnel_id
    AND public.has_org_role(f.organization_id, ARRAY['owner', 'admin']);
  
  IF v_funnel.id IS NULL THEN
    RAISE EXCEPTION 'Funnel not found or permission denied';
  END IF;
  
  -- Update funnel status
  UPDATE public.funnels
  SET 
    status = 'draft',
    unpublished_at = now(),
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = p_funnel_id
  RETURNING * INTO v_funnel;
  
  RETURN v_funnel;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.funnels TO authenticated;
GRANT INSERT ON public.funnels TO authenticated;
GRANT UPDATE ON public.funnels TO authenticated;
GRANT DELETE ON public.funnels TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_with_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_funnel_widgets(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_funnel(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_funnel(UUID) TO authenticated;

-- Document the widget structure
/*
Widget JSON Schema:

{
  "id": "uuid",
  "type": "text|heading|image|button|input|form|columns|container|section|spacer",
  "order": number,
  "parentId": "uuid|null",
  "props": {
    // Type-specific properties
    
    // Text Widget Properties
    "content": "string",
    "fontSize": number,
    "fontWeight": "normal|medium|semibold|bold",
    "color": "hex color",
    "alignment": "left|center|right",
    "lineHeight": number,        // NEW: typography control
    "letterSpacing": number,     // NEW: typography control
    "opacity": 0-1,              // NEW: transparency
    
    // Heading Widget Properties
    "content": "string",
    "level": "h1|h2|h3",
    "fontSize": number,
    "color": "hex color",
    "alignment": "left|center|right",
    "lineHeight": number,        // NEW
    "letterSpacing": number,     // NEW
    "opacity": 0-1,              // NEW
    
    // Image Widget Properties
    "src": "url",
    "alt": "string",
    "width": "css dimension",
    "height": "css dimension",
    "borderRadius": number,
    "alignment": "left|center|right",
    "borderWidth": number,       // NEW: border support
    "borderColor": "hex color",  // NEW
    "borderStyle": "solid|dashed|dotted",  // NEW
    "shadowBlur": number,        // NEW: shadow support
    "opacity": 0-1,              // NEW
    
    // Button Widget Properties
    "text": "string",
    "url": "string",
    "variant": "primary|secondary|outline",
    "backgroundColor": "hex color",
    "textColor": "hex color",
    "alignment": "left|center|right",
    "icon": "string",
    "borderRadius": number,      // NEW
    "shadowBlur": number,        // NEW
    "opacity": 0-1,              // NEW
    "padding": number,           // NEW
    
    // Input Widget Properties
    "inputType": "text|email|phone",
    "placeholder": "string",
    "required": boolean,
    "label": "string",
    
    // Form Widget Properties
    "submitText": "string",
    "successMessage": "string",
    "fields": ["uuid", ...],     // Array of input widget IDs
    
    // Container Widget Properties
    "padding": number,
    "margin": number,
    "backgroundColor": "hex color",
    "borderRadius": number,
    "borderWidth": number,       // NEW
    "borderColor": "hex color",  // NEW
    "borderStyle": "solid|dashed|dotted",  // NEW
    "shadowBlur": number,        // NEW
    "opacity": 0-1,              // NEW
    
    // Columns Widget Properties
    "columns": 2|3|4,
    "gap": number,
    "padding": number,
    "margin": number,
    "backgroundColor": "hex color",
    "borderRadius": number,
    "stackOnMobile": boolean,
    "verticalAlign": "start|center|end",
    "borderWidth": number,       // NEW
    "borderColor": "hex color",  // NEW
    "borderStyle": "solid|dashed|dotted",  // NEW
    "shadowBlur": number,        // NEW
    "opacity": 0-1,              // NEW
    
    // Section Widget Properties
    "backgroundType": "solid|gradient|image",
    "backgroundColor": "hex color",
    "gradientFrom": "hex color",
    "gradientTo": "hex color",
    "backgroundImage": "url",
    "paddingY": number,
    
    // Spacer Widget Properties
    "height": number
  }
}
*/
