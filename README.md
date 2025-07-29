# WeGotJiraAtHome

## Project Goal

A full-featured, test-driven project and task management API inspired by Jira. The goal is to deepen my understanding of maintainable and scalable backend architecture through real-world development practices.

---

## Overview

**WeGotJiraAtHome** is a backend application built using NestJS that provides:

- Role-based access control (Admin, Regular User)
- Authentication via JWT
- Projects with ownership and members
- Tasks with status updates, labels, and filters
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
- Email Verification (via Mailer & Email-Driven Workflows) – Verifies a user’s email before granting access to sensitive routes (e.g., project creation, profile).
- Password Reset (via Mailer & Email-Driven Workflows) – Allows secure password recovery through a time-limited token sent via email.

### Mailer & Email-Driven Workflows

The Mailer is its own dedicated module responsible for sending and managing all application emails. It serves as the central hub for workflows that involve email as part of the user journey.

- Email Verification – Ensures users validate their email before accessing sensitive routes (e.g., project creation, profile)
- Project Invitations – Sends invite links via email and automatically creates a ProjectUser record with permissions upon acceptance
- Password Reset – Allows users to request a reset token and update their password securely.

### Projects & ProjectUsers

- Create projects (with optional tasks)
- Automatically assign project to Project User
- Designed for full CRUD of project users
- ProjectUser module serves as the canonical source for project membership and roles to enable consistent permissions enforcement
- Invitation System (via Mailer & Email-Driven Workflows) – Sends project invites via email and handles automated user creation with default permissions on acceptance.

### Tasks

- Full CRUD for tasks
- Attach multiple labels to tasks
- Filter by status, labels, title, and description
- Pagination and sorting support
- DTO validation and robust error handling

### Permission System

The permission system is designed to be lightweight, cache-efficient, and secure. Here's how it works:

#### Structure

Permissions follow a consistent structure:
- Project → Role → Resource → Action
- Each project assigns users a role (OWNER, ADMIN, USER, GUEST).
- Each role defines permissions over resources (e.g., projects, tasks, project-users).
- Each resource supports actions (read, create, update, delete).
> Only explicitly allowed actions (`true`) grant access. All others are denied by default — keeping permission objects slim and secure.

#### Default Permissions

- Default permissions are defined in the codebase (config/project-permissions.config.ts) and do not exist in the database.
- They are deeply frozen using a utility (deepFreeze) to prevent accidental mutation at runtime.
- Since they reside entirely in memory, accessing them is O(1) and incurs no I/O cost.

#### Storage

- A default permission map (defaultProjectPermissions) is used as a baseline.
- If no custom permissions are defined, the database remains empty — reducing storage and keeping the table clean.
- If custom permissions are added, only those changes are stored in the DB and merged with the default.

#### Utilities

Utility functions like normalizeAllPermissions and mapPermissionsToRole ensure:
- Default values are filled in for missing fields.
- The resulting permission map is complete, consistent, and based on a known baseline.

#### Performance

- Permissions are cached per project (project-permissions:{projectId}).
- Read access is O(1) from cache.
- Cache is updated only on permission changes — minimizing unnecessary DB queries.

This design is especially efficient for smaller teams and projects where permissions rarely change.

---

## Testing

- Integration tests with Jest
- Modular test setup (`test-setup.ts`)
- Test helpers and dummy data
- Isolated test environment and dedicated test DB

---

## Tech Stack

- **Framework**: NestJS
- **Auth**: AuthGuard, bcrypt, JwtModule
- **Database**: PostgreSQL (via TypeORM)
- **Testing**: Jest (integration and unit tests)
- **Environment**: dotenv + Joi schema validation
- **Docker**: Compose setup for DB and app

---

## Architecture

- Modular, feature-based structure using NestJS modules
- Separation of concerns: services, controllers, and utilities
- Centralized configuration and validation via Joi
- Cache layer for permission system (via NestJS CacheManager)
- Decoupled test setup with isolated test DB and custom bootstrap

