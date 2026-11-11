# Certificate Portal — Front-end

React 19 + Vite + Tailwind. See the [root README](../README.md) for setup and team conventions.

```
src/
├── main.jsx            entry: Router + <AuthProvider>
├── App.jsx             every page route (public / employee / admin)
├── services/api.js     THE ONLY place that talks to the backend
├── context/            <AuthProvider> — employee session
├── hooks/useAuth.js    read the employee session in any component
├── components/         shared UI + route guards (ProtectedRoute, AdminProtectedRoute)
├── utils/              small helpers (safe post-login redirect)
├── pages/              public + employee pages
└── Admin/              admin pages
```

## Rules

- Call the API through `services/api.js` (never `fetch` directly). It sets the right base URL,
  sends the session cookie, and turns errors into `Error` objects with `.status` and `.message`.
- Login state lives in httpOnly cookies — never store tokens in `localStorage`.
- Protect pages by wrapping them in `<ProtectedRoute>` (employee) or `<AdminProtectedRoute>` (admin) in `App.jsx`.

## Environment

`VITE_API_URL` (optional) — backend origin, e.g. `http://localhost:5000`. See `.env.example`.
