
import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "./config";

const apiKey = CONFIG.gemini.apiKey;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateDescription = async (title: string, type: 'product' | 'bio' | 'service'): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key not found. Returning mock response.");
    return "Geração de IA indisponível. Verifique a chave de API.";
  }

  try {
    const promptMap = {
      product: `Escreva uma descrição de venda curta e convincente (máx 30 palavras) em Português do Brasil para um produto chamado "${title}". Foque em valor e desejo.`,
      service: `Escreva uma descrição de serviço profissional (máx 30 palavras) em Português do Brasil para um serviço chamado "${title}". Foque no benefício para o cliente.`,
      bio: `Escreva uma bio profissional e cativante (máx 150 caracteres) em Português do Brasil para um criador chamado "${title}".`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptMap[type] || `Descreva ${title} em português`,
    });

    return response.text?.trim() || "Não foi possível gerar o conteúdo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o serviço de IA.";
  }
};

export const analyzeProductImage = async (base64Image: string): Promise<{ title: string; description: string } | null> => {
  if (!ai) return null;

  try {
    // Strip header if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: cleanBase64
                    }
                },
                {
                    text: 'Analise esta imagem de produto. Retorne APENAS um JSON válido (sem markdown) com as chaves "title" (nome comercial curto em PT-BR) e "description" (descrição vendedora curta em PT-BR).'
                }
            ]
        }
    });

    const text = response.text || '';
    // Clean markdown blocks
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
      console.error("Image Analysis Error", error);
      return null;
  }
}
