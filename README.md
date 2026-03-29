# 👕 GDG Founder's Edition Shirt Drop

Welcome! This repository contains the source code of one of the many possible solutions and deployment procedures for the **GDG PUP Founder's Edition Shirt Drop** infrastructure lab. 

## 🎯 Scenario: GDG PUP Flash Sale

**The Situation:**
GDG PUP is releasing a limited-edition "GDG Founder’s Edition" Shirt. Only 500 units are available. At exactly 12:00 PM, the link goes live to thousands of students.

**The Mission:**
Cadets must deploy an infrastructure capable of handling a massive surge of traffic while ensuring the inventory count remains 100% accurate. The system must automatically scale up when the drop happens and scale down to zero when the rush is over.

> [!NOTE]
> This codebase purposely uses **vanilla technologies** (No React, No Express framework) to demonstrate that native GCP logic and features are more than capable of handling highly scalable serverless architectures.

## 🏗️ Infrastructure Overview

| Component | Service | Configuration |
|-----------|---------|---------------|
| **Frontend** | Cloud Storage | Static website hosting for the "Buy" page. |
| **Backend API** | Cloud Run | Serverless logic; scales based on request volume. |
| **Database** | Cloud SQL | Relational database (PostgreSQL/MySQL) for inventory. |
| **Networking** | Load Balancer | Global External HTTP(S) Load Balancer (Standard Tier). |
| **Deployment** | Source-to-Deploy | Deploying directly from code folder to Cloud Run. |

## 📂 Project Structure
- `/frontend/` - Contains the premium HTML, CSS, and Vanilla JS drop landing page.
- `/backend/` - Contains the Node.js API logic and Postgres connector pool.
- `/deployment_docs/` - Contains step-by-step tutorials and instructions on deploying this infrastructure.

## 🚀 Getting Started (Prerequisites)

To work with this repository, you must first clone or fork it to your local machine:

```bash
# Clone the repository directly
git clone https://github.com/Justinroyse/gdgpup_cloudsol_sj5_activity
cd gcp_gdgshirt_activity

# Alternatively, you can fork the repository on GitHub Website GUI
```

Deploying this application architecture gives you exposure to handling flash sales on Cloud Provider hardware. To deploy this project:

1. Look through the custom backend routing logic in `/backend/index.js` to understand the database operations.
2. Navigate to the `deployment_docs/` folder in your workspace.
3. Choose your preferred tutorial:
   - Open `deploy_instructions.md` to configure using the **`gcloud` CLI** terminal commands.
   - Open `deploy_instructions_gui.md` to configure exclusively via navigating the **Google Cloud Web Console**.

## 🤝 Contributing

We welcome contributions! To ensure a smooth integration of your work, please follow these standardized steps:

### 1. Create a Branch
Always branch off from `main`. Do not push directly to the `main` branch.

```bash
git checkout main
git pull origin main
git checkout -b <type>/<short-description>
```

**Branch Naming Conventions:**
- `feat/` - For new additions or enhancements (e.g., `feat/add-dockerfile`)
- `fix/` - For bug fixes (e.g., `fix/postgres-connection-timeout`)
- `docs/` - For documentation updates (e.g., `docs/update-readme`)

### 2. Submit a Pull Request
Once you have committed your changes, push your branch and open a Pull Request (PR) against the `main` branch.

**PR Naming Conventions:**
Your PR Title should be clear and descriptive following the Conventional Commits specification:
- `[feat]: Add user authentication to API`
- `[fix]: Resolve stock overselling race condition`
- `[docs]: Update deployment instructions folder structure`

**PR Description Format:**
Please include the following sections in your PR description:
- **Objective:** What problem does this PR solve?
- **Changes Made:** A bulleted list of the technical changes.
- **Testing:** How did you verify these changes work?
