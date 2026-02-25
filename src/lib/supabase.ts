import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://jelizzyrgwedhuzuihnu.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjQzODQ4NDY4LWU4Y2UtNDQzMS1iMmNjLWMwZDY3MzZhNmE1ZSJ9.eyJwcm9qZWN0SWQiOiJqZWxpenp5cmd3ZWRodXp1aWhudSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY1OTgwMDIyLCJleHAiOjIwODEzNDAwMjIsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.-44OZzVI0F-foRXikCZwLtSm-ALVyHq3TvSOqwMz2k4';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };