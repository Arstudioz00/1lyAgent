#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const sql = readFileSync(join(__dirname, 'add_json_delivery.sql'), 'utf-8')

console.log('Running migration...')
console.log(sql)

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  console.error('Migration failed:', error)
  // Try alternative method - direct SQL execution
  console.log('\nTrying direct execution...')
  const queries = sql.split(';').filter(q => q.trim())

  for (const query of queries) {
    const trimmed = query.trim()
    if (!trimmed) continue

    console.log(`Executing: ${trimmed}`)
    const { error: execError } = await supabase.rpc('exec', { sql: trimmed })
    if (execError) {
      console.error('Failed:', execError.message)
    } else {
      console.log('✓ Success')
    }
  }
} else {
  console.log('✓ Migration completed successfully')
}
