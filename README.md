# TWENTY

한국 기업과 개발자를 위한 선불 크레딧 AI API 서비스 랜딩 페이지입니다. TWENTY는 임시 브랜드명입니다.

빌드나 외부 JS 의존성 없이 `dist/`를 정적 호스팅하면 됩니다.

```sh
npm run dev
npm test
```

로컬 주소: http://127.0.0.1:4317

## 포함된 동작

- 8개 모델 검색, 유형 필터, 상세 안내
- 입력 검증이 적용된 20% 절감 계산기
- 탭 메모리 기반 크레딧 충전 및 콘솔 체험
- 기업 문의서 로컬 다운로드 (서버 전송 없음)
- API 예시 복사, FAQ, 모바일 메뉴
- 키보드 포커스, 모달, 모션 일시정지, 시스템 모션 줄이기 지원

## 실제 서비스 연결 시

실결제, 사용자 인증, 크레딧 원장, API 프록시, 문의 접수는 구현하지 않았습니다. 가격표·환불·유효기간·사업자 및 개인정보 안내도 실제 정책으로 교체해야 합니다. `YOUR_API_HOST`와 `YOUR_MODEL_ID`는 의도적으로 실행되지 않는 예시 값입니다. API 키를 클라이언트 코드에 넣지 마세요.

폰트: Pretendard Variable (SIL Open Font License), `dist/fonts/OFL.txt` 참고.

구조 참고: https://openrouter.ai/ , https://ai-gateway.kr/
