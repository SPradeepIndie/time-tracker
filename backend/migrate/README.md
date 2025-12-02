# Database Migration

This tool handles database schema initialization and migrations for the Time Tracker application.

## Prerequisites

1. **PostgreSQL** must be installed and running
2. **Database must be created manually** before running migrations

## Setup Instructions

### 1. Create Database in PostgreSQL

Connect to PostgreSQL and create the database:

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create the database
CREATE DATABASE timetracker;

# Exit psql
\q
```

Or using a single command:
```bash
psql -U postgres -c "CREATE DATABASE timetracker;"
```

### 2. Configure Database Connection

The migration tool reads configuration from `backend/internal/config/config.json`.

#### Configuration File (`config.json`)

```json
{
  "dbtype": "postgres",
  "host": "localhost",
  "port": 5432,
  "user": "postgres",
  "password": "postgres",
  "schema_name": "timetracker",
  "app_port": "8080"
}
```

#### Environment Variable Override

You can override any configuration value using environment variables with the `DB_` prefix:

**Environment Variable Naming Convention:**

| Config Field | Environment Variable | Example Value |
|--------------|---------------------|---------------|
| `Type` | `DB_TYPE` | `postgres` |
| `Host` | `DB_HOST` | `localhost` |
| `Port` | `DB_PORT` | `5432` |
| `User` | `DB_USER` | `postgres` |
| `Password` | `DB_PASSWORD` | `postgres` |
| `SchemaName` | `DB_SCHEMA_NAME` | `timetracker` |
| `AppPort` | `DB_APP_PORT` | `8080` |

**Why `DB_` prefix?**
- Avoids collision with system environment variables (e.g., `$USER`, `$HOST`)
- Makes it clear these are database-related configuration variables
- Follows best practices for application-specific environment variables

#### Example: Using Environment Variables

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=mypassword
export DB_SCHEMA_NAME=timetracker

# Run migration
cd backend/migrate/cmd
go run main.go
```

Or set them inline:
```bash
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres DB_PASSWORD=mypassword go run main.go
```

## Running Migrations

### Local Development

```bash
cd backend/migrate/cmd
go run main.go
```

### Using Docker Compose

The migration runs automatically when using docker-compose:

```bash
docker-compose up migrate
```

## Migration Process

The migration tool will:
1. Read configuration from `config.json`
2. Override with environment variables (if set)
3. Connect to PostgreSQL database
4. Execute migration scripts to create tables and schema
5. Log results to `migrate.log`

## Troubleshooting

### Error: "database does not exist"

**Solution:** Create the database manually first:
```bash
psql -U postgres -c "CREATE DATABASE timetracker;"
```

### Error: "connection refused"

**Solution:** Ensure PostgreSQL is running:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
```

### Error: "password authentication failed"

**Solution:** Check your credentials in `config.json` or environment variables.

### Error: "reflect: call of reflect.Value.Elem on struct Value"

**Solution:** This was a bug in the config loader - ensure you're using the latest version of `config.go`.

## Environment Variables Priority

The configuration loading follows this priority (highest to lowest):

1. **Environment Variables** (e.g., `DB_HOST`, `DB_USER`) - Highest priority
2. **config.json file** - Default values

This allows you to:
- Use `config.json` for local development defaults
- Override with environment variables in Docker/production
- Keep sensitive values (passwords) out of version control

## Log Files

Migration logs are written to `migrate.log` in the current directory.

## Schema Information

After successful migration, the database will contain:
- Time tracking tables
- User management tables
- Necessary indexes and constraints
- Initial data (if any)

Check `backend/migrate/migrate.go` for the complete schema definition.
