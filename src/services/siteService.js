import { supabase } from "./supabaseClient";

const SITE_CONTENT_ID = "main-site-content";

export async function loadSiteData() {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", SITE_CONTENT_ID)
    .maybeSingle();

  console.log("loadSiteData result:", { data, error });

  if (error) {
    console.error("loadSiteData error:", error);
    throw error;
  }

  return data?.data ?? null;
}

export async function saveSiteData(siteData) {
  const payload = {
    id: SITE_CONTENT_ID,
    data: siteData,
    updated_at: new Date().toISOString(),
  };

  console.log("saveSiteData payload:", payload);

  const { data, error } = await supabase
    .from("site_content")
    .upsert(payload)
    .select()
    .single();

  console.log("saveSiteData result:", { data, error });

  if (error) {
    console.error("saveSiteData error:", error);
    throw error;
  }

  return data;
}

export async function submitBrandEnquiry(formData) {
  const { data, error } = await supabase
    .from("brand_enquiries")
    .insert({
      name: formData.name,
      email: formData.email,
      brand: formData.brand,
      phone: formData.phone,
      message: formData.message,
    })
    .select()
    .single();

  console.log("submitBrandEnquiry result:", { data, error });

  if (error) {
    console.error("submitBrandEnquiry error:", error);
    throw error;
  }

  return data;
}