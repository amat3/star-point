const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function populateMixings() {
  console.log('🚀 Starting to populate mixings...');

  // 1. Fetch Open Events
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, max_spots, rounds')
    .eq('status', 'open');

  if (eventsError) {
    console.error('❌ Error fetching events:', eventsError);
    return;
  }

  if (!events || events.length === 0) {
    console.log('ℹ️ No open events found.');
    return;
  }

  console.log(`📋 Found ${events.length} open events.`);

  // 2. Fetch All Users
  // We fetch a reasonable amount of users to pool from.
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, full_name, email'); // email might not be in profiles depending on schema, adjusting to just id/full_name if needed.

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  if (!users || users.length === 0) {
    console.error('❌ No users found in database to populate events with.');
    return;
  }
  
  console.log(`👥 Found ${users.length} total users available.`);

  for (const event of events) {
    console.log(`\n🎟️ Processing event: ${event.title} (ID: ${event.id}) - Max Spots: ${event.max_spots}`);

    // Check existing participants
    const { count, data: participants, error: partError } = await supabase
        .from('event_participants')
        .select('user_id', { count: 'exact' })
        .eq('event_id', event.id);

    if (partError) {
        console.error(`   ❌ Error fetching participants for event ${event.id}:`, partError);
        continue;
    }

    const currentCount = count || 0;
    const spotsNeeded = event.max_spots - currentCount;

    console.log(`   🔸 Current participants: ${currentCount}`);
    console.log(`   🔸 Spots needed: ${spotsNeeded}`);

    if (spotsNeeded <= 0) {
        console.log('   ✅ Event is already full.');
        continue;
    }
    
    // Filter users who are NOT already in the event
    const existingUserIds = new Set(participants?.map(p => p.user_id) || []);
    const availableUsers = users.filter(u => !existingUserIds.has(u.id));

    if (availableUsers.length < spotsNeeded) {
        console.warn(`   ⚠️ Not enough available users to fill the event! Needed: ${spotsNeeded}, Available: ${availableUsers.length}`);
    }

    // Random shuffle available users
    const shuffled = availableUsers.sort(() => 0.5 - Math.random());
    const usersToAdd = shuffled.slice(0, spotsNeeded);

    if (usersToAdd.length === 0) {
        console.log('   ℹ️ No new users to add.');
        continue;
    }

    // Insert new participants
    const participantsToAdd = usersToAdd.map(u => ({
        event_id: event.id,
        user_id: u.id,
        // joined_at default is usually now(), or we can set it
        joined_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
        .from('event_participants')
        .insert(participantsToAdd);

    if (insertError) {
        console.error(`   ❌ Failed to insert participants:`, insertError);
    } else {
        console.log(`   ✅ Successfully added ${participantsToAdd.length} users to event.`);
        participantsToAdd.forEach(p => {
             const u = users.find(user => user.id === p.user_id);
             console.log(`      + Added ${u.full_name || u.id}`);
        });
    }
  }

  console.log('\n✨ Population complete.');
}

populateMixings();
