# Rules About Database Updates

We do use Prisma for some database transactions, but we don't use any of their migrations at this time. Therefore, when making updates to the database schema, also just update database directly using your MCP tools.

# Guides

- For a guide on how we do console command creation, refer to docs/console-command-creation.md

# Query Guidelines

- In raw queries, surround all field names with double quotes, to ensure camel-cased field names stay in tact 

# Styling Guidelines

- Always include the globals.scss in every SCSS file. Use the @use syntax, like this:
```scss
@use '@/styles/globals' as globals;
```
- Always use the breakpoint min-media helpers from globals.scss for conditional styling for screen width, and the helper for dark mode
- Assume a mobile-first approach, in that the default styling is optimized for mobile
- When adding styling for dark-mode, always use the @include globals.dark-mode helper.
- When using prisma, always use prismaWrite and prismaRead for write and read operations. We have a read replica and a master database and so you need to always use those.