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
- Admin role support for developer-level access

### Projects & ProjectUsers

- Create projects (with optional tasks)
- Automatically assign project to Project User
- Designed for full CRUD of project users
- ProjectUser module serves as the canonical source for project membership and roles to enable consistent permissions enforcement
- Invitation module to handle project invites and automated user addition on acceptance

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

### Testing

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

## Running Tests

### Run all unit tests
npm run test

### Run a specific test file
npm run test -- path/to/test-file

### Run all E2E tests
npm run test:e2e

### Run a specific E2E test file
npm run test:e2e -- path/to/e2e-test-file

Note:  Please set up the following environment variables with your own db setup. Migration files will be included!

---

## Installation

### Install dependencies

```bash
npm install
```

### Start PostgreSQL using Docker

```bash
docker-compose up -d
```

### Run the app in development mode

```bash
npm run start:dev
```

---

## Environment Variables

### Optional greeting prefix
APP_MESSAGE_PREFIX=HelloWorld
### Database host
DB_HOST=localhost
### Database port
DB_PORT=5432
### Database username (required)
DB_USER=your_db_user
### Database password (required)
DB_PASSWORD=your_db_password
### Database name (required)
DB_NAME=your_db_name
### Set to 1 to auto-sync schema (not recommended in prod)
DB_SYNC=0
### Secret key for JWT (required)
JWT_SECRET=your_jwt_secret
### Token expiration time (e.g., 3600s)
JWT_EXPIRES_IN=3600s

Check src/config/config.types.ts joi object for current .env setup if db connection fails

---

## Demo

If you'd like to preview the app live, a frontend demo or API documentation will be provided soon.

---

## Folder Structure

You can view the current folder structure with:
bash:
cat folder-structure.txt
Or simply open the folder-structure.txt file in the root directory.
I’ll try to keep it updated as the project evolves.

---

## Author

Adonis Smlatic
Junior Full-Stack Developer
https://www.linkedin.com/in/adonis-smlatic-3b072a2b8/

---

## License

This project is currently unlicensed. License terms will be added soon.
