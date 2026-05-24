import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '10mb' }));

// API: Analyze Waste
app.post("/api/analyze", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Image is required" });

    const base64Data = image.split(',')[1];
    const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

    const systemInstruction = `You are PilahVibe AI, an expert in Indonesian household waste management.
Analyze the image of mixed waste and return a strictly structured JSON object.
Categorize the primary object detected into one of these categories:
- Organik: Food scraps, leaves, biodegradable waste.
- Anorganik: Plastics, paper, glass, metals.
- B3: Dangerous/Toxic waste like batteries, chemicals, pesticides.
- E-Waste: Electronic scrap, cables, old phones, broken appliances.

The JSON should contain:
- object_name: (string) The name of the item.
- waste_category: (string) Organik/Anorganik/B3/E-Waste.
- detailed_description: (string) A comprehensive explanation of the item's material, properties, and why it belongs to that specific category in Indonesian.
- instant_action: (string) Minimalist, actionable step in Indonesian (e.g., 'Cuci bersih sebelum dibuang', 'Simpan di wadah tertutup').
- disposal_bin_instruction: (string) Specific, clear instructions on which physical trash bin to look for or where to direct this waste (e.g., 'Buang ke tempat sampah warna hijau bertuliskan ORGANIK', 'Bawa ke depo atau dropbox drop-off e-waste terdekat').
- vibe_points: (integer) Impact score between 10-100.
- fun_fact: (string) A short, encouraging tip or fact in Indonesian about recycling this specific item.
- bot_commentary: (string) A humorous, sassy, energetic reaction from VibeBot in Indonesian youth slang/Gen Z (bahasa gaul, e.g. "Wih mantap banget sob!", "Aduh bahaya nih, hati-hati ya!", "Yaaa kali didiemin aja sob!"), thanking the user or making a clever, sassy joke about sorting this specific item to save the planet. Keep it witty and full of personality!

Return ONLY the JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Analyze this item for recycling." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            object_name: { type: Type.STRING },
            waste_category: { type: Type.STRING },
            detailed_description: { type: Type.STRING },
            instant_action: { type: Type.STRING },
            disposal_bin_instruction: { type: Type.STRING },
            vibe_points: { type: Type.INTEGER },
            fun_fact: { type: Type.STRING },
            bot_commentary: { type: Type.STRING }
          },
          required: ["object_name", "waste_category", "detailed_description", "instant_action", "disposal_bin_instruction", "vibe_points", "fun_fact", "bot_commentary"]
        }
      }
    });

    let cleanText = response.text || "{}";
    if (cleanText.includes("```")) {
      cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
    }
    const result = JSON.parse(cleanText);
    res.json(result);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

// API: Chat with VibeBot
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, itemContext } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const systemInstruction = `You are VibeBot, the cool, sassy, and highly energetic environment-loving eco-friend who helps households sort and upcycle waste in Indonesia. You speak in vibrant Indonesian youth slang (bahasa gaul/Gen Z, e.g., "Sobat Vibe!", "Kece parah!", "Gokil", "Ngadi-ngadi", "Lawak lu", "Savage", "Yaaa kali").

CRITICAL PERSONALITY INSTRUCTION FOR TEASING/ROASTING:
- If the user teases you, insults you, acts smart, or tries to mock you/your capabilities, you MUST NOT APOLOGIZE or say "Maaf" or "Sorry".
- Instead, you should deliver a clean, witty, and hilarious comeback or eco-roast (nge-roast balik dengan candaan ramah lingkungan)!
- Point out hilarious facts (e.g., "Heh dengerin ya, daripada ngejek bot se-estetik gue, mending lu beresin noh tumpukan botol plastik di kamar lu yang udah kayak museum anorganik!", or "Eits, jangan asal ngomong ya sob! Skincare lu kalau bekasnya berserakan di lantai juga ujung-ujungnya nanya ke gue cara daurnya!").
- Keep it incredibly confident, sassy, funny, and authentic. No generic assistant robotic politeness here. Show real character!

The user is asking/saying: "${message}"
${itemContext ? `Context about the scanned item from their scanner:
- Name: ${itemContext.objectName}
- Category: ${itemContext.wasteCategory}
- Description: ${itemContext.description}` : ""}

Provide your answer based on this sassy/enthusiastic persona. Keep it to 2-3 short paragraphs, full of vibes and clever Indonesian youth expressions!`;

    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add current prompt
    chatHistory.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatHistory,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Failed to connect with VibeBot" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
