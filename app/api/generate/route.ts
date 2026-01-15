import { NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { placeName, placeAddress, type, website } = await request.json();

    if (!placeName || !type) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    let prompt = "";

    if (type === "demo") {
      prompt = `
        You are a high-end web designer. Create a single-file HTML landing page (using Tailwind CSS via CDN) for a business named "${placeName}" located at "${placeAddress}".
        
        The design should be modern, responsive, and professional. 
        Include a hero section, an about section, and a contact section. 
        Use placeholders for images (e.g., unsplash source URLs).
        
        IMPORTANT: Return ONLY the raw HTML code. Do not wrap it in markdown code blocks like \`\`\`html. Just the HTML.
        `;
    } else if (type === "proposal") {
      prompt = `
        You are a senior sales representative for a digital agency called "Arknica". 
        Write a professional sales proposal for a client named "${placeName}".
        They currently have a website at "${website}".
        
        The proposal should:
        1. Acknowledge their current online presence.
        2. Suggest 3 specific improvements (e.g., SEO, Speed, Modern UI).
        3. Offer a "Sales OS" upgrade package.
        
        Format the output as clean HTML with simple styling structure (e.g. <h2>, <p>, <ul>).
        Return ONLY the HTML of the body content.
        `;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const generatedContent = await generateContent(prompt);

    // Clean up potential markdown code blocks if Gemini ignores instructions
    const cleanContent = generatedContent
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Save to Supabase
    const { data, error } = await supabase
      .from("generated_assets")
      .insert([
        {
          place_name: placeName,
          type: type,
          content: cleanContent,
          meta: { address: placeAddress, website },
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, status: "success" });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
