import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// base './' makes the build work everywhere:
//  - GitHub Pages project sites (https://user.github.io/repo-name/)
//  - Vercel (https://app.vercel.app/)
//  - any subfolder or file:// preview
export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      // Bind locally so the one-click desktop launcher works reliably and
      // does not expose the development server to the whole network.
      host: '127.0.0.1',
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      // Split stable vendor libraries into their own cached chunks so
      // repeat visits/deployments reuse the browser cache.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          },
        },
      },
    },
  };
});
