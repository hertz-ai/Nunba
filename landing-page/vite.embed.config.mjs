/**
 * Vite library build for <hart-agent> (@hertzai/hart-embed).
 *
 *   npx vite build -c vite.embed.config.mjs      -> build-embed/
 *     hart-embed.es.js   ES module; the launcher is the entry chunk and the
 *                        React/MUI Liquid UI is a lazy chunk (loaded on
 *                        first open)
 *     hart-embed.umd.js  one self-contained <script> file (global HartEmbed)
 *   npx vitest run -c vite.embed.config.mjs      -> src/__tests__/embed
 *
 * Separate from the CRA app build (react-app-rewired); nothing here changes
 * how the app is built.
 */
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// axiosFactory lazily `require`s hooks/useAuthSession (the app's session
// store, which pulls in crypto-js and the SPA's auth flows) inside a
// try/catch and falls back to clearing the token itself.  The embed has no
// app session, so that require resolves to a module that throws on load and
// axiosFactory's own documented fallback runs.  One implementation, no copy.
const NO_APP_SESSION = '\0hart-embed:no-app-session';
function noAppSession() {
  return {
    name: 'hart-embed-no-app-session',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && /services[\\/]axiosFactory\.js$/.test(importer) && /hooks\/useAuthSession$/.test(source)) {
        return NO_APP_SESSION;
      }
      return null;
    },
    load(id) {
      if (id === NO_APP_SESSION) {
        return "throw new Error('hart-embed: the app auth session is not bundled');";
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [noAppSession(), react({include: /\.(js|jsx)$/})],
  // CRA code keeps JSX in .js files.
  oxc: {include: /\.(js|jsx)$/, exclude: /node_modules/, lang: 'jsx', jsx: {runtime: 'automatic'}},
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV === 'test' ? 'test' : 'production'),
    'process.env': '{}',
  },
  resolve: {
    alias: [
      // ServerDrivenUI's `import * as MuiIcons` -> the curated embed set.
      {find: /^@mui\/icons-material$/, replacement: here('./src/embed/iconMap.js')},
    ],
  },
  // The CRA app owns public/; the library build must not copy it.
  publicDir: false,
  build: {
    outDir: 'build-embed',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2019',
    lib: {
      entry: here('./src/embed/index.js'),
      name: 'HartEmbed',
    },
    rollupOptions: {
      output: [
        {format: 'es', entryFileNames: 'hart-embed.es.js', chunkFileNames: 'hart-embed-[name]-[hash].js'},
        {format: 'umd', name: 'HartEmbed', entryFileNames: 'hart-embed.umd.js'},
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/embed/**/*.test.js'],
    testTimeout: 20000,
  },
});
