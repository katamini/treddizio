import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // Relative paths for GitHub Pages
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Remove chunk size warnings for large 3D model files
    chunkSizeWarningLimit: 10000, // 10MB limit (increased from default 500KB)
    rollupOptions: {
      output: {
        // Don't split large assets, keep them as-is
        manualChunks: undefined,
        // Ensure large files are included
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'trystero']
  },
  // Ensure large static assets are copied and not processed
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.bin', '**/*.jpg', '**/*.png', '**/*.ktx2']
})

