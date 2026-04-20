-- Create design_components table to store Puck component instances with design properties
CREATE TABLE IF NOT EXISTS public.design_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  component_name TEXT NOT NULL,
  -- Core design properties
  position_x DECIMAL,
  position_y DECIMAL,
  width DECIMAL,
  height DECIMAL,
  rotation DECIMAL DEFAULT 0,
  z_index INTEGER DEFAULT 0,
  -- Shadow properties
  shadow_blur DECIMAL DEFAULT 0,
  shadow_spread DECIMAL DEFAULT 0,
  shadow_offset_x DECIMAL DEFAULT 0,
  shadow_offset_y DECIMAL DEFAULT 0,
  shadow_opacity DECIMAL DEFAULT 0,
  shadow_color TEXT,
  -- Opacity
  opacity DECIMAL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  -- Text formatting
  text_bold BOOLEAN DEFAULT false,
  text_italic BOOLEAN DEFAULT false,
  text_underline BOOLEAN DEFAULT false,
  text_color TEXT,
  font_size INTEGER,
  font_family TEXT,
  line_height DECIMAL,
  letter_spacing DECIMAL,
  -- Alignment (stored as enum values)
  text_align TEXT CHECK (text_align IN ('left', 'center', 'right', 'justify')),
  vertical_align TEXT CHECK (vertical_align IN ('top', 'center', 'bottom')),
  -- Distribution properties (stored as JSON due to flexibility)
  distribution_type TEXT CHECK (distribution_type IN ('space-evenly', 'space-between', 'space-around')),
  -- Animation effects
  animation_type TEXT CHECK (animation_type IN ('fade', 'slide', 'bounce', 'spin', 'pulse', 'none')),
  animation_duration INTEGER DEFAULT 300,
  animation_delay INTEGER DEFAULT 0,
  animation_timing_function TEXT DEFAULT 'ease',
  -- Visibility conditions (stored as JSONB for complex logic)
  visibility_conditions JSONB DEFAULT '[]'::jsonb,
  -- Additional metadata
  parent_component_id UUID REFERENCES public.design_components(id) ON DELETE SET NULL,
  puck_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX idx_design_components_funnel_id ON public.design_components(funnel_id);
CREATE INDEX idx_design_components_organization_id ON public.design_components(organization_id);
CREATE INDEX idx_design_components_parent ON public.design_components(parent_component_id);
CREATE INDEX idx_design_components_animation ON public.design_components(animation_type);

-- Enable RLS
ALTER TABLE public.design_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view design components"
ON public.design_components FOR SELECT
TO authenticated
USING (public.is_org_member(organization_id));

CREATE POLICY "Org members with edit role can insert design components"
ON public.design_components FOR INSERT
TO authenticated
WITH CHECK (
  public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor'])
);

CREATE POLICY "Org members with edit role can update design components"
ON public.design_components FOR UPDATE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));

CREATE POLICY "Org members with edit role can delete design components"
ON public.design_components FOR DELETE
TO authenticated
USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));

