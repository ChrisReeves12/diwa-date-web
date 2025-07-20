# Rules About Database Updates

We do use Prisma for some database transactions, but we don't use any of their migrations at this time. Therefore, when making updates to the database schema, also just update database directly using your MCP tools.

# Guides

- For a guide on how we do console command creation, refer to docs/console-command-creation.md

# Query Guidelines

- In raw queries, surround all field names with double quotes, to ensure camel-cased field names stay in tact 