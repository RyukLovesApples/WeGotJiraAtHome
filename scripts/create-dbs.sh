#!/bin/bash

set -a
source .env
set +a

export PGPASSWORD="$DB_PASSWORD"

psql -h "$DB_HOST" -U "$DB_USER" -d postgres <<-EOSQL
  CREATE DATABASE we_got_jira_at_home;
  CREATE DATABASE we_got_jira_at_home_integration;
EOSQL
