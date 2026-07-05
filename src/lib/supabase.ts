import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kadyxpahlhogpnmqlndz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZHl4cGFobGhvZ3BubXFsbmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMjI5MzMsImV4cCI6MjA5ODc5ODkzM30.kGqBLuPW8u_ZHzg-1WZkriWqPOttEp3f4aK-h49Rfuk'

// Using 'any' for database type to avoid strict schema typing issues
// In production, generate types with: npx supabase gen types typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}) as any
