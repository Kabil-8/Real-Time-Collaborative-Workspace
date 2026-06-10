# Zaalima Workspace — Week 1

**Real-Time Collaborative Workspace** · Zaalima Development Confidential

---

## What was built this week

### Day 1–2: Data Models (`/backend/models/`)

| Model | Key design decisions |
|---|---|
| `User` | Password hashed via bcryptjs pre-save hook. `toPublicJSON()` strips sensitive fields. `avatarColor` auto-assigned for initials avatars. |
| `Workspace` | `members[]` subdocument with role enum. `pendingInvites[]` with UUID token + expiry. Auto-generates slug on save. Helper methods: `isMember()`, `getMemberRole()`, `getValidInvite()`. |
| `Board` | Per-board label palette seeded on creation. `listOrder[]` array maintains column ordering. Background supports `color` or `gradient` type. |
| `List` | `position` integer for deterministic sort. `wipLimit` field ready for Kanban discipline (Week 2). `cardOrder[]` array for card ordering within the list. |
| `Card` | Full agile card: assignees, labels, priority, dueDate, checklists (with item-level completion), comments, attachments, activity log, `checklistProgress` virtual. |

### Day 3–5: Authentication & Workspace API (`/backend/`)

**Auth endpoints** (`/api/auth/`)
- `POST /register` — name/email/password with express-validator
- `POST /login` — returns JWT + user profile
- `GET /me` — returns authenticated user
- `PATCH /me` — update name/avatar
- `POST /change-password`

**Workspace endpoints** (`/api/workspaces/`)
- `POST /` — create workspace, auto-adds creator as owner
- `GET /` — list user's workspaces
- `GET /:id` — single workspace with board count
- `PATCH /:id` — update name/description/icon (admin/owner)
- `DELETE /:id` — archive workspace (owner only)
- `POST /:id/invite` — create invite token with expiry
- `POST /accept-invite/:token` — join workspace via invite link
- `DELETE /:id/members/:userId` — remove member or self-leave
- `GET /:id/boards` — list boards in workspace

**Board endpoints** (`/api/boards/`)
- `POST /` — create board, seeds 3 default lists (To Do / In Progress / Done)
- `GET /:id` — full board hydration: board + lists + cards grouped by list
- `PATCH /:id` — update title/description/background/star
- `DELETE /:id` — archive board

**Security**
- JWT in `Authorization: Bearer` header
- `protect` middleware on all private routes
- `requireWorkspaceMember` / `requireWorkspaceAdmin` / `requireBoardAccess` guards
- Rate limiting: 200 req/15min global, 20 req/15min on auth endpoints
- Helmet headers, CORS origin restriction

### Day 6–7: Frontend Layout & UI (`/frontend/src/`)

- **Auth pages** — Login + Register with client-side validation, global error display
- **App shell** — Sidebar + collapsible navigation + top bar
- **Sidebar** — Workspace switcher (dropdown), nav items, user profile footer with logout
- **Create Workspace modal** — Name, description, icon picker, color picker, live preview
- **Home/Dashboard page** — Greeting, board grid, inline board creation, workspace stats
- **Workspace Settings page** — General info editing, member list with role badges, invite form with copyable invite link

---

## Project structure

```
zaalima-workspace/
├── backend/
│   ├── config/
│   │   └── db.js                   # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── workspaceController.js
│   │   └── boardController.js
│   ├── middleware/
│   │   ├── auth.js                 # protect, requireWorkspaceMember, etc.
│   │   ├── errorHandler.js         # global error handler
│   │   └── validate.js             # express-validator error formatter
│   ├── models/
│   │   ├── User.js
│   │   ├── Workspace.js
│   │   ├── Board.js
│   │   ├── List.js
│   │   └── Card.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workspaces.js
│   │   └── boards.js
│   ├── utils/
│   │   ├── jwt.js                  # signToken, verifyToken, sendAuthResponse
│   │   └── response.js             # successResponse, errorResponse helpers
│   ├── server.js                   # Express + Socket.io + rate limiting
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.jsx     # nav + workspace switcher + avatar
    │   │   │   └── AppShell.jsx    # sidebar + top bar + modal host
    │   │   └── workspace/
    │   │       └── CreateWorkspaceModal.jsx
    │   ├── context/
    │   │   ├── AuthContext.jsx     # register, login, logout, updateUser
    │   │   └── WorkspaceContext.jsx
    │   ├── pages/
    │   │   ├── AuthPages.jsx       # LoginPage + RegisterPage
    │   │   ├── HomePage.jsx        # dashboard + board grid
    │   │   └── WorkspaceSettings.jsx
    │   ├── utils/
    │   │   └── api.js              # axios instance + interceptors
    │   ├── App.jsx                 # BrowserRouter + route guards
    │   ├── index.js
    │   └── index.css               # Tailwind directives + scrollbar
    ├── tailwind.config.js
    └── package.json
```

---

## Local setup

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)
- (Optional) Redis for Week 4

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm install
npm run dev
# → http://localhost:5000/api/health
```

### Frontend

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

## API quick reference

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alex","email":"alex@test.com","password":"secret123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"alex@test.com","password":"secret123"}'

# Create workspace (use token from login)
curl -X POST http://localhost:5000/api/workspaces \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Engineering","icon":"🛠️"}'

# Create board
curl -X POST http://localhost:5000/api/boards \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"title":"Sprint 1","workspaceId":"<WORKSPACE_ID>"}'
```

---

## Coming next

| Week | Focus |
|---|---|
| Week 2 | List/Card CRUD REST APIs · React Beautiful DnD · optimistic UI state |
| Week 3 | Socket.io rooms · real-time card events · typing indicators · comment threads |
| Week 4 | Full-text search · notification system · Redis caching · security audit · deployment |
