# SNVM AI

한국 기업과 개발자를 위한 선불 크레딧 AI API 서비스 랜딩 페이지입니다. 영문 브랜드는 SNVM AI, 한국어 표기는 스노비움 AI이며 사용할 도메인은 `snvm.cc`입니다. DNS 연결은 별도 작업입니다.

빌드나 외부 JS 의존성 없이 `dist/`를 정적 호스팅하면 됩니다.

```sh
npm run dev
npm test
```

로컬 주소: http://127.0.0.1:4317

## Vercel 배포

`vercel.json`에서 빌드·의존성 설치 없이 `dist/`를 배포하도록 설정합니다. GitHub 저장소는 Vercel의 `snvm-ai` 프로젝트에 연결되어 있습니다.

## 포함된 동작

- 8개 모델 검색, 유형 필터, 상세 안내
- 입력 검증이 적용된 20% 절감 계산기
- Google Forms로 연결되는 출시 알림 신청 및 문의 CTA
- Google Sheets에 모이는 신청 정보와 이메일 연락처
- API 예시 복사, FAQ, 모바일 메뉴
- 키보드 포커스, 모달, 모션 일시정지, 시스템 모션 줄이기 지원

## 실제 서비스 연결 시

출시 알림 신청과 문의는 Google Forms에서 접수하고 응답을 Google Sheets에 저장합니다. 실결제, 사용자 인증, 크레딧 원장, API 프록시는 구현하지 않았습니다. 가격표·환불·유효기간·사업자 안내는 실제 판매 정책에 맞춰 확정해야 합니다. `YOUR_API_HOST`와 `YOUR_MODEL_ID`는 의도적으로 실행되지 않는 예시 값입니다. API 키를 클라이언트 코드에 넣지 마세요.

폰트: Pretendard Variable (SIL Open Font License), `dist/fonts/OFL.txt` 참고.

구조 참고: https://openrouter.ai/ , https://ai-gateway.kr/
