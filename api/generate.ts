import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  if (req.method === 'POST' && req.url.includes('test-connection')) {
    try {
      const { config } = req.body;
      let { apiKey, baseUrl, modelName } = config;

      if (!apiKey) apiKey = process.env.GEMINI_API_KEY;

      if (baseUrl && (!baseUrl.includes('googleapis.com'))) {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5
          })
        });
        if (response.ok) return res.status(200).json({ success: true });
        const err = await response.json();
        throw new Error(err.error?.message || "Connection failed");
      } else {
        if (!apiKey) throw new Error("API Key is missing.");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName || "gemini-2.0-flash" });
        await model.generateContent("hi");
        return res.status(200).json({ success: true });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes('API key not valid')) {
        errorMessage = "API Key is invalid. Please check your API Key in Settings -> Secrets (or in the Model Switcher if using a custom model).";
      }
      return res.status(500).json({ error: errorMessage });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, systemInstruction, responseSchema, config } = req.body;
    
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      // In a real Express server, you might use dotenv here.
      // For now, we'll just let it fail if it's not set in process.env,
      // but since we are running in Vite, vite.config.ts handles it.
      // If this file is used, we can hardcode the fallback for the user since they provided it.
      apiKey = "AIzaSyChrzhnuk1wNjnRrQg1eRpyaBOhMWEMc2M";
    }
    let baseUrl = "";
    let modelName = "gemini-2.5-flash";

    if (config) {
      if (config.apiKey) apiKey = config.apiKey;
      if (config.baseUrl) baseUrl = config.baseUrl;
      if (config.modelName) modelName = config.modelName;
    }

    console.log(`[API] Generating content with model: ${modelName}, baseUrl: ${baseUrl}, apiKey length: ${apiKey ? apiKey.length : 0}, prefix: ${apiKey ? apiKey.substring(0, 5) : 'none'}`);

    if (!apiKey) {
      return res.status(500).json({ error: "API Key is not configured. Please set GEMINI_API_KEY in Settings." });
    }

    if (baseUrl && (!baseUrl.includes('googleapis.com'))) {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "AI call failed");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      // Extract JSON if needed or assume it returns JSON
      try {
        return res.status(200).json(JSON.parse(content));
      } catch (e) {
        // Fallback for non-json responses if any
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) return res.status(200).json(JSON.parse(jsonMatch[0]));
        throw new Error("AI returned invalid JSON format");
      }
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName || "gemini-2.5-flash",
        systemInstruction: systemInstruction,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const response = result.response;
      res.status(200).json(JSON.parse(response.text()));
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    let errorMessage = error.message || "Internal Server Error";
    if (errorMessage.includes('API key not valid')) {
      errorMessage = "API Key is invalid. Please check your API Key in Settings -> Secrets (or in the Model Switcher if using a custom model).";
    }
    res.status(500).json({ error: errorMessage });
  }
}
