import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function refineTasks(tasks: string[], isOutTime: boolean): Promise<string[]> {
  const systemInstruction = `
    You are a professional software developer's assistant.
    Your task is to rewrite a list of task descriptions to be professional and grammatically correct.
    
    Rules:
    - If it's an "In Time" report (planned tasks), use the imperative/present tense (e.g., "Implement orders features", "Fix login bug").
    - If it's an "Out Time" report (completed tasks), use the past tense (e.g., "Implemented orders features", "Fixed login bug").
    - Keep the descriptions concise but professional.
    - Correct any spelling or grammar errors.
    - Return the results as a JSON array of strings.
  `;

  const prompt = `
    Report Type: ${isOutTime ? 'Out Time (Completed Tasks)' : 'In Time (Planned Tasks)'}
    Tasks to refine:
    ${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const refinedTasks = JSON.parse(response.text || "[]");
    return refinedTasks.length === tasks.length ? refinedTasks : tasks;
  } catch (error) {
    console.error("Error refining tasks:", error);
    return tasks; // Fallback to original tasks on error
  }
}
