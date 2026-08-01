import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function buildResourceHints(env) {
  const origins = new Set([
    'https://script.google.com',
    'https://docs.google.com',
    'https://www.googleapis.com',
  ]);

  if (env.VITE_SUPABASE_URL) {
    try {
      origins.add(new URL(env.VITE_SUPABASE_URL).origin);
    } catch {
      /* ignore invalid url */
    }
  }

  const lines = [];
  for (const origin of origins) {
    lines.push(`<link rel="dns-prefetch" href="${origin}" />`);
    lines.push(
      `<link rel="preconnect" href="${origin}"${origin.includes('supabase') ? ' crossorigin' : ''} />`,
    );
  }
  return lines.join('\n    ');
}

function injectBuildPreloads(html, bundle) {
  if (!bundle) return html;

  const tags = [];
  const seen = new Set();

  const addTag = (tag) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    tags.push(tag);
  };

  for (const chunk of Object.values(bundle)) {
    if (chunk.type !== 'chunk') continue;
    const href = `./${chunk.fileName}`;

    if (chunk.isEntry || chunk.name === 'index') {
      addTag(`<link rel="modulepreload" crossorigin href="${href}" />`);
    }
    if (chunk.name === 'react-vendor') {
      addTag(`<link rel="modulepreload" crossorigin href="${href}" />`);
    }
    if (chunk.fileName.includes('DashboardOverview')) {
      addTag(`<link rel="modulepreload" crossorigin href="${href}" />`);
    }
    if (
      chunk.fileName.includes('Overview') ||
      chunk.fileName.includes('Calendar') ||
      chunk.fileName.includes('Log') ||
      chunk.fileName.includes('Database') ||
      chunk.fileName.includes('SyncBackup')
    ) {
      if (!chunk.isEntry && chunk.name !== 'react-vendor') {
        addTag(`<link rel="prefetch" href="${href}" as="script" crossorigin />`);
      }
    }
  }

  for (const asset of Object.values(bundle)) {
    if (asset.type === 'asset' && asset.fileName.endsWith('.css')) {
      addTag(`<link rel="preload" href="./${asset.fileName}" as="style" />`);
    }
  }

  if (!tags.length) return html;
  return html.replace('<!-- BUILD_PRELOADS -->', tags.join('\n    '));
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-resource-hints',
        transformIndexHtml(html) {
          const hints = buildResourceHints(env);
          return html.replace('<!-- RESOURCE_HINTS -->', hints);
        },
      },
      {
        name: 'html-build-preloads',
        transformIndexHtml: {
          order: 'post',
          handler(html, ctx) {
            return injectBuildPreloads(html, ctx.bundle);
          },
        },
      },
    ],
    base: './',
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            if (id.includes('lucide-react')) return 'icons';
          },
        },
      },
    },
  };
});
