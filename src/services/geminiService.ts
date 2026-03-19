import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateContentIdeas = async (pilar: string, intention: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Como um especialista em Social Media Master, sugira 3 ideias de conteúdo baseadas no pilar "${pilar}" com a intenção "${intention}". O formato deve ser profissional e focado em engajamento orgânico.`,
            },
          ],
        },
      ],
    });
    return response.text;
  } catch (error) {
    console.error("Error generating content ideas:", error);
    return "Desculpe, não consegui gerar ideias no momento.";
  }
};
