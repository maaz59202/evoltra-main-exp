-- Design System Components - Useful SQL Queries

-- ============================================
-- VIEWING & EXPLORING DATA
-- ============================================

-- Get all components for a specific funnel
SELECT 
  id, 
  component_type, 
  component_name, 
  position_x, 
  position_y,
  opacity,
  animation_type
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
ORDER BY z_index ASC;

-- Get components with animation effects
SELECT 
  id, 
  component_name, 
  animation_type, 
  animation_duration, 
  animation_delay
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND animation_type != 'none'
ORDER BY animation_duration DESC;

-- Get components with shadow effects
SELECT 
  id, 
  component_name, 
  shadow_blur, 
  shadow_spread, 
  shadow_opacity,
  shadow_color
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND shadow_opacity > 0
ORDER BY shadow_opacity DESC;

-- Get text-formatted components
SELECT 
  id, 
  component_name, 
  text_bold, 
  text_italic, 
  text_underline,
  text_color,
  font_size
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND (text_bold OR text_italic OR text_underline);

-- Get components with visibility conditions
SELECT 
  id, 
  component_name, 
  visibility_conditions,
  jsonb_array_length(visibility_conditions) as condition_count
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND jsonb_array_length(visibility_conditions) > 0;

-- ============================================
-- STATISTICS & ANALYSIS
-- ============================================

-- Count components by type
SELECT 
  component_type, 
  COUNT(*) as count
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
GROUP BY component_type
ORDER BY count DESC;

-- Get average animation duration
SELECT 
  animation_type, 
  COUNT(*) as count,
  AVG(animation_duration) as avg_duration,
  MIN(animation_duration) as min_duration,
  MAX(animation_duration) as max_duration
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND animation_type IS NOT NULL
GROUP BY animation_type;

-- Find components with highest opacity
SELECT 
  id, 
  component_name, 
  opacity,
  created_at
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND opacity < 1.0
ORDER BY opacity ASC;

-- Get recently modified components
SELECT 
  id, 
  component_name, 
  updated_at,
  updated_by,
  animation_type
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================
-- BULK OPERATIONS
-- ============================================

-- Reset all animations in a funnel to none
UPDATE public.design_components
SET 
  animation_type = 'none',
  animation_duration = 0,
  animation_delay = 0,
  updated_at = NOW()
WHERE funnel_id = 'your-funnel-id';

-- Increase all font sizes by 10%
UPDATE public.design_components
SET 
  font_size = CASE 
    WHEN font_size IS NOT NULL THEN ROUND(font_size * 1.1)
    ELSE NULL 
  END,
  updated_at = NOW()
WHERE funnel_id = 'your-funnel-id';

-- Clear all shadow effects
UPDATE public.design_components
SET 
  shadow_blur = 0,
  shadow_spread = 0,
  shadow_offset_x = 0,
  shadow_offset_y = 0,
  shadow_opacity = 0,
  updated_at = NOW()
WHERE funnel_id = 'your-funnel-id';

-- Reset all opacity to 1 (fully visible)
UPDATE public.design_components
SET 
  opacity = 1,
  updated_at = NOW()
WHERE funnel_id = 'your-funnel-id';

-- Remove all visibility conditions
UPDATE public.design_components
SET 
  visibility_conditions = '[]'::jsonb,
  updated_at = NOW()
WHERE funnel_id = 'your-funnel-id'
AND jsonb_array_length(visibility_conditions) > 0;

-- ============================================
-- RPC FUNCTION EXAMPLES
-- ============================================

-- Batch update multiple components
SELECT * FROM public.batch_update_design_components(
  'funnel-uuid'::UUID,
  '[
    {
      "id": "comp-1",
      "position_x": 100,
      "position_y": 200,
      "shadow_blur": 10,
      "shadow_opacity": 0.2
    },
    {
      "id": "comp-2",
      "animation_type": "fade",
      "animation_duration": 500
    }
  ]'::JSONB
);

-- Get components for editing
SELECT * FROM public.get_design_components_by_funnel(
  'funnel-uuid'::UUID,
  false  -- don't include archived
);

-- ============================================
-- COMPONENT HIERARCHY QUERIES
-- ============================================

-- Get all child components of a parent
SELECT 
  id, 
  component_name, 
  parent_component_id,
  position_x,
  position_y
FROM public.design_components
WHERE parent_component_id = 'parent-component-id'
AND funnel_id = 'your-funnel-id'
ORDER BY z_index ASC;

-- Get components at a specific z_index level
SELECT 
  id, 
  component_name, 
  component_type,
  z_index,
  position_x,
  position_y,
  width,
  height
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND z_index = 5
ORDER BY id ASC;

