import app from './app.js';
import dotenv from 'dotenv';
import { runDiagnostics } from './services/healthCheckService.js';
dotenv.config();
const PORT = process.env.PORT || 5000;
(async () => {
    // Execute database health check diagnostics before accepting requests
    await runDiagnostics({ exitOnError: true });
    app.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
    });
})();
