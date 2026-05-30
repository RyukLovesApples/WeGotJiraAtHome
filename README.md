# WeGotJiraAtHome

## Project Goal

A full-featured, test-driven project and task management API inspired by Jira. The goal is to deepen my understanding of maintainable and scalable backend architecture through real-world development practices.

---

## Overview

**WeGotJiraAtHome** is a backend application built with NestJS that provides:

- Role-based access control (Admin, Regular User)
- Authentication via JWT
- Projects, Epics, and Tasks for hierarchical work organization
- Real-time activity updates via WebSockets
- Modular architecture for maintainability and scalability
- Full integration test coverage
- Isolated environment setup for testing

---

## Features

### Auth & Users

- Register/Login with password validation
- JWT authentication with embedded role info
- Guards for public/private and role-restricted routes
- Custom decorators for cleaner controller logic
- Email Verification – Verifies a user's email before granting access to sensitive routes (e.g., project creation, profile)
- Password Reset – Allows secure password recovery through a time-limited token sent via email

### Mailer & Email-Driven Workflows

The Mailer is its own dedicated module responsible for sending and managing all application emails. It serves as the central hub for workflows that involve email as part of the user journey.

- Email Verification – Ensures users validate their email before accessing sensitive routes
- Project Invitations – Sends invite links via email and automatically creates a ProjectUser record with permissions upon acceptance
- Password Reset – Allows users to request a reset token and update their password securely

### Projects, Epics & ProjectUsers

- Create and manage projects
- Epics as an intermediate layer between Projects and Tasks, grouping related work under a larger objective
- Automatically assign creator as Project User on project creation
- Full CRUD for project users
- ProjectUser module as the canonical source for membership and roles, enabling consistent permission enforcement
- Invitation System – Sends project invites via email and handles automated user creation with default permissions on acceptance

### Tasks

- Full CRUD for tasks
- Subtask support (up to two levels deep)
- Assign users to tasks and subtasks
- Attach multiple labels to tasks and subtasks
- Filter by status, labels, title, and description
- Pagination and sorting support
- DTO validation and robust error handling

### Real-Time Activity (WebSockets)

Built with Socket.IO, the activity module broadcasts project changes in real time to all connected members of a project room. Connections are authenticated via JWT and users must be project members to join a room.

**Emitted events:**

| Event | Trigger |
|---|---|
| `projectUpdated` | Project is updated |
| `projectDeleted` | Project is deleted |
| `epicCreated` / `epicUpdated` / `epicDeleted` | Epic lifecycle |
| `taskCreated` / `taskUpdated` / `taskDeleted` | Task lifecycle |
| `taskAssigned` | Task is assigned to a user |
| `userJoinedProject` | A member connects to the project room |
| `userOnline` / `userOffline` | Presence tracking with a grace period before offline broadcast |

User sessions and presence state are cached to avoid redundant DB lookups and support multi-tab connections per user.

Full integration test coverage for auth, room access, event broadcasting, presence, and session caching is in `test/websockets/activity.integration-spec.ts`.

### Permission System

The permission system is designed to be lightweight, cache-efficient, and secure.

#### Structure

Permissions follow a consistent structure:
- Project → Role → Resource → Action
- Each project assigns users a role (OWNER, ADMIN, USER, GUEST)
- Each role defines permissions over resources (e.g., projects, tasks, project-users)
- Each resource supports actions (read, create, update, delete)

> Only explicitly allowed actions (`true`) grant access. All others are denied by default — keeping permission objects slim and secure.

#### Default Permissions

- Default permissions are defined in code (`config/project-permissions.config.ts`) and do not exist in the database
- Deeply frozen using a `deepFreeze` utility to prevent accidental mutation at runtime
- Since they reside entirely in memory, access is O(1) with no I/O cost

#### Storage

- A `defaultProjectPermissions` map is used as a baseline
- If no custom permissions are defined, the database remains empty — reducing storage and keeping the table clean
- If custom permissions are added, only those changes are stored in the DB and merged with the default

#### Performance

- Permissions are cached per project (`project-permissions:{projectId}`)
- Read access is O(1) from cache
- Cache is updated only on permission changes — minimizing unnecessary DB queries

---

## Testing

- Integration tests with Jest
- Modular test setup (`test/test.setup.ts`)
- Test helpers and dummy data
- Isolated test environment with a dedicated test database
- Coverage across REST, GraphQL, and WebSocket layers

---

## Tech Stack

- **Framework**: NestJS
- **Auth**: JWT, bcrypt
- **Database**: PostgreSQL via TypeORM
- **Real-Time**: Socket.IO
- **Testing**: Jest (integration and unit tests)
- **Environment**: dotenv + Joi schema validation
- **Infrastructure**: Docker + Docker Compose

---

## Architecture

- Modular, feature-based structure using NestJS modules
- Separation of concerns: services, controllers, utilities
- Centralized configuration and validation via Joi
- Cache layer for permission system and WebSocket sessions via NestJS CacheManager
- Decoupled test setup with isolated test DB and custom bootstrap

---

## Requirements

> **Docker is required.** There is no supported local setup without it.

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)

---

## Installation & Running the App

### Option 1 — With Bash (macOS / Linux / WSL)

Runs `init-project-setup.sh` directly. This will:

- Create your `.env` file interactively
- Start PostgreSQL and app containers
- Create the main and integration databases
- Generate and run the initial migration

```bash
npm run init:app
```

### Option 2 — Without Bash (Windows, no WSL)

Builds a temporary Linux container to handle the setup. Does the same as Option 1, but the bash environment runs inside Docker.

```bash
npm run init:bash
```

### Restart containers (after first setup)

```bash
npm run docker:restart
```

### Open a shell inside the app container

```bash
npm run enter
```

### Start the app in development mode (inside container)

```bash
npm run enter:start
```

---

## Running Tests

### Run all integration tests (inside container)

```bash
npm run enter:test
```

### Run a specific integration test file

```bash
npm run enter:test -- filename
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `APP_MESSAGE_PREFIX` | Optional greeting prefix |
| `DB_HOST` | `db` for Docker setup |
| `DB_PORT` | Default `5432` |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_SYNC` | Set to `1` to auto-sync schema (not recommended) |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiration (e.g. `60m`) |
| `NODE_ENV` | `development` or `test` |

> See `src/config/config.types.ts` for the full Joi schema if you run into connection issues.

---

## Folder Structure

```bash
cat folder-structure.txt
```

> I keep this file updated as the project evolves.

---

## Author

Adonis Smlatic — Backend Developer
[LinkedIn](https://www.linkedin.com/in/adonis-smlatic-3b072a2b8/)

---

## License

MIT License — Copyright (c) 2025 Adonis Smlatic
