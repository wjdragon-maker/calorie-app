import { GoogleGenAI, Type } from "@google/genai";
import { EntryType, GeminiParseResult } from "../types";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses a natural language string into structured calorie entries.
 * Uses Gemini 2.5 Flash for speed and structured JSON output.
 * Returns an array of results to handle multi-item inputs.
 */
export const parseNaturalLanguageInput = async (
  input: string, 
  userContext: string
): Promise<GeminiParseResult[] | null> => {
  try {
    const modelId = "gemini-2.5-flash";
    
    const prompt = `
      You are a precise nutrition and fitness tracker AI. 
      The user is: ${userContext}.
      
      Analyze the following text: "${input}".
      
      1. Identify all distinct items mentioned (foods or exercises).
      2. For each item:
         - Determine if it is FOOD intake or EXERCISE.
         - Estimate the calories.
           - If FOOD: Return positive calories.
           - If EXERCISE: Return the calories burned as a POSITIVE integer.
           - Be realistic based on the user's stats.
         - Extract the item name and quantity.
      
      Return a JSON ARRAY of objects matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              entryType: {
                type: Type.STRING,
                enum: [EntryType.FOOD, EntryType.EXERCISE, EntryType.UNKNOWN],
                description: "Whether the input describes eating food or doing exercise.",
              },
              item: {
                type: Type.STRING,
                description: "A concise name of the food or exercise.",
              },
              calories: {
                type: Type.INTEGER,
                description: "The estimated calorie amount (always positive).",
              },
              quantity: {
                type: Type.STRING,
                description: "The quantity or duration extracted from text (e.g. '2 eggs', '30 mins').",
              },
            },
            required: ["entryType", "item", "calories", "quantity"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return null;

    const results = JSON.parse(text) as GeminiParseResult[];
    
    const validResults = results.filter(r => r.entryType !== EntryType.UNKNOWN);

    return validResults.length > 0 ? validResults : null;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};