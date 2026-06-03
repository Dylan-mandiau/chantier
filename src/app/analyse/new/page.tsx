import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnalyseClient } from "./AnalyseClient";

export default async function AnalyseNewPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string; lat?: string; lng?: string }>;
}) {
  const params = await searchParams;
  if (!params.photo) redirect("/nouveau");

  const supabase = await createClient();
  const { data: signed } = await supabase.storage
    .from("chantier-photos")
    .createSignedUrl(params.photo, 1800);

  if (!signed) redirect("/nouveau");

  return (
    <AnalyseClient
      photoPath={params.photo}
      photoUrl={signed.signedUrl}
      lat={params.lat ? Number(params.lat) : null}
      lng={params.lng ? Number(params.lng) : null}
    />
  );
}