---

## Installation & Running the App

### Local Setup (optional)
Requires Node.js and PostgreSQL to be installed manually.

#### Install dependencies

```bash
npm install
```

#### Initialize .env interactively
Creates a .env file with required environment variables. Prompts for DB name, user, password, and JWT secret (auto-generated if left blank).

```bash
npm run init:lite
```

### Run the app in development mode

```bash
npm run start:dev
```

### Docker setup (recommended)

#### Initialize .env and spin up containers
Run the init-project-setup.sh script via the command below. This will:
- Create your .env file (if missing)
- Set up PostgreSQL with required databases
- Start the app and database containers and creates main and test db
- Generate and run the initial migration based on current entities

```bash
npm run init:app
```

#### No Bash? Use this instead
This will:
- Create a temporary Linux shell container
- Create your .env file (if missing) → runs init-env.sh inside env-init service
- Build the Docker Compose for DB connection and app
- Create main and test DB → runs create-dbs.sh inside init service
- Generate and run initial migration based on current entities

```bash
npm run init:bash
```

#### Restart Docker containers (after first setup)

```bash
npm run docker:restart
```

#### Open a shell inside the app container

```bash
npm run enter
```

#### Start the app in development mode (inside container)

```bash
npm run enter:start
```

---

## Running Tests

### Local Setup (optional)

#### Run all integration tests

```bash
npm run test:integration
```

#### Run a specific integration test file

```bash
npm run test:integration -- filename
```

### Docker Setup (recommended)

#### Run all integration tests

```bash
npm run enter:test
```

#### Run a specific integration test file

```bash
npm run enter:test -- filename
```

> All tests pass and run successfully. However, you may notice duplicate logs or memory issues during testing. This appears to be related to the test setup (possibly multiple app instances being created). It does not affect real usage (e.g., Postman).

---

## Environment Variables

#### Optional greeting prefix
APP_MESSAGE_PREFIX=HelloWorld

#### Database host
DB_HOST=localhost # for local setup
DB_HOST=db # docker setup

#### Database port
DB_PORT=5432

#### Database username (required)
DB_USER=your_db_user

#### Database password (required)
DB_PASSWORD=your_db_password

#### Database name (required)
DB_NAME=your_db_name

#### Set to 1 to auto-sync schema (not recommended in prod)
DB_SYNC=0

#### Secret key for JWT (required)
JWT_SECRET=your_jwt_secret

#### Token expiration time (e.g., 3600s)
JWT_EXPIRES_IN=3600s

Check src/config/config.types.ts joi object for current .env setup if db connection fails

---

## ⚠️ Experimental Frontend Setup — DO NOT RUN YET!

> **IMPORTANT:** This script is **experimental** and **does NOT work reliably at this time.**
> Running it **may break project structure** or cause unexpected issues.
> Only run if you want to explore at your own risk. I will update this notice when the script is stable.

What it does:

- Moves all backend files into a ./backend folder
- Creates a .env file with default values (postgres user/pass, random JWT secret, etc.)
- Starts the backend via Docker for database initialization
- Creates a ./frontend folder and runs the Vite CLI (npm create vite@latest) so you can pick your preferred setup (e.g., React, Vue, etc.)

#### To try it:
Run this once from the root:
```bash
npm run frontend:init
```

Once the structure is set up, you can start the backend using:
```bash
npm run start:backend
```

When you're done developing:

```bash
cd backend
docker-compose down -v
```

API documentation will be added once core features are finalized. Until then, check out the entity and DTO files if you’re curious.

---

## Folder Structure

To see the current layout of the project, run:

```bash
cat folder-structure.txt
```

Or just open the folder-structure.txt file in the root directory.
> I’ll keep this file updated as the project structure evolves.

---

## Author

Adonis Smlatic
Junior Full-Stack Developer
https://www.linkedin.com/in/adonis-smlatic-3b072a2b8/

---

## License

This project is currently unlicensed. License terms will be added soon.
