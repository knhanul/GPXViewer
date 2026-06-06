// Capacitor 설정 파일.
// - appId: Android 패키지명
// - appName: Android 홈 화면에 표시되는 앱 이름
// - webDir: Vite 가 생성한 정적 빌드 디렉터리 (Capacitor 가 dist 전체를 앱에 포함)
//
// 주의: webDir 변경 시 Vite 출력 경로와 일치해야 한다.
//   => package.json scripts 의 build:android 에서 vite build --mode android 로
//      mode 'android' 분기를 활성화해 base 경로를 상대('./') 로 만든다.

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.co.nuni.gpxviewer',
  appName: 'GPX Viewer',
  webDir: 'dist'
};

export default config;
