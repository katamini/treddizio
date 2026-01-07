# Testing New 3D Models

## Quick Test Checklist

When you add or update a 3D model file, follow these steps:

### 1. Update the Model Path
- Update the `useGLTF()` path in the component
- Update the `useGLTF.preload()` path
- Example: Changed from `Character_Soldier.gltf` to `Character_Soldier_new.gltf`

### 2. Check if Regeneration is Needed

**You MUST regenerate if:**
- Node names changed (e.g., `Body` → `BodyMesh`)
- New nodes were added that you want to reference
- Material names changed
- Animation names changed
- The hierarchy/structure changed significantly

**You DON'T need to regenerate if:**
- Only textures/images changed
- Only geometry details changed (but structure stays the same)
- Only material properties changed (colors, roughness, etc.)

### 3. Regenerate Component (if needed)
```bash
npm run generate:character
```

**⚠️ Warning:** This will overwrite your component! Make sure to:
- Backup any custom logic first
- Review the generated code
- Re-add any custom code (weapon switching, color assignment, etc.)

### 4. Test Locally

#### Start Dev Server
```bash
npm run dev
```

#### Check Browser Console
Open browser DevTools (F12) and look for:
- ✅ No errors loading the model
- ✅ No "Cannot read property" errors
- ✅ Model appears correctly in the game
- ✅ Animations work
- ✅ Materials/textures load correctly

#### Visual Checks
- [ ] Model appears in the game
- [ ] Model has correct scale/size
- [ ] Model has correct colors/materials
- [ ] Animations play correctly
- [ ] Shadows work (if applicable)
- [ ] No visual glitches or artifacts

### 5. Test in Build

#### Build for Production
```bash
npm run build
```

#### Preview Build
```bash
npm run preview
```

Check the same things as in dev mode.

### 6. Common Issues

#### Model doesn't load
- Check file path is correct
- Check file exists in `public/models/`
- Check browser console for 404 errors
- Verify file format (GLTF/GLB)

#### Model loads but is invisible
- Check if nodes exist (might need regeneration)
- Check if materials are assigned correctly
- Check browser console for errors

#### Model structure errors
- Regenerate component: `npm run generate:character`
- Check if node names match (e.g., `nodes.Body` exists)

#### Model appears but animations don't work
- Check animation names in the GLTF file
- Verify animation names match in code
- Check browser console for animation errors

### 7. Current Model Files

- `Character_Soldier.gltf` (2.2MB) - Original
- `Character_Soldier_new.gltf` (6.4MB) - New version (currently in use)

### 8. After Testing

Once confirmed working:
- Commit the changes
- Update documentation if needed
- Consider removing old model file if no longer needed

