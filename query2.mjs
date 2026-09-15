import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://etfujmuzwzzhztucqbek.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZnVqbXV6d3p6aHp0dWNxYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjA3NTQsImV4cCI6MjA4MzM5Njc1NH0.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0");

async function run() {
  const { data } = await supabase.from("packages").select("*, package_benefits(*), package_cycles(*)");
  console.log(JSON.stringify(data, null, 2));
}

run();
