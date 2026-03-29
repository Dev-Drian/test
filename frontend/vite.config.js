import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core separado para mejor caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Socket.io cliente (se actualiza menos)
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3020,
    proxy: {
      "/api": {
        target: "http://localhost:3010",
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', options.target + req.url);
          });
        }
      },
    },
  },
});
