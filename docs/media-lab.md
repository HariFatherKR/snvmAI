# SNVM 공급자별 이미지·영상 API 테스트

확인 기준일: **2026-11-03**

SNVM에서 사용할 이미지·영상 API를 로컬에서 확인하는 Node.js CLI입니다. TokenHub와 WAND는 서로 다른 담당팀의 독립된 연동입니다. 텍스트 모델 연결은 이후 단계이며, 구축 과정에서 실제 생성 API는 아직 호출하지 않았습니다.

| 공급자 | 담당팀 | 현재 상태 |
| --- | --- | --- |
| `tokenhub` | 팀 1 | TokenHub에서 제공하는 WAND 이미지 Lite·영상 Lite의 요청 구성, 생성 및 작업 조회 구현 |
| `wand` | 팀 5 | 별도 WAND 전용 API 규격 확인 대기 (`pending-contract`) |

모델 이름에 WAND가 있어도 `tokenhub`로 호출하면 TokenHub 연동입니다. `--provider tokenhub` 또는 `--provider wand`로 공급자를 선택하며, 생략하면 기존 동작대로 `tokenhub`를 사용합니다.

## 준비

프로젝트 루트에서 실행합니다. Node.js 22.16 이상과 npm이 필요하며, 별도 npm 패키지는 설치하지 않습니다.

