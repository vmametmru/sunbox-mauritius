import { createClient } from '@supabase/supabase-js';

// PRO DB configuration from environment variables
const supabaseUrl = import.meta.env.VITE_PRO_DB_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_PRO_DB_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error('ERREUR : PRO DB URL Manquant (VITE_PRO_DB_URL non défini dans .env)');
}
if (!supabaseKey) {
  throw new Error('ERREUR : PRO DB ENCRYPTION KEY Manquant (VITE_PRO_DB_KEY non défini dans .env)');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };