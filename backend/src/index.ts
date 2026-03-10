import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { mockDb } from './mockDb';

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
// 真正的實作會使用 `jsonwebtoken` 或 LINE SDK 驗證 `req.headers.authorization` 裡的 IDToken 並解析出 `sub`
const mockLiffAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1] || 'fake-liff-token';

    // 在這裡，因為是 mock 測試，我們假設前端開發階段傳來的 token 解析後能得出 userId="mock_user_123"
    // 若你要用不同帳號測試，可以直接讓前端把 token 設定為想模擬的 userId，例如 Bearer my_test_id
    const userId = token === 'fake-liff-token' ? 'U_mock_user_123' : token;

    req.user = { userId };

    // 自動 Upsert User 資料供模擬
    mockDb.upsertUser(userId, { displayName: `User ${userId}` });

    next();
};

app.use('/api/v1', mockLiffAuth);

// --- API Endpoints ---

// 1. Training Sessions
app.get('/api/v1/sessions', (req, res) => {
    const userId = req.user!.userId;
    const sessions = mockDb.getSessions(userId);
    res.json({ data: sessions });
});

app.post('/api/v1/sessions', (req, res) => {
    const userId = req.user!.userId;
    const data = req.body;
    const newSession = mockDb.addSession(userId, data);
    res.status(201).json({ data: newSession });
});

app.put('/api/v1/sessions/:id', (req, res) => {
    const userId = req.user!.userId;
    const docId = req.params.id;
    const data = req.body;
    const updated = mockDb.updateSession(userId, docId, data);
    if (!updated) {
        return res.status(404).json({ error: 'Session not found or unauthorized' });
    }
    res.json({ data: updated });
});

app.delete('/api/v1/sessions/:id', (req, res) => {
    const userId = req.user!.userId;
    const docId = req.params.id;
    const success = mockDb.deleteSession(userId, docId);
    if (!success) {
        return res.status(404).json({ error: 'Session not found or unauthorized' });
    }
    res.status(204).send();
});

// 2. Body Metrics
app.get('/api/v1/body-metrics', (req, res) => {
    const userId = req.user!.userId;
    const metrics = mockDb.getBodyMetrics(userId);
    res.json({ data: metrics });
});

app.post('/api/v1/body-metrics', (req, res) => {
    const userId = req.user!.userId;
    const { date, fatPercentage, bodyWeight } = req.body;

    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    const updated = mockDb.upsertBodyMetric(userId, date, { fatPercentage, bodyWeight });
    res.status(200).json({ data: updated });
});

app.delete('/api/v1/body-metrics/:date', (req, res) => {
    const userId = req.user!.userId;
    const date = req.params.date;
    const success = mockDb.deleteBodyMetric(userId, date);
    if (!success) {
        return res.status(404).json({ error: 'Metric not found or unauthorized' });
    }
    res.status(204).send();
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
