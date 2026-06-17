import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth.js';
import dbRouter from './routes/db.js';
import storageRouter from './routes/storage.js';
import rpcRouter from './routes/rpc.js';
import functionsRouter from './routes/functions.js';
const app = express();
// Global Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
// Routes Registration
app.use('/api/auth', authRouter);
app.use('/api/db', dbRouter);
app.use('/api/storage', storageRouter);
app.use('/api/rpc', rpcRouter);
app.use('/api/functions', functionsRouter);
export default app;
