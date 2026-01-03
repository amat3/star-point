const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function checkParticipants() {
  const { data: events } = await supabase.from('events').select('id, title, max_spots').order('created_at', { ascending: false }).limit(2);

  for (const e of events) {
      const { count } = await supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', e.id);
      console.log(`Event: ${e.title} (${e.id})`);
      console.log(`Max: ${e.max_spots}, Actual: ${count}`);
  }
}

checkParticipants();
