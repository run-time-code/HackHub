# MongoDB Atlas environment setup

The application code cannot create or configure Atlas clusters without access to
the MongoDB Atlas project. Complete these account-level steps before deploying.

## Create isolated environments

1. In Atlas, create separate development, staging, and production projects or
   clusters according to the team's billing and deployment plan.
2. Create a database user for each environment. Grant only `readWrite` on the
   application database (`HackHub`); do not grant project-owner or cluster
   administration roles to the application.
3. Add only the API/importer deployment's trusted outbound IP addresses to the
   Network Access IP Access List. Do not use `0.0.0.0/0` in production.
4. Copy each environment's connection string into that deployment platform's
   secret manager as `MONGODB_URI`, and set `MONGODB_DATABASE=HackHub` to keep
   the backend aligned with the importer. Do not commit credentials to the
   repository.
5. Configure `MONGODB_MAX_POOL_SIZE` for the expected instance count and
   concurrency. The application defaults to 10 connections per process.
6. Ensure the API and importer point to the same environment database and use
   the `HackHub` database name and the capitalized collection names documented
   in [DATA_MODEL.md](./DATA_MODEL.md).

## Verify access

From each deployment environment, start the backend or run the existing
connection check. Confirm the application can connect and read/write its own
database, and confirm that the application database user cannot administer the
Atlas project or access unrelated databases.

## Schema freeze

The initial schema and index plan is recorded in [DATA_MODEL.md](./DATA_MODEL.md).
Have the project team review and approve that document before treating the
Week 1 schema-freeze checklist item as signed off. A repository document alone
cannot verify team approval.

## API specification

The complete frontend API specification is checked in at
[openapi.yaml](./openapi.yaml) and is served by the backend at
`/api-docs/openapi.yaml` (for local development:
`http://localhost:5000/api-docs/openapi.yaml`).
