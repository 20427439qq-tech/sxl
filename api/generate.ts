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
        const model = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });
        await model.generateContent("hi");
        return res.status(200).json({ success: true });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes('API key not valid')) {
        const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '未知';
        errorMessage = `API Key 无效 (当前使用的 Key: ${maskedKey})。请检查 Settings -> Secrets 中的 GEMINI_API_KEY 是否正确，或者检查模型切换器中是否设置了错误的 Key。`;
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        errorMessage = "API 请求过于频繁或配额已耗尽 (429 Too Many Requests)。请稍后再试，或检查您的 Google AI Studio 配额限制。";
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
    }
    let baseUrl = "";
    let modelName = "gemini-1.5-flash";

    if (config) {
      if (config.apiKey) apiKey = config.apiKey;
      if (config.baseUrl) baseUrl = config.baseUrl;
      if (config.modelName) modelName = config.modelName;
    }

    const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'none';
    console.log(`[API] Generating content with model: ${modelName}, baseUrl: ${baseUrl}, apiKey: ${maskedKey}`);

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
        model: modelName || "gemini-1.5-flash",
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
      const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '未知';
      errorMessage = `API Key 无效 (当前使用的 Key: ${maskedKey})。请检查 Settings -> Secrets 中的 GEMINI_API_KEY 是否正确，或者检查模型切换器中是否设置了错误的 Key。`;
    } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      errorMessage = "API 请求过于频繁或配额已耗尽 (429 Too Many Requests)。请稍后再试，或检查您的 Google AI Studio 配额限制。";
    }
    res.status(500).json({ error: errorMessage });
  }
}
