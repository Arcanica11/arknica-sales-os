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
        Actúa como un Diseñador Web de Clase Mundial (Awwwards level).
        Crea una Landing Page "One-Pager" IMPRESIONANTE para un negocio local llamado "${placeName}" ubicado en "${placeAddress}".
        
        ### REGLAS DE IMÁGENES (CRÍTICO):
        NO uses 'source.unsplash.com' (está roto).
        Usa ESTOS formatos exactos para las imágenes:
        - Hero Background: "https://loremflickr.com/1200/800/business,modern" (o cambia 'business' por el rubro del cliente ej: 'food', 'gym', 'dentist').
        - Feature Images: "https://loremflickr.com/800/600/work" o "https://picsum.photos/seed/${placeName.replace(/\s/g, '')}/800/600".
        - SIEMPRE pon un 'background-color' de respaldo (ej. bg-gray-900) por si la imagen tarda en cargar.

        ### ESTRUCTURA OBLIGATORIA (5 SECCIONES):
        1. **Hero Section:** Titular gigante, subtítulo persuasivo, botón de llamada a la acción (CTA) y foto de fondo con superposición oscura (overlay) para leer el texto.
        2. **Sobre Nosotros:** Breve historia inspiradora.
        3. **Nuestros Servicios / Menú (NUEVO):** Grid de 3 tarjetas con iconos o fotos mostrando lo que venden.
        4. **Testimonios (NUEVO):** 2 o 3 reseñas de clientes ficticios pero realistas con estrellas.
        5. **Footer:** Dirección real, mapa (simulado visualmente), horario y contacto.

        ### ESTILO VISUAL:
        - Usa **Tailwind CSS** via CDN.
        - Tipografía: Usa Google Fonts (Inter, Playfair Display o Montserrat).
        - Espaciado: Usa mucho 'padding' (py-20) para que se vea 'High-End'.
        - Sombras: Usa 'shadow-xl' en las tarjetas.
        - Bordes: 'rounded-2xl' para un look moderno.
        
        RETORNA SOLO EL CÓDIGO HTML5 PURO. Sin markdown (\`\`\`).
      `;
    } else if (type === "proposal") {
      prompt = `
        Actúa como Director Comercial de 'Rueda La Rola Media'. Escribe una propuesta comercial estratégica para "${placeName}".
        Sitio web actual: "${website || 'No tiene'}".
        
        Objetivo: Vender Digitalización + Imprenta.
        Estructura HTML limpia con Tailwind CSS (Clases: p-8 max-w-4xl mx-auto bg-white shadow-lg rounded-xl).
        
        Secciones:
        1. **Diagnóstico:** ¿Qué están perdiendo hoy por no tener una buena presencia?
        2. **La Solución (Pack Rueda La Rola):** Web moderna + QR Menu + Tarjetas de presentación.
        3. **Inversión:** Muestra una tabla de precios simple (Plan Start vs Plan Pro).
        4. **CTA:** Botón de WhatsApp para cerrar el trato.
        
        RETORNA SOLO EL HTML DEL CONTENIDO (BODY).
      `;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const generatedContent = await generateContent(prompt);

    // Limpieza de Markdown por si Gemini se pone creativo
    const cleanContent = generatedContent
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();

    // Guardar en Supabase
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