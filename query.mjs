import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://etfujmuzwzzhztucqbek.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZnVqbXV6d3p6aHp0dWNxYmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MjA3NTQsImV4cCI6MjA4MzM5Njc1NH0.J0EQtBMyiVchphMa3OijiPjr7j3l44oFlMPkfXAFYo0");

async function run() {
  const { data: p } = await supabase.from("packages").select("*").eq("is_active", false);
  console.log("Deleted/Inactive Packages:", p);

  const { data: s } = await supabase.from("services").select("*").eq("is_active", false);
  console.log("Deleted/Inactive Services:", s);
  
  const { data: c } = await supabase.from("client_packages").select("*").eq("status", "cancelled");
  console.log("Cancelled Client Packages:", c);
}

run();
