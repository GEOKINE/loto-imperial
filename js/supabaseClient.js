import { SUPABASE_CONFIG } from './config.js';

if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.anonKey || !SUPABASE_CONFIG.url) {
    console.error('❌ [Supabase] Configuración incompleta. Falta URL o anonKey en js/config.js:', SUPABASE_CONFIG);
} else {
    console.log('🔑 [Supabase] Inicializando cliente con URL:', SUPABASE_CONFIG.url);
}

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
        },
        global: {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey
            }
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
                err.message.includes('NetworkError') ||
                err.message.includes('No API key found') ||
                err.message.includes('apikey')
            ))
        )) {
            console.warn('⚠️ Supabase: Error de conexión o autenticación API key. Continuando en modo offline seguro.');
            event.preventDefault();
        }
    });
}

export default supabase;
