import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });
    console.log('Successfully initialized Supabase Client.');
  } catch (error) {
    console.error('Failed to initialize Supabase Client:', error);
  }
} else {
  console.warn('Supabase URL or Service Role Key is missing. Operating in in-memory fallback mode.');
}
