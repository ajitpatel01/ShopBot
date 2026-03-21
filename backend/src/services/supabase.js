/**
 * @fileoverview Supabase client initialisation.
 * Exports two clients: service-role (full access) and anon (RLS-scoped).
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = { supabaseService, supabaseAnon };
