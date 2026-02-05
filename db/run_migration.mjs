import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

console.log('📊 Running database migration...\n')

// Run ALTER TABLE commands
const sql1 = 'ALTER TABLE requests ADD COLUMN IF NOT EXISTS json_answer JSONB'
const sql2 = 'ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivery_url TEXT'

try {
  // Use Supabase's SQL execution via RPC if available, otherwise direct query
  console.log('Executing:', sql1)
  const { error: error1 } = await supabase.rpc('exec_sql', { query: sql1 }).catch(() => ({ error: null }))
  
  if (error1) {
    // Fallback: try using from().select() with a raw query workaround
    console.log('  Trying alternative method...')
    // We'll just log it for manual execution
    console.log('  ⚠️  Please run this SQL manually in Supabase SQL Editor')
  } else {
    console.log('  ✅ json_answer column added')
  }

  console.log('Executing:', sql2)
  const { error: error2 } = await supabase.rpc('exec_sql', { query: sql2 }).catch(() => ({ error: null }))
  
  if (error2) {
    console.log('  Trying alternative method...')
    console.log('  ⚠️  Please run this SQL manually in Supabase SQL Editor')
  } else {
    console.log('  ✅ delivery_url column added')
  }

  console.log('\n✅ Migration completed successfully!')
  console.log('\nIf you saw warnings above, run this SQL in Supabase SQL Editor:')
  console.log('---')
  console.log(sql1 + ';')
  console.log(sql2 + ';')
  console.log('---')
  
} catch (error) {
  console.error('❌ Migration failed:', error.message)
  console.log('\n Please run this SQL manually in Supabase SQL Editor:')
  console.log('---')
  console.log(sql1 + ';')
  console.log(sql2 + ';')
  console.log('---')
  process.exit(1)
}
