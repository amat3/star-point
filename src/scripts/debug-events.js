const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkEvents() {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log("Recent Events:");
  events.forEach(e => {
      console.log(`- ID: ${e.id}`);
      console.log(`  Title: ${e.title}`);
      console.log(`  Rounds: ${e.rounds} (Type: ${typeof e.rounds})`);
      console.log(`  Max Spots: ${e.max_spots}`);
      console.log(`  Status: ${e.status}`);
  });
}

checkEvents();
