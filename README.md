<h1 align="center">
  <img src="docs/images/yuja.png" width="65">
  <br/>
  <strong>Here’s Dummy</strong>
</h1>

<h3 align="center">Your time-saving DB partner</h3>

</br>
<!-- Language selection -->
<p align="center">
  <a href="README.ko.md">🇰🇷 Korean</a> • 
  <a href="README.md">🇺🇸 English</a>
</p>

<!-- Main links -->
<p align="center">
  <a href="https://github.com/yuja201/here-is-dummy/releases">⬇️ Releases</a> •
  <a href="https://www.buymeacoffee.com/heresdummy">☕ Support</a>
</p>

<!-- Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square">
  <img src="https://img.shields.io/github/v/release/yuja201/here-is-dummy?style=flat-square">
</p>

</br>

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Key Features](#2-key-features)
- [3. Getting Started](#3-getting-started)
- [4. User Guide](#4-user-guide)
- [5. Tech Stack](#5-tech-stack)
- [6. Developer Guide](#6-developer-guide)
- [7. Advanced Configuration](#7-advanced-configuration)
- [8. Contributing](#8-contributing)
- [9. License](#9-license)
- [10. Contact & Support](#10-contact--support)

</br>

## 1. Introduction

**Here’s Dummy** is a desktop application that automatically analyzes database schemas and utilizes AI or Faker.js to generate realistic, high-volume dummy data. It allows you to quickly secure the necessary data during development and testing phases, significantly boosting productivity.

</br>

## 2. Key Features

Here’s Dummy offers features for **dummy data generation** and **DB performance testing**.

### 1. Data Generation

- **Schema Auto-Analysis**: Automatically identifies table structures, constraints, and relationships (FK).
- **Multi-Database Support**: Can connect to various DBs like **MySQL and PostgreSQL** to generate data.
- **High-Speed Bulk Generation**: Capable of generating **100,000 records** in approximately **10 seconds** using Faker.js.
- **AI-Powered Generation**: Utilizes **GPT, Claude, and Gemini** to generate smart, contextually relevant data.
- **File-Based Data Conversion**: Upload **CSV, TXT, or JSON** files to convert and insert data matching the DB structure.

### 2. **DB Performance Test**

- **Index Test**: Analyzes the **efficiency** of your database **indexes**.
- **User Query Test**: Analyzes **query performance** and recommends **improvement measures**.
- **Test History**: Allows you to check the history of completed tests.

  </br>

## 3. Getting Started

### Download & Install

The latest release is available for download from the [Releases page](https://github.com/yuja201/here-is-dummy/releases).

- Run the `heresdummy-setup.exe` file.

</br>

## 4. User Guide

### 1️⃣ Create Project & Connect DB

Click the `+` button to create a project and enter connection details for MySQL, PostgreSQL, etc. You can check the connection status beforehand via `Test Connection`.

<p align="center">
  <img src="docs/images/create_project.gif" alt="Project Creation and DB Connection" width="80%">
</p>

<br/>

### 2️⃣ Check Schema & Set Data Rules

Once the DB is connected, the table list is automatically analyzed and displayed. Select a table for data generation and set the desired method for each column, such as **Faker (random values), AI (intelligent generation), or File Upload**.

<p align="center">
  <img src="docs/images/schema_check.gif" alt="Schema and Rule Setup" width="80%">
</p>

<br/>

### 3️⃣ Generate & Insert Data

Enter the number of rows to generate and press the `Generate Data` button. The generated results can be `Exported to SQL file` or `Inserted directly into DB`.

<p align="center">
  <img src="docs/images/data_creation.gif" alt="Data Generation and Insertion" width="80%">
</p>

<br/>

### 4️⃣ Index Test

You can analyze the efficiency of your database indexes by clicking the `Start Test` button in the **Index Test** tab.

Indexes are classified as Normal, Recommended, or Critical based on criteria. For indexes classified as Recommended or Critical, issues and improvement suggestions are displayed. Try deleting unused or inefficient indexes.

<p align="center">
  <img src="docs/images/index_test.gif" alt="Performance Test Dashboard" width="80%">
</p>

<br/>

### 5️⃣ User Query Test

In the **User Query Test** tab, you can click the `Start Test` button, enter the SQL you want to test, set the number of executions and a timeout, and then proceed with the test.

**Syntax validation** can be used to check if the query is valid. Even if not checked, syntax validation is performed upon starting the test, ensuring only valid queries are tested.

The test results provide average response time and response time distributions such as P50 and P95.
It also analyzes the query execution plan to show how the query is processed.

<p align="center">
  <img src="docs/images/query_test.gif" alt="Performance Test Dashboard" width="80%">
</p>

Click the AI response generation button to receive recommendations for improving the query. Improve complex queries, such as subqueries and joins, and add necessary indexes more efficiently.

<p align="center">
  <img src="docs/images/query_test_ai.gif" alt="Performance Test Dashboard" width="80%">
</p>

<br/>

### 6️⃣ Test History

In the Test History tab, you can view the history of tests performed. Compare the results and use them for your portfolio.

<p align="center">
  <img src="docs/images/test_history.gif" alt="Performance Test Dashboard" width="80%">
</p>

<br/>

## 5. Tech Stack

- **Core**: Electron, React, TypeScript, Vite
- **Database**: mysql2, pg
- **Data Generation**: @faker-js/faker, openai, @anthropic-ai/sdk, @google/generative-ai
- **State Management**: zustand

<br/>

## 6. Developer Guide

### Requirements

- Node.js 18+
- npm or yarn

### Local Development Execution

```bash
# 1. Clone the repository
git clone https://github.com/yuja201/here-is-dummy.git
cd here-is-dummy

# 2. Install dependencies
npm install

# 3. Set up .env file
cp .env.example .env
# Add your API keys to the .env file

# 4. Run development server
npm run dev
```

<br/>

## 7. Advanced Configuration

### Change API Endpoints & Timeouts

To change advanced settings for the AI generation feature (BASE_URL, TIMEOUT, etc.):

**Windows**

```
C:\Users\{USERNAME}\AppData\Roaming\Here's Dummy\.env
```

Open the `.env` file at this path with a text editor to modify the following settings. If using GMS, be sure to change the endpoint:

```
# API Endpoints
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_BASE_URL=https://api.anthropic.com
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com

# Timeout settings (milliseconds)
OPENAI_TIMEOUT=60000
ANTHROPIC_TIMEOUT=60000
GOOGLE_TIMEOUT=60000

# Maximum retries
OPENAI_MAX_RETRIES=2
ANTHROPIC_MAX_RETRIES=2
GOOGLE_MAX_RETRIES=2
```

The settings will be applied after restarting the application.

<br/>

## 8. Contributing

We welcome various contributions to the Here’s Dummy project!
Bug reports and feature suggestions can be registered on the **[Issues](https://github.com/yuja201/here-is-dummy/issues)** page.

</br>

<p align="center">
  <a href="CONTRIBUTING.md" style="padding:10px 18px; background:#134686; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
    🇰🇷 Korean Manual
  </a>
  &nbsp;&nbsp;
  <a href="CONTRIBUTING.en.md" style="padding:10px 18px; background:#1f2937; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
    🇺🇸 English Guide
  </a>
</p>

<br/>

## 9. License

This project follows the <strong> [MIT License](./LICENSE)</strong>.

<br/>

## 10. Contact & Support

- **Bug Reports & Feature Suggestions**: [GitHub Issues](https://github.com/yuja201/here-is-dummy/issues)
- **Other Inquiries**: [Google Forms](https://forms.gle/ehjfVpaeZMGxTcoU7)

<br/>

---

If you find this project useful, please give it a Star ⭐!