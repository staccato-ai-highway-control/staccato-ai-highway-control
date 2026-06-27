/**
 * 파일 역할: Tailwind CSS를 포함한 PostCSS 변환 파이프라인을 구성합니다.
 * 유지보수 참고: 여기에 등록된 플러그인은 개발 서버와 프로덕션 빌드의 CSS 처리 과정에 함께 적용됩니다.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
