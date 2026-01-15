import { NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { placeName, placeAddress, type, website } = await request.json();

    if (!placeName || !type) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let prompt = "";

    // ==================================================================================
    // 1. ZONA INTOCABLE: DEMO WEB (CÓDIGO ORIGINAL QUE YA FUNCIONA PERFECTO)
    // ==================================================================================
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
    } 
    
    // ==================================================================================
    // 2. ZONA FLYER (PROPUESTA): CORREGIDO A MODO OSCURO (CAMISETA NEGRA)
    // ==================================================================================
    else if (type === "proposal") {
      prompt = `
        Actúa como Diseñador Gráfico Senior.
        Genera un HTML (Tailwind CSS) para una PRESENTACIÓN DE MARCA "DARK MODE".
        
        OBJETIVO: Que parezca un Mockup profesional sobre ropa negra (disimula mejor el montaje).
        
        ### RECURSOS GRÁFICOS (URLs FIJAS DE ROPA NEGRA SIN GENTE):
        - Camiseta Negra (Flat Lay): "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop"
        - Gorra Negra (Frontal): "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800&auto=format&fit=crop"

        ### ESTRUCTURA VISUAL (Contenedor Cuadrado Elegante - Bento Grid):
        - Contenedor principal: max-w-md mx-auto bg-black text-white font-sans overflow-hidden shadow-2xl relative aspect-square border border-gray-800.
        
        **BLOQUE SUPERIOR (70%): LA CAMISETA**
        - Imagen de fondo: Camiseta Negra.
        - Texto superpuesto: "${placeName.toUpperCase()}"
        - POSICIÓN: Absoluta, centrada perfectamente.
        - ESTILO: Fuente 'Impact' o 'Oswald', Color Blanco (#eee), Opacidad 80% (para que se fusione con la tela), Rotación -2deg.
        - DETALLE: Texto "STAFF" pequeño debajo del nombre.

        **BLOQUE INFERIOR (30%): LA GORRA + OFERTA**
        - Divide en 2 columnas verticales.
        - COL 1: Imagen Gorra Negra. Texto pequeño "${placeName}" en la frente (blanco).
        - COL 2: Fondo Amarillo Neón (bg-yellow-400) texto negro. "PACK IDENTIDAD: Camisetas + Gorras + Web".

        RETORNA SOLO EL CÓDIGO HTML DEL BODY.
      `;
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const generatedContent = await generateContent(prompt);
    const cleanContent = generatedContent.replace(/```html/g, "").replace(/```/g, "").trim();

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

    if (error) throw error;

    return NextResponse.json({ id: data.id, status: "success" });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}