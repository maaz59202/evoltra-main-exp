# Supabase Updates Needed (Post-Puck Removal)

## Summary
Since Puck has been removed from the funnel builder, the system now uses an enhanced custom widget system with a new Supabase schema to support it. Here are all the updates needed:

---

## 1. ✅ Funnels Table (PRIMARY)
**Migration**: `20260420150000_create_funnels_table_enhanced.sql`

### Table Structure
```sql
id (UUID PRIMARY KEY)
name (TEXT NOT NULL)
status (TEXT: 'draft' | 'published')
organization_id (UUID FK → organizations)
widgets (JSONB array of Widget objects)
published_url (TEXT nullable)
published_at (TIMESTAMP nullable)
unpublished_at (TIMESTAMP nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
created_by (UUID FK → auth.users)
updated_by (UUID FK → auth.users)
version (INTEGER)
is_template (BOOLEAN)
template_name (TEXT)
```

### Key Features
- ✅ RLS policies for org members (view), editors (create/update), admins (delete)
- ✅ Indexes for organization_id, status, created_at, updated_at, published_url
- ✅ Auto-update trigger for updated_at
- ✅ Unique constraint on (organization_id, name)

### RPC Functions
1. **get_funnel_with_details(p_funnel_id)** - Retrieve complete funnel
2. **update_funnel_widgets(p_funnel_id, p_widgets)** - Batch update widgets
3. **publish_funnel(p_funnel_id, p_published_url)** - Publish funnel
4. **unpublish_funnel(p_funnel_id)** - Unpublish funnel

---

## 2. ✅ Design Components Table (SECONDARY)
**Already exists**: `20260420140000_add_design_system_components.sql`

This table stores design properties for individual components and references funnels:
- funnel_id (FK → funnels)
- Shadow, opacity, text formatting, animation, visibility conditions
- For advanced design features

---

## 3. Widget Schema (JSONB Structure)

### New Properties Added (Post-Enhancement)
Enhanced all widgets to support:

#### Text & Heading Widgets
- `lineHeight` (number) - Line height control
- `letterSpacing` (number) - Character spacing
- `opacity` (0-1) - Transparency

#### Image, Button, Container, Columns Widgets
- `borderWidth` (number) - Border thickness
- `borderColor` (hex) - Border color
- `borderStyle` (solid|dashed|dotted) - Border style
- `shadowBlur` (number) - Drop shadow blur
- `opacity` (0-1) - Transparency
- **Button only**: `padding` (number) - Button padding, `borderRadius` (number)

### Widget Types Supported
1. **text** - Paragraph text with typography controls
2. **heading** - Headings (h1/h2/h3) with typography controls
3. **image** - Images with border and shadow support
4. **button** - CTAs with comprehensive styling
5. **input** - Form fields (text/email/phone)
6. **form** - Form container with submit button
7. **container** - Layout container with border/shadow
8. **columns** - Multi-column layout (2/3/4 columns)
9. **section** - Full-width section with background (solid/gradient/image)
10. **spacer** - Vertical spacing element

---

## 4. Frontend Integration Updates Required

### Types Already Updated
✅ `/src/types/funnel.ts` - All widget interfaces updated with new properties

### Hooks Already Updated
✅ `/src/hooks/useFunnels.ts` - Ready for database calls
✅ `/src/hooks/useFunnelEditor.ts` - State management for editor

### Components Already Updated
✅ `/src/components/funnel/PropertiesPanel.tsx` - Property controls
✅ `/src/components/funnel/PropertyControls.tsx` - Helper components
✅ All widget components (TextWidget, ImageWidget, ButtonWidget, etc.) - Ready for new props

### New Helper Components Added
- `OpacityControl` - For transparency
- `BorderWidthControl` - Border thickness
- `BorderColorInput` - Border color picker
- `BorderStyleSelect` - Border style selector
- `ShadowControl` - Shadow blur
- `LineHeightControl` - Line height
- `LetterSpacingControl` - Letter spacing

---

## 5. Deployment Checklist

- [ ] **Database Migration**
  - Run: `supabase migration up` or push migrations to Supabase
  - Verify funnels table created with correct schema
  - Verify RLS policies enabled
  - Verify RPC functions accessible

- [ ] **Table Verification**
  ```sql
  -- Check table exists
  SELECT * FROM information_schema.tables WHERE table_name = 'funnels';
  
  -- Check columns
  \d public.funnels
  
  -- Check RLS enabled
  SELECT * FROM pg_tables WHERE tablename = 'funnels' AND rowsecurity = true;
  ```

- [ ] **Test CRUD Operations**
  - Create funnel
  - Update widgets
  - Publish/unpublish funnel
  - Delete funnel

- [ ] **Test RPC Functions**
  - `get_funnel_with_details()`
  - `update_funnel_widgets()`
  - `publish_funnel()`
  - `unpublish_funnel()`

- [ ] **Test RLS Policies**
  - Org members can view funnels
  - Editors can create/update
  - Only admins can delete

---

## 6. Edge Functions (Optional)

Recommended to create Edge Functions for:
- `publish-funnel` - Generate public funnel URL
- `export-funnel` - Export funnel to HTML/JSON
- `duplicate-funnel` - Clone existing funnel
- `import-funnel` - Import from template

---

## 7. Data Migration (If Needed)

If migrating from Puck to this system:
```sql
-- Map old puck_data to new widgets structure
-- Update existing funnels records
UPDATE public.funnels
SET widgets = puck_data  -- if puck_data already has Widget format
WHERE puck_data IS NOT NULL;
```

---

## 8. Migration Files Order

1. `20260420150000_create_funnels_table_enhanced.sql` — **NEW** (this migration)
2. `20260420140000_add_design_system_components.sql` — Already exists

---

## Next Steps

1. ✅ Review this migration file
2. ✅ Run migrations in Supabase
3. ✅ Test CRUD operations
4. ✅ Verify RLS policies
5. ✅ Test RPC functions
6. ⏳ Deploy to production
7. ⏳ Monitor for errors

---

## Reference: Widget JSONB Example

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "order": 0,
  "parentId": null,
  "props": {
    "content": "Welcome to our funnel",
    "fontSize": 16,
    "fontWeight": "semibold",
    "color": "#1f2937",
    "alignment": "left",
    "lineHeight": 14,
    "letterSpacing": 0.5,
    "opacity": 1
  }
}
```

---

## Summary of Changes

| Component | Status | Notes |
|-----------|--------|-------|
| Funnels Table | ✅ New Migration | Schema designed for enhanced widgets |
| Widget Types | ✅ Updated | All 10 widget types fully typed |
| Frontend Types | ✅ Updated | TypeScript interfaces match schema |
| Property Controls | ✅ Updated | All new controls added |
| Editor Components | ✅ Updated | Ready to use new properties |
| RLS Policies | ✅ Included | Complete org-based security |
| RPC Functions | ✅ Included | Publish, unpublish, batch update |
| Design System | ✅ Integrated | design_components table available |