-- Find overlapping components
SELECT DISTINCT a.id as component_1, b.id as component_2
FROM public.design_components a
JOIN public.design_components b ON (
  a.funnel_id = b.funnel_id
  AND a.id < b.id
  AND a.position_x < b.position_x + b.width
  AND a.position_x + a.width > b.position_x
  AND a.position_y < b.position_y + b.height
  AND a.position_y + a.height > b.position_y
)
WHERE a.funnel_id = 'your-funnel-id';

-- ============================================
-- SEARCHING & FILTERING
-- ============================================

-- Find components by name pattern
SELECT 
  id, 
  component_name, 
  component_type,
  created_at
FROM public.design_components
WHERE component_name ILIKE '%button%'  -- Case-insensitive search
AND funnel_id = 'your-funnel-id';

-- Find components by creator
SELECT 
  id, 
  component_name, 
  created_by,
  created_at
FROM public.design_components
WHERE created_by = 'user-uuid'
AND funnel_id = 'your-funnel-id'
ORDER BY created_at DESC;

-- Find components modified in the last 24 hours
SELECT 
  id, 
  component_name, 
  updated_at,
  updated_by
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- ============================================
-- VISIBILITY CONDITION ANALYSIS
-- ============================================

-- Analyze visibility condition types
SELECT 
  jsonb_extract_path_text(cond, 'operator') as operator,
  jsonb_extract_path_text(cond, 'field') as field,
  COUNT(*) as count
FROM public.design_components,
jsonb_array_elements(visibility_conditions) as cond
WHERE funnel_id = 'your-funnel-id'
GROUP BY operator, field
ORDER BY count DESC;

-- Find all components with 'equals' visibility condition
SELECT 
  id,
  component_name,
  visibility_conditions
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND visibility_conditions @> '[{"operator":"equals"}]'::jsonb;

-- Find components checking a specific field
SELECT 
  id,
  component_name,
  visibility_conditions
FROM public.design_components
WHERE funnel_id = 'your-funnel-id'
AND visibility_conditions @> '[{"field":"action"}]'::jsonb;

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'design_components'
ORDER BY indexname;

-- Get table size
SELECT 
  pg_size_pretty(pg_total_relation_size('public.design_components')) as total_size,
  pg_size_pretty(pg_relation_size('public.design_components')) as table_size,
  pg_size_pretty(pg_indexes_size('public.design_components')) as indexes_size;

-- Get row count per funnel
SELECT 
  funnel_id,
  COUNT(*) as component_count
FROM public.design_components
GROUP BY funnel_id
ORDER BY component_count DESC
LIMIT 10;

-- ============================================
-- CLEANUP & MAINTENANCE
-- ============================================

-- Delete all components from a specific funnel
DELETE FROM public.design_components
WHERE funnel_id = 'old-funnel-id';

-- Delete orphaned components (no parent, not in funnel)
DELETE FROM public.design_components
WHERE parent_component_id IS NOT NULL
AND parent_component_id NOT IN (
  SELECT id FROM public.design_components WHERE funnel_id = 'your-funnel-id'
);

-- Archive unused animation types
UPDATE public.design_components
SET animation_type = 'none'
WHERE animation_type NOT IN ('fade', 'slide', 'bounce', 'spin', 'pulse', 'none')
AND funnel_id = 'your-funnel-id';

-- ============================================
-- EXPORT & BACKUP
-- ============================================

-- Export component data as CSV-compatible format
COPY (
  SELECT 
    id, 
    funnel_id,
    component_type, 
    component_name,
    position_x,
    position_y,
    width,
    height,
    animation_type,
    opacity,
    created_at,
    updated_at
  FROM public.design_components
  WHERE funnel_id = 'your-funnel-id'
  ORDER BY z_index, created_at
)
TO STDOUT WITH (FORMAT CSV, HEADER TRUE);

-- Get full component backup as JSON
SELECT jsonb_build_object(
  'funnel_id', funnel_id,
  'export_date', NOW(),
  'component_count', COUNT(*),
  'components', jsonb_agg(to_jsonb(dc.*))
) as backup
FROM public.design_components dc
WHERE funnel_id = 'your-funnel-id'
GROUP BY funnel_id;

-- ============================================
-- NOTES & REMINDERS
-- ============================================

/*
Replace 'your-funnel-id' with actual funnel UUID
Replace 'user-uuid' with actual user UUID
Replace 'component-id' with actual component UUID

All queries respect RLS policies:
- Must have organization membership to view
- Must have editor+ role to modify

For bulk operations, consider:
1. Using batch_update_design_components() for better performance
2. Running during off-peak hours
3. Backing up data first
4. Testing with LIMIT first

Key indexes for performance:
- idx_design_components_funnel_id
- idx_design_components_organization_id
- idx_design_components_parent
- idx_design_components_animation
*/
