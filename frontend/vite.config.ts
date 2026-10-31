import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({ root: path.resolve('frontend'), plugins:[react(),tailwindcss()],
  server:{host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:3333',changeOrigin:false}}},
  build:{outDir:path.resolve('dist'),emptyOutDir:true} });
