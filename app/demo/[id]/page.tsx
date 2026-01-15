import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function DemoPage({ params }: { params: { id: string } }) {
  // In Next.js 15, params is a Promise. We await it to be safe for both 14 (if using a specific version) and 15.
  // But wait, in 14 it's not a promise. In 15 it is.
  // Given I installed @latest, it is likely 15.
  // I will await it. If it's not a promise (14), awaiting an object does nothing bad.
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const { data, error } = await supabase
    .from("generated_assets")
    .select("content, type")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <div
      className="w-full min-h-screen bg-white" // Reset background for demo
      dangerouslySetInnerHTML={{ __html: data.content }}
    />
  );
}