TokenHub를 실제 호출하기 전에 Tencent Cloud 계정에서 TokenHub를 활성화하고, TokenHub API Key를 발급합니다. 콘솔의 **Online Inference → Vision Models**에서 사용할 모델의 후불 과금도 활성화해야 합니다. 모델별 사용 가능 여부는 해당 계정의 콘솔에서 확인합니다. [TokenHub API 사용 안내](https://www.tencentcloud.com/document/product/1300/78941), [TokenHub WAND 영상 사전 조건](https://www.tencentcloud.com/document/product/1300/84930)

처음 설정할 때:

```sh
cp .env.example .env.local
```

기존 `.env.local`이 있다면 복사하지 말고 다음 항목만 추가합니다.

```dotenv
TOKENHUB_API_KEY=발급받은_API_Key
WAND_BASE_URL=
```

TokenHub 요청 호스트는 `https://tokenhub-intl.tencentcloudmaas.com`으로 고정하며, `TOKENHUB_API_KEY`를 Bearer 인증에 사용합니다. API Key를 명령줄의 프롬프트나 저장소에 넣지 않습니다.

`WAND_BASE_URL`은 별도 WAND 전용 주소를 위한 빈 설정 항목입니다. 사용자가 제공할 전용 API 주소·문서에서 인증 방식, 모델 ID, 생성·조회 경로와 응답 구조를 확인한 뒤 연결합니다. 주소만 입력해도 실행 가능 상태로 바뀌지 않습니다. WAND의 인증 방식을 가정하거나 TokenHub 키를 재사용하지 않으며, VOD/MPS 경로도 이 전용 API로 간주하지 않습니다.

## 요청 미리보기

`--execute`를 생략하면 API를 호출하지 않는 dry-run입니다. 먼저 모델과 요청 내용을 확인합니다.

```sh
npm run lab -- list
npm run lab -- list --provider tokenhub
npm run lab -- image --provider tokenhub --prompt "흰 배경 위에 놓인 무광 검정 머그컵 제품 사진"
npm run lab -- video --provider tokenhub --prompt "나무 책상 위 머그컵에서 김이 천천히 올라온다. 카메라는 고정되어 있다."
```

`list`는 공급자별 연결 상태를, `list --provider tokenhub`는 구현된 TokenHub 모델 목록을 보여 줍니다. 계정의 전체 모델을 실시간 조회하지 않습니다.

아래는 현재 구현된 **TokenHub 모델**입니다.

| 명령 | 모델 ID | 기본 설정 |
| --- | --- | --- |
| `image` | `wand-vega-image-lite` | `1024x1024`, 텍스트로 이미지 생성 |
| `video` | `wand-vega-video-1.0-lite` | `768P`, `16:9`, 5초, 텍스트로 영상 생성 |

기본값은 이 테스트 도구의 선택입니다. 모델 전체 기능이나 모든 입력 옵션을 제공하지는 않습니다. [TokenHub WAND 이미지 API](https://www.tencentcloud.com/document/product/1300/83859), [TokenHub WAND 영상 API](https://www.tencentcloud.com/document/product/1300/84930)

`image --provider wand`, `video --provider wand`와 WAND 작업의 `resume`은 전용 API 규격 확인 전까지 오류 안내와 함께 종료됩니다. 네트워크 요청을 보내거나 TokenHub로 자동 전환하지 않습니다.

## TokenHub 실제 생성

미리보기에서 확인한 명령에 `--execute`를 붙입니다. 이때 실제 생성 요청을 보내므로 계정의 과금 조건이 적용됩니다.

```sh
npm run lab -- image --provider tokenhub --prompt "흰 배경 위에 놓인 무광 검정 머그컵 제품 사진" --execute
npm run lab -- video --provider tokenhub --prompt "나무 책상 위 머그컵에서 김이 천천히 올라온다. 카메라는 고정되어 있다." --execute
```

이미지와 영상 모두 작업을 제출한 뒤 5초 간격으로 최대 10분간 상태를 조회합니다. 개별 HTTP 요청의 제한 시간은 30초입니다. 생성 소요 시간과 성공 여부는 실제 호출 결과로 확인합니다.

## 중단한 작업 조회 재개

이미 작업 ID를 받았다면 새 생성 요청 대신 `resume`으로 조회를 이어갑니다. 아래 `TASK_ID`를 보고서나 터미널에 표시된 실제 ID로 바꿉니다.

```sh
npm run lab -- resume image --task TASK_ID --provider tokenhub --execute
npm run lab -- resume video --task TASK_ID --provider tokenhub --execute
```

`resume`에는 작업을 생성한 공급자를 지정합니다. 기존 작업의 상태만 조회하며 새 작업을 만들지 않습니다. 조회가 시간 초과되거나 중단되어도 서버의 생성 작업이 취소된다는 뜻은 아닙니다. 제출 중 연결이 끊겨 작업 ID를 받지 못했다면 콘솔에서 요청 접수 여부를 확인한 뒤 재요청합니다.

## 결과와 오류 확인

실행 결과는 다음 경로에서 확인합니다.

```text
artifacts/media-lab/<provider>/<실행 ID>/report.json
artifacts/media-lab/<provider>/<실행 ID>/index.html
```

`report.json`에서 `provider`, 요청 설정, 작업 ID, 처리 상태, 결과 URL과 반환된 사용량을 확인합니다. `status`는 도구의 실행 상태이며, `providerStatus`는 API가 반환한 작업 상태입니다. 오류가 나면 `error`, `nextStep`과 요청 ID가 있는지 확인합니다. `index.html`은 저장된 실행 내용을 읽기 쉽게 보여 주고, 성공한 결과 URL로 이미지·영상을 미리 봅니다.

`dry-run`은 미리보기, `succeeded`는 완료, `failed`는 생성 실패입니다. `timed-out`은 조회 대기 종료, `error`는 HTTP·연결·응답 처리 등의 오류를 뜻합니다. API Key가 없거나 입력이 잘못된 경우에는 요청 전에 종료하며 보고서를 만들지 않습니다.

**TokenHub에서 제공하는 WAND 모델**의 상태값은 이미지와 영상이 다릅니다. 별도 WAND 전용 API의 상태값은 아직 확인하지 않았습니다.

| 종류 | 대기·처리 중 | 성공 | 종료 오류 |
| --- | --- | --- | --- |
| 이미지 | `queued`, `in_progress` | `completed` | `failed`, `cancelled`, `incomplete` |
| 영상 | `queued`, `running` | `succeeded` | `failed` |

키 오류는 API Key와 활성화 계정을, 모델 사용 오류는 해당 모델의 이용·과금 설정을 확인합니다. 사용량이 응답에 없다면 사용량을 확인할 수 없는 상태이며, 0원이나 무료라는 뜻은 아닙니다.

TokenHub 보고서는 API가 반환한 `usage`를 기록하며 **청구 금액을 추정하지 않습니다**. 실제 과금과 계약 할인은 해당 공급자의 콘솔·계약 조건으로 확인합니다. 홈페이지의 할인 표시를 API 테스트 비용 계산에 적용하지 않습니다. [TokenHub 과금표](https://www.tencentcloud.com/document/product/1300/78937)

결과 파일은 자동 다운로드하지 않습니다. 미리보기는 원격 결과 URL을 사용하므로 URL이 만료되면 재생되지 않을 수 있습니다. **TokenHub 경로**의 WAND 이미지 URL은 임시 서명 URL이며, 영상 URL의 문서상 유효 기간은 12시간입니다. 별도 WAND의 보관 조건은 확인 전입니다. 보관할 결과는 직접 저장합니다. [TokenHub 이미지 결과 안내](https://www.tencentcloud.com/document/product/1300/83859), [TokenHub 영상 결과 안내](https://www.tencentcloud.com/document/product/1300/84930)

## TokenHub 추가 연결 후보

아래는 **TokenHub 공식 문서**에서 ID를 확인한 추가 구현 후보입니다. 현재 CLI에서 선택하거나 호출할 수 있는 모델 목록이 아니며, 별도 WAND의 모델 지원을 뜻하지도 않습니다. 각 모델의 제출·조회 방식과 응답 구조를 별도로 연결해야 합니다.

| 종류 | 후보 모델 ID | 공식 문서 |
| --- | --- | --- |
| WAND 이미지 | `wand-vega-image-flash`, `wand-vega-image-pro` | [TokenHub WAND 이미지](https://www.tencentcloud.com/document/product/1300/83859) |
| Seedream 이미지 | `seedream-image-v5.0-pro`, `seedream-image-v5.0-flash` | [Seedream 이미지](https://www.tencentcloud.com/document/product/1300/83710) |
| Kling 이미지 | `kling-image-v3`, `kling-image-o1`, `kling-image-v3-omni` | [Kling 이미지](https://www.tencentcloud.com/document/product/1300/85048) |
| Vidu 이미지 | `vidu-image-q2` | [Vidu 이미지](https://www.tencentcloud.com/document/product/1300/83709) |
| Kling 영상 | `kling-video-v4`, `kling-video-v3`, `kling-video-v3-turbo`, `kling-video-v3-omni` | [Kling 영상](https://www.tencentcloud.com/document/product/1300/83714) |
| Vidu 영상 | `vidu-video-q4-preview`, `vidu-video-q3-turbo`, `vidu-video-q3-pro`, `vidu-video-q3` | [Vidu 영상](https://www.tencentcloud.com/document/product/1300/84817) |

Seedream은 이미지 모델이며 Seedance 영상과 구분합니다. 제공받은 소개 자료에만 있고 TokenHub 공개 API 문서에서 확인하지 못한 WAND Image 1.5 Pro, WAND Video 1.0 Pro·1.5 Pro와 `custom-model-gn` 계열은 이 표에 포함하지 않았습니다. TokenHub 모델 추가 전 최신 문서와 계정의 이용 가능 여부를 다시 확인합니다.
