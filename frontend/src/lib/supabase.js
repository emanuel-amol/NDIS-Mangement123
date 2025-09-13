// Simple working stub for development
export const supabase = {
  from: (table) => ({
    select: (columns = "*") => ({
      eq: (column, value) => ({
        single: () => Promise.resolve({ data: { id: '1', status: 'complete' }, error: null }),
        maybeSingle: () => Promise.resolve({ data: { id: '1', status: 'complete' }, error: null })
      }),
      execute: () => Promise.resolve({ data: [], error: null })
    }),
    insert: (data) => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: '1', ...data }, error: null })
      })
    }),
    update: (data) => ({
      eq: (column, value) => Promise.resolve({ data: { id: '1', ...data }, error: null })
    })
  })
};