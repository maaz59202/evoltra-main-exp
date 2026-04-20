# Quick Start: Integrating Design System with FunnelBuilder

## 1. Update FunnelBuilder.tsx

Add the hook at the top of your component:

```tsx
import { useDesignComponents } from '@/hooks/useDesignComponents';

export function FunnelBuilder() {
  const { funnel_id } = useParams<{ funnel_id: string }>();
  const { organization_id } = useOrgContext();
  
  // Initialize the design components hook
  const {
    components,
    loading,
    saveComponent,
    batchUpdateComponents,
    deleteComponent,
    fetchComponents,
  } = useDesignComponents();

  // Fetch components when funnel changes
  useEffect(() => {
    if (funnel_id) {
      fetchComponents(funnel_id);
    }
  }, [funnel_id, fetchComponents]);

  // ... rest of component
}
```

## 2. Connect Canvas to Design Components

In your canvas rendering:

```tsx
import { generateComponentStyles } from '@/lib/designComponentUtils';

function PuckCanvas() {
  const { components } = useDesignComponents();

  return (
    <div className="canvas-container">
      {components.map((component) => (
        <div
          key={component.id}
          style={generateComponentStyles(component)}
          onDragEnd={(e) => handleComponentDrag(component.id, e)}
        >
          {renderComponentContent(component)}
        </div>
      ))}
    </div>
  );
}
```

## 3. Connect Property Panels to Save

In each property panel component:

```tsx
// Example: ShadowPanel.tsx
export function ShadowPanel() {
  const { selectedComponent } = useCanvasContext();
  const { saveComponent } = useDesignComponents();
  const { toast } = useToast();

  const handleShadowChange = async (property: string, value: any) => {
    try {
      await saveComponent({
        ...selectedComponent,
        [`shadow_${property}`]: value,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save shadow properties',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="shadow-panel">
      <Slider
        label="Blur"
        value={selectedComponent?.shadow_blur || 0}
        onChange={(v) => handleShadowChange('blur', v)}
      />
      {/* ... other shadow controls */}
    </div>
  );
}
```

## 4. Handle Batch Updates for Drag & Drop

```tsx
// In canvas drag handler
const handleDragEnd = async (componentIds: string[], positions: Position[]) => {
  const updatedComponents = components
    .filter((c) => componentIds.includes(c.id))
    .map((c, i) => ({
      ...c,
      position_x: positions[i].x,
      position_y: positions[i].y,
    }));

  // Single batch call instead of multiple saves
  await batchUpdateComponents(updatedComponents);
};
```

## 5. Handle Component Deletion

```tsx
// In component context menu
const handleDeleteComponent = async (componentId: string) => {
  if (confirm('Delete this component?')) {
    await deleteComponent(componentId);
    toast({
      title: 'Success',
      description: 'Component deleted',
    });
  }
};
```

## 6. Apply Visibility Conditions

```tsx
import { isComponentVisible } from '@/lib/designComponentUtils';

function PublishedFunnel({ components, userContext }) {
  return (
    <div>
      {components
        .filter((c) =>
          isComponentVisible(c.visibility_conditions, userContext)
        )
        .map((c) => (
          <div key={c.id} style={generateComponentStyles(c)}>
            {c.component_name}
          </div>
        ))}
    </div>
  );
}
```

## 7. Test in Local Development

```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Deploy function locally
supabase functions serve design-components

# Your app should now be able to:
# - Fetch components from DB
# - Save component changes
# - Apply design properties
# - Batch update on drag/drop
```

## 8. Deployment Steps

```bash
# When ready to deploy to production:

# 1. Apply migrations
supabase db push

# 2. Deploy Edge Function
supabase functions deploy design-components

# 3. Verify in Supabase Dashboard:
# - design_components table exists
# - design-components function is deployed
# - RLS policies are enabled
```

## Common Integration Patterns

### Pattern 1: Auto-save on Property Change
```tsx
const [saving, setSaving] = useState(false);

const handlePropertyChange = async (property: string, value: any) => {
  setSaving(true);
  try {
    await saveComponent({
      ...selectedComponent,
      [property]: value,
    });
  } finally {
    setSaving(false);
  }
};
```

### Pattern 2: Debounced Saves (for performance)
```tsx
import { debounce } from 'lodash';

const debouncedSave = useMemo(
  () => debounce(saveComponent, 500),
  [saveComponent]
);

const handleSliderChange = (value: number) => {
  setLocalValue(value);
  debouncedSave({ ...selectedComponent, opacity: value });
};
```

### Pattern 3: Undo/Redo with Component State
```tsx
const [history, setHistory] = useState<DesignComponent[][]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const undoChange = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    batchUpdateComponents(history[historyIndex - 1]);
  }
};

const redoChange = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(historyIndex + 1);
    batchUpdateComponents(history[historyIndex + 1]);
  }
};
```

## Troubleshooting

### Issue: "Unauthorized" error when saving
**Solution:** Verify user has editor role:
```tsx
const userRole = useOrgContext().userRole;
if (!['owner', 'admin', 'editor'].includes(userRole)) {
  // Show read-only mode
}
```

### Issue: Components not updating in real-time
**Solution:** Add real-time subscription:
```tsx
useEffect(() => {
  const subscription = supabase
    .from(`design_components:funnel_id=eq.${funnel_id}`)
    .on('*', (payload) => {
      fetchComponents(funnel_id); // Refresh
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [funnel_id]);
```

### Issue: Performance slow when many components
**Solution:** Use batch updates and pagination:
```tsx
// Fetch only visible components
const visibleComponents = components.slice(
  page * PAGE_SIZE,
  (page + 1) * PAGE_SIZE
);

// Save only changed components
const changedComponents = components.filter(
  (c) => c.updated_at > lastSaveTime
);
await batchUpdateComponents(changedComponents);
```

## Files Reference

| File | Purpose |
|------|---------|
| `/supabase/migrations/20260420140000_*.sql` | Database schema |
| `/supabase/functions/design-components/index.ts` | Edge function |
| `/src/hooks/useDesignComponents.ts` | React hook |
| `/src/lib/designComponentUtils.ts` | Utility functions |
| `/SUPABASE_DESIGN_SYSTEM_GUIDE.md` | Detailed documentation |
| `/DESIGN_SYSTEM_INTEGRATION.md` | Architecture overview |

## Support

For issues or questions:
1. Check the error message in the console
2. Review RLS policies in Supabase dashboard
3. Verify user has correct organization role
4. Check Edge function logs in Supabase dashboard
5. Refer to SUPABASE_DESIGN_SYSTEM_GUIDE.md

---

**Last Updated:** April 20, 2026
