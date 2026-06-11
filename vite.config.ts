import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      // Custom Plugin to guarantee direct download of actual files in dev & production build
      {
        name: 'source-exporter',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const cleanUrl = req.url?.split('?')[0];
            if (cleanUrl === '/download-app-source' || cleanUrl === '/download-app-source.txt') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'src/App.tsx'), 'utf-8'));
            } else if (cleanUrl === '/download-package-json' || cleanUrl === '/download-package-json.txt') {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
            } else if (cleanUrl === '/download-order-tracker' || cleanUrl === '/download-order-tracker.txt') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'src/components/OrderTracker.tsx'), 'utf-8'));
            } else if (cleanUrl === '/download-firebase-ts' || cleanUrl === '/download-firebase-ts.txt') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'src/lib/firebase.ts'), 'utf-8'));
            } else if (cleanUrl === '/download-index-css' || cleanUrl === '/download-index-css.txt') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'index.css'), 'utf-8'));
            } else if (cleanUrl === '/download-index-html' || cleanUrl === '/download-index-html.txt') {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8'));
            } else if (cleanUrl === '/download-vite-config' || cleanUrl === '/download-vite-config.txt') {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'vite.config.ts'), 'utf-8'));
            } else if (cleanUrl === '/download-tsconfig' || cleanUrl === '/download-tsconfig.txt') {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(fs.readFileSync(path.resolve(__dirname, 'tsconfig.json'), 'utf-8'));
            } else {
              next();
            }
          });
        },
        generateBundle() {
          try {
            const filesToEmit = [
              { name: 'download-app-source', path: 'src/App.tsx' },
              { name: 'download-app-source.txt', path: 'src/App.tsx' },
              { name: 'download-package-json', path: 'package.json' },
              { name: 'download-package-json.txt', path: 'package.json' },
              { name: 'download-order-tracker', path: 'src/components/OrderTracker.tsx' },
              { name: 'download-order-tracker.txt', path: 'src/components/OrderTracker.tsx' },
              { name: 'download-firebase-ts', path: 'src/lib/firebase.ts' },
              { name: 'download-firebase-ts.txt', path: 'src/lib/firebase.ts' },
              { name: 'download-index-css', path: 'index.css' },
              { name: 'download-index-css.txt', path: 'index.css' },
              { name: 'download-index-html', path: 'index.html' },
              { name: 'download-index-html.txt', path: 'index.html' },
              { name: 'download-vite-config', path: 'vite.config.ts' },
              { name: 'download-vite-config.txt', path: 'vite.config.ts' },
              { name: 'download-tsconfig', path: 'tsconfig.json' },
              { name: 'download-tsconfig.txt', path: 'tsconfig.json' }
            ];

            for (const item of filesToEmit) {
              try {
                const content = fs.readFileSync(path.resolve(__dirname, item.path), 'utf-8');
                this.emitFile({
                  type: 'asset',
                  fileName: item.name,
                  source: content
                });
              } catch (e) {
                console.error(`Error emitting asset ${item.name}:`, e);
              }
            }
          } catch (e) {
            console.error('Error emitting source download assets:', e);
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
