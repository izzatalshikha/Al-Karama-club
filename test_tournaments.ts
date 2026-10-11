import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function main() {
  const { data: t, error: e1 } = await supabase.from('tournaments').select('*');
  console.log('Tournaments:', t, 'Error:', e1);
  const { data: tm, error: e2 } = await supabase.from('tournament_matches').select('*');
  console.log('Tournament Matches:', tm, 'Error:', e2);
}
main();
