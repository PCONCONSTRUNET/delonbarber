const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('client_package_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  fs.writeFileSync('db_check.txt', JSON.stringify({ error, data }, null, 2));
}
run();
