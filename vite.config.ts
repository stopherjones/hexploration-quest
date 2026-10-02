import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : 'hexploration-quest';
  const basePath = isGitHubActions ? `/${repoName}/` : './';

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'google-verification-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/googleccc77936a16528e9.html' || req.url?.startsWith('/googleccc77936a16528e9.html')) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end('google-site-verification: googleccc77936a16528e9.html\n');
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
