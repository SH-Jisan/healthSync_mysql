import { runDiagnostics } from '../services/healthCheckService.js';
(async () => {
    try {
        console.log('Starting standalone Database and System diagnostics...\n');
        const { success } = await runDiagnostics({ exitOnError: false });
        process.exit(success ? 0 : 1);
    }
    catch (error) {
        console.error('❌ Fatal error running diagnostics command:', error.message);
        process.exit(1);
    }
})();
