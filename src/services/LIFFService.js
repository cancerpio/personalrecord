const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
import liff from '@line/liff';
import { useLiffStore } from '../stores/liffStore';

export class LIFFService {
    async getHeaders() {
        let token;
        
        // 檢查環境變數：本地開發時若啟用 Mock，直接給假 Token
        if (import.meta.env.VITE_MOCK_LIFF_TOKEN === 'true') {
            token = 'fake-liff-token';
        } else {
            // Check if store initialized LIFF successfully
            const store = useLiffStore();
            if (!store.isInit) {
                // Wait for init if called early
                await store.initLiff(); 
            }
            token = liff.getIDToken();
            if (!token) throw new Error("LIFF Token not found, user might not be logged in.");
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async getSessions() {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            headers: await this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch sessions');
        const json = await response.json();
        // Map backend docId to frontend id
        return json.data.map(session => ({ ...session, id: session.docId }));
    }

    async addSession(record) {
        const response = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify(record)
        });
        if (!response.ok) throw new Error('Failed to add session');
        const json = await response.json();
        return { ...json.data, id: json.data.docId };
    }

    async updateSession(id, updatedFields) {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
            method: 'PUT',
            headers: await this.getHeaders(),
            body: JSON.stringify(updatedFields)
        });
        if (!response.ok) throw new Error('Failed to update session');
        const json = await response.json();
        return { ...json.data, id: json.data.docId };
    }

    async deleteSession(id) {
        const response = await fetch(`${API_BASE_URL}/sessions/${id}`, {
            method: 'DELETE',
            headers: await this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete session');
        return true;
    }

    async getBodyMetrics() {
        const response = await fetch(`${API_BASE_URL}/body-metrics`, {
            headers: await this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch body metrics');
        const json = await response.json();
        return json.data.map(metric => ({ ...metric, id: metric.docId }));
    }

    async addBodyMetric(record) {
        const response = await fetch(`${API_BASE_URL}/body-metrics`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify(record)
        });
        if (!response.ok) throw new Error('Failed to add body metric');
        const json = await response.json();
        return { ...json.data, id: json.data.docId };
    }

    async deleteBodyMetric(date) {
        const response = await fetch(`${API_BASE_URL}/body-metrics/${date}`, {
            method: 'DELETE',
            headers: await this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete body metric');
        return true;
    }
}
