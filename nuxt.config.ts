import UnheadVite from '@unhead/addons/vite';
import parseDuration from 'parse-duration';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { join } from 'pathe';
import { createResolver } from '@nuxt/kit';
import { isCI, isDevelopment, isProduction, isTest } from 'std-env';
import RollupReplace from '@rollup/plugin-replace';
import RollupSucrase from '@rollup/plugin-sucrase';

import { config } from './config/build';
import { getHeaders } from './config/headers';
import { breakpoints, sidebarsBreakpoints } from './constants/breakpoints';
import { ParseDurationTransformPlugin } from './unplugin/parse-duration';

const { resolve } = createResolver(import.meta.url);

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, interactive-widget=resizes-visual',
      htmlAttrs: { translate: 'no', lang: 'en' },
      meta: [
        { name: 'description', content: 'Better then just notes ❤. Synced between your devices, simple, fast and purple.' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#FCFCFD', media: '(prefers-color-scheme: light)', key: 'theme-color-light' },
        { name: 'theme-color', content: '#111113', media: '(prefers-color-scheme: dark)', key: 'theme-color-dark' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default', media: '(prefers-color-scheme: light)', key: 'status-bar-light' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent', media: '(prefers-color-scheme: dark)', key: 'status-bar-dark' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'robots', content: 'none' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'manifest', href: '/site.webmanifest', crossorigin: 'use-credentials' },
      ],
    },
  },

  experimental: {
    writeEarlyHints: true,
    componentIslands: true,
    watcher: 'parcel',
    typescriptBundlerResolution: true,
    headNext: true,
    appManifest: false,
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['vitest/importMeta'],
      },
      exclude: [
        '../data',
        '../benchmarks',
        '../scripts',
      ],
    },
  },

  imports: {
    dirs: [
      resolve('./constants'),
      resolve('./composables/toasts'),
    ],

    imports: [
      { from: 'rad-event-listener', name: 'on' },
      { from: 'perfect-debounce', name: 'debounce' },
    ],
  },

  runtimeConfig: {
    public: {
      siteOrigin: '',

      oauthEnabled: false,

      errors: {
        url: '',
        apiKey: '',
      },
    },

    github: {
      clientId: '',
      clientSecret: '',
    },

    google: {
      clientId: '',
      clientSecret: '',
    },

    axiom: {
      token: '',
      orgId: '',
      dataset: '',
    },
  },

  routeRules: {
    '/**': { headers: getHeaders('default') },

    // Caching only build assets that has build hash in filenames
    // Actually nuxt caches assets for 1 year by default
    // https://github.com/nuxt/nuxt/blob/7cb4c69935ba0de874ba3274c42fc1df8bbca3ed/packages/nuxt/src/core/nitro.ts#L102
    // this setup uses only 6 months and adds another 6 months for stale-while-revalidate cache
    '/_nuxt/**': { headers: getHeaders('assets') },

    '/api/**': { headers: getHeaders('api') },
    '/api/info': {
      // To correctly render response endpoint needs query, but nitro lacks
      // possibility to pass vercel specific options to isr yet.
      // isr: true
      headers: getHeaders('api-info'),
    },

    // this would be great https://github.com/unjs/nitro/issues/603#issuecomment-1415826732
    '/view/**': { isr: parseDuration('15 minutes', 'second') },
    '/site.webmanifest': { headers: getHeaders('webmanifest') },

    '/': { prerender: true },
    '/about': { prerender: true },

    '/oauth/ask-username': { experimentalNoScripts: true },
  },

  modules: [
    isTest && 'nuxt-vitest',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxtjs/fontaine',
    'unplugin-ltsdi/nuxt',
  ],

  css: [
    'normalize.css/normalize.css',
    '~/assets/styles/global.scss',
    '~/assets/fonts/Mona-Sans/style.css',
  ],

  sourcemap: isDevelopment,

  build: {
    transpile: ['tinykeys'],
  },

  hooks: {
    // minifies service worker
    'nitro:init': function (nitro) {
      if (isDevelopment)
        return;

      const terserPromise = import('terser');
      const fspPromise = import('node:fs/promises');

      nitro.hooks.hookOnce('compiled', async (nitro) => {
        const terser = await terserPromise;
        const fsp = await fspPromise;

        const { publicDir } = nitro.options.output;

        const swPath = join(publicDir, 'sw.js');
        const swSource = await fsp.readFile(swPath, 'utf-8');
        const swMinified = await terser.minify(swSource, {
          compress: true,
          mangle: true,
          ecma: 2020,
          sourceMap: false,
          ie8: false,
          safari10: false,
        });

        await fsp.writeFile(swPath, swMinified.code!);
      });
    },
  },

  vite: {
    define: {
      'import.meta.vitest': JSON.stringify(false),
      'import.meta.dev': JSON.stringify(isDevelopment),
      'import.meta.prod': JSON.stringify(isProduction),

      ...Object.fromEntries(
        Object.entries(config)
          .map(
            ([k, v]) => [`import.meta.config.${k}`, JSON.stringify(v)],
          ),
      ),
    },

    plugins: [
      UnheadVite(),
      ParseDurationTransformPlugin.vite(),
    ],

    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.json'],
    },

    build: {
      target: 'esnext',
      cssMinify: 'lightningcss',
      cssTarget: browserslistToEsbuild(),
      minify: isCI ? 'terser' : 'esbuild',
      terserOptions: !isCI ? undefined : { // eslint-disable-line style/multiline-ternary
        compress: true,
        mangle: true,
        safari10: false,
        ecma: 2020,
      },

      rollupOptions: {
        treeshake: 'recommended',

        output: {
          interop: 'esModule',
          generatedCode: {
            constBindings: true,
            objectShorthand: true,
          },
        },
      },

      commonjsOptions: {
        strictRequires: true,
      },
    },

    optimizeDeps: {
      include: [
        'rad-event-listener',
        '@prisma/client',
        'hashlru',
        'mitt',
        'idb-keyval',
        'perfect-debounce',
        'h3',
        'escape-string-regexp',
        'coincident',
        '@superhuman/command-score',
        '@popperjs/core',
        '@tiptap/core',
        '@tiptap/extension-blockquote',
        '@tiptap/extension-bold',
        '@tiptap/extension-bubble-menu',
        '@tiptap/extension-bullet-list',
        '@tiptap/extension-code',
        '@tiptap/extension-code-block',
        '@tiptap/extension-document',
        '@tiptap/extension-hard-break',
        '@tiptap/extension-heading',
        '@tiptap/extension-history',
        '@tiptap/extension-horizontal-rule',
        '@tiptap/extension-italic',
        '@tiptap/extension-link',
        '@tiptap/extension-list-item',
        '@tiptap/extension-ordered-list',
        '@tiptap/extension-paragraph',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-strike',
        '@tiptap/extension-task-item',
        '@tiptap/extension-task-list',
        '@tiptap/extension-text',
        '@tiptap/extension-text-align',
        '@tiptap/vue-3',
      ],
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: [
            Object.entries(breakpoints).map(([key, value]) => `$breakpoint-${key}: ${value}px;`).join('\n'),
            Object.entries(sidebarsBreakpoints).map(([key, value]) => `$sidebar-breakpoint-${key}: ${value}px;`).join('\n'),
          ].join('\n'),
        },
      },
    },

    $client: {
      build: {
        rollupOptions: {
          external: ['.prisma/client/index-browser'],
        },
      },
    },

    $server: {
      plugins: [
        // Taken from elk
        //  https://github.com/elk-zone/elk/blob/ed5592260fc83f0207a12a7184973749e87bc85e/nuxt.config.ts#L186
        {
          name: 'mock',
          enforce: 'pre',
          resolveId(id) {
            if (id.match(/(^|\/)(@tiptap)\//))
              return resolve('./mocks/tiptap.ts');
            if (id.match(/(^|\/)(prosemirror)/))
              return resolve('./mocks/prosemirror.ts');
          },
        },
      ],
    },
  },

  nitro: {
    // https://github.com/danielroe/roe.dev/blob/main/nuxt.config.ts#L115
    replace: { 'process.browser': false },

    imports: {
      dirs: [
        resolve('./prisma'),
      ],
    },

    typescript: {
      tsConfig: {
        compilerOptions: {
          types: ['vitest/importMeta'],
        },
      },
    },

    rollupConfig: {
      // @ts-expect-error probably broken types
      plugins: [
        RollupReplace({
          preventAssignment: true,
          values: {
            'import.meta.vitest': JSON.stringify(false),
            'import.meta.dev': JSON.stringify(isDevelopment),
            'import.meta.prod': JSON.stringify(isProduction),
          },
        }),
      ],
    },

    esbuild: {
      options: {
        target: 'esnext',
      },
    },

    storage: {
      cache: {
        driver: 'redis',
        url: process.env.REDIS_URL,
        tls: true,
      },
    },
  },

  serverHandlers: [
    {
      route: '/security.txt',
      handler: resolve('./server/routes/.well-known/security.txt.get.ts'),
      lazy: true,
    },
  ],

  fontMetrics: {
    fonts: [
      {
        family: 'Mona Sans',
        src: '/fonts/Mona-Sans/Mona-Sans.woff2',
        root: 'assets',
        fallbacks: ['Arial'],
      },
    ],
  },

  pwa: {
    srcDir: 'workers',
    filename: 'sw.ts',
    registerType: 'prompt',
    strategies: 'injectManifest',
    manifest: false,
    includeManifestIcons: false,
    minify: true, // TODO: why this is not working ? https://github.com/vite-pwa/nuxt/issues/62

    client: {
      installPrompt: false,
      registerPlugin: true,
      periodicSyncForUpdates: parseDuration('1 hour', 'second'),
    },

    injectManifest: {
      globPatterns: ['**/*.{js,json,css,html,txt,svg,png,ico,webp,woff,woff2,ttf,eot,otf,wasm}'],
      globIgnores: ['**.webmanifest', 'register', 'login', 'sw.js', 'index.html'],
    },
  },

  $production: {
    nitro: {
      minify: true,

      rollupConfig: {
        plugins: [
          // NOTE: it results in smaller server size and faster builds. Neat ¯\_(ツ)_/¯
          RollupSucrase({
            transforms: [
              'typescript',
            ],
          }),
          ParseDurationTransformPlugin.rollup(),
        ],
      },
    },
  },
});
