import { GoogleGenAI, Type } from "@google/genai";
import { Activity, SelectedDimensions, DimensionKey } from "../types";
import { DIMENSIONS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ACTIVITY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "活动名称" },
    positioning: { type: Type.STRING, description: "活动定位/简介" },
    goals: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "活动目标列表" 
    },
    participants: { type: Type.STRING, description: "适用人数范围" },
    duration: { type: Type.STRING, description: "活动时长" },
    venue: { type: Type.STRING, description: "场地要求" },
    props: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "道具要求" 
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "步骤标题" },
          content: { type: Type.STRING, description: "详细描述及规则" },
          guide: { type: Type.STRING, description: "主持人引导语" }
        },
        required: ["title", "content", "guide"]
      },
      description: "活动流程步骤"
    },
    emotionPath: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "情绪路径" 
    },
    risks: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "风险提醒" 
    },
    reviewQuestions: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "复盘问题" 
    },
    dimensions: {
      type: Type.OBJECT,
      properties: {
        environment: { type: Type.ARRAY, items: { type: Type.STRING } },
        location: { type: Type.ARRAY, items: { type: Type.STRING } },
        senses: { type: Type.ARRAY, items: { type: Type.STRING } },
        intelligence: { type: Type.ARRAY, items: { type: Type.STRING } },
        emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
        learningMethods: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      description: "反向匹配的五维元素（必须从给定的选项中选择）"
    }
  },
  required: ["title", "positioning", "goals", "participants", "duration", "venue", "props", "steps", "emotionPath", "risks", "reviewQuestions", "dimensions"]
};

const SYSTEM_INSTRUCTION = `你是一位世界顶级的身心灵体验式学习课程专家。
你的任务是根据用户提供的主题和目的，设计一个极具深度、专业且可操作的体验式活动。

规则：
1. 活动设计必须遵循“体验式学习”逻辑：进入状态 -> 建立规则 -> 核心体验 -> 连接/表达 -> 收束。
2. 你需要从以下给定的“五维模型”选项中，反向匹配最适合该活动的元素。
3. 选项必须严格来自以下列表，不能编造：
${DIMENSIONS.map(d => `- ${d.label} (${d.key}): ${d.options.map(o => o.label).join(', ')}`).join('\n')}

4. 输出必须是符合指定模式的 JSON 格式。
5. 活动名称要优美、有引导感。
6. 引导语要亲切、有感染力。
7. **关键要求**：详细描述及规则（content 字段）必须尽可能详尽。
   - 必须包含具体的动作指令。
   - 必须包含互动规则（如：不能说话、必须闭眼、分组方式等）。
   - 必须包含时间分配建议。
   - 必须包含空间移动的逻辑。
   - 必须包含对可能出现的状况的处理方案。`;

export async function generateActivityFromAI(topic: string, purpose: string): Promise<Activity> {
  const prompt = `主题：${topic}\n目的：${purpose}\n请设计一个最恰当的体验式活动，并反向匹配五维元素。`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA as any
    }
  });

  const result = JSON.parse(response.text);
  return {
    ...result,
    id: Math.random().toString(36).substring(2, 9),
    topic,
    purpose,
    createdAt: Date.now(),
    alternatives: [
      { label: "温和版", description: "减少互动强度，增加静心环节。" },
      { label: "高能版", description: "提升感官刺激，增加互动频率。" }
    ]
  };
}

export async function refineActivityFromAI(topic: string, purpose: string, dimensions: SelectedDimensions): Promise<Activity> {
  const dimensionsStr = Object.entries(dimensions)
    .filter(([_, values]) => values.length > 0)
    .map(([key, values]) => `${key}: ${values.join(', ')}`)
    .join('\n');

  const prompt = `主题：${topic}\n目的：${purpose}\n\n用户已手动调整了五维元素：\n${dimensionsStr}\n\n请根据这些特定的维度限制，重新设计最贴近的活动方案。保持主题和目的不变，但活动形式必须完美契合这些维度。`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: ACTIVITY_SCHEMA as any
    }
  });

  const result = JSON.parse(response.text);
  return {
    ...result,
    id: Math.random().toString(36).substring(2, 9),
    topic,
    purpose,
    createdAt: Date.now(),
    alternatives: [
      { label: "温和版", description: "减少互动强度，增加静心环节。" },
      { label: "高能版", description: "提升感官刺激，增加互动频率。" }
    ]
  };
}
