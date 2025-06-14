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

### Testing

- Integration tests with Jest
- Modular test setup (`test-setup.ts`)
- Test helpers and mock data organized by concern
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

## Running Tests

### Run all unit tests
npm run test

### Run a specific test file
npm run test -- path/to/test-file

### Run all E2E tests
npm run test:e2e

### Run a specific E2E test file
npm run test:e2e -- path/to/e2e-test-file

Note: Please setup these environment variables with an own db setup. Mirgration files will be included soon!


## Installation

Install dependencies
npm install

Start PostgreSQL using Docker
docker-compose up -d

Run the app in development mode
npm run start:dev

## Environment Variables
### Optional greeting prefix
APP_MESSAGE_PREFIX=Hello
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

## Demo
🔗 Link to live API/demo frontend — coming soon!

If you'd like to preview the app live, a frontend demo or API documentation will be provided soon.

## Folder Structure

You can view the current folder structure with:
bash:
cat folder-structure.txt
Or simply open the folder-structure.txt file in the root directory.
I’ll try to keep it updated as the project evolves.

## Author
Adonis Smlatic
Junior Full-Stack Developer
https://www.linkedin.com/in/adonis-smlatic-3b072a2b8/

## License
To be added!
