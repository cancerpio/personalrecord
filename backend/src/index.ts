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

// 模擬的 LIFF 驗證 Middleware
const mockLiffAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1] || 'fake-liff-token';

    // 在這裡，因為是 mock 測試，我們假設前端開發階段傳來的 token 解析後能得出 userId="mock_user_123"
    // 若你要用不同帳號測試，可以直接讓前端把 token 設定為想模擬的 userId，例如 Bearer my_test_id
    const userId = token === 'fake-liff-token' ? 'U_mock_user_123' : token;

    req.user = { userId };

    try {
        // 自動 Upsert User 資料供模擬
        await db.upsertUser(userId, { displayName: `User ${userId}` });
        next();
    } catch (e) {
        console.error("Auth Error", e);
        next(e);
    }
};

app.use('/api/v1', mockLiffAuth as any);

// --- API Endpoints ---

// 1. Training Sessions
app.get('/api/v1/sessions', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const sessions = await db.getSessions(userId);
        res.json({ data: sessions });
    } catch (e) {
        next(e);
    }
});

app.post('/api/v1/sessions', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const data = req.body;
        const newSession = await db.addSession(userId, data);
        res.status(201).json({ data: newSession });
    } catch (e) {
        next(e);
    }
});

app.put('/api/v1/sessions/:id', async (req, res, next) => {
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

app.delete('/api/v1/sessions/:id', async (req, res, next) => {
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
app.get('/api/v1/body-metrics', async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const metrics = await db.getBodyMetrics(userId);
        res.json({ data: metrics });
    } catch (e) {
        next(e);
    }
});

app.post('/api/v1/body-metrics', async (req, res, next) => {
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

app.delete('/api/v1/body-metrics/:date', async (req, res, next) => {
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
