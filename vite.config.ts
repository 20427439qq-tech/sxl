import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch, { Headers, Request, Response } from 'node-fetch';

// Ensure global fetch is available for the SDK
if (!globalThis.fetch) {
  globalThis.fetch = fetch as any;
  globalThis.Headers = Headers as any;
  globalThis.Request = Request as any;
  globalThis.Response = Response as any;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';
            if (url.includes('/api/test-connection') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { config } = JSON.parse(body);
                  let { apiKey, baseUrl, modelName } = config;
                  console.log(`[API] process.env.GEMINI_API_KEY: "${process.env.GEMINI_API_KEY}", env.GEMINI_API_KEY: "${env.GEMINI_API_KEY}"`);
                  if (!apiKey) {
                    apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
                      apiKey = env.GEMINI_API_KEY;
                    }
                  }
                  if (apiKey) apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
                  
                  console.log(`[API] Testing connection for model: ${modelName}, baseUrl: ${baseUrl}, apiKey: "${apiKey}"`);

                  if (baseUrl && !baseUrl.includes('googleapis.com')) {
                    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                      body: JSON.stringify({ model: modelName, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 })
                    });
                    if (response.ok) { 
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true })); 
                      return; 
                    }
                    const err = await response.json() as any;
                    throw new Error(err.error?.message || "Connection failed");
                  } else {
                    if (!apiKey) throw new Error("API Key is missing. Please set GEMINI_API_KEY in Settings.");
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });
                    await model.generateContent("hi");
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                  }
                } catch (error: any) {
                  console.error("[API] Test connection error:", error.message);
                  let errorMessage = error.message;
                  if (errorMessage.includes('API key not valid')) {
                    const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '未知';
                    errorMessage = `API Key 无效 (当前使用的 Key: ${maskedKey})。请检查 Settings -> Secrets 中的 GEMINI_API_KEY 是否正确，或者检查模型切换器中是否设置了错误的 Key。`;
                  } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                    errorMessage = "API 请求过于频繁或配额已耗尽 (429 Too Many Requests)。请稍后再试，或检查您的 Google AI Studio 配额限制。";
                  }
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: errorMessage }));
                }
              });
              return;
            }

            if (url.includes('/api/generate') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { prompt, systemInstruction, responseSchema, config } = JSON.parse(body);
                  let apiKey = process.env.GEMINI_API_KEY;
                  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
                    apiKey = env.GEMINI_API_KEY;
                  }
                  let baseUrl = "";
                  let modelName = "gemini-1.5-flash";

                  if (config) {
                    if (config.apiKey) apiKey = config.apiKey.trim().replace(/^["']|["']$/g, '');
                    if (config.baseUrl) baseUrl = config.baseUrl.trim();
                    if (config.modelName) modelName = config.modelName.trim();
                  }

                  if (apiKey) {
                    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
                  }

                  const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : 'none';
                  console.log(`[API] Generating content with model: ${modelName}, baseUrl: ${baseUrl}, apiKey: ${maskedKey}`);

                  if (!apiKey) throw new Error("API Key is not configured. Please set GEMINI_API_KEY in Settings -> Secrets.");

                  if (baseUrl && !baseUrl.includes('googleapis.com')) {
                    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                      body: JSON.stringify({
                        model: modelName,
                        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: prompt }]
                      })
                    });
                    if (!response.ok) {
                      const err = await response.json() as any;
                      throw new Error(err.error?.message || "AI call failed");
                    }
                    const data = await response.json() as any;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(data.choices[0].message.content);
                  } else {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ 
                      model: modelName || "gemini-1.5-flash",
                      systemInstruction: systemInstruction 
                    });
                    
                    // Add a timeout to the fetch request to prevent hanging
                    const result = await model.generateContent({
                      contents: [{ role: "user", parts: [{ text: prompt }] }],
                      generationConfig: { 
                        responseMimeType: "application/json", 
                        responseSchema: responseSchema as any 
                      },
                    });
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(result.response.text());
                  }
                } catch (error: any) {
                  console.error("[API] Generate error:", error.message);
                  let errorMessage = error.message;
                  if (errorMessage.includes('API key not valid')) {
                    const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}` : '未知';
                    errorMessage = `API Key 无效 (当前使用的 Key: ${maskedKey})。请检查 Settings -> Secrets 中的 GEMINI_API_KEY 是否正确，或者检查模型切换器中是否设置了错误的 Key。`;
                  } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                    errorMessage = "API 请求过于频繁或配额已耗尽 (429 Too Many Requests)。请稍后再试，或检查您的 Google AI Studio 配额限制。";
                  }
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: errorMessage }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
