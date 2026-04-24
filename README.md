# Auto Event Arena

Auto Event Arena is a full-stack event platform for coding and round-based competitions with admin and student dashboards, MongoDB-backed storage, dynamic event setup, automatic scoring, and support for solo and team events.

## Highlights

- Admin dashboard for event creation, round management, question management, locking, leaderboard tracking, and MongoDB inspection
- Student dashboard for joining events, attempting rounds, viewing live ranking, and using the built-in compiler preview
- Supported round types: MCQ, single-line answer, multi-line answer, coding, and debugging
- Team-event progression rules so only the next round in sequence can be attempted by the team
- MongoDB backend using `mongodb://localhost:27017/event`
- VS Code-ready project setup with launch configuration

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js
- Database: MongoDB

## Run In VS Code

1. Open this folder in VS Code.
2. Open the integrated terminal.
3. Install dependencies:

```powershell
npm install
```

4. Start the server:

```powershell
npm start
```

5. Open:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

You can also run it from the VS Code Run and Debug panel with:

- `Run Auto Event Arena`

## MongoDB Setup

The app currently uses:

```env
MONGO_URI=mongodb://localhost:27017/event
```

You can inspect the same database in MongoDB Compass with:

```text
mongodb://localhost:27017/event
```

## Default Admin Login

- Email: `admin@arena.com`
- Password: `admin123`

## Project Structure

- `index.html` - main UI
- `styles.css` - styling
- `script.js` - frontend logic
- `server.js` - backend server and MongoDB integration
- `package.json` - scripts and dependencies
- `.vscode/launch.json` - VS Code run configuration

## Built-In Mongo Inspector

The admin dashboard includes a MongoDB viewer for:

- users
- events
- participants
- participant members
- attempts
- sessions

## Recommended GitHub Upload Files

- `index.html`
- `styles.css`
- `script.js`
- `server.js`
- `package.json`
- `package-lock.json`
- `README.md`
- `LICENSE`
- `.gitignore`
- `.env.example`
- `.vscode/launch.json`

Do not upload:

- `node_modules/`
- local secrets in `.env`
- temporary local-only files

## License

This project is licensed under the MIT License.
