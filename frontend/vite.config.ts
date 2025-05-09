import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { // Add this server configuration
    proxy: {
      // Proxy /api requests to your Spring Boot backend
      '/api': {
        target: 'http://localhost:8080', // Your backend URL
        changeOrigin: true, // Recommended for virtual hosted sites
        secure: false,      // Optional: if your backend is http
        // You might not need to rewrite path if backend expects /api prefix
        // rewrite: (path) => path.replace(/^\/api/, '') // Remove /api prefix if backend doesn't expect it
      }
    }
  }
})
