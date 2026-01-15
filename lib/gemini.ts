import { GoogleGenerativeAI } from "@google/generative-ai";

// Función de espera (Paciencia)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateContent(prompt: string, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usamos el modelo Flash. Si el 2.5 te sigue dando problemas, cambia a "gemini-2.0-flash"
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error: any) {
    // DETECTOR DE LÍMITE DE VELOCIDAD (Error 429)
    if ((error.message?.includes("429") || error.status === 429) && retries > 0) {
      console.warn(`⚠️ Límite de Google alcanzado. Esperando 10 segundos... (Intentos restantes: ${retries})`);
      await wait(10000); // Espera 10 segundos
      return generateContent(prompt, retries - 1); // Vuelve a intentar
    }

    console.error("❌ Error definitivo Gemini:", error);
    throw error;
  }
}