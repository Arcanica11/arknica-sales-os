import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateContent(prompt: string) {
  // MOVIDO ADENTRO: La llave se busca solo cuando se ejecuta la función
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error(
      "❌ ERROR CRÍTICO: No se encontró GEMINI_API_KEY en las variables de entorno."
    );
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Usamos el modelo Flash que es más rápido
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("❌ Error generando contenido con Gemini:", error);
    throw error;
  }
}
