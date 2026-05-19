import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Eagle OS - نظام النسر الرياضي',
            short_name: 'Eagle OS',
            description: 'نظام إدارة نادي الكرامة الرياضي - Eagle OS',
            theme_color: '#001F3F',
            background_color: '#ffffff',
            display: 'standalone',
            icons: [
              {
                src: 'https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg',
                sizes: '192x192',
                type: 'image/jpeg'
              },
              {
                src: 'https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg',
                sizes: '512x512',
                type: 'image/jpeg'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
