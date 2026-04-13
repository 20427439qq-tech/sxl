import { Activity, SelectedDimensions, AIModelConfig } from "../types";
import { DIMENSIONS } from "../constants";

const ACTIVITY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "活动名称" },
    positioning: { type: "string", description: "活动定位/简介" },
    goals: { 
      type: "array", 
      items: { type: "string" },
      description: "活动目标列表" 
    },
    participants: { type: "string", description: "适用人数范围" },
    duration: { type: "string", description: "活动时长" },
    venue: { type: "string", description: "场地要求" },
    props: { 
      type: "array", 
      items: { type: "string" },
      description: "道具要求" 
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "步骤标题" },
          content: { type: "string", description: "详细描述及规则" },
          guide: { type: "string", description: "主持人引导语" }
        },
        required: ["title", "content", "guide"]
      },
      description: "活动流程步骤"
    },
    emotionPath: { 
      type: "array", 
      items: { type: "string" },
      description: "情绪路径" 
    },
    risks: { 
      type: "array", 
      items: { type: "string" },
      description: "风险提醒" 
    },
    reviewQuestions: { 
      type: "array", 
      items: { type: "string" },
      description: "复盘问题" 
    },
    dimensions: {
      type: "object",
      properties: {
        environment: { type: "array", items: { type: "string" } },
        location: { type: "array", items: { type: "string" } },
        senses: { type: "array", items: { type: "string" } },
        intelligence: { type: "array", items: { type: "string" } },
        emotions: { type: "array", items: { type: "string" } },
        learningMethods: { type: "array", items: { type: "string" } }
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

async function callGeminiAPI(prompt: string, config?: AIModelConfig) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        systemInstruction: SYSTEM_INSTRUCTION,
        responseSchema: ACTIVITY_SCHEMA,
        config: config
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to generate activity");
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("请求超时，请重试");
    }
    throw error;
  }
}

export async function testModelConnection(config: AIModelConfig) {
  const response = await fetch("/api/test-connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ config }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Connection failed");
  }

  return response.json();
}

export async function generateActivityFromAI(topic: string, purpose: string, participants: string, duration: string, config?: AIModelConfig): Promise<Activity> {
  const prompt = `主题：${topic}\n目的：${purpose}\n活动人数：${participants}\n活动时长：${duration}\n请设计一个最恰当的体验式活动，并反向匹配五维元素。`;
  
  const result = await callGeminiAPI(prompt, config);
  
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

export async function refineActivityFromAI(topic: string, purpose: string, participants: string, duration: string, dimensions: SelectedDimensions, config?: AIModelConfig): Promise<Activity> {
  const dimensionsStr = Object.entries(dimensions)
    .filter(([_, values]) => values.length > 0)
    .map(([key, values]) => `${key}: ${values.join(', ')}`)
    .join('\n');

  const prompt = `主题：${topic}\n目的：${purpose}\n活动人数：${participants}\n活动时长：${duration}\n\n用户已手动调整了五维元素：\n${dimensionsStr}\n\n请根据这些特定的维度限制，重新设计最贴近的活动方案。保持主题和目的不变，但活动形式必须完美契合这些维度。`;
  
  const result = await callGeminiAPI(prompt, config);
  
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
