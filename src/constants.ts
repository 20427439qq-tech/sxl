import { DimensionCategory, Activity } from './types';

export const DIMENSIONS: DimensionCategory[] = [
  {
    key: 'environment',
    label: '环境',
    description: '活动所营造的心理或物理氛围',
    options: [
      { id: 'journey', label: '旅程' },
      { id: 'planning', label: '规划' },
      { id: 'reality', label: '现实' },
      { id: 'activity', label: '活动' },
      { id: 'challenge', label: '挑战' },
      { id: 'obstacle', label: '障碍' },
      { id: 'other', label: '其他' },
    ]
  },
  {
    key: 'location',
    label: '地点和元素',
    description: '活动发生的物理空间与自然元素',
    options: [
      { id: 'air', label: '空气' },
      { id: 'water', label: '水' },
      { id: 'darkness', label: '黑暗' },
      { id: 'hotel', label: '酒店场地' },
      { id: 'wild', label: '野外' },
      { id: 'fire', label: '火' },
      { id: 'other', label: '其他' },
    ]
  },
  {
    key: 'senses',
    label: '感官',
    description: '主要调动的身体知觉',
    options: [
      { id: 'eye', label: '眼' },
      { id: 'ear', label: '耳' },
      { id: 'nose', label: '鼻' },
      { id: 'tongue', label: '舌' },
      { id: 'nerve', label: '神经' },
      { id: 'intuition', label: '直觉' },
      { id: 'other', label: '其他' },
    ]
  },
  {
    key: 'intelligence',
    label: '智力形态',
    description: '参与者互动的认知模式',
    options: [
      { id: 'music', label: '音乐' },
      { id: 'space', label: '空间' },
      { id: 'interpersonal', label: '人际关系' },
      { id: 'logic', label: '逻辑' },
      { id: 'language', label: '语言' },
      { id: 'body', label: '肢体' },
      { id: 'other', label: '其他' },
    ]
  },
  {
    key: 'emotions',
    label: '情绪',
    description: '活动希望触达或转化的情绪状态',
    options: [
      { id: 'sadness', label: '悲伤' },
      { id: 'aggression', label: '进攻性' },
      { id: 'boredom', label: '烦闷' },
      { id: 'fear', label: '害怕' },
      { id: 'hope', label: '希望' },
      { id: 'joy', label: '快乐' },
      { id: 'other', label: '其他' },
    ]
  },
  {
    key: 'learningMethods',
    label: '学习方法',
    description: '扩展维度：知识内化的路径',
    options: [
      { id: 'planned', label: '计划的' },
      { id: 'urgent', label: '紧急的' },
      { id: 'active', label: '积极' },
      { id: 'pragmatic', label: '实用主义' },
      { id: 'synchronous', label: '同步学习' },
      { id: 'visionary', label: '展望式学习' },
      { id: 'other', label: '其他' },
    ]
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: '暗夜之舞',
    topic: '热场',
    purpose: '让参与者从拘谨进入放松，从分离进入连接，从旁观进入参与。',
    dimensions: {
      environment: ['journey', 'activity'],
      location: ['darkness', 'hotel'],
      senses: ['ear', 'nerve', 'intuition'],
      intelligence: ['music', 'body', 'interpersonal'],
      emotions: ['fear', 'hope', 'joy'],
      learningMethods: ['active', 'synchronous']
    },
    positioning: '适合开场5-10分钟，快速打破隔阂的身体互动活动。',
    goals: [
      '降低社交焦虑',
      '激活身体能量',
      '建立初步的非语言连接'
    ],
    participants: '8到50人',
    duration: '15分钟',
    venue: '室内可站立空间，需可调暗灯光',
    props: ['高能音乐', '眼罩（可选）'],
    steps: [
      {
        title: '进入状态',
        content: '调暗灯光，播放轻柔的背景音乐，请大家闭上眼睛，感受自己的呼吸。',
        guide: '“现在，请大家轻轻闭上双眼，把注意力从外界收回到你的呼吸上。”'
      },
      {
        title: '建立规则',
        content: '告知大家这是一个安全的空间，接下来的移动请保持静默。',
        guide: '“在这个空间里，你是绝对安全的。请尝试在黑暗中缓慢移动你的身体。”'
      },
      {
        title: '身体启动',
        content: '音乐节奏逐渐加强，引导大家开始随节奏摆动。',
        guide: '“让音乐进入你的每一个细胞，让你的身体带你舞动。”'
      },
      {
        title: '核心体验',
        content: '引导大家在黑暗中尝试与他人产生轻微的肢体接触（如指尖）。',
        guide: '“尝试去探索你周围的空间，如果你遇到了另一双温暖的手，请给出一个轻柔的信号。”'
      },
      {
        title: '连接表达',
        content: '音乐转为欢快，灯光微亮，大家睁开眼，与最近的人交换微笑。',
        guide: '“现在，请慢慢睁开眼，看看你身边这些美丽的灵魂，给他们一个最灿烂的微笑。”'
      }
    ],
    guideLines: [
      '观察参与者的反应，如果有人表现出极度不安，及时给予支持。',
      '音乐的起伏是活动成功的关键。'
    ],
    emotionPath: ['紧张', '好奇', '打开', '连接', '放松'],
    risks: [
      '避免过强的身体接触',
      '若有敏感参与者，可改为睁眼版本'
    ],
    reviewQuestions: [
      '在黑暗中移动时，你的第一反应是什么？',
      '当你与他人产生连接时，身体有什么感觉？',
      '现在你的能量状态与刚进来时有什么不同？'
    ],
    alternatives: [
      { label: '温和版', description: '保持微弱灯光，不进行肢体接触。' },
      { label: '高能版', description: '增加快速跑动和击掌环节。' }
    ],
    createdAt: Date.now()
  }
];
