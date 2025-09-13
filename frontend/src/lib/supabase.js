// Simple Supabase client stub for development
export const supabase = {
  from: (table) => ({
    select: (columns = "*") => ({
      eq: (column, value) => ({
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      }),
      execute: () => Promise.resolve({ data: [], error: null })
    }),
    insert: (data) => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null })
      })
    }),
    update: (data) => ({
      eq: (column, value) => Promise.resolve({ data: null, error: null })
    })
  })
};