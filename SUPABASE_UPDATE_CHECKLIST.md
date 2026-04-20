# 🚀 Supabase Updates Quick Start (Post-Puck)

## What Changed?
Puck (the visual editor library) has been removed. The system now uses an **enhanced custom funnel builder** with improved widget properties and Supabase schema.

## Required Supabase Updates

### 1. **Run the New Migration** (REQUIRED)
```bash
# File: supabase/migrations/20260420150000_create_funnels_table_enhanced.sql

# This creates/updates:
✅ funnels table (stores widget configurations as JSONB)
✅ RLS policies (organization-based security)
✅ 4 RPC functions (publish, unpublish, batch update, fetch)
✅ Performance indexes
```

### 2. **Deploy Locally First**
```bash
cd /workspaces/evoltra-main-exp

# Start Supabase
supabase start

# Run migrations
supabase migration up

# Or link to remote
supabase link --project-ref nvqnbnzbnzgpuckconte
supabase push
```

### 3. **Verify Migration Success**
```sql
-- Check table exists
SELECT * FROM public.funnels LIMIT 1;

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'funnels';

-- Test RPC function
SELECT * FROM public.get_funnel_with_details('test-id');
```

## New Widget Properties

All widgets now support these enhanced properties:

### Typography (Text & Heading)
- `lineHeight` - Line spacing control
- `letterSpacing` - Character spacing
- `opacity` - Transparency (0-1)

### Styling (Image, Button, Container, Columns)
- `borderWidth` - Border thickness
- `borderColor` - Border color
- `borderStyle` - Solid, dashed, or dotted
- `shadowBlur` - Drop shadow effect
- `opacity` - Transparency (0-1)

### Button-Specific
- `padding` - Button padding (pixels)
- `borderRadius` - Rounded corners

## Database Schema

```
funnels table columns:
├── id (UUID)
├── name (TEXT)
├── status (TEXT: draft|published)
├── organization_id (FK → organizations)
├── widgets (JSONB array) ← Stores all widget data
├── published_url (TEXT)
├── published_at (TIMESTAMP)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── created_by (FK → auth.users)
├── updated_by (FK → auth.users)
└── version (INTEGER)

design_components table
├── Stores design properties for components
├── References funnels(id)
└── For advanced design features
```

## Widget JSONB Structure

Each widget in the `widgets` array has:
```json
{
  "id": "uuid",
  "type": "text|heading|image|button|input|form|columns|container|section|spacer",
  "order": 0,
  "parentId": "parent-uuid|null",
  "props": { /* type-specific properties */ }
}
```

## Supported Widget Types (10 total)

| Type | Purpose | New Props |
|------|---------|-----------|
| **text** | Paragraph | lineHeight, letterSpacing, opacity |
| **heading** | h1/h2/h3 | lineHeight, letterSpacing, opacity |
| **image** | Images | borderWidth, borderColor, borderStyle, shadowBlur, opacity |
| **button** | CTAs | borderRadius, shadowBlur, opacity, padding |
| **input** | Form fields | (no new props) |
| **form** | Forms | (no new props) |
| **container** | Layout | borderWidth, borderColor, borderStyle, shadowBlur, opacity |
| **columns** | Grid (2-4) | borderWidth, borderColor, borderStyle, shadowBlur, opacity |
| **section** | Full-width | (no changes) |
| **spacer** | Vertical gap | (no changes) |

## RPC Functions Available

```sql
-- Get complete funnel with widgets
SELECT * FROM public.get_funnel_with_details('funnel-id');

-- Batch update all widgets
SELECT * FROM public.update_funnel_widgets('funnel-id', '[...]'::jsonb);

-- Publish funnel with URL
SELECT * FROM public.publish_funnel('funnel-id', '/published-funnels/slug');

-- Unpublish funnel
SELECT * FROM public.unpublish_funnel('funnel-id');
```

## RLS Security

**Who can do what:**
- ✅ Org members: VIEW funnels
- ✅ Editors/Admins: CREATE & UPDATE funnels
- ✅ Only Admins: DELETE funnels

## Frontend Ready

All frontend code is already updated:
- ✅ TypeScript types match new widget properties
- ✅ Property Panel has new controls (borders, shadows, opacity, etc.)
- ✅ All widget editors ready to use
- ✅ Build passes successfully

## Action Checklist

- [ ] Run migration file: `20260420150000_create_funnels_table_enhanced.sql`
- [ ] Verify table created: `SELECT COUNT(*) FROM public.funnels;`
- [ ] Test RPC function: `SELECT * FROM public.get_funnel_with_details('test-id');`
- [ ] Verify RLS enabled
- [ ] Create a test funnel (should work seamlessly)
- [ ] Test publish/unpublish
- [ ] Deploy to production

## Need Help?

See full documentation:
- `SUPABASE_UPDATES_NEEDED.md` - Complete reference
- `START_HERE.md` - Overview of all changes

## Status Summary

| Layer | Status |
|-------|--------|
| 💾 Database Schema | 📄 Migration created, ready to deploy |
| 📝 TypeScript Types | ✅ Updated |
| 🎨 UI Components | ✅ Updated |
| 🔌 Hooks & APIs | ✅ Ready |
| 🚀 Build | ✅ Passing |

**Next: Deploy the migration to Supabase**
