# Support Center Development

We need to create a support center for our users. This document outlines the steps and considerations for developing an effective support center.

### Database Schema Updates

We need to create a new table in our database to store support requests. The table should include the following fields:
Table Name: `support_requests`
- `id`: Primary key, auto-incrementing integer.
- `user_id`: Foreign key referencing the user who submitted the request.
- `issue_type`: String to categorize the type of issue (e.g., Bug Report, Feature Request, General Inquiry).
- `description`: Text field to store the user's description of the issue or request.
- `status`: String to indicate the status of the request (e.g., Open, In Progress, Closed).
- `created_at`: Timestamp for when the request was created.
- `updated_at`: Timestamp for when the request was last updated.

In this task, do not worry about creating a migration, just use the MCP to directly create the table in the database.

### Page Content and Structure

There is already a component where the support center should be integrated. Most of the work should be placed in `src/app/support/support-center-view.tsx`. 

We can leave the `<h1>Support Center</h1>` because that clearly indicates the purpose of the page. We do, however, need to remove all the other placeholder content. Essentially, we want to create a layout that includes:

- A brief paragraph informing the user to use the form below to submit a support request.
- A form with the following fields: 
- A dropdown to select the type of issue (e.g., Bug Report, Feature Request, General Inquiry).
- A textarea for the user to describe their issue or request.
- A submit button to send the request.

After the user submits the form, we should display a confirmation message indicating that their request has been received and is being processed. Take a look at the Personal Information form in `src/app/profile/personal-information/personal-information-form.tsx` for an example of the alert we want to show.

## Server-Side Handling

We need to create a `support-center.actions.ts` file, which will have the server action we need to handle saving the form submission to the database. Before saving the request, we should validate the input to ensure that all required fields are filled out correctly. You can follow this pattern to get the `currentUser`, which is what you will need to set the `user_id` field in the database:

```typescript
const currentUser = await getCurrentUser(await cookies());
if (!currentUser) {
    redirect('/login');
}
```

## Styling

Let's also update the `src/app/support/support.scss` and clean up any unused styles. We want to ensure that the support center page is visually appealing and consistent with the overall design of the application. Use the existing styles as a reference, but feel free to add new styles as needed to enhance the user experience. Please make sure to use the existing color scheme and typography to maintain consistency. You can find these in the globals.scss file.
