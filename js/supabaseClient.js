import { SUPABASE_CONFIG } from './config.js';

// Initialize Supabase client
// The global 'supabase' object is provided by the CDN script in index.html
export const supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
);

export default supabase;
