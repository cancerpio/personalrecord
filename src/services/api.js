import { LocalService } from './LocalService';
import { LIFFService } from './LIFFService';

// Decide which service to use based on environment variables
const storageMode = import.meta.env.VITE_STORAGE_MODE || 'local';

let apiInstance;

if (storageMode === 'liff') {
    apiInstance = new LIFFService();
    console.log('[API Factory] Initialized LIFF Mode Service.');
} else {
    apiInstance = new LocalService();
    console.log('[API Factory] Initialized Local Mode Service (using localStorage).');
}

export const api = apiInstance;
