import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { GoogleGenAI } from "@google/genai";

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
            if (req.url === '/api/generate' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { prompt, systemInstruction, responseSchema } = JSON.parse(body);
                  const genAI = new (GoogleGenAI as any)(env.GEMINI_API_KEY || "");
                  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                  
                  const result = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                      responseMimeType: "application/json",
                      responseSchema: responseSchema,
                    },
                    systemInstruction: systemInstruction,
                  });
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(result.response.text());
                } catch (error: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: error.message }));
                }
              });
            } else {
              next();
            }
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
