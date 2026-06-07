# 🔱 Auto Event Arena

Auto Event Arena is a full-stack event platform designed for conducting coding and round-based competitions with powerful admin and student dashboards. It supports dynamic event creation, multiple round types, automatic evaluation, and structured progression for both solo and team-based events.

---

## 🚀 Features

### 👨‍💼 Admin Dashboard

* Create and manage events
* Add and configure multiple rounds
* Add and manage questions
* Lock/unlock rounds
* Monitor participants
* View live leaderboard
* Inspect MongoDB collections directly

---

### 🎓 Student Dashboard

* Join events using event code
* Attempt rounds based on progression rules
* View real-time leaderboard
* Access built-in compiler preview for coding rounds

---

### 🧠 Supported Round Types

* MCQ (Multiple Choice Questions)
* Single-line Answer
* Multi-line Answer
* Coding
* Debugging

---

### 👥 Team Event Logic

* Sequential round progression
* Only one team member can attempt a round at a time
* Once a round is completed, other team members cannot reattempt it
* Next round unlocks automatically for the team

---

## 🛠 Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js
* **Database:** MongoDB

---

## ⚙️ Setup & Run Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Anagha2904/event_Arena.git
cd event_Arena
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Configure Environment Variables

Create a `.env` file in the root folder and add:

```env
MONGO_URI=mongodb://localhost:27017/event
PORT=8000
```

---

### 4️⃣ Start the server

```bash
npm start
```

---

### 5️⃣ Open in browser

```
http://127.0.0.1:8000
```


## 🗄 MongoDB Setup

The application uses MongoDB for storing:

* users
* events
* participants
* attempts
* sessions

You can inspect the database using **MongoDB Compass**:



---

## 🔐 Admin Access

Admin credentials are **not publicly shared** for security reasons.

👉 The admin account must be created manually:

* Either directly in the database
* Or through backend configuration
---

## 📁 Project Structure

```
├── index.html
├── styles.css
├── script.js
├── server.js
├── package.json
├── package-lock.json
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── .vscode/
```

---

## 📦 Recommended Files for Deployment

✔ index.html
✔ styles.css
✔ script.js
✔ server.js
✔ package.json
✔ package-lock.json
✔ README.md
✔ LICENSE
✔ .gitignore

---



## 🌍 Deployment

You can deploy this project using:

* **Render**
* **Railway**
* **Vercel (frontend only)**

Make sure to:

* Set environment variables
* Use MongoDB Atlas for production

---

## 📌 Future Improvements

* AI-based proctoring system
* Real-time WebSocket leaderboard
* Anti-cheat mechanisms
* Role-based authentication
* Email verification system

---

## 📜 License

This project is licensed under the MIT License.

---

## ✨ Author

**Anagha C**
GitHub: https://github.com/Anagha2904

---

## 🔥 Tagline

> *"Compete. Code. Conquer."*
