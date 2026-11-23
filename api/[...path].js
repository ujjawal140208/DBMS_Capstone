import { createApp } from '../Backend/src/app.js';

// Vercel serverless entrypoint. The existing Express routes and database logic
// remain unchanged; MongoDB connects lazily through the existing requireDb middleware.
const app = createApp();
export default app;
