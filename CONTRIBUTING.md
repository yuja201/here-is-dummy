# 🤝 Contributing to Here’s Dummy

여깄덤(Here’s Dummy)에 관심을 가지고 기여해주셔서 감사합니다!  
</br>

## 📖 목차

- [프로젝트 개요](#-프로젝트-개요)
- [1. 개발 환경 준비](#1-개발-환경-준비)
- [2. 프로젝트 구조](#2-프로젝트-구조)
- [3. 브랜치 전략](#3-브랜치-전략)
- [4. 커밋 컨벤션 conventional commits](#4-커밋-컨벤션-conventional-commits)
- [5. Pull Request 규칙](#5-pull-request-규칙)
- [6. 이슈 작성 규칙](#6-이슈-작성-규칙)
- [7. Data Generator / DB Test 기여 안내](#7-data-generator--db-test-기여-안내)
- [8. UI/UX 기여 가이드](#8-uiux-기여-가이드)
- [9. 테스트](#9-테스트)
- [10. 코드 작성 시 참고 사항](#10-코드-작성-시-참고-사항)

</br>

## 프로젝트 개요

**Here’s Dummy**는 데이터베이스 스키마 분석과 더미 데이터 자동 생성,  
그리고 인덱스/쿼리 성능 테스트 기능을 제공하는 **Electron 기반 데스크탑 앱**입니다.

기술 스택:

- Electron, React, Vite, TypeScript
- mysql2, pg
- Faker.js, OpenAI / Claude / Gemini
- Zustand

</br>

## 1. 개발 환경 준비

### 1-1. 요구 사항

| 항목          | 버전                    |
| ------------- | ----------------------- |
| Node.js       | 18 이상                 |
| npm 또는 yarn | 최신 버전               |
| OS            | Windows / macOS / Linux |

### 1-2. 로컬 실행 방법

```bash
# 저장소 클론
git clone https://github.com/yuja201/here-is-dummy.git
cd here-is-dummy

# 의존성 설치
npm install

# 환경 변수 파일 생성
cp .env.example .env
# OpenAI, Anthropic, Gemini API KEY 입력

# 개발 모드 실행
npm run dev
```

</br>

## 2. 프로젝트 구조

`여깄덤`은 다음과 같이 세 개의 독립적인 프로세스(Main, Preload, Renderer)로 구성된 표준 Electron 아키텍처를 따릅니다. 각 디렉토리의 역할은 다음과 같습니다.

```
here-is-dummy/
└── src/
    ├── main/
    ├── preload/
    ├── renderer/
    └── shared/
```

---

### 📂 `src/main` - 메인 프로세스 (백엔드 로직)

Node.js 환경에서 실행되며, 애플리케이션의 핵심 백엔드 로직, 데이터베이스 통신, 파일 시스템 접근, 윈도우 관리 등 모든 핵심 기능을 담당합니다. **UI와 분리되어 있습니다.**

- `index.ts`: Electron 애플리케이션의 생명주기를 관리하는 메인 프로세스 진입점입니다.
- **`database/`**: 데이터베이스 스키마, 마이그레이션, 프로젝트 설정(DB 연결 정보 등)을 관리합니다.
  - `schema.ts`: DB 스키마(테이블, 컬럼, 제약조건 등)를 정의하고 분석하는 로직이 담겨있습니다.
  - `projects.ts`: 생성된 프로젝트 정보를 관리하는 로직입니다.
- **`ipc/`**: 렌더러 프로세스(UI)로부터의 요청을 수신하고 처리하는 **IPC 핸들러**의 집합입니다.
  - `data-generator-handlers.ts`: 데이터 생성 요청을 받아 `DataGeneratorService`에 작업을 위임합니다.
  - `database-handlers.ts`: DB 연결, 스키마 조회 등의 요청을 처리합니다.
- **`services/`**: 애플리케이션의 핵심 비즈니스 로직을 포함하는 **서비스 레이어**입니다. **여기가 핵심 로직의 대부분을 차지합니다.**
  - `data-generator/`: **데이터 생성의 심장부입니다.**
    - `data-generator-service.ts`: 데이터 생성 요청을 받아 Worker Thread Pool에 작업을 분배하는 오케스트레이터 역할을 합니다.
    - `worker-runner.ts`: 실제 데이터 생성(Faker.js, AI 호출 등)을 수행하는 Worker Thread의 실행 코드입니다.
    - 각 `* -generator.ts` 파일들은 생성 유형(AI, 고정값, 참조 등)에 따른 구체적인 로직을 담고 있습니다.
  - `index-analyzer/`: DB 인덱스 효율성을 분석하는 서비스입니다.
  - `user-query-test/`: 사용자 SQL의 실행 계획을 분석하고 성능을 측정하는 서비스입니다.
  - `ai/`: OpenAI, Claude, Gemini 등 여러 AI 모델을 일관된 인터페이스로 사용할 수 있도록 하는 `AI Factory` 및 어댑터 패턴이 구현되어 있습니다.

---

### 📂 `src/preload` - 프리로드 스크립트

메인 프로세스와 렌더러 프로세스 사이의 **안전한 다리(Bridge)** 역할을 합니다. 메인 프로세스의 특정 기능(`ipcRenderer.invoke` 등)을 `window` 객체에 안전하게 노출시켜, 렌더러가 Node.js API를 직접 호출하지 않고도 백엔드 기능에 접근할 수 있게 합니다.

- `index.ts`: 메인 프로세스의 API를 렌더러의 `window.api` 객체로 노출시키는 스크립트입니다.
- `index.d.ts`: 렌더러에서 `window.api`를 타입스크립트로 안전하게 사용할 수 있도록 타입 정의를 제공합니다.

---

### 📂 `src/renderer` - 렌더러 프로세스 (UI)

사용자 인터페이스(UI)를 담당하는 **React 애플리케이션**입니다. Chromium 브라우저 환경에서 실행되며, 사용자 입력 처리, 상태 관리, 화면 렌더링에만 집중합니다.

- `index.html`: React 앱이 마운트되는 루트 HTML 파일입니다.
- **`src/`**: React 소스 코드 디렉토리입니다.
  - `main.tsx`: React 애플리케이션의 진입점입니다.
  - `App.tsx`: 라우팅(화면 전환)을 포함한 애플리케이션의 최상위 레이아웃 컴포넌트입니다.
  - **`views/`**: 각 페이지에 해당하는 큰 단위의 컴포넌트들입니다. (예: `CreateDummyView.tsx`)
  - **`components/`**: 버튼, 모달, 테이블 등 애플리케이션 전반에서 재사용되는 작은 단위의 UI 컴포넌트들입니다.
  - **`modals/`**: 특정 목적(규칙 생성, FK 설정 등)을 위해 제작된 복잡한 모달 컴포넌트들입니다.
  - **`stores/`**: `Zustand`를 사용한 전역 상태 관리 스토어입니다. UI 상태와 데이터 생성 규칙 등을 관리합니다.
  - `utils/` / `hooks/`: 렌더러 내에서 사용되는 공통 함수 및 커스텀 React 훅입니다.

---

### 📂 `src/shared` - 공유 코드

메인 프로세스와 렌더러 프로세스 **양쪽 모두에서 사용되는** 코드입니다.

- `types.ts`: IPC 통신 시 주고받는 데이터의 형태를 정의하는 **TypeScript 타입과 인터페이스**가 포함되어 있습니다. 이 파일을 통해 프로세스 간 데이터 통신의 안정성과 일관성을 보장합니다.

</br>
</br>

## 3. 브랜치 전략

프로젝트는 GitHub Flow 기반으로 운영됩니다.

### ✔ 기본 브랜치

- main : 배포 가능한 안정 버전
- dev : 다음 릴리즈를 준비하는 통합 브랜치

### ✔ 작업 브랜치 규칙 (feature branches)

- 작업 시 반드시 dev에서 브랜치를 생성합니다.

```
feature/{기능명}
fix/{이슈번호}-{수정내용}
refactor/{모듈명}
docs/{문서명}
```

### ✔ 예시

```
feature/data-generator-ai
fix/102-schema-parsing-error
refactor/electron-ipc
docs/update-readme
```

</br>

## 4. 커밋 컨벤션 (Conventional Commits)

여깄덤은 Conventional Commits을 사용합니다.

| 타입     | 설명                              |
| -------- | --------------------------------- |
| feat     | 새로운 기능 추가                  |
| fix      | 버그 수정                         |
| docs     | 문서 변경                         |
| style    | 코드 스타일 변경 (기능 영향 없음) |
| refactor | 리팩토링                          |
| test     | 테스트 관련 추가/수정             |
| chore    | 빌드/설정/환경 작업               |

### ✔ 예시

```
feat: add AI-based smart data generator logic
fix: resolve mysql schema parsing error on FK
refactor: split query runner service for performance
docs: update index test documentation
```

</br>

## 5. Pull Request 규칙

PR을 생성할 때 아래 규칙을 지켜주세요.

### 5-1. PR 제목

```
[feat] AI 기반 데이터 생성 로직 추가
[fix] PostgreSQL 연결 시 인증 문제 해결
[refactor] 인덱스 검사 로직 모듈화
```

### 5-2. PR 설명 템플릿

```
## ✨ 작업 내용

> 기능에서 어떤 부분이 구현되었는지 설명해주세요.

  <br/>

## 🔍 변경 이유

- 왜 해당 작업을 했는지 명확하게 작성

<br/>

## 💬 리뷰 요구사항 (선택)

> 리뷰어가 특별히 봐주었으면 하는 부분이 있다면 작성해주세요.
> ex) 메서드 XXX의 이름을 더 잘 짓고 싶은데 혹시 좋은 명칭이 있을까요?

<br/>

## 📸 이미지 첨부 (선택)

<br/>

## 기타(선택)

- 관련 이슈 번호 (#123)
```

### 5-3. PR 조건

    - Lint/Build 오류 없어야 합니다

    - dev 브랜치 기준으로 PR 생성해 주세요

    - 가능하면 관련 이슈 번호 연결해 주세요

    - 변경 범위가 너무 크면 쪼개서 제출 해주세요

### 5-4. PR 자동 검증

Pull Request를 제출하면 코드 품질을 유지하기 위해 다음과 같은 자동화된 검증 프로세스가 실행됩니다.

    - GitHub Actions (CI): PR이 생성되면 타입 검사, ESLint, 빌드 테스트가 자동으로 실행됩니다. 여기서 오류가 발생하면 PR이 병합될 수 없으므로, 반드시 오류를 수정한 후 다시 커밋해주세요.
    - Coderabbit (자동 코드 리뷰): AI 코드 리뷰어가 코드 변경점을 분석하여 잠재적 버그, 가독성 문제 등을 지적하는 코멘트를 남길 수 습니다. 제안된 내용을 참고하여 더 좋은 코드를 만들어주세요.

</br>

## 6. 이슈 작성 규칙

이슈는 아래 3가지 템플릿 중 하나를 선택해서 작성해주세요.

1. 버그 리포트
2. 기능 요청
3. 유지 보수 이슈

</br>

## 7. Data Generator / DB Test 기여 안내

프로젝트의 핵심 로직은 **src/main/services/**에 존재합니다.

이 디렉토리의 변경은 아래 기준을 따라야 합니다.

- 비동기 로직은 IPC block 방지를 우선해야 합니다.

- AI 요청은 공통 모듈 (aiClient.ts) 사용합니다.

- DB 스키마 분석 로직 변경 시 최소 1개 이상의 실제 DB 테스트 필요합니다.

- Generator 로직 변경 시 기존 Faker 기반 로직을 깨지 않도록 유지해 주세요.

</br>

## 8. UI/UX 기여 가이드

- Atomic Design 계층을 유지하며 컴포넌트를 구성합니다.

- Zustand store 수정 시 타입 변경에 주의해 주세요.

- GIF/이미지 업데이트 시 docs/images에 추가해 주세요.

- UI 변경 시 반드시 스크린샷 또는 GIF 포함해 주세요.

</br>

## 9. 테스트

현재 `여깄덤`은 핵심 기능의 안정성을 보장하기 위해 실제 데이터베이스와 연동하는
E2E(End-to-End) 테스트 및 수동 테스트를 중심으로 품질을 관리하고 있습니다.

- **핵심 로직 테스트**: 데이터 생성, 스키마 분석, 쿼리 테스트 등 DB와 직접 통신하는 핵심  
   로직은 변경 시 **반드시 실제 DB(MySQL, PostgreSQL 등)와 연결하여 기능이 정상 동작하는지 직접
  테스트**해야 합니다.

- **UI 테스트**: UI 변경 시에는 기능의 의도대로 동작하는지 스크린샷 또는 GIF를 PR에 첨부하
  시각적으로 검증합니다.
- **체크리스트**: PR 설명란에 변경 사항에 대한 자체 검증 체크리스트를 작성하는 것을  
  권장합니다.

</br>

## 10. 코드 작성 시 참고 사항

1. 타입스크립트 strict mode 준수해 주세요.

2. Electron IPC는 모듈 단위로 구분해 주세요.

3. 서비스 로직은 UI 컴포넌트에 직접 포함하는 것을 지양합니다.

4. “UI ↔ 상태관리 ↔ 서비스” 구조를 유지해 주세요.

5. AI 호출은 반드시 공통 함수 이용해 주세요. (재시도/타임아웃 시스템 포함)
