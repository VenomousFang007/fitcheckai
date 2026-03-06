import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data, error } = await supabase.auth.signUp({
        email: "playwright-test@example.com",
        password: "password123",
    });
    console.log(data, error);
}

run();
