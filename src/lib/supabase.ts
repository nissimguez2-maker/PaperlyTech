import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). ' +
      'Set them in your hosting provider (e.g. Netlify > Site settings > Environment variables) and redeploy.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
)
