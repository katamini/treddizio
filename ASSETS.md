# Asset Generation Guide

## Why Components Need Regeneration

The `CharacterSoldier.jsx` component is **auto-generated** from the GLTF file structure. When you update the 3D model file (`Character_Soldier.gltf`), the component code that references specific nodes, materials, and animations may break if the structure changes.

### What gltfjsx Does

`gltfjsx` analyzes your GLTF/GLB file and generates React Three Fiber code that:
- Extracts all nodes (meshes, groups, bones, etc.)
- Extracts all materials
- Extracts all animations
- Creates typed references like `nodes.Body`, `nodes.Head`, `materials.Skin`, etc.

### When to Regenerate

**You MUST regenerate the component when:**
- Node names change (e.g., `Body` → `BodyMesh`)
- New nodes are added that you want to reference
- Material names change
- Animation names change
- The hierarchy/structure changes significantly

**You DON'T need to regenerate when:**
- Only textures/images change
- Only geometry details change (but structure stays the same)
- Only material properties change (colors, roughness, etc.)

## How to Regenerate Components

### Character Model
```bash
npm run generate:character
```

This runs:
```bash
npx gltfjsx@6.2.3 public/models/Character_Soldier.gltf -o src/components/CharacterSoldier.jsx -r public -k
```

### Map Model
```bash
npm run generate:map
```

### Regenerate All
```bash
npm run generate:all
```

## After Regeneration

1. **Review the generated code** - Check for any breaking changes
2. **Preserve custom logic** - The generator may overwrite your custom code (like the weapon switching, color assignment, etc.)
3. **Test thoroughly** - Make sure animations, materials, and nodes still work correctly

## Current Component Structure

The `CharacterSoldier.jsx` component includes custom logic that you'll need to preserve:
- Weapon visibility switching (`WEAPONS` array)
- Character color assignment (`playerColorMaterial`)
- Shadow casting configuration
- Animation handling

**Note:** The Map component doesn't need regeneration because it uses a simpler approach (just loads the GLB as a primitive).

