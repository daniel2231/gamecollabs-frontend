import { fileURLToPath } from 'node:url';

// Radix Themes에서 쓰지 않는 규칙을 지우는 플러그인(postcss/trim-radix.cjs 참고).
// 플러그인은 이름(문자열)으로만 줄 수 있고 Turbopack 작업자에서는 상대 경로를 못 찾아 절대 경로로 넘긴다
export default {
  plugins: [fileURLToPath(new URL('./postcss/trim-radix.cjs', import.meta.url))],
};
