import { Activity, SelectedDimensions, ActivityStep } from '../types';

export function generateActivity(
  topic: string,
  purpose: string,
  participants: string,
  duration: string,
  dimensions: SelectedDimensions
): Activity {
  const id = Math.random().toString(36).substring(2, 9);
  
  // Simple logic to derive activity type based on topic
  const isIcebreaker = topic.includes('破冰') || topic.includes('热场') || topic.includes('连接');
  const isAwareness = topic.includes('觉察') || topic.includes('内观') || topic.includes('反思');
  
  const title = `${topic}之${dimensions.environment[0] || '探索'}·${dimensions.senses[0] || '觉知'}`;
  
  const positioning = isIcebreaker 
    ? '这是一个旨在快速打破隔阂、建立连接的动态体验活动。'
    : isAwareness
    ? '这是一个深度的内省活动，适合在课程中段引导参与者进行自我探索。'
    : '这是一个综合性的体验式学习活动，平衡了身体参与和心理反思。';

  const steps: ActivityStep[] = [
    {
      title: '进入状态',
      content: `根据${dimensions.location[0] || '场地'}环境，引导参与者调整呼吸，进入${dimensions.environment[0] || '当下'}。`,
      guide: '“请大家找一个舒适的位置站好或坐下，闭上眼睛，感受这里的空气。”'
    },
    {
      title: '建立规则',
      content: `明确本次活动的边界，特别强调调动${dimensions.senses.join('、')}等感官。`,
      guide: '“在接下来的过程中，请尝试放下语言，用你的直觉去感受周围的一切。”'
    },
    {
      title: '核心体验',
      content: `结合${dimensions.intelligence.join('、')}等智力形态，开展核心互动。`,
      guide: '“现在，请跟随你的身体，去探索这个充满挑战的空间。”'
    },
    {
      title: '收束与复盘',
      content: `引导参与者从${dimensions.emotions.join('、')}等情绪中走出来，进行初步分享。`,
      guide: '“慢慢收回你的动作，深呼吸，准备好将你的感受转化为语言。”'
    }
  ];

  return {
    id,
    title,
    topic,
    purpose,
    dimensions,
    positioning,
    goals: [
      `达成“${purpose}”的核心目标`,
      `通过${dimensions.senses[0] || '感官'}体验深化觉察`,
      `在${dimensions.environment[0] || '特定'}环境中完成转化`
    ],
    participants: participants || '8到20人',
    duration: duration || '20分钟',
    venue: dimensions.location.includes('hotel') ? '酒店会议室' : '半开放环境',
    props: ['背景音乐', '记录纸笔'],
    steps,
    guideLines: [
      '保持中立的观察者姿态',
      '注意场域能量的变化'
    ],
    emotionPath: ['好奇', '投入', '挑战', '获得', '平静'],
    risks: [
      '注意场地安全，避免剧烈碰撞',
      '尊重参与者的个人边界'
    ],
    reviewQuestions: [
      '刚才的过程中，哪个瞬间让你印象最深？',
      '你的身体给出了什么样的信号？',
      '这个体验如何关联到你的现实生活？'
    ],
    alternatives: [
      { label: '温和版', description: '减少移动范围，增加静心时间。' },
      { label: '高能版', description: '增加互动频率和感官刺激强度。' }
    ],
    createdAt: Date.now()
  };
}
