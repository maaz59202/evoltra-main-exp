# Supabase Database & Functions Guide - Design System Implementation

## Overview
This guide covers the Supabase updates made to support the new design system features (Shadow/Opacity, Text Formatting, Alignment/Distribution, Animation Effects, and Visibility Conditions).

---

## 1. DATABASE SCHEMA UPDATES

### New Table: `design_components`
This table stores all design properties for Puck components used in funnels.

#### Key Columns:

**Identification & Relationships:**
```
id (UUID, PK) - Unique component ID
funnel_id (UUID, FK) - Links to funnels table
organization_id (UUID, FK) - Links to organizations table
component_type (TEXT) - Type of component (button, text, section, etc.)
component_name (TEXT) - Display name
parent_component_id (UUID, FK) - For nested components
created_by (UUID) - User who created component
updated_by (UUID) - User who last updated component
```

**Position & Size:**
```
position_x (DECIMAL) - X coordinate
position_y (DECIMAL) - Y coordinate
width (DECIMAL) - Component width
height (DECIMAL) - Component height
rotation (DECIMAL) - Rotation in degrees (0-360)
z_index (INTEGER) - Stacking order
```

**Shadow & Opacity Properties:**
```
shadow_blur (DECIMAL) - Blur radius
shadow_spread (DECIMAL) - Spread radius
shadow_offset_x (DECIMAL) - Horizontal offset
shadow_offset_y (DECIMAL) - Vertical offset
shadow_opacity (DECIMAL) - Shadow transparency (0-1)
shadow_color (TEXT) - Shadow color in hex or rgba
opacity (DECIMAL) - Component opacity (0-1, CHECK constraint)
```

**Text Formatting:**
```
text_bold (BOOLEAN) - Font weight
text_italic (BOOLEAN) - Font style
text_underline (BOOLEAN) - Text decoration
text_color (TEXT) - Text color
font_size (INTEGER) - Font size in px
font_family (TEXT) - Font family name
line_height (DECIMAL) - Line height multiplier
letter_spacing (DECIMAL) - Letter spacing
```

**Alignment & Distribution:**
```
text_align (TEXT) - Horizontal alignment: 'left', 'center', 'right', 'justify'
vertical_align (TEXT) - Vertical alignment: 'top', 'center', 'bottom'
distribution_type (TEXT) - Distribution: 'space-evenly', 'space-between', 'space-around'
```

**Animation Effects:**
```
animation_type (TEXT) - Animation: 'fade', 'slide', 'bounce', 'spin', 'pulse', 'none'
animation_duration (INTEGER) - Duration in milliseconds
animation_delay (INTEGER) - Delay in milliseconds
animation_timing_function (TEXT) - Easing: 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'
```

**Visibility Conditions:**
```
visibility_conditions (JSONB) - Array of condition objects:
  [
    {
      "id": "cond-1",
      "operator": "equals|contains|greater_than|less_than|between",
      "field": "action|formValue|deviceType",
      "value": "any",
      "value2": "optional (for between)"
    }
  ]
```

**Metadata:**
```
puck_data (JSONB) - Original Puck editor data
created_at (TIMESTAMP) - Creation timestamp
updated_at (TIMESTAMP) - Last update timestamp
```

#### Indexes Created:
```sql
idx_design_components_funnel_id - Quick filtering by funnel
idx_design_components_organization_id - Quick filtering by org
idx_design_components_parent - Parent component lookups
idx_design_components_animation - Animation type filtering
```

---

## 2. ROW-LEVEL SECURITY (RLS) POLICIES

### View Policy
```sql
SELECT: Organization members can view components
- User must be a member of the organization
```

### Insert Policy
```sql
Users with 'owner', 'admin', or 'editor' roles can create components
```

### Update Policy
```sql
Users with 'owner', 'admin', or 'editor' roles can update components
```

### Delete Policy
```sql
Users with 'owner', 'admin', or 'editor' roles can delete components
```

---

## 3. EDGE FUNCTIONS

### Function: `design-components`
**Location:** `supabase/functions/design-components/index.ts`

#### Configuration (config.toml):
```toml
[functions.design-components]
verify_jwt = false  # Uses authorization header instead
```

