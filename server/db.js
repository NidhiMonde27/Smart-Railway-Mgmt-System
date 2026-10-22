const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key is missing!');
}

// Normalize URL (strip trailing /rest/v1 or slashes if present)
const cleanUrl = supabaseUrl
    ? supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
    : '';

const supabase = createClient(cleanUrl, supabaseKey);

module.exports = supabase;
