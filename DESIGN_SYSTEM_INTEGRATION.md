# Design System Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Components                          │
│  (FunnelBuilder, PropertyPanels, DesignCanvas)                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ├─ useDesignComponents Hook
                               │  (useDesignComponents.ts)
                               │
                               ├─ generateComponentStyles()
                               │  (designComponentUtils.ts)
                               │
                               └─ Event Handlers
                                  (save, delete, batch update)
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                      Supabase Edge Function                      │
│           /functions/v1/design-components (TypeScript)          │
│                                                                   │
│  • POST: Save/update single component                           │
│  • POST: Batch update multiple components                       │
│  • GET: Retrieve components by funnel_id                        │
│  • DELETE: Remove component by id                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               └─ RPC Functions
                                  (SQL Layer)
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                    PostgreSQL Database                           │
│                                                                   │
│  ┌─ design_components (main table)                             │
│  │  • 50+ columns for all design properties                   │
│  │  • JSONB storage for visibility conditions                │
│  │  • RLS policies for org-based access control              │
│  │  • Indexes for performance                                │
│  │                                                             │
│  └─ RPC Functions (Security Definer)                          │
│     • batch_update_design_components()                         │
│     • get_design_components_by_funnel()                        │
│     • update_updated_at_column() [trigger]                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: Save Single Component with Animations
```
1. User configures animation in AnimationEffectsPanel
   ↓
2. saveShadowPanel() calls saveComponent({
     animation_type: 'fade',
     animation_duration: 500,
     ...
   })
   ↓
3. useDesignComponents.saveComponent() makes POST request
   ↓
4. Edge Function verifies auth, validates data
   ↓
5. Inserts/updates design_components row in PostgreSQL
   ↓
6. Returns { success: true, data: [...] }
   ↓
7. Component updates local state + displays toast notification
```

### Example 2: Batch Update on Drag & Drop
```
1. User drags multiple components on canvas
   ↓
2. Canvas drag handler collects all changes:
   [
     { id: 'comp-1', position_x: 150, position_y: 200 },
     { id: 'comp-2', position_x: 300, position_y: 400 },
   ]
   ↓
3. useDesignComponents.batchUpdateComponents([...]) called
   ↓
4. Edge Function receives POST with batch payload
   ↓
5. Calls batch_update_design_components() RPC function
   ↓
6. RPC verifies org permissions once, updates all components
   ↓
7. Returns status for each component (success/error)
   ↓
8. Local state syncs with server state
```

### Example 3: Load Components on Editor Open
```
1. FunnelBuilder mounts with funnelId
   ↓
2. useEffect calls fetchComponents(funnelId)
   ↓
3. GET /functions/v1/design-components?funnel_id=xxx
   ↓
4. Edge Function verifies org membership
   ↓
5. Calls get_design_components_by_funnel() RPC
   ↓
6. RPC returns all components ordered by z_index
   ↓
7. useDesignComponents.components state updated
   ↓
8. Canvas renders components with proper styles
```

## Table Structure: `design_components`

```sql
Column Name                   | Type    | Purpose
─────────────────────────────┼─────────┼──────────────────────────────
id (PK)                       | UUID    | Unique identifier
funnel_id (FK)                | UUID    | Parent funnel reference
organization_id (FK)          | UUID    | Organization for RLS
component_type                | TEXT    | button, text, section, etc.
component_name                | TEXT    | Display name

-- Layout & Position
position_x                    | DECIMAL | X coordinate
position_y                    | DECIMAL | Y coordinate
width                         | DECIMAL | Component width
height                        | DECIMAL | Component height
rotation                      | DECIMAL | Rotation degrees
z_index                       | INTEGER | Stacking order

-- Shadow Effects
shadow_blur                   | DECIMAL | Blur radius
shadow_spread                 | DECIMAL | Spread radius
shadow_offset_x               | DECIMAL | X offset
shadow_offset_y               | DECIMAL | Y offset
shadow_opacity                | DECIMAL | 0-1 (CHECK)
shadow_color                  | TEXT    | Hex/rgba color

-- Opacity
opacity                       | DECIMAL | 0-1 (CHECK)

-- Text Formatting
text_bold                     | BOOLEAN | Font weight
text_italic                   | BOOLEAN | Font style
text_underline                | BOOLEAN | Text decoration
text_color                    | TEXT    | Text color
font_size                     | INTEGER | Size in px
font_family                   | TEXT    | Font name
line_height                   | DECIMAL | Line height
letter_spacing                | DECIMAL | Letter spacing

-- Alignment
text_align                    | TEXT    | left/center/right/justify
vertical_align                | TEXT    | top/center/bottom

-- Distribution
distribution_type            | TEXT    | space-evenly/between/around

-- Animation
animation_type                | TEXT    | fade/slide/bounce/spin/pulse
animation_duration            | INTEGER | Duration in ms
animation_delay               | INTEGER | Delay in ms
animation_timing_function     | TEXT    | ease/ease-in/ease-out/etc.

-- Visibility Logic
visibility_conditions         | JSONB   | Array of condition objects

-- Relationships
parent_component_id           | UUID    | For nested components

-- Metadata
puck_data                     | JSONB   | Original Puck data
created_at                    | TIMESTAMP | Creation time
updated_at                    | TIMESTAMP | Last update (auto)
created_by (FK)               | UUID    | User who created
updated_by (FK)               | UUID    | User who updated
```

