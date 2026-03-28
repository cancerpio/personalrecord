import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { firestoreDb as db } from './db';
import * as functions from 'firebase-functions/v1';

const app = express();
app.use(cors());
app.use(express.json());

// 擴充 Express Request 型別以支援自訂的 userId
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
            };
        }
    }
}

import axios from 'axios';

// 正式版的 LIFF 驗證 Middleware
const liffAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        let userId = '';
        let userProfile: any = {};

        // 開發端防呆切換：若啟用 MOCK 模式，則直接通關
        if (process.env.MOCK_LIFF_TOKEN === 'true') {
            userId = token === 'fake-liff-token' ? 'U_mock_user_123' : token;
            userProfile = { displayName: `User ${userId}` };
        } else {
            // 正式安全連線：向 LINE 伺服器驗證 JWT Token 的真實性
            const response = await axios.post('https://api.line.me/oauth2/v2.1/verify', new URLSearchParams({
                id_token: token,
                client_id: process.env.LINE_CLIENT_ID || '' // 【重要】後端 .env 必須填寫對應的 LINE Login Channel ID
            }).toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const payload: any = response.data;
            userId = payload.sub; // LINE User ID
            if (payload.name) userProfile.displayName = payload.name;
            if (payload.picture) userProfile.pictureUrl = payload.picture;
        }

        req.user = { userId };

        // 自動 Upsert 真實使用者的資訊到 Firestore Users 表
        await db.upsertUser(userId, userProfile);
        next();
    } catch (e: any) {
        console.error("Auth Error:", e.response?.data || e.message);
        return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
    }
};

const v1Router = express.Router();

v1Router.use(liffAuthMiddleware as any);

// --- API Endpoints ---

// 1. Training Sessions
v1Router.get('/sessions', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const sessions = await db.getSessions(userId);
        res.json({ data: sessions });
    } catch (e) {
        next(e);
    }
});

v1Router.post('/sessions', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const data = req.body;
        const newSession = await db.addSession(userId, data);
        res.status(201).json({ data: newSession });
    } catch (e) {
        next(e);
    }
});

v1Router.put('/sessions/:id', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const docId = req.params.id;
        const data = req.body;
        const updated = await db.updateSession(userId, docId, data);
        if (!updated) {
            return res.status(404).json({ error: 'Session not found or unauthorized' });
        }
        res.json({ data: updated });
    } catch (e) {
        next(e);
    }
});

v1Router.delete('/sessions/:id', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const docId = req.params.id;
        const success = await db.deleteSession(userId, docId);
        if (!success) {
            return res.status(404).json({ error: 'Session not found or unauthorized' });
        }
        res.status(204).send();
    } catch (e) {
        next(e);
    }
});

// 2. Body Metrics
v1Router.get('/body-metrics', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const metrics = await db.getBodyMetrics(userId);
        res.json({ data: metrics });
    } catch (e) {
        next(e);
    }
});

v1Router.post('/body-metrics', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { date, fatPercentage, bodyWeight } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const updated = await db.upsertBodyMetric(userId, date, { fatPercentage, bodyWeight });
        res.status(200).json({ data: updated });
    } catch (e) {
        next(e);
    }
});

v1Router.delete('/body-metrics/:date', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const date = req.params.date;
        const success = await db.deleteBodyMetric(userId, date);
        if (!success) {
            return res.status(404).json({ error: 'Metric not found or unauthorized' });
        }
        res.status(204).send();
    } catch (e) {
        next(e);
    }
});

// Mount the router twice to solve the Firebase Routing mismatch
// Local environment -> Hits /api/v1/sessions
app.use('/api/v1', v1Router);
// Firebase Cloud Functions -> Strips the function name `/api`, hits /v1/sessions
app.use('/v1', v1Router);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// --- Execution & Deployment Mode ---
// For Local Development (only active if not running inside Firebase Functions emulator)
if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

// For Firebase Cloud Functions
export const api = functions.region('asia-east1').https.onRequest(app);
