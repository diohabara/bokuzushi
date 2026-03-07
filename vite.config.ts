import { defineConfig } from "vite";

export default defineConfig({
  base: "/bokuzushi/",
  build: {
    outDir: "dist",
    // The remaining large bundle is the isolated Three.js vendor chunk.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/three/")) return "three-vendor";
          return "vendor";
        },
      },
    },
  },
});
