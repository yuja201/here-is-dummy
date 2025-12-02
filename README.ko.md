<h1 align="center">
  <img src="docs/images/yuja.png" width="65">
  <br/>
  <strong>여깄덤 (Here’s Dummy)</strong>
</h1>

<h3 align="center">시간을 아껴주는 DB 파트너</h3>

</br>
<!-- 언어 선택 -->
<p align="center">
  <a href="README.ko.md">🇰🇷 한국어</a> • 
  <a href="README.md">🇺🇸 English</a>
</p>

<!-- 주요 링크 -->
<p align="center">
  <a href="https://github.com/yuja201/here-is-dummy/releases">⬇️ Releases</a> •
  <a href="https://www.buymeacoffee.com/heresdummy">☕ Support</a>
</p>

<!-- 배지 -->
<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square">
  <img src="https://img.shields.io/github/v/release/yuja201/here-is-dummy?style=flat-square">
</p>

</br>

## 목차

- [프로젝트 소개](#1-프로젝트-소개)
- [핵심 기능](#2-핵심-기능)
- [시작하기](#3-시작하기)
- [사용 방법](#4-사용-가이드)
- [기술 스택](#️5-기술-스택)
- [개발자용 가이드](#6-개발자용-가이드)
- [고급 설정](#️7-고급-설정)
- [기여하기](#8-기여하기)
- [라이선스](#9-라이선스)
- [문의 및 지원](#10-문의-및-지원)

</br>

## 1. 프로젝트 소개

<strong>여깄덤(Here’s Dummy)</strong>은 데이터베이스 스키마를 자동으로 분석하고, AI 또는 Faker.js를 활용하여 현실적인 대용량 더미 데이터를 생성하는 데스크탑 애플리케이션입니다. 개발 및 테스트 단계에서 필요한 데이터를 쉽고 빠르게 확보하여 생산성을 높일 수 있습니다.

</br>

## 2. 핵심 기능

여깄덤은 **더미 데이터 생성**과 **DB 성능 테스트** 기능을 제공합니다.

### 1. 데이터 생성

- **스키마 자동 분석**: 테이블 구조, 제약 조건, 관계(FK)를 자동으로 파악합니다.
- **다중 데이터베이스 지원**: **MySQL, PostgreSQL** 등 다양한 DB에 연결하여 데이터를 생성할 수 있습니다.
- **고속 대량 생성**: Faker.js 기반으로 **10만 건** 데이터를 **약 10초** 내에 생성할 수 있습니다.
- **AI 기반 생성**: **GPT, Claude, Gemini**를 활용하여 컬럼의 문맥에 맞는 똑똑하고 현실적인 데이터를 생성합니다.
- **파일 기반 데이터 변환**: **CSV, TXT, JSON** 파일을 업로드하여 DB 구조에 맞게 데이터를 변환하고 삽입합니다.

### 2. **DB 성능 테스트**

- **인덱스 테스트**: 데이터베이스 **인덱스**의 **효율성**을 분석해드립니다.
- **사용자 쿼리 테스트**: **쿼리 성능**을 분석하고 **개선 방안**을 추천해드립니다.
- **테스트 히스토리**: 진행된 테스트 이력을 확인할 수 있습니다.

  </br>

## 3.시작하기

### 다운로드 및 설치

최신 릴리즈는 [Releases 페이지](https://github.com/yuja201/here-is-dummy/releases)에서 다운로드하실 수 있습니다.

- `heresdummy-setup.exe` 파일 실행

</br>

## 4. 사용 가이드

### 1️⃣ 프로젝트 생성 및 DB 연결

`+` 버튼을 눌러 프로젝트를 생성하고, MySQL, PostgreSQL 등의 접속 정보를 입력하여 DB를 연결합니다. `연결 테스트`를 통해 상태를 미리 확인할 수 있습니다.

<p align="center">
  <img src="docs/images/create_project.gif" alt="프로젝트 생성 및 DB 연결" width="80%">
</p>

<br/>

### 2️⃣ 스키마 확인 및 데이터 규칙 설정

DB가 연결되면 테이블 목록이 자동으로 분석되어 표시됩니다. 데이터를 생성할 테이블을 선택하고, 컬럼별로 **Faker(랜덤값), AI(지능형 생성), 파일 업로드** 중 원하는 방식을 설정하세요.

<p align="center">
  <img src="docs/images/schema_check.gif" alt="스키마 및 규칙 설정" width="80%">
</p>

<br/>

### 3️⃣ 데이터 생성 및 삽입

생성할 데이터 개수(Row)를 입력하고 `데이터 생성` 버튼을 누릅니다. 생성된 결과는 `SQL 파일로 내보내기`하거나 `DB에 즉시 삽입`할 수 있습니다.

<p align="center">
  <img src="docs/images/data_creation.gif" alt="데이터 생성 및 삽입" width="80%">
</p>

<br/>

### 4️⃣ 인덱스 테스트

**인덱스 테스트**의 `테스트 시작` 버튼을 눌러 데이터베이스 인덱스의 효율성을 분석할 수 있습니다.

인덱스는 기준에 따라 정상, 권장, 심각으로 분류됩니다. 권장이나 심각으로 분류된 인덱스는 문제점과 개선사항이 함께 표시됩니다. 사용하지 않거나 효율이 낮은 인덱스를 삭제해보세요.

<p align="center">
  <img src="docs/images/index_test.gif" alt="성능 테스트 대시보드" width="80%">
</p>

<br/>

### 5️⃣ 사용자 쿼리 테스트

**사용자 쿼리 테스트**의 `테스트 시작` 버튼을 눌러 테스트하고 싶은 SQL을 입력하고, 실행 횟수와 타임아웃을 설정한 뒤 테스트를 진행할 수 있습니다.

**문법 검증**을 통해 쿼리가 정상적인지 확인 할 수 있으며, 확인하지 않아도 시작시 문법 검증을 진행하여 정상쿼리만 테스트가 진행됩니다.

테스트 결과는 평균 응답 시간과 P50, P95 등의 응답시간 분포를 제공합니다.
또한 쿼리 실행계획을 분석하여 어떻게 쿼리가 진행되는지 확인 할 수 있습니다.

<p align="center">
  <img src="docs/images/query_test.gif" alt="성능 테스트 대시보드" width="80%">
</p>

AI 응답 생성 버튼을 눌러 쿼리의 개선 사항을 추천 받을 수 있습니다. 서브쿼리와 조인 등 복잡한 쿼리를 더욱 효율적으로 개선하고, 필요한 인덱스를 추가해보세요.

<p align="center">
  <img src="docs/images/query_test_ai.gif" alt="성능 테스트 대시보드" width="80%">
</p>

<br/>

### 6️⃣ 테스트 히스토리

테스트 히스토리 탭에서 진행한 테스트 이력을 확인할 수 있습니다. 결과를 비교해 포트폴리오에 사용해보세요.

<p align="center">
  <img src="docs/images/test_history.gif" alt="성능 테스트 대시보드" width="80%">
</p>

<br/>

## 5. 기술 스택

- **Core**: Electron, React, TypeScript, Vite
- **Database**: mysql2, pg
- **Data Generation**: @faker-js/faker, openai, @anthropic-ai/sdk, @google/generative-ai
- **State Management**: zustand

<br/>

## 6. 개발자용 가이드

### 요구사항

- Node.js 18+
- npm 또는 yarn

### 로컬 개발 실행

```bash
# 1. 저장소 클론
git clone https://github.com/yuja201/here-is-dummy.git
cd here-is-dummy

# 2. 의존성 설치
npm install

# 3. .env 파일 설정
cp .env.example .env
# .env 파일에 API 키를 추가하세요

# 4. 개발 서버 실행
npm run dev
```

<br/>

## 7. 고급 설정

### API 엔드포인트 및 타임아웃 변경

AI 생성 기능의 고급 설정(BASE_URL, TIMEOUT 등)을 변경하려면:

**Windows**

```
C:\Users\{사용자명}\AppData\Roaming\Here's Dummy\.env
```

위 경로의 `.env` 파일을 텍스트 에디터로 열어 다음 설정을 수정할 수 있습니다. GMS 사용 시 엔드포인트를 반드시 변경해주세요:

```
# API 엔드포인트
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_BASE_URL=https://api.anthropic.com
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com

# 타임아웃 설정 (밀리초)
OPENAI_TIMEOUT=60000
ANTHROPIC_TIMEOUT=60000
GOOGLE_TIMEOUT=60000

# 최대 재시도 횟수
OPENAI_MAX_RETRIES=2
ANTHROPIC_MAX_RETRIES=2
GOOGLE_MAX_RETRIES=2
```

설정 변경 후 애플리케이션을 재시작하면 적용됩니다.

<br/>

## 7. 기여하기

여깄덤 프로젝트에 대한 다양한 기여를 환영합니다!  
버그 제보 및 기능 제안은 **[Issues](https://github.com/yuja201/here-is-dummy/issues)** 페이지에서 등록할 수 있습니다.

</br>

<p align="center">
  <a href="CONTRIBUTING.md" style="padding:10px 18px; background:#134686; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
    🇰🇷 한국어 매뉴얼
  </a>
  &nbsp;&nbsp;
  <a href="CONTRIBUTING.en.md" style="padding:10px 18px; background:#1f2937; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
    🇺🇸 English Guide
  </a>
</p>

<br/>

## 8. 라이선스

본 프로젝트는 <strong> [MIT 라이선스](./LICENSE)를 따릅니다.

<br/>

## 10. 문의 및 지원

- **버그 및 기능 제안**: [GitHub Issues](https://github.com/yuja201/here-is-dummy/issues)
- **기타 문의**: [Google Forms](https://forms.gle/ehjfVpaeZMGxTcoU7)

<br/>

---

이 프로젝트가 유용하다면 Star ⭐를 눌러주세요!
