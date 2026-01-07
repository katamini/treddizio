# Testing New Character Model

## Current Situation

You've added `Character_Soldier_new.gltf` (6.4MB) and updated the code to use it. Here's how to test:

## Step 1: Quick Visual Test (No Regeneration)

### Start Dev Server
```bash
npm run dev
```

### Check Browser Console
Open http://localhost:5173 and check the browser console (F12) for:
- ✅ **No errors** - Model loads successfully
- ❌ **404 errors** - File path is wrong
- ❌ **"Cannot read property"** - Node structure changed, needs regeneration
- ❌ **"nodes.Body is undefined"** - Structure changed, needs regeneration

### Visual Checks
- [ ] Model appears in game
- [ ] Model has correct scale
- [ ] Colors/materials look correct
- [ ] Animations work (if any)
- [ ] No visual glitches

## Step 2: Check if Regeneration is Needed

### Test Current Code
The current code references:
- `nodes.Body` - for color assignment
- `nodes.Head` - for color assignment  
- `nodes.Root` - for the skeleton
- `nodes[weapon]` - for weapon visibility (AK, Pistol, etc.)
- `materials.Skin`, `materials.DarkGrey`, etc.

### If You See Errors Like:
- `Cannot read property 'Body' of undefined`
- `nodes.Body.traverse is not a function`
- `Cannot read property 'AK' of undefined`

**→ The model structure changed, you need to regenerate!**

## Step 3: Regenerate Component (If Needed)

### ⚠️ WARNING: This will overwrite your component!

**Backup first:**
```bash
cp src/components/CharacterSoldier.jsx src/components/CharacterSoldier.jsx.backup
```

**Then regenerate:**
```bash
npm run generate:character
```

### After Regeneration

The new component will have:
- Different structure (based on new model)
- No custom logic (weapon switching, colors, animations)
- Different function name (`Model` instead of `CharacterSoldier`)

**You'll need to:**
1. Change function name back to `CharacterSoldier`
2. Add back custom props (`color`, `animation`, `weapon`)
3. Add back animation handling
4. Add back weapon visibility logic
5. Add back color assignment logic
6. Update node references to match new structure

## Step 4: Compare Model Structures

### Old Model Structure (Character_Soldier.gltf)
- Uses `nodes.Body`, `nodes.Head`, `nodes.Root`
- Uses skinned meshes with `SkeletonUtils.clone`
- Has animations

### New Model Structure (Character_Soldier_new.gltf)
- Different hierarchy (check regenerated code)
- May or may not have same node names
- May or may not have animations

## Step 5: Test Without Regeneration First

**Try this first** - the model might work without regeneration if:
- Only textures/colors changed
- Only geometry details changed
- Node names stayed the same

### Quick Test Command
```bash
# Start dev server
npm run dev

# In browser console, check:
# - No errors = Good!
# - Errors about nodes = Need regeneration
```

## Step 6: If Model Works But Needs Updates

If the model loads but you want to:
- Update node references
- Add new features
- Fix material assignments

You can manually edit the component without full regeneration.

## Current File Status

- ✅ Code updated to use `Character_Soldier_new.gltf`
- ✅ Preload updated
- ⚠️ Structure may be different - test first!

## Next Steps

1. **Test now**: `npm run dev` and check browser
2. **If errors**: Regenerate component
3. **If works**: You're done! 🎉

