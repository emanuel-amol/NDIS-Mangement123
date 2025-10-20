// frontend/src/lib/auth-provider.ts
// Auth provider abstraction - easy to swap Supabase for IBM later

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'

interface AuthProvider {
  initialize(): void
  login(email: string, password: string): Promise<{ user: any; session: any }>
  logout(): Promise<void>
  getSession(): Promise<{ user: any; session: any } | null>
  getToken(): Promise<string | null>
  onAuthStateChange(callback: (user: any) => void): () => void
}

class SupabaseAuthProvider implements AuthProvider {
  private client: SupabaseClient

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing')
    }

    this.client = createClient(supabaseUrl, supabaseKey)
  }

  initialize(): void {
    console.log('✅ Supabase auth initialized')
  }

  async login(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { user: data.user, session: data.session }
  }

  async logout() {
    const { error } = await this.client.auth.signOut()
    if (error) throw error
  }

  async getSession() {
    const { data: { session }, error } = await this.client.auth.getSession()
    if (error) throw error
    return session ? { user: session.user, session } : null
  }

  async getToken() {
    const { data: { session } } = await this.client.auth.getSession()
    return session?.access_token || null
  }

  onAuthStateChange(callback: (user: any) => void) {
    const { data: { subscription } } = this.client.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }
}

// Factory function - easily swap providers
function createAuthProvider(): AuthProvider {
  const provider = import.meta.env.VITE_AUTH_PROVIDER || 'supabase'

  switch (provider) {
    case 'supabase':
      return new SupabaseAuthProvider()
    case 'ibm':
      // TODO: Add IBM provider when you have permissions
      throw new Error('IBM provider not yet implemented')
    default:
      throw new Error(`Unknown auth provider: ${provider}`)
  }
}

export const authProvider = createAuthProvider()
export type { AuthProvider }
