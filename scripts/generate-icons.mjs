// PWA 아이콘 생성 스크립트 (1회 실행)
// SVG 소스로부터 PWA 설치에 필요한 모든 PNG 아이콘을 생성한다.
// 사용법: npm run icons

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.resolve(__dirname, '..', 'public')

// 트레일/마운틴 마크 SVG (정사각, 1024x1024 디자인)
// iOS / Android 다크 배경에서 잘 보이도록 컬러풀하게.
const ICON_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1419"/>
      <stop offset="100%" stop-color="#1A1F26"/>
    </linearGradient>
    <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="200" fill="url(#bg)"/>
  <!-- 산 능선 -->
  <path d="M120 720 L320 480 L460 600 L620 380 L800 540 L900 480"
        fill="none" stroke="url(#ridge)" stroke-width="48"
        stroke-linecap="round" stroke-linejoin="round"/>
  <!-- 시작 마커 -->
  <circle cx="620" cy="380" r="44" fill="#22D3EE"/>
  <circle cx="620" cy="380" r="20" fill="#0F1419"/>
  <!-- 종료 마커 -->
  <circle cx="900" cy="480" r="44" fill="#F97316"/>
  <circle cx="900" cy="480" r="20" fill="#0F1419"/>
</svg>`

// maskable 아이콘: 안전 영역(safe zone) 안쪽에 핵심 그래픽 배치.
// safe zone 은 중앙 80% 영역 (padding 10%).
const MASKABLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F1419"/>
      <stop offset="100%" stop-color="#1A1F26"/>
    </linearGradient>
    <linearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <!-- safe zone 안쪽 (padding 10%) -->
  <g transform="translate(102.4, 102.4) scale(0.8)">
    <path d="M120 720 L320 480 L460 600 L620 380 L800 540 L900 480"
          fill="none" stroke="url(#ridge)" stroke-width="60"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="620" cy="380" r="56" fill="#22D3EE"/>
    <circle cx="620" cy="380" r="24" fill="#0F1419"/>
    <circle cx="900" cy="480" r="56" fill="#F97316"/>
    <circle cx="900" cy="480" r="24" fill="#0F1419"/>
  </g>
</svg>`

const targets = [
  // 일반 아이콘 (PWA manifest, 안드로이드)
  { name: 'pwa-192x192.png', size: 192, svg: ICON_SVG, rounded: false },
  { name: 'pwa-512x512.png', size: 512, svg: ICON_SVG, rounded: false },
  // maskable 아이콘 (안드로이드 adaptive icon)
  {
    name: 'maskable-icon-512x512.png',
    size: 512,
    svg: MASKABLE_SVG,
    rounded: false
  },
  // iOS apple-touch-icon (180x180)
  {
    name: 'apple-touch-icon.png',
    size: 180,
    svg: ICON_SVG,
    rounded: false
  },
  // 파비콘 PNG (fallback, 64x64)
  { name: 'favicon-64.png', size: 64, svg: ICON_SVG, rounded: false }
]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function main() {
  await ensureDir(publicDir)

  for (const t of targets) {
    const out = path.join(publicDir, t.name)
    const png = await sharp(Buffer.from(t.svg))
      .resize(t.size, t.size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toBuffer()
    await fs.writeFile(out, png)
    console.log(`✓ generated ${t.name} (${t.size}x${t.size})`)
  }

  // iOS 가 apple-touch-icon-precomposed.png 도 인식하지만, 같은 파일로도 OK.
  console.log('\n모든 아이콘이 public/ 에 생성되었습니다.')
}

main().catch((err) => {
  console.error('아이콘 생성 실패:', err)
  process.exit(1)
})
