# 🎬 스토리보드 영상 프롬프트 스튜디오

상품 탐색 → 스토리보드 생성 → 플랫폼별 AI 영상 프롬프트 자동 생성

## 기능
- **1단계**: 쿠팡·네이버·알리·카카오쇼핑·토스쇼핑 트렌드 상품 탐색 (AI 수익성 분석, 상품 이미지 포함)
- **2단계**: 5개 스토리 프레임워크 × 13개 이미지 스타일 × 16개 플랫폼
- 카메라 무브 자동 결정 (씬 × 스타일 조합)
- YouTube/이미지 정책 자동 준수
- 씬별 AI 영상 프롬프트 (Sora·Runway·Kling·Veo 호환)

## 지원 AI 엔진
- Claude (Haiku 4.5 추천 — $1/$5/MTok)
- Gemini 2.5 Flash
- Kimi K3
- OpenRouter (DeepSeek 무료)

## 로컬 실행
```bash
npm install
npm run dev
```

## 배포
GitHub → main 브랜치 push → Cloudflare Pages 자동 배포

## GitHub Secrets 설정
- `CLOUDFLARE_API_TOKEN` — Cloudflare API 토큰
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare 계정 ID
