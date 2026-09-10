import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
