const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function checkSchema() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching matches:", error);
  } else if (data && data.length > 0) {
    console.log("Matches columns:", Object.keys(data[0]));
  } else {
    console.log("Matches table is empty, cannot infer columns from data.");
    // Try to insert a dummy to see error or just assume
  }
}

checkSchema();
