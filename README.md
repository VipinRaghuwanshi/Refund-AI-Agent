# 🚀 Refund AI Agent (Human-in-the-Loop)

> A production-ready **AI-powered refund management system** built with **LangChain + JavaScript**, featuring a **Human-in-the-Loop approval workflow** for safe and controlled decision making.

---

## 🧠 Overview

This project demonstrates how to build a **real-world AI agent system** where:

* AI processes refund requests 🤖
* Humans review & approve/reject decisions 👨‍💻
* The system ensures **safe, auditable, and controlled automation**

Unlike fully autonomous systems, this project introduces **interrupt-based workflows** to prevent risky decisions.

---

## ✨ Features

* 🔹 AI-powered refund request processing
* 🔹 Human-in-the-loop approval system
* 🔹 Real-time dashboard (Approved / Rejected tracking)
* 🔹 Chat-based interaction with AI agent
* 🔹 Safe decision-making architecture
* 🔹 Clean and modern UI

---

## 🏗️ Architecture

```bash
User → AI Agent → Decision (Interrupt)
                     ↓
               Human Approval
                     ↓
            Final Action (Approve/Reject)
```

---

## ⚙️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js
* **AI Framework:** LangChain
* **Agent Workflow:** Interrupt-based execution

---

## 📂 Project Structure

```bash
refund-agent/
│── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
│── agent.js
│── server.js
│── package.json
│── .env
```

---

## 🚀 Getting Started

### 1️⃣ Clone the repo

```bash
git clone https://github.com/your-username/refund-ai-agent.git
cd refund-ai-agent
```

### 2️⃣ Install dependencies

```bash
pnpm install --legacy-peer-deps
```

### 3️⃣ Setup environment

Create `.env` file:

```env
OPENAI_API_KEY=your_api_key_here
```

### 4️⃣ Run server

```bash
node server.js
```

### 5️⃣ Open frontend

```bash
http://127.0.0.1:5500/frontend/index.html
```

---

## 🔐 Human-in-the-Loop Concept

Instead of letting AI take final actions:

* AI suggests a decision
* Workflow pauses ⏸️
* Human reviews & approves/rejects ✅❌
* Then system continues

👉 This ensures:

* Safety
* Control
* Transparency

---

## 📊 Example Use Case

* AI detects refund request
* Suggests approval/rejection
* Admin reviews decision
* Final action is executed

---

## 🔥 Future Improvements

* Database integration (MongoDB / Firebase)
* Authentication system
* Role-based access control
* Deployment (Vercel / Render)
* Advanced analytics dashboard

