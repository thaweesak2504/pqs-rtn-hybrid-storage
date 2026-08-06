# Rust And Database Patterns

## Commands And Layers

Tauri command adapters normally live in `src-tauri/src/commands/` and delegate to `auth`, `content_database`, backup, export, or file modules. Some legacy commands remain directly registered; do not add new direct registrations without a reason.

Commands return `Result<T, String>` at the IPC boundary. Keep detailed internal errors in logs while returning stable, understandable messages. Avoid `unwrap`/`expect` outside startup invariants and tests.

## SQLite

Acquire connections through `content_database::get_content_connection()` or the appropriate safe auth wrapper. Do not open the live database path ad hoc.

- Bind all values with prepared parameters.
- Use transactions for multi-row or database/filesystem state transitions where possible.
- Validate any dynamic SQL identifier against a fixed allowlist.
- Respect foreign keys and cascading ownership.
- Add indexes only with a demonstrated query need.

Schema creation currently combines versioned migrations with compatibility-oriented `CREATE TABLE IF NOT EXISTS` and best-effort `ALTER TABLE` logic. Prefer a new versioned migration for schema changes; do not add another startup `ALTER TABLE` unless backward compatibility requires it and the reason is documented.

## IPC Data

Create public DTOs that contain only fields the UI needs. Password hashes, stored credential data, filesystem secrets, and internal diagnostics must never derive into a serialized response. Authentication should query private credential records and convert successful results into a public user DTO plus a backend-issued opaque session token.

User-management commands must validate that token in Rust and enforce the required role or self-access there. Frontend route guards improve navigation but are not an authorization boundary. Sessions are process-local and expire after 12 hours, so a token left in browser storage after an application restart must fail closed and be cleared.

## Files

Use `get_portable_data_dir()` and established media helpers. Validate relative prefixes and ensure resolved targets remain under the intended data root before writing or deleting. Count all database references before deleting shared physical files.

Trainee attachments use `upload_trainee_attachment` and paths under `data/<document-id>/trainee-attachments/`; do not use the obsolete `save_attachment_file`/`documents/` convention.

## Backup And Restore

Create database backups through SQLite's backup API or an equivalent consistent snapshot while WAL is active. Do not copy the live main file alone. Stream large files into ZIP entries instead of reading every file fully into memory.

For import:

1. Validate the backup filename and manifest limits.
2. Resolve each ZIP entry through a safe enclosed path.
3. Extract into a unique staging directory.
4. Verify checksum and database readability/schema.
5. Coordinate replacement with the live connection pool.
6. Preserve a recoverable copy of current data until the application successfully reopens the restored database.

## Tests

Use isolated temporary directories and SQLite connections. Add policy tests near `src-tauri/src/content_database/tests/`; keep backup and auth unit tests near their modules when private helpers are under test.
