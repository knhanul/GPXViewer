import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA 설정: Workbox 기반 정적 자산 precache + OSM 타일 런타임 캐시.
    VitePWA({
      registerType: 'autoUpdate',
      // 정적 자산으로 그대로 복사할 파일들
      includeAssets: [
        'favicon.svg',
        'favicon-64.png',
        'apple-touch-icon.png',
        'sample-bukhansan.gpx'
      ],
      manifest: {
        id: '/',
        name: 'GPX 뷰어',
        short_name: 'GPX 뷰어',
        description: '브라우저에서 GPX 경로를 시각화하는 미니멀 PWA',
        theme_color: '#0F1419',
        background_color: '#0F1419',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ko',
        categories: ['sports', 'navigation', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // 빌드 산출물의 모든 정적 자원을 precache
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // 폰트 등 외부 CDN 자원은 precache 에서 제외
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // 런타임 캐시: OSM 타일 + Google Fonts CSS
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              String(url).includes('tile.openstreetmap.org'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ url }) =>
              String(url).includes('fonts.googleapis.com') ||
              String(url).includes('fonts.gstatic.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      },
      devOptions: {
        // 개발 모드에서도 SW 활성화 (디버깅 편의)
        enabled: false
      }
    })
  ],
  server: {
    // Windows 에서 IPv6 (::1) 바인딩이 차단되는 경우가 많다.
    // EACCES 회피를 위해 IPv4 (127.0.0.1) 만 사용하도록 명시한다.
    // 네트워크 노출이 필요하면 'npm run dev -- --host 0.0.0.0' 으로 실행한다.
    host: '127.0.0.1',
    port: 5173,
    strictPort: false
  },
  preview: {
    // preview 서버는 IPv4 명시 + 다양한 환경에서 안전하게 동작
    host: '127.0.0.1',
    port: 4173
  }
})