## API Endpoints Reference

### POST - Save Single Component
```bash
curl -X POST https://...functions.supabase.co/design-components \
  -H "Authorization: Bearer user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel_id": "uuid",
    "organization_id": "uuid",
    "component_type": "button",
    "component_name": "Call to Action",
    "shadow_blur": 10,
    "shadow_opacity": 0.2,
    "animation_type": "fade"
  }'
```

### POST - Batch Update
```bash
curl -X POST https://...functions.supabase.co/design-components \
  -H "Authorization: Bearer user-id" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel_id": "uuid",
    "components": [
      { "id": "comp-1", "position_x": 100, "position_y": 200 },
      { "id": "comp-2", "position_x": 300, "position_y": 400 }
    ]
  }'
```

### GET - Retrieve Components
```bash
curl "https://...functions.supabase.co/design-components?funnel_id=uuid" \
  -H "Authorization: Bearer user-id"
```

### DELETE - Remove Component
```bash
curl -X DELETE "https://...functions.supabase.co/design-components?component_id=uuid" \
  -H "Authorization: Bearer user-id"
```

## Security Model

### Row-Level Security (RLS)
```sql
-- All design_components queries require organization membership
Table: design_components
├─ SELECT: is_org_member(organization_id)
├─ INSERT: has_org_role(organization_id, ['owner','admin','editor'])
├─ UPDATE: has_org_role(organization_id, ['owner','admin','editor'])
└─ DELETE: has_org_role(organization_id, ['owner','admin','editor'])

-- RLS Helper Functions (Security Definer)
├─ is_org_member(org_id, user_id)
├─ org_role(org_id, user_id)
└─ has_org_role(org_id, roles[], user_id)
```

## Utility Functions (designComponentUtils.ts)

| Function | Purpose |
|----------|---------|
| `opacityToCSS()` | Convert percentage (0-100) to CSS (0-1) |
| `opacityToPercent()` | Convert CSS (0-1) to percentage (0-100) |
| `generateAnimationKeyframes()` | Create CSS keyframes for animation type |
| `buildAnimationCSS()` | Generate CSS animation string |
| `buildShadowCSS()` | Generate CSS box-shadow string |
| `hexToRgba()` | Convert hex color with opacity to rgba |
| `evaluateVisibilityCondition()` | Check if condition matches context |
| `isComponentVisible()` | Check if all visibility conditions pass |
| `generateComponentStyles()` | Build inline styles React object |

## Integration Checklist

- [x] Database migration created
- [x] Edge function implemented
- [x] Config updated (config.toml)
- [x] React hook created (useDesignComponents)
- [x] Utility library created (designComponentUtils)
- [ ] FunnelBuilder integration (connect hook)
- [ ] Property panels integration (call saveComponent)
- [ ] Canvas integration (apply generated styles)
- [ ] Real-time subscriptions (optional, for collaboration)
- [ ] Component history/versioning (optional, future)

## Performance Considerations

1. **Batch Updates:** Use `batch_update_design_components()` for multiple changes
2. **Lazy Loading:** Cache components in React state, fetch once per funnel
3. **Debouncing:** Debounce saveComponent on property panel slider drags
4. **Indexes:** Query performance optimized with:
   - idx_design_components_funnel_id
   - idx_design_components_organization_id
   - idx_design_components_animation

## Error Handling

```typescript
// Hook provides error state
const { error, loading } = useDesignComponents();

if (loading) return <Spinner />;
if (error) return <Alert>{error}</Alert>;

// Try-catch in edge function for all operations
try {
  // operation
} catch (error) {
  return { success: false, error: error.message }
}
```

## Next Phase: Enhanced Features

1. **Real-time Collaboration**
   - Add Supabase real-time subscription
   - Show cursor positions of other editors
   - Conflict resolution for simultaneous edits

2. **Component Versioning**
   - Create `design_component_versions` table
   - Track changes with timestamps
   - Implement undo/redo functionality

3. **Template System**
   - Save component sets as templates
   - Share templates across funnels/organizations
   - Template marketplace

4. **Advanced Conditions**
   - Support for AND/OR logic combinations
   - Time-based visibility (show after X seconds)
   - Scroll-based triggers

---

**Document Version:** 1.0
**Last Updated:** April 20, 2026
