const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service_role_key) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment.");
  process.exit(1);
}

const supabase = createClient(url, service_role_key);

const MOCK_USER_PASSWORD = 'password123';
const TOTAL_NEEDED = 30; // 2 events * 12 + spares

async function seed() {
  console.log('🌱 Starting seed...');

  // 1. Ensure Users
  console.log('Checking users...');
  const { data: { users }, error: uError } = await supabase.auth.admin.listUsers();
  if (uError) throw uError;

  const existingCount = users.length;
  console.log(`Found ${existingCount} users.`);

  let createdCount = 0;
  if (existingCount < TOTAL_NEEDED) {
    const toCreate = TOTAL_NEEDED - existingCount;
    console.log(`Need to create ${toCreate} more users...`);

    for (let i = 0; i < toCreate; i++) {
        const rand = Math.floor(Math.random() * 10000);
        const email = `player${existingCount + i + 1}_${rand}@test.com`;
        const fullName = `Player ${existingCount + i + 1} (${rand})`;
        const rating = (Math.floor(Math.random() * 8) + 2) / 2; // 1.0 to 5.0

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: 'password123',
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (error) {
            console.error(`Failed to create ${email}:`, error.message);
        } else {
            // Update profile with rating and technical stats
            const positions = ['drive', 'reves', 'ambos'];
            const hands = ['diestro', 'zurdo'];
            
            await supabase.from('profiles').update({ 
                rating: rating,
                full_name: fullName,
                court_position: positions[Math.floor(Math.random() * positions.length)],
                preferred_hand: hands[Math.floor(Math.random() * hands.length)],
                gender: Math.random() > 0.5 ? 'masculino' : 'femenino'
            }).eq('id', data.user.id);
            
            createdCount++;
            process.stdout.write('.');
        }
    }
    console.log(`\nCreated ${createdCount} new users.`);
  }

  // Reload users to get IDs
  const { data: { users: allUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const playerIds = allUsers.map(u => u.id);

  // 2. Create Events
  const creatorId = playerIds[0]; // Just pick the first one as creator (Admin usually)

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const tomorrow2 = new Date(tomorrow);
  tomorrow2.setHours(12, 0, 0, 0);

  const eventsData = [
      {
          title: "MOCK MIXING - Mañana 10:00",
          start_time: tomorrow.toISOString(),
          max_spots: 12,
          created_by: creatorId,
          status: 'open',
          rounds: 1
      },
      {
          title: "MOCK MIXING - Mañana 12:00",
          start_time: tomorrow2.toISOString(),
          max_spots: 16,
          created_by: creatorId,
          status: 'open',
          rounds: 3
      }
  ];

  for (const ev of eventsData) {
      console.log(`Creating event: ${ev.title}`);
      const { data: event, error: eError } = await supabase.from('events').insert(ev).select().single();
      
      if (eError) {
          console.error('Error creating event:', eError);
          continue;
      }

      console.log(`Event created: ${event.id}. Filling with participants...`);
      
      // Shuffle users
      const shuffled = playerIds.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, ev.max_spots);

      const participantsData = selected.map(uid => ({
          event_id: event.id,
          user_id: uid
      }));

      const { error: pError } = await supabase.from('event_participants').insert(participantsData);
      if (pError) console.error('Error adding participants:', pError);
      else console.log(`Added ${selected.length} participants.`);
  }

  console.log('✅ Seed completed!');
}

seed().catch(console.error);
