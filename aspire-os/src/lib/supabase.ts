import { createClient } from '@supabase/supabase-js';

// Strip trailing path from SUPABASE_URL — the JS client appends /rest/v1 itself
const rawUrl = process.env.SUPABASE_URL!;
const supabaseUrl = (() => {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return rawUrl;
  }
})();

export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!);