#### Endpoints:

##### POST - Save/Update Single Component
**Request:**
```bash
curl -X POST https://your-project.functions.supabase.co/design-components \
  -H "Authorization: Bearer USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "optional-uuid",
    "funnel_id": "funnel-uuid",
    "organization_id": "org-uuid",
    "component_type": "button",
    "component_name": "CTA Button",
    "position_x": 100,
    "position_y": 200,
    "width": 150,
    "height": 50,
    "shadow_blur": 10,
    "shadow_opacity": 0.2,
    "text_bold": true,
    "animation_type": "fade",
    "animation_duration": 500
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [{
    "id": "component-uuid",
    "funnel_id": "funnel-uuid",
    ...
  }]
}
```

##### POST - Batch Update Components
**Request:**
```bash
curl -X POST https://your-project.functions.supabase.co/design-components \
  -H "Authorization: Bearer USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel_id": "funnel-uuid",
    "components": [
      {
        "id": "component-1",
        "position_x": 100,
        "position_y": 200,
        ...
      },
      {
        "id": "component-2",
        "position_x": 300,
        "position_y": 400,
        ...
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "component-1",
      "component_name": "Button",
      "success": true,
      "error_message": null
    },
    {
      "id": "component-2",
      "component_name": "Text",
      "success": true,
      "error_message": null
    }
  ]
}
```

##### GET - Retrieve Components
**Request:**
```bash
curl "https://your-project.functions.supabase.co/design-components?funnel_id=funnel-uuid" \
  -H "Authorization: Bearer USER_ID"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "component-1",
      "component_type": "button",
      "component_name": "CTA Button",
      "position_x": 100,
      "position_y": 200,
      "opacity": 1,
      "animation_type": "fade",
      "visibility_conditions": []
    }
  ]
}
```

##### DELETE - Remove Component
**Request:**
```bash
curl -X DELETE "https://your-project.functions.supabase.co/design-components?component_id=component-uuid" \
  -H "Authorization: Bearer USER_ID"
```

**Response:**
```json
{
  "success": true,
  "message": "Component deleted"
}
```

---

## 4. RPC FUNCTIONS (SQL)

### `batch_update_design_components`
**Purpose:** Efficiently update multiple components in a single transaction.

**Parameters:**
```sql
p_funnel_id UUID - Target funnel
p_components JSONB - Array of component objects with all properties to update
```

**Returns:**
```sql
TABLE (
  id UUID,
  component_name TEXT,
  success BOOLEAN,
  error_message TEXT
)
```

**Usage:**
```sql
SELECT * FROM public.batch_update_design_components(
  'funnel-uuid'::UUID,
  '[{"id": "comp-1", "position_x": 100, ...}]'::JSONB
);
```

### `get_design_components_by_funnel`
**Purpose:** Retrieve all components for a funnel with access control.

**Parameters:**
```sql
p_funnel_id UUID - Target funnel
p_include_archived BOOLEAN DEFAULT false - Include archived components
```

**Returns:**
```sql
TABLE (
  id UUID,
  component_type TEXT,
  component_name TEXT,
  position_x DECIMAL,
  position_y DECIMAL,
  ... (all component fields)
)
```

**Usage:**
```sql
SELECT * FROM public.get_design_components_by_funnel('funnel-uuid'::UUID);
```

---

## 5. REACT HOOK: `useDesignComponents`

**Location:** `src/hooks/useDesignComponents.ts`

### Usage Example:
```tsx
import { useDesignComponents } from '@/hooks/useDesignComponents';

function DesignEditor() {
  const {
    loading,
    components,
    saveComponent,
    batchUpdateComponents,
    deleteComponent,
    fetchComponents,
    error,
  } = useDesignComponents();

  // Fetch components on mount
  useEffect(() => {
    fetchComponents(funnelId);
  }, [funnelId]);

  // Save a single component
  const handleSave = async (component) => {
    await saveComponent({
      ...component,
      funnel_id: funnelId,
      organization_id: orgId,
    });
  };

  // Batch update (e.g., after moving multiple items)
  const handleBatchUpdate = async () => {
    await batchUpdateComponents(components.map(c => ({
      ...c,
      position_x: c.position_x + 10, // Move all right
    })));
  };

  // Delete a component
  const handleDelete = async (componentId) => {
    await deleteComponent(componentId);
  };

  return (
    // Your UI here
  );
}
```

