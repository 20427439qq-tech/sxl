/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Library, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Dices, 
  Check, 
  ArrowRight, 
  Save, 
  Share2, 
  Edit3, 
  Trash2,
  Clock,
  Users,
  MapPin,
  Package,
  AlertTriangle,
  MessageSquare,
  History,
  Home,
  X,
  Settings,
  Activity as ActivityIcon,
  RefreshCw,
  Trash
} from 'lucide-react';
import { Activity, SelectedDimensions, DimensionKey, AIModelConfig } from './types';
import { DIMENSIONS, MOCK_ACTIVITIES } from './constants';
import { generateActivity } from './utils/generator';
import { generateActivityFromAI, refineActivityFromAI, testModelConnection } from './services/geminiService';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Page = 'home' | 'basic-info' | 'dimension-select' | 'result' | 'edit' | 'library' | 'detail';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [topic, setTopic] = useState('');
  const [purpose, setPurpose] = useState('');
  const [participants, setParticipants] = useState('10-20人');
  const [duration, setDuration] = useState('60分钟');
  const [selectedDimensions, setSelectedDimensions] = useState<SelectedDimensions>({
    environment: [],
    location: [],
    senses: [],
    intelligence: [],
    emotions: [],
    learningMethods: []
  });
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [savedActivities, setSavedActivities] = useState<Activity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Model Switcher States
  const [modelConfigs, setModelConfigs] = useState<AIModelConfig[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('default');
  const [isModelSwitcherOpen, setIsModelSwitcherOpen] = useState(false);
  const [isEditingModel, setIsEditingModel] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [testStatus, setTestStatus] = useState<{ id: string; status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ id: '', status: 'idle' });

  // Load Model Configs
  useEffect(() => {
    const saved = localStorage.getItem('ai_model_configs');
    if (saved) {
      const configs = JSON.parse(saved);
      setModelConfigs(configs);
      const active = localStorage.getItem('active_model_id');
      if (active) setActiveModelId(active);
    }
  }, []);

  // Save Model Configs
  useEffect(() => {
    localStorage.setItem('ai_model_configs', JSON.stringify(modelConfigs));
    localStorage.setItem('active_model_id', activeModelId);
  }, [modelConfigs, activeModelId]);

  const activeModel = useMemo(() => {
    return modelConfigs.find(m => m.id === activeModelId) || null;
  }, [modelConfigs, activeModelId]);

  const handleSaveModel = (config: AIModelConfig) => {
    setModelConfigs(prev => {
      const exists = prev.find(m => m.id === config.id);
      if (exists) {
        return prev.map(m => m.id === config.id ? config : m);
      }
      return [...prev, config];
    });
    setIsEditingModel(false);
    setEditingModel(null);
  };

  const handleDeleteModel = (id: string) => {
    setModelConfigs(prev => prev.filter(m => m.id !== id));
    if (activeModelId === id) setActiveModelId('default');
  };

  const handleTestConnection = async (config: AIModelConfig) => {
    setTestStatus({ id: config.id, status: 'testing' });
    try {
      await testModelConnection(config);
      setTestStatus({ id: config.id, status: 'success' });
    } catch (error: any) {
      setTestStatus({ id: config.id, status: 'error', message: error.message });
    }
  };

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener
  useEffect(() => {
    if (!user || !db) {
      setSavedActivities(MOCK_ACTIVITIES);
      return;
    }

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Activity[];
      setSavedActivities(activities.length > 0 ? activities : []);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleToggleDimension = (key: DimensionKey, optionId: string) => {
    setSelectedDimensions(prev => {
      const current = prev[key];
      if (current.includes(optionId)) {
        return { ...prev, [key]: current.filter(id => id !== optionId) };
      } else {
        return { ...prev, [key]: [...current, optionId] };
      }
    });
  };

  const handleRandomSelect = () => {
    const newSelection: SelectedDimensions = {
      environment: [],
      location: [],
      senses: [],
      intelligence: [],
      emotions: [],
      learningMethods: []
    };
    DIMENSIONS.forEach(dim => {
      const randomCount = Math.floor(Math.random() * 2) + 1;
      const shuffled = [...dim.options].sort(() => 0.5 - Math.random());
      newSelection[dim.key] = shuffled.slice(0, randomCount).map(o => o.label);
    });
    setSelectedDimensions(newSelection);
  };

  const handleSmartRecommend = () => {
    const isIcebreaker = topic.includes('破冰') || topic.includes('热场');
    const isAwareness = topic.includes('觉察') || topic.includes('内观');

    if (isIcebreaker) {
      setSelectedDimensions({
        environment: ['活动', '旅程'],
        location: ['酒店场地'],
        senses: ['眼', '耳', '神经'],
        intelligence: ['人际关系', '肢体'],
        emotions: ['害怕', '希望', '快乐'],
        learningMethods: ['积极', '同步学习']
      });
    } else if (isAwareness) {
      setSelectedDimensions({
        environment: ['现实', '障碍'],
        location: ['黑暗', '空气'],
        senses: ['鼻', '直觉'],
        intelligence: ['语言', '空间'],
        emotions: ['悲伤', '希望'],
        learningMethods: ['展望式学习', '计划的']
      });
    } else {
      handleRandomSelect();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const activity = await generateActivityFromAI(topic, purpose, participants, duration, activeModel || undefined);
      setCurrentActivity(activity);
      setSelectedDimensions(activity.dimensions);
      setCurrentPage('result');
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      const detailedError = error.message || JSON.stringify(error);
      setErrorMsg(`AI 尝试失败: ${detailedError.substring(0, 150)}`);
      setTimeout(() => {
        const activity = generateActivity(topic, purpose, participants, duration, selectedDimensions);
        setCurrentActivity(activity);
        setCurrentPage('result');
        setErrorMsg(null);
      }, 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    console.log("handleRefine triggered");
    setIsRefining(true);
    setErrorMsg(null);
    try {
      const activity = await refineActivityFromAI(topic, purpose, participants, duration, selectedDimensions, activeModel || undefined);
      setCurrentActivity(activity);
      setCurrentPage('result');
    } catch (error: any) {
      console.error("AI Refinement failed:", error);
      const detailedError = error.message || JSON.stringify(error);
      setErrorMsg(`AI 尝试失败: ${detailedError.substring(0, 150)}`);
      setTimeout(() => {
        const activity = generateActivity(topic, purpose, participants, duration, selectedDimensions);
        setCurrentActivity(activity);
        setCurrentPage('result');
        setErrorMsg(null);
      }, 5000);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    if (currentActivity) {
      try {
        const activityData = {
          ...currentActivity,
          userId: user.uid,
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'activities'), activityData);
        setCurrentPage('library');
      } catch (error) {
        console.error("Save failed:", error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('activity-content');
    if (!element) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentActivity?.title || '活动方案'}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="absolute top-6 right-6">
        {user ? (
          <button onClick={logout} className="flex items-center gap-2 text-xs text-slate-400">
            <img src={user.photoURL || ''} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            退出登录
          </button>
        ) : (
          <button onClick={signInWithGoogle} className="text-xs text-brand-600 font-medium">
            登录同步
          </button>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-sm">
          <Sparkles className="w-10 h-10 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">身心灵体验式学习<br/>活动生成器</h1>
        <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
          输入主题与目的，选择五维元素，快速生成一个可带领、可复盘、可转化的体验式学习活动。
        </p>
      </motion.div>

      <div className="w-full max-w-sm space-y-4">
        <button 
          onClick={() => setCurrentPage('basic-info')}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-medium shadow-lg shadow-brand-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          开始创建活动
        </button>
        <button 
          onClick={() => setCurrentPage('library')}
          className="w-full py-4 bg-white text-slate-700 rounded-2xl font-medium border border-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Library className="w-5 h-5" />
          查看活动库
        </button>
      </div>

      <div className="mt-12 flex gap-8 text-slate-400">
        <div className="flex flex-col items-center gap-1">
          <History className="w-5 h-5" />
          <span className="text-xs">最近记录</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Edit3 className="w-5 h-5" />
          <span className="text-xs">我的草稿</span>
        </div>
      </div>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-4 flex items-center justify-between border-b border-slate-50">
        <button onClick={() => setCurrentPage('home')} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="font-medium">创建活动 (1/3)</h2>
        <button onClick={() => setIsModelSwitcherOpen(true)} className="p-2 -mr-2 text-slate-400">
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 p-6 space-y-8">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">活动主题</span>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：破冰连接、自我觉察..."
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {['破冰连接', '打开感受', '团队信任', '自我觉察'].map(t => (
              <button 
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">活动目的</span>
            <textarea 
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="请输入你希望参与者通过这个活动达成什么状态、觉察或转化..."
              rows={4}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all resize-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {['快速进入状态', '打开身体感官', '提升团队连接'].map(p => (
              <button 
                key={p}
                onClick={() => setPurpose(p)}
                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs hover:bg-brand-50 hover:text-brand-600 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">活动人数</span>
            <select
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all appearance-none"
            >
              <option value="1-5人">1-5人 (微型)</option>
              <option value="6-12人">6-12人 (小型)</option>
              <option value="10-20人">10-20人 (中型)</option>
              <option value="20-50人">20-50人 (大型)</option>
              <option value="50人以上">50人以上 (超大型)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 mb-2 block">活动时长</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all appearance-none"
            >
              <option value="15分钟">15分钟 (破冰/热身)</option>
              <option value="30分钟">30分钟 (短时体验)</option>
              <option value="60分钟">60分钟 (标准工坊)</option>
              <option value="90分钟">90分钟 (深度体验)</option>
              <option value="半天">半天 (半日营)</option>
              <option value="全天">全天 (全日营)</option>
            </select>
          </label>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-100 safe-bottom z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button 
          disabled={!topic || !purpose}
          onClick={() => setCurrentPage('dimension-select')}
          className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-bold shadow-xl shadow-brand-200/50 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:active:scale-100"
        >
          下一步：选择五维元素
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );

  const renderDimensionSelect = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 bg-white flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button onClick={() => setCurrentPage('basic-info')} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="font-medium">五维选择 (2/3)</h2>
        <button onClick={() => setSelectedDimensions({
          environment: [], location: [], senses: [], intelligence: [], emotions: [], learningMethods: []
        })} className="text-xs text-slate-400">
          清空
        </button>
      </header>

      <div className="p-4 bg-brand-50/50 border-b border-brand-100">
        <div className="flex items-center gap-2 text-brand-700 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-medium">当前主题：{topic}</span>
        </div>
        <p className="text-[10px] text-brand-600/70 line-clamp-1">目的：{purpose}</p>
      </div>

      <main className="flex-1 p-4 space-y-6 overflow-y-auto pb-32">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {dim.label}
                  {selectedDimensions[dim.key].length > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded-md">
                      {selectedDimensions[dim.key].length}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{dim.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {dim.options.map(opt => {
                const isSelected = selectedDimensions[dim.key].includes(opt.label);
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleToggleDimension(dim.key, opt.label)}
                    className={`px-4 py-2 rounded-xl text-sm transition-all ${
                      isSelected 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-100' 
                        : 'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex gap-3 safe-bottom z-30 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <button 
          onClick={handleSmartRecommend}
          className="flex-1 py-4 bg-gradient-to-br from-brand-50 to-brand-100/50 text-brand-700 rounded-2xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all border border-brand-100/50 shadow-sm touch-manipulation"
        >
          <Sparkles className="w-4 h-4 text-brand-500" />
          推荐
        </button>
        <button 
          onClick={handleRandomSelect}
          className="p-4 bg-slate-50 text-slate-500 rounded-2xl active:scale-95 transition-all border border-slate-100 shadow-sm touch-manipulation"
        >
          <Dices className="w-5 h-5" />
        </button>
        <button 
          onClick={handleRefine}
          disabled={isRefining}
          className="flex-[1.8] py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-bold shadow-xl shadow-brand-200/50 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 touch-manipulation"
        >
          {isRefining ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>生成中</span>
            </div>
          ) : (
            <>
              <span className="tracking-wide">AI生成</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </footer>

      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-50 text-red-600 px-4 py-2 rounded-full text-xs font-medium border border-red-100 shadow-lg animate-bounce">
          {errorMsg}
        </div>
      )}

      {(isGenerating || isRefining) && (
        <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full mb-6"
          />
          <p className="text-brand-700 font-medium animate-pulse">
            {isGenerating ? '正在为您组合五维灵感...' : '正在根据调整优化方案...'}
          </p>
        </div>
      )}
    </div>
  );

  const renderResult = () => {
    if (!currentActivity) return null;
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="p-4 bg-white flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
          <button onClick={() => setCurrentPage('dimension-select')} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="font-medium">活动方案</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} disabled={isExporting} className="p-2 text-slate-400 disabled:opacity-50">
              <Share2 className={`w-6 h-6 ${isExporting ? 'animate-pulse' : ''}`} />
            </button>
            <button onClick={handleSave} className="p-2 -mr-2 text-brand-600">
              <Save className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main id="activity-content" className="flex-1 p-4 space-y-6 overflow-y-auto pb-32">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-3 uppercase tracking-wider">
              {currentActivity.topic}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentActivity.title}</h1>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">活动简介</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{currentActivity.positioning}</p>
              </div>
            </div>
          </div>

          {/* 5D Summary */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                五维组合结果
              </h3>
              <button 
                onClick={() => setCurrentPage('dimension-select')}
                className="text-[10px] text-brand-600 font-medium flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                调整维度
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(currentActivity.dimensions) as [DimensionKey, string[]][]).map(([key, values]) => (
                values.length > 0 && (
                  <div key={key} className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 block mb-1">
                      {DIMENSIONS.find(d => d.key === key)?.label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {values.map(v => (
                        <span key={v} className="text-[11px] font-medium text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <Users className="w-5 h-5 text-brand-500 mb-2" />
              <span className="text-[10px] text-slate-400 block">适用人数</span>
              <span className="text-sm font-bold">{currentActivity.participants}</span>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <Clock className="w-5 h-5 text-brand-500 mb-2" />
              <span className="text-[10px] text-slate-400 block">活动时长</span>
              <span className="text-sm font-bold">{currentActivity.duration}</span>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <MapPin className="w-5 h-5 text-brand-500 mb-2" />
              <span className="text-[10px] text-slate-400 block">场地要求</span>
              <span className="text-sm font-bold">{currentActivity.venue}</span>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <Package className="w-5 h-5 text-brand-500 mb-2" />
              <span className="text-[10px] text-slate-400 block">道具要求</span>
              <span className="text-sm font-bold">{currentActivity.props.join('、')}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-brand-500" />
              详细描述及规则
            </h3>
            <div className="space-y-8 relative">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />
              {currentActivity.steps.map((step, idx) => (
                <div key={idx} className="relative pl-10">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                    {idx + 1}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed whitespace-pre-wrap">{step.content}</p>
                  <div className="bg-brand-50 p-3 rounded-2xl border border-brand-100">
                    <div className="flex items-center gap-2 text-brand-700 text-[10px] font-bold mb-1">
                      <MessageSquare className="w-3 h-3" />
                      引导语
                    </div>
                    <p className="text-xs text-brand-800 italic">{step.guide}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion Path */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">情绪路径</h3>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {currentActivity.emotionPath.map((e, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-medium whitespace-nowrap">
                    {e}
                  </span>
                  {idx < currentActivity.emotionPath.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Risks */}
          <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
            <h3 className="text-sm font-bold text-orange-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              风险提醒
            </h3>
            <ul className="space-y-2">
              {currentActivity.risks.map((r, idx) => (
                <li key={idx} className="text-xs text-orange-700 flex gap-2">
                  <span className="w-1 h-1 bg-orange-400 rounded-full mt-1.5 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Review Questions */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">复盘问题</h3>
            <div className="space-y-3">
              {currentActivity.reviewQuestions.map((q, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 leading-relaxed">
                  {q}
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex gap-3 safe-bottom">
          <button 
            onClick={() => setCurrentPage('dimension-select')}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            重新生成
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-medium shadow-lg shadow-brand-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            保存并收藏
            <Check className="w-5 h-5" />
          </button>
        </footer>
      </div>
    );
  };

  const renderLibrary = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="p-4 bg-white flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button onClick={() => setCurrentPage('home')} className="p-2 -ml-2">
          <Home className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="font-medium">活动库</h2>
        <button onClick={() => setCurrentPage('basic-info')} className="p-2 -mr-2 text-brand-600">
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto pb-24">
        {savedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Library className="w-12 h-12 mb-4 opacity-20" />
            <p>还没有收藏的活动</p>
          </div>
        ) : (
          savedActivities.map(activity => (
            <motion.div 
              layout
              key={activity.id}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 active:scale-[0.98] transition-all"
              onClick={() => {
                setCurrentActivity(activity);
                setCurrentPage('detail');
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {activity.topic}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(activity.id);
                  }}
                  className="p-1 text-slate-300 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{activity.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 mb-4">{activity.purpose}</p>
              
              <div className="flex items-center gap-4 text-[10px] text-slate-400 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.duration}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activity.participants}
                </div>
                <div className="ml-auto">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around p-4 safe-bottom">
        <button onClick={() => setCurrentPage('home')} className="flex flex-col items-center gap-1 text-slate-400">
          <Home className="w-5 h-5" />
          <span className="text-[10px]">首页</span>
        </button>
        <button onClick={() => setCurrentPage('library')} className="flex flex-col items-center gap-1 text-brand-600">
          <Library className="w-5 h-5" />
          <span className="text-[10px]">活动库</span>
        </button>
      </nav>
    </div>
  );

  const renderModelSwitcher = () => (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <header className="p-4 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => setIsModelSwitcherOpen(false)} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="font-medium">模型管理</h2>
        <button 
          onClick={() => {
            setEditingModel({ id: Math.random().toString(36).substring(2, 9), name: '', modelName: 'gemini-2.0-flash', apiKey: '', baseUrl: '' });
            setIsEditingModel(true);
          }}
          className="p-2 -mr-2 text-brand-600"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div 
          onClick={() => setActiveModelId('default')}
          className={`p-4 rounded-2xl border-2 transition-all ${activeModelId === 'default' ? 'border-brand-500 bg-brand-50' : 'border-slate-100 bg-white'}`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900">系统默认 (Gemini)</h3>
              <p className="text-xs text-slate-500">使用系统预设的 API Key</p>
            </div>
            {activeModelId === 'default' && <Check className="w-5 h-5 text-brand-600" />}
          </div>
        </div>

        {modelConfigs.map(config => (
          <div 
            key={config.id}
            onClick={() => setActiveModelId(config.id)}
            className={`p-4 rounded-2xl border-2 transition-all ${activeModelId === config.id ? 'border-brand-500 bg-brand-50' : 'border-slate-100 bg-white'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{config.name}</h3>
                <p className="text-xs text-slate-500">{config.modelName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestConnection(config);
                  }}
                  className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                    testStatus.id === config.id && testStatus.status === 'success' ? 'bg-green-100 text-green-700' :
                    testStatus.id === config.id && testStatus.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}
                >
                  {testStatus.id === config.id && testStatus.status === 'testing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 
                   testStatus.id === config.id && testStatus.status === 'success' ? '调通' :
                   testStatus.id === config.id && testStatus.status === 'error' ? '失败' : '测试'}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingModel(config);
                    setIsEditingModel(true);
                  }}
                  className="p-2 text-slate-400"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModel(config.id);
                  }}
                  className="p-2 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {activeModelId === config.id && (
              <div className="flex justify-end mt-2">
                <Check className="w-5 h-5 text-brand-600" />
              </div>
            )}
            {testStatus.id === config.id && testStatus.status === 'error' && (
              <p className="text-[10px] text-red-500 mt-1">{testStatus.message}</p>
            )}
          </div>
        ))}
      </main>

      {isEditingModel && editingModel && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">编辑模型</h3>
              <button onClick={() => setIsEditingModel(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input 
                placeholder="模型显示名称 (如: 我的GPT4)"
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-brand-500"
                value={editingModel.name}
                onChange={e => setEditingModel({...editingModel, name: e.target.value})}
              />
              <input 
                placeholder="模型名称 (如: gpt-4, gemini-pro)"
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-brand-500"
                value={editingModel.modelName}
                onChange={e => setEditingModel({...editingModel, modelName: e.target.value})}
              />
              <input 
                placeholder="API Key"
                type="password"
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-brand-500"
                value={editingModel.apiKey}
                onChange={e => setEditingModel({...editingModel, apiKey: e.target.value})}
              />
              <input 
                placeholder="Base URL (留空则使用默认)"
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-brand-500"
                value={editingModel.baseUrl}
                onChange={e => setEditingModel({...editingModel, baseUrl: e.target.value})}
              />
            </div>
            <button 
              onClick={() => handleSaveModel(editingModel)}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200"
            >
              保存配置
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-slate-50 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          {currentPage === 'home' && renderHome()}
          {currentPage === 'basic-info' && renderBasicInfo()}
          {currentPage === 'dimension-select' && renderDimensionSelect()}
          {currentPage === 'result' && renderResult()}
          {currentPage === 'detail' && renderResult()}
          {currentPage === 'library' && renderLibrary()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {isModelSwitcherOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100]"
          >
            {renderModelSwitcher()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
