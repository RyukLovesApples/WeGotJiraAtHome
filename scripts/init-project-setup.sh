#!/bin/bash
set -e

bash scripts/init-env.sh

set -o allexport
source .env
set +o allexport

echo "🐳 Starting Docker containers..."
docker-compose up -d --build

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec db pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; do
  sleep 2
done
echo "✅ PostgreSQL is ready!"

echo "🗃️ Creating main and integration databases..."
docker-compose exec -T db psql -U "$DB_USER" -d postgres <<-'EOSQL'
  DO $$
  DECLARE
    db_exists BOOLEAN;
  BEGIN
    SELECT EXISTS (SELECT FROM pg_database WHERE datname = 'we_got_jira_at_home') INTO db_exists;
    IF NOT db_exists THEN
      EXECUTE 'CREATE DATABASE we_got_jira_at_home';
      RAISE NOTICE '✅ Created main DB';
    ELSE
      RAISE NOTICE 'ℹ️ Main DB already exists';
    END IF;

    PERFORM pg_sleep(1); -- just to be safe

    SELECT EXISTS (SELECT FROM pg_database WHERE datname = 'we_got_jira_at_home_integration') INTO db_exists;
    IF NOT db_exists THEN
      EXECUTE 'CREATE DATABASE we_got_jira_at_home_integration';
      RAISE NOTICE '✅ Created integration DB';
    ELSE
      RAISE NOTICE 'ℹ️ Integration DB already exists';
    END IF;
  END
  $$;
EOSQL

echo "Main and test databases successfully created"

echo "📦 Generating initial migration..."
docker-compose exec app npm run migration:generate -- src/migrations/InitialMigration

echo "🚀 Running migrations..."
docker-compose exec app npm run migration:run

echo "🎉 Init complete. Container is running."
echo "🛠️  Use 'docker-compose exec app npm run enter' to enter app shell."
