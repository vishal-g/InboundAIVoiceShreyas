const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listSteps() {
    const { data, error } = await supabase.from('checklist_steps').select('id, title').limit(10);
    console.log(JSON.stringify(data || error, null, 2));
}
listSteps();
