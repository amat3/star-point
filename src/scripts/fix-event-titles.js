const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTitles() {
  console.log('🔍 Buscando eventos con título "Mixing Padel"...');
  
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title')
    .eq('title', 'Mixing Padel');

  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log(`📋 Encontrados ${events.length} eventos para actualizar.`);

  if (events.length === 0) {
      console.log('✅ No hay nada que hacer.');
      return;
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({ title: 'Mixing' })
    .eq('title', 'Mixing Padel');

  if (updateError) {
    console.error('❌ Error actualizando eventos:', updateError);
  } else {
    console.log('✅ Títulos actualizados correctamente a "Mixing".');
  }
}

fixTitles();
