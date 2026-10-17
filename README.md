
# 🔱 Auto Event Arena

**Compete. Code. Conquer.**

Auto Event Arena is a full-stack event management and competition platform designed for coding contests, quizzes, and multi-round technical events. It provides dedicated admin and student dashboards, flexible question formats, automatic evaluation where supported, and structured progression for individual and team-based competitions.

## 🚀 Features

### 👨‍💼 Admin Dashboard

- Create and manage events.
- Configure multiple rounds for each event.
- Add and manage questions across supported question types.
- Lock and unlock rounds.
- Monitor event participants and their progress.
- View competition leaderboards.
- Inspect application data through authorized database tools.

### 🎓 Student Dashboard

- Join events using an event code.
- Participate in individual or team-based competitions.
- Attempt rounds according to event progression rules.
- Submit answers for supported question types.
- View leaderboard rankings and competition progress.
- Access the built-in compiler preview for coding rounds.

### 🧠 Supported Round Types

Auto Event Arena supports multiple question and challenge formats:

- **MCQ:** Multiple-choice questions.
- **Single-line Answer:** Short answers submitted on one line.
- **Multi-line Answer:** Answers containing multiple lines of text.
- **Coding:** Programming challenges.
- **Debugging:** Identify and correct errors in code.

### 👥 Team Event Management

- Supports solo and team-based participation.
- Enforces sequential round progression.
- Allows only one team member to attempt a round at a time, according to the configured team rules.
- Prevents other team members from reattempting a round after it has been completed.
- Automatically unlocks the next round for the team when the progression requirements are satisfied.

### 🏆 Leaderboard and Evaluation

- Displays participant rankings based on competition results.
- Supports tracking performance across event rounds.
- Provides a centralized view of competition progress.
- Supports automatic evaluation where implemented for the relevant question type.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js |
| Database | MongoDB |
| Development Tools | npm, MongoDB Compass |
| Version Control | Git and GitHub |

## 📋 Prerequisites

Before running the project locally, ensure you have installed:

- [Node.js](https://nodejs.org/)
- npm (included with Node.js)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) or a MongoDB Atlas database
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass) (optional, for viewing database collections)
- Git

## ⚙️ Setup and Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/Anagha2904/event_Arena.git
cd event_Arena
```

### 2. Install Dependencies

Install the project's Node.js dependencies:

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root directory.

Add the following local development configuration:

```env
MONGO_URI=mongodb://localhost:27017/event
PORT=8000
```

**Important:** This connection string is intended for local development. For production, configure a secured MongoDB connection and store credentials in environment variables.

Never commit your actual `.env` file, database passwords, API keys, session secrets, or other credentials to GitHub.

### 4. Start MongoDB

If you are using a local MongoDB installation, ensure the MongoDB service is running before starting the application.

If you are using MongoDB Atlas, configure your connection string in the `.env` file and ensure your network access settings and database permissions are correctly configured.

### 5. Start the Application

Run the application using the configured npm start script:

```bash
npm start
```

Ensure that `package.json` defines the appropriate start script.

### 6. Open the Application

Open the following URL in your browser:

```text
http://127.0.0.1:8000
```

If you configure a different port, use the corresponding local URL.

## 🗄️ MongoDB Database

Auto Event Arena uses MongoDB to store application data.

The application may use collections for:

- **Users:** User and account information.
- **Events:** Event details and configurations.
- **Participants:** Event registrations and participation records.
- **Attempts:** Submitted answers and attempt records.
- **Sessions:** Session-related data, if session persistence is configured.

The exact collections depend on the application's database implementation.

### Viewing the Database

You can use MongoDB Compass to connect to your database and inspect the collections.

For the local configuration above:

```text
mongodb://localhost:27017
```

Select the `event` database to view its collections.

Only access databases for which you have authorization. Do not expose production database credentials or sensitive participant information.

## 🔐 Admin Access and Security

Admin access is intentionally not documented with public credentials.

An authorized administrator account must be provisioned through the application's supported backend or database setup process.

For a secure deployment:

- Protect admin routes with server-side authentication and authorization.
- Validate user input on the server.
- Enforce event participation and round progression rules on the backend.
- Store passwords securely using an appropriate password-hashing algorithm.
- Keep secrets and database credentials in environment variables.
- Avoid exposing database administration functions to ordinary users.
- Apply appropriate access controls to participant records and submissions.
- Use HTTPS in production.
- Never publish real passwords, authentication tokens, or private connection strings.

**Note:** These are security recommendations; actual protection depends on the implemented application code.

## 📁 Project Structure

The main project files are organized as follows:

```text
event_Arena/
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
└── .vscode/
```

### File Overview

| File | Purpose |
|---|---|
| `index.html` | Application interface and page structure |
| `styles.css` | Styling and visual presentation |
| `script.js` | Client-side interactions |
| `server.js` | Node.js server and backend logic |
| `package.json` | Project metadata, dependencies, and scripts |
| `package-lock.json` | Records dependency versions |
| `README.md` | Project documentation |
| `LICENSE` | Project licensing terms |
| `.gitignore` | Specifies files excluded from Git |
| `.env.example` | Example environment variable names and placeholder values |

## 🔒 Environment and Git Configuration

Ensure your `.gitignore` includes entries similar to these:

```gitignore
node_modules/
.env
.env.*
!.env.example
npm-debug.log*
.DS_Store
```

Keep `.env.example` free of real secrets. For example:

```env
MONGO_URI=your_mongodb_connection_string
PORT=8000
```

If your project uses additional environment variables, document their names and purposes using safe placeholder values.

**Security reminder:** `.gitignore` does not remove files or secrets that have already been committed. Remove exposed credentials from use by rotating them, and clean repository history when necessary.

## 🌍 Deployment

Auto Event Arena can be adapted for deployment using platforms such as:

- [Render](https://render.com/)
- [Railway](https://railway.com/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)

Vercel may be suitable for a compatible frontend deployment, but the Node.js backend must also be hosted on a platform that supports the application's server requirements.

### Deployment Checklist

1. Push the application code to your GitHub repository.
2. Configure the production environment variables on your hosting platform.
3. Set up a MongoDB Atlas database or another secured MongoDB deployment.
4. Configure the production database connection string.
5. Restrict database network access and use appropriate database permissions.
6. Configure the application to listen on the port supplied by the hosting platform.
7. Test authentication, event creation, question submission, team progression, and leaderboard functionality.
8. Verify that private configuration files and credentials are not publicly accessible.

## 🔮 Future Improvements

Potential enhancements for future versions include:

- AI-assisted question generation.
- AI-based proctoring, subject to privacy and consent requirements.
- Real-time leaderboard updates using WebSockets.
- Additional anti-cheating mechanisms.
- Role-based access control.
- Email verification and account recovery.
- Detailed analytics for event organizers.
- Enhanced code execution and automated test-case evaluation.
- Improved event reports and participant performance tracking.

These are planned improvements and may not be available in the current version.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for the complete license terms.

## 👩‍💻 Author

**Anagha C**

- GitHub: [Anagha2904](https://github.com/Anagha2904)
- Project Repository: [event_Arena](https://github.com/Anagha2904/event_Arena)

## ✨ Tagline

> Compete. Code. Conquer.
