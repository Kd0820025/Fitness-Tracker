import Groq from "groq-sdk";
import fs from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const analyzeImage = async (filePath: string) => {
  try {
    const base64 = fs.readFileSync(filePath, { encoding: "base64" });

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: "text", text: 'Return ONLY raw JSON, no markdown, no backticks: { "name": string, "calories": number }' }
          ]
        }
      ]
    });

    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("No AI response");

    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(cleaned);

  } catch (err) {
    console.error("AI ERROR:", err);
    throw err;
  }
};