#!/bin/bash

set -e
# checks for docker
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Please install Docker and try again."
  exit 1
fi

# checks for existing backend folder
if [ ! -d "./backend" ]; then
  echo "Moving backend files into ./backend..."
  mkdir backend
  shopt -s extglob
  mv !(frontend|scripts|backend) backend/ 2>/dev/null || true
fi

# creates .env standard variables
if [ ! -f "./backend/.env" ]; then
  echo "Creating default .env in ./backend..."
  cat <<EOF > ./backend/.env
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=wegotjira
DB_HOST=db
DB_PORT=5432
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=3600s
DB_SYNC=1
EOF
fi

# start backend for the first time for db initialization
echo "Starting backend using Docker..."
cd backend
npm run start:backend
echo "Waiting for Docker container to be ready..."
sleep 10
cd ..

# check for frontend folder and create frontend project
if [ ! -d "./frontend" ]; then
  echo "Creating Vite project in ./frontend..."
  mkdir frontend
  cd frontend
  npm create vite@latest . --yes
  cd ..
else
  echo "⚠️ ./frontend already exists, skipping Vite scaffold."
fi

echo ""
echo "✅ Backend is set up and running via Docker (./backend)"
echo "✅ Frontend scaffolded in ./frontend"
echo ""
echo "🔔 If you're building a frontend with Vite, make sure to prefix your environment variables with VITE_"
echo "🔗 Example: VITE_API_URL=http://localhost:3000"
