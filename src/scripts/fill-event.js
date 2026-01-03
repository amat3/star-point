const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service_role_key) {
  console.error("Error: Env vars missing");
  process.exit(1);
}

const supabase = createClient(url, service_role_key);

const EVENT_ID = '157dea10-cf32-4ecb-8009-a2628cce6dbf'; // Mixing Padel

async function fillEvent() {
    console.log(`Filling event ${EVENT_ID}...`);

    // 1. Get Event Info
    const { data: event, error: eError } = await supabase.from('events').select('max_spots').eq('id', EVENT_ID).single();
    if (eError) throw eError;

    const MAX = event.max_spots;
    console.log(`Max spots: ${MAX}`);

    // 2. Get Current Count
    const { count, error: cError } = await supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', EVENT_ID);
    if (cError) throw cError;

    const needed = (MAX + 4) - count; // Fill reserves too (max + 4)
    console.log(`Currently ${count} participants. Need ${needed} more.`);

    if (needed <= 0) {
        console.log("Event is already full.");
        return;
    }

    // 3. Get Users NOT in event
    // Simplified: Get all users, filter out those already in.
    const { data: participants } = await supabase.from('event_participants').select('user_id').eq('event_id', EVENT_ID);
    const joinedIds = new Set(participants.map(p => p.user_id));

    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    const candidates = users.filter(u => !joinedIds.has(u.id));
    
    // 4. Insert needed
    const toInsert = candidates.slice(0, needed).map(u => ({
        event_id: EVENT_ID,
        user_id: u.id
    }));

    if (toInsert.length === 0) {
        console.log("No candidates available to add.");
        return;
    }

    const { error: iError } = await supabase.from('event_participants').insert(toInsert);
    if (iError) throw iError;

    console.log(`✅ Added ${toInsert.length} participants.`);
}

fillEvent().catch(console.error);