### Hook Methods:

| Method | Parameters | Description |
|--------|-----------|-------------|
| `fetchComponents(funnelId)` | `funnelId: string` | Load all components for a funnel |
| `saveComponent(component)` | `component: DesignComponent` | Save or update a single component |
| `batchUpdateComponents(components)` | `components: DesignComponent[]` | Update multiple components in one request |
| `deleteComponent(componentId)` | `componentId: string` | Delete a component |

### Hook State:

| State | Type | Description |
|-------|------|-------------|
| `loading` | `boolean` | Whether an operation is in progress |
| `components` | `DesignComponent[]` | Current list of components |
| `error` | `string \| null` | Last error message, if any |

---

## 6. DEPLOYMENT CHECKLIST

### Local Development:
```bash
# Run migrations
supabase migrations up

# Start local Supabase
supabase start

# Test Edge Function locally
supabase functions serve design-components
```

### Production Deployment:
```bash
# Apply migrations to remote
supabase db push

# Deploy Edge Function
supabase functions deploy design-components
```

### Verify Deployment:
- [ ] Migration applied successfully
- [ ] Table `design_components` exists with all columns
- [ ] RLS policies are enabled
- [ ] Edge Function is deployed
- [ ] `batch_update_design_components` RPC works
- [ ] `get_design_components_by_funnel` RPC works
- [ ] `design-components` function accessible via HTTPS

---

## 7. COMMON OPERATIONS & QUERIES

### Get all components for a funnel:
```tsx
const { data } = await supabase.rpc('get_design_components_by_funnel', {
  p_funnel_id: funnelId,
});
```

### Save component with animations:
```tsx
await saveComponent({
  funnel_id: funnelId,
  organization_id: orgId,
  component_type: 'button',
  component_name: 'Subscribe Button',
  animation_type: 'fade',
  animation_duration: 500,
  animation_timing_function: 'ease-in-out',
});
```

### Apply shadow effects:
```tsx
await saveComponent({
  ...component,
  shadow_blur: 15,
  shadow_spread: 5,
  shadow_offset_x: 2,
  shadow_offset_y: 4,
  shadow_opacity: 0.3,
  shadow_color: '#000000',
});
```

### Set visibility conditions:
```tsx
await saveComponent({
  ...component,
  visibility_conditions: [
    {
      id: 'cond-1',
      operator: 'equals',
      field: 'action',
      value: 'subscribe',
    },
    {
      id: 'cond-2',
      operator: 'contains',
      field: 'formValue',
      value: 'email@example.com',
    },
  ],
});
```

---

## 8. PERFORMANCE NOTES

- **Batch Updates:** Use `batch_update_design_components` for updating multiple components to reduce API calls
- **Indexing:** Queries filtered by `funnel_id` and `organization_id` are optimized with indexes
- **JSONB Storage:** `visibility_conditions` stored as JSONB for flexible querying
- **RLS Overhead:** All queries respect organization membership checks

---

## 9. TROUBLESHOOTING

### Issue: "Insufficient permissions" error
**Solution:** Verify user has 'editor', 'admin', or 'owner' role in the organization

### Issue: Components not appearing
**Solution:** Ensure `funnel_id` and `organization_id` are correct in the request

### Issue: Batch update partial failure
**Solution:** Check `error_message` field in response for each failed component

### Issue: RPC function not found
**Solution:** Run migrations: `supabase db push`

---

## 10. NEXT STEPS

1. **Integrate with Canvas:** Update `PuckCanvas.tsx` to use `useDesignComponents`
2. **Property Panels:** Connect property panels (Shadow, Text Format, etc.) to `saveComponent`
3. **Real-time Updates:** Consider adding Supabase Real-time subscriptions for collaborative editing
4. **Undo/Redo:** Implement versioning using component history table
5. **Template Support:** Create component templates and share across funnels

---

**Last Updated:** April 20, 2026
**Version:** 1.0.0
