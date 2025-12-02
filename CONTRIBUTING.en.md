# 🤝 Contributing to Here’s Dummy

Thank you for your interest in contributing to Here’s Dummy!
This document guides you through the essential aspects for contributing to the project, including development environment setup, branch strategy, commit conventions, and PR rules.

</br>

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [1. Development Environment Setup](#1-development-environment-setup)
- [2. Project Structure](#2-project-structure)
- [3. Branch Strategy](#3-branch-strategy)
- [4. Commit Convention (Conventional Commits)](#4-commit-convention-conventional-commits)
- [5. Pull Request Rules](#5-pull-request-rules)
- [6. Issue Writing Rules](#6-issue-writing-rules)
- [7. Data Generator / DB Test Contribution Guide](#7-data-generator--db-test-contribution-guide)
- [8. UI/UX Contribution Guide](#8-uiux-contribution-guide)
- [9. Testing Strategy](#9-testing-strategy)
- [10. Code Writing Guidelines](#10-code-writing-guidelines)

</br>

## Project Overview

**Here’s Dummy** is an **Electron-based desktop application** that provides database schema analysis, automatic dummy data generation, and index/query performance testing features.

Tech Stack:

- Electron, React, Vite, TypeScript
- mysql2, pg
- Faker.js, OpenAI / Claude / Gemini
- Zustand

</br>

## 1. Development Environment Setup

### 1-1. Requirements

| Item        | Version                 |
| ----------- | ----------------------- |
| Node.js     | 18 or higher            |
| npm or yarn | Latest version          |
| OS          | Windows / macOS / Linux |

### 1-2. Local Run Method

```bash
# Clone the repository
git clone https://github.com/yuja201/here-is-dummy.git
cd here-is-dummy

# Install dependencies
npm install

# Create environment variable file
cp .env.example .env
# Enter OpenAI, Anthropic, Gemini API KEY

# Run in development mode
npm run dev
```

</br>

## 2. Project Structure

`Here's Dummy` follows a standard Electron architecture composed of three independent processes (Main, Preload, Renderer) as follows. The role and responsibility of each directory are:

```
here-is-dummy/
└── src/
    ├── main/
    ├── preload/
    ├── renderer/
    └── shared/
```

---

### 📂 `src/main` - Main Process (Backend Logic)

Running in a Node.js environment, it handles all core functionalities of the application such as backend logic, database communication, file system access, and window management. It is **completely separated from the UI.**

- `index.ts`: The entry point for the Main Process managing the Electron application's lifecycle.
- **`database/`**: Manages database schemas, migrations, and project settings (e.g., DB connection info).
  - `schema.ts`: Contains logic for defining and analyzing DB schemas (tables, columns, constraints, etc.).
  - `projects.ts`: Logic for managing created project information.
- **`ipc/`**: A collection of **IPC handlers** that receive and process requests from the Renderer process (UI).
  - `data-generator-handlers.ts`: Receives data generation requests and delegates tasks to `DataGeneratorService`.
  - `database-handlers.ts`: Handles requests for DB connection, schema lookup, etc.
- **`services/`**: The **service layer** containing the core business logic of the application. **This is where most of the core logic resides.**
  - `data-generator/`: **The heart of data generation.**
    - `data-generator-service.ts`: Acts as an orchestrator, receiving data generation requests and distributing tasks to the Worker Thread Pool.
    - `worker-runner.ts`: The execution code for the Worker Thread that performs actual data generation (Faker.js, AI calls, etc.).
    - Each `* -generator.ts` file contains specific logic for different generation types (AI, fixed value, reference, etc.).
  - `index-analyzer/`: Service for analyzing DB index efficiency.
  - `user-query-test/`: Service for analyzing query execution plans and measuring performance of user SQL.
  - `ai/`: Implements `AI Factory` and adapter patterns for using various AI models like OpenAI, Claude, Gemini with a consistent interface.

---

### 📂 `src/preload` - Preload Script

Acts as a **secure bridge** between the Main and Renderer processes. It securely exposes specific functionalities of the Main process (`ipcRenderer.invoke`, etc.) to the `window` object of the Renderer, allowing the Renderer to access backend features without directly calling Node.js APIs.

- `index.ts`: The script that exposes Main process APIs to the Renderer's `window.api` object.
- `index.d.ts`: Provides type definitions for securely using `window.api` in TypeScript within the Renderer.

---

### 📂 `src/renderer` - Renderer Process (UI)

The **React application** responsible for the user interface (UI). It runs in a Chromium browser environment, focusing solely on user input processing, state management, and screen rendering.

- `index.html`: The root HTML file where the React app is mounted.
- **`src/`**: The React source code directory.
  - `main.tsx`: The entry point for the React application.
  - `App.tsx`: The top-level layout component of the application, including routing (screen transitions).
  - **`views/`**: Page-level large components. (e.g., `CreateDummyView.tsx`)
  - **`components/`**: Small, reusable UI components used throughout the application (e.g., `Button.tsx`, `Modal.tsx`, `DBTableDetail.tsx`).
  - **`modals/`**: Complex modal components created for specific purposes (e.g., rule creation, FK settings).
  - **`stores/`**: Global state management stores using `Zustand`. Manages UI state and data generation rules.
  - `utils/` / `hooks/`: Common functions and custom React hooks used within the Renderer.

---

### 📂 `src/shared` - Shared Code

Code **used by both** the Main and Renderer processes.

- `types.ts`: Contains **TypeScript types and interfaces** that define the shape of data exchanged via IPC and used throughout the application, ensuring consistency and type safety across processes.

</br>
</br>

## 3. Branch Strategy

The project operates based on the GitHub Flow.

### ✔ Base Branches

- main : Stable version ready for deployment
- dev : Integration branch preparing for the next release

### ✔ Work Branch Rules (feature branches)

- When working, always create a branch from `dev`.

```
feature/{feature-name}
fix/{issue-number}-{fix-description}
refactor/{module-name}
docs/{document-name}
```

### ✔ Example

```
feature/data-generator-ai
fix/102-schema-parsing-error
refactor/electron-ipc
docs/update-readme
```

</br>

## 4. Commit Convention (Conventional Commits)

Here’s Dummy uses Conventional Commits.

| Type     | Description                                     |
| -------- | ----------------------------------------------- |
| feat     | Adds a new feature                              |
| fix      | Fixes a bug                                     |
| docs     | Changes to documentation                        |
| style    | Code style changes (no impact on functionality) |
| refactor | Code refactoring                                |
| test     | Adding/modifying tests                          |
| chore    | Build/configuration/environment tasks           |

### ✔ Example

```
feat: add AI-based smart data generator logic
fix: resolve mysql schema parsing error on FK
refactor: split query runner service for performance
docs: update index test documentation
```

</br>

## 5. Pull Request Rules

Please follow these rules when creating a PR.

### 5-1. PR Title

```
[feat] Add AI-based data generation logic
[fix] Resolve authentication issue with PostgreSQL connection
[refactor] Modularize index inspection logic
```

### 5-2. PR Description Template

```
## ✨ Work Details

> Please describe what part of the feature has been implemented.

  <br/>

## 🔍 Reason for Change

- Clearly state why the work was done

<br/>

## 💬 Review Requirements (Optional)

> If there's anything specific you'd like the reviewer to look at, please write it here.
> e.g.) I'd like a better name for method XXX, do you have any good suggestions?

<br/>

## 📸 Image Attachment (Optional)

<br/>

## Other (Optional)

- Related issue number (#123)
```

### 5-3. PR Conditions

    - No Lint/Build errors must exist.

    - Create the PR based on the `dev` branch.

    - If possible, link the related issue number.

    - If the change scope is too large, please split it and submit.

### 5-4. PR Automatic Verification

When submitting a Pull Request, the following automated verification processes are executed to maintain code quality.

    - GitHub Actions (CI): Type checking, ESLint, and build tests are automatically run when a PR is created. If errors occur here, the PR cannot be merged, so please fix the errors and re-commit.
    - CodeRabbit (Automated Code Review): The AI code reviewer analyzes code changes and may provide comments pointing out potential bugs, readability issues, etc. Please refer to the suggestions to improve your code.

</br>

## 6. Issue Writing Rules

Please choose one of the 3 templates below when creating an issue.

1. Bug Report
2. Feature Request
3. Maintenance Issue

</br>

## 7. Data Generator / DB Test Contribution Guide

The core logic of the project resides in **src/main/services/**.

Changes to this directory must follow these criteria:

- Asynchronous logic must prioritize preventing IPC block.

- AI requests must use the common module (`aiClient.ts`).

- When changing DB schema analysis logic, at least one real DB test is required.

- When changing Generator logic, ensure existing Faker-based logic is not broken.

</br>

## 8. UI/UX Contribution Guide

- Maintain the Atomic Design hierarchy when composing components.

- Be careful with type changes when modifying Zustand store.

- When updating GIFs/images, add them to `docs/images`.

- When making UI changes, always include screenshots or GIFs.

</br>

## 9. Testing Strategy

Currently, `Here's Dummy` manages quality primarily through E2E (End-to-End) tests and manual tests linked with real databases to ensure the stability of core functionalities.

- **Core Logic Testing**: For changes to core logic that directly communicates with the DB, such as data generation, schema analysis, and query testing, **it is essential to directly test its normal operation by connecting to a real DB (MySQL, PostgreSQL, etc.).**

- **UI Testing**: When making UI changes, visually verify that the feature works as intended by attaching screenshots or GIFs to the PR.
- **Checklist**: It is recommended to include a self-verification checklist for changes in the PR description.

</br>

## 10. Code Writing Guidelines

1. Adhere to TypeScript strict mode.

2. Electron IPC should be separated by module.

3. Avoid embedding service logic directly into UI components.

4. Maintain the "UI ↔ State Management ↔ Service" structure.

5. AI calls must always use common functions. (Includes retry/timeout system)
