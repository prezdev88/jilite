# History Log persistence lifecycle

History Log owns the `EventLog` model and its data. The core schema must never
reference this model. `projectId` is intentionally a scalar reference instead
of a Prisma relation so the core schema remains valid when this plugin is not
installed.

## Install and upgrade

`npm run db:upgrade` discovers plugin schemas and upgrade scripts. Upgrade
scripts live in `upgrades/`, run in filename order, must be idempotent, and must
create a recoverable database backup before rebuilding a table.

Upgrade `001-decouple-project-relation.cjs` removes the legacy foreign key to
`Project` while preserving every event and both query indexes. Its backup path
is printed during execution.

If recovery is necessary, stop the application, preserve the failed database
for diagnosis, replace the configured SQLite database with the printed backup,
and run the previous application version. The upgrade is idempotent, so a
successful database is not rebuilt on later executions.

## Project deletion

There is currently no project deletion use case. When one is introduced, its
application workflow must invoke registered plugin cleanup hooks before deleting
the core project. History Log's hook will delete `EventLog` rows by `projectId`.
The core schema must not regain a reverse relation solely to obtain cascading
deletion.

## Deactivation and removal

Deactivating History Log preserves its data. Removing the plugin must be an
explicit operation: back up or export its events, run the plugin uninstall
migration, remove its server/client registry entries, gather schemas again, and
only then regenerate Prisma. A normal application start must never implicitly
drop plugin data.
