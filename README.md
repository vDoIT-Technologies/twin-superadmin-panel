# Twin Superadmin Panel React

Starter React dashboard scaffolded in a sibling folder beside the original static HTML app.

## Stack

- React 18
- Vite 5
- React Router

## Structure

```text
src/
  app/          router configuration
  components/   reusable UI building blocks
  data/         local mock data
  layouts/      shell and page framing
  pages/        route-level screens
  services/     API abstraction layer
  utils/        helpers and formatters
```

## Start

```bash
npm install
npm run dev
```

## Notes

- The current service layer uses mocked async responses so you can swap in real API calls later.
- Routes included: Overview, Clients, Twins, Users, Services, Financial.