-- Create updated_at trigger for design_components
CREATE TRIGGER update_design_components_updated_at
    BEFORE UPDATE ON public.design_components
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function to batch update design components (for performance)
CREATE OR REPLACE FUNCTION public.batch_update_design_components(
  p_funnel_id UUID,
  p_components JSONB
)
RETURNS TABLE (
  id UUID,
  component_name TEXT,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_component RECORD;
  v_error TEXT;
BEGIN
  -- Get organization ID and verify user is member
  SELECT f.organization_id INTO v_org_id
  FROM public.funnels f
  WHERE f.id = p_funnel_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funnel not found';
  END IF;
  
  IF NOT public.has_org_role(v_org_id, ARRAY['owner', 'admin', 'editor']) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Process each component
  FOR v_component IN
    SELECT 
      (component->>'id')::UUID as id,
      component->>'component_name' as component_name,
      component
    FROM jsonb_array_elements(p_components) as component
  LOOP
    BEGIN
      UPDATE public.design_components
      SET
        position_x = (v_component.component->>'position_x')::DECIMAL,
        position_y = (v_component.component->>'position_y')::DECIMAL,
        width = (v_component.component->>'width')::DECIMAL,
        height = (v_component.component->>'height')::DECIMAL,
        rotation = (v_component.component->>'rotation')::DECIMAL,
        z_index = (v_component.component->>'z_index')::INTEGER,
        shadow_blur = (v_component.component->>'shadow_blur')::DECIMAL,
        shadow_spread = (v_component.component->>'shadow_spread')::DECIMAL,
        shadow_offset_x = (v_component.component->>'shadow_offset_x')::DECIMAL,
        shadow_offset_y = (v_component.component->>'shadow_offset_y')::DECIMAL,
        shadow_opacity = (v_component.component->>'shadow_opacity')::DECIMAL,
        shadow_color = v_component.component->>'shadow_color',
        opacity = (v_component.component->>'opacity')::DECIMAL,
        text_bold = (v_component.component->>'text_bold')::BOOLEAN,
        text_italic = (v_component.component->>'text_italic')::BOOLEAN,
        text_underline = (v_component.component->>'text_underline')::BOOLEAN,
        text_color = v_component.component->>'text_color',
        font_size = (v_component.component->>'font_size')::INTEGER,
        animation_type = v_component.component->>'animation_type',
        animation_duration = (v_component.component->>'animation_duration')::INTEGER,
        animation_delay = (v_component.component->>'animation_delay')::INTEGER,
        animation_timing_function = v_component.component->>'animation_timing_function',
        visibility_conditions = v_component.component->'visibility_conditions',
        updated_by = auth.uid()
      WHERE id = v_component.id AND funnel_id = p_funnel_id;
      
      RETURN QUERY
      SELECT v_component.id, v_component.component_name, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
      RETURN QUERY
      SELECT v_component.id, v_component.component_name, false, v_error;
    END;
  END LOOP;
END;
$$;

-- Grant execute on the batch update function
GRANT EXECUTE ON FUNCTION public.batch_update_design_components(UUID, JSONB) TO authenticated;

-- Create RPC function to get components with visibility conditions applied
CREATE OR REPLACE FUNCTION public.get_design_components_by_funnel(
  p_funnel_id UUID,
  p_include_archived BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  component_type TEXT,
  component_name TEXT,
  position_x DECIMAL,
  position_y DECIMAL,
  width DECIMAL,
  height DECIMAL,
  rotation DECIMAL,
  z_index INTEGER,
  shadow_blur DECIMAL,
  shadow_spread DECIMAL,
  shadow_offset_x DECIMAL,
  shadow_offset_y DECIMAL,
  shadow_opacity DECIMAL,
  shadow_color TEXT,
  opacity DECIMAL,
  text_bold BOOLEAN,
  text_italic BOOLEAN,
  text_underline BOOLEAN,
  text_color TEXT,
  font_size INTEGER,
  text_align TEXT,
  animation_type TEXT,
  animation_duration INTEGER,
  animation_delay INTEGER,
  visibility_conditions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get organization ID and verify user can access
  SELECT f.organization_id INTO v_org_id
  FROM public.funnels f
  WHERE f.id = p_funnel_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funnel not found';
  END IF;
  
  IF NOT public.is_org_member(v_org_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT
    dc.id,
    dc.component_type,
    dc.component_name,
    dc.position_x,
    dc.position_y,
    dc.width,
    dc.height,
    dc.rotation,
    dc.z_index,
    dc.shadow_blur,
    dc.shadow_spread,
    dc.shadow_offset_x,
    dc.shadow_offset_y,
    dc.shadow_opacity,
    dc.shadow_color,
    dc.opacity,
    dc.text_bold,
    dc.text_italic,
    dc.text_underline,
    dc.text_color,
    dc.font_size,
    dc.text_align,
    dc.animation_type,
    dc.animation_duration,
    dc.animation_delay,
    dc.visibility_conditions
  FROM public.design_components dc
  WHERE dc.funnel_id = p_funnel_id
  ORDER BY dc.z_index ASC, dc.created_at ASC;
END;
$$;

-- Grant execute on the get function
GRANT EXECUTE ON FUNCTION public.get_design_components_by_funnel(UUID, BOOLEAN) TO authenticated;
