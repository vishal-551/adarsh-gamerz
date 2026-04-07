import { supabase } from "../supabase";

export async function loadSiteData() {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", "main")
    .single();

  if (error) throw error;
  return data?.data || null;
}

export async function saveSiteData(siteData) {
  const { error } = await supabase.from("site_content").upsert(
    {
      id: "main",
      data: siteData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function submitBrandEnquiry(payload) {
  const { error } = await supabase.from("brand_enquiries").insert([
    {
      name: payload.name,
      email: payload.email,
      brand: payload.brand,
      phone: payload.phone,
      message: payload.message,
    },
  ]);

  if (error) throw error;
}