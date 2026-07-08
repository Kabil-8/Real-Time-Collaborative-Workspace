# Zaalima Workspace

Full-stack collaborative workspace app.

## Structure

    zaalima-workspace/
    ├── backend/    # Express + MongoDB + Socket.io API
    └── frontend/   # React + React Router + Tailwind

## Backend

    cd backend
    cp .env.example .env
    npm install
    npm run dev

Runs on http://localhost:4000.

## Frontend

    cd frontend
    cp .env.example .env
    npm install
    npm start

Runs on http://localhost:3000.

## Notes

- The in-app Lovable preview is disabled for this project (see `.preview/`).
- Week 1 covers auth, workspaces, profiles, and boards.
- Week 2 backend endpoints for lists/cards/move are implemented in
  `backend/routes/boards.js`; the frontend Kanban drag-and-drop UI is
  deferred to Week 2 commits.
