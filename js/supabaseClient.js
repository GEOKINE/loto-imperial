import { SUPABASE_CONFIG } from './config.js';

// Initialize Supabase client
// The global 'supabase' object is provided by the CDN script in index.html
export const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);

// Manejo seguro de promesas de Auth para evitar errores no capturados cuando no hay conexión o en sandboxes
if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (event) => {
        const err = event.reason;
        if (err && (
            err.name === 'AuthRetryableFetchError' ||
            (err.message && (
                err.message.includes('refresh_token') ||
                err.message.includes('Failed to fetch') ||
                err.message.includes('NetworkError')
            ))
        )) {
            console.warn('⚠️ Supabase Auth: Red no disponible o token expirado. Continuando en modo offline seguro.');
            event.preventDefault();
        }
    });
}

export default supabase;
