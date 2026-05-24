/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Trash2, Leaf, Zap, Award, Info, RefreshCw, X, 
  CheckCircle2, ChevronRight, BarChart3, MessageSquare, Send, Sparkles, Trophy, Check, Upload, Users, Gift
} from 'lucide-react';
import { cn } from './lib/utils';
import mascotUrl from './assets/images/vibebot_mascot_1779031187636.png';

interface AnalysisResult {
  object_name: string;
  waste_category: 'Organik' | 'Anorganik' | 'B3' | 'E-Waste';
  detailed_description: string;
  instant_action: string;
  disposal_bin_instruction: string;
  vibe_points: number;
  fun_fact: string;
  bot_commentary: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

interface Quest {
  id: string;
  title: string;
  reward: number;
  icon: string;
}

const CATEGORIES = {
  'Organik': { color: 'bg-emerald-500', icon: Leaf, border: 'border-emerald-200', text: 'text-emerald-700' },
  'Anorganik': { color: 'bg-blue-500', icon: RefreshCw, border: 'border-blue-200', text: 'text-blue-700' },
  'B3': { color: 'bg-red-500', icon: X, border: 'border-red-200', text: 'text-red-700' },
  'E-Waste': { color: 'bg-purple-500', icon: Zap, border: 'border-purple-200', text: 'text-purple-700' },
};

const DAILY_QUESTS: Quest[] = [
  { id: 'organic', title: 'Pilah Sampah Sisa Makanan (Organik)', reward: 25, icon: '🍎' },
  { id: 'plastic', title: 'Daur Ulang Botol/Cup Plastik (Anorganik)', reward: 35, icon: '🥤' },
  { id: 'share', title: 'Edukasi / Ceritakan Cara Pilah ke Teman', reward: 20, icon: '📢' },
];

const COMMUNITY_LEADERBOARD = [
  { rank: 1, name: "Bu RW Sumiati (RW 05)", points: 840, avatar: "👵" },
  { rank: 2, name: "Reza Pejuang Kompos", points: 720, avatar: "👦" },
  { rank: 3, name: "Pak RT Bambang (RT 02)", points: 610, avatar: "👨" },
  { rank: 4, name: "Siti Upcycle Queen", points: 490, avatar: "👧" },
];

interface Reward {
  id: string;
  title: string;
  cost: number;
  icon: string;
  description: string;
}

const REDEEMABLE_REWARDS: Reward[] = [
  { id: 'mangrove', title: 'Tanam 1 Bibit Mangrove', cost: 100, icon: '🌱', description: 'Aksi nyata penanaman 1 bibit mangrove di pesisir pantai Utara Jakarta.' },
  { id: 'eco_voucher', title: 'Voucher Refill Shop Rp15k', cost: 180, icon: '🎟️', description: 'E-Voucher diskon belanja sabun & detergen isi ulang bebas plastik.' },
  { id: 'tote_bag', title: 'Tote Bag Upcycle VibeBot', cost: 250, icon: '👜', description: 'Tas belanja kokoh nan stylish hasil olahan anyaman spanduk bekas.' },
  { id: 'compost_bag', title: '1 Karung Kompos Organik', cost: 80, icon: '🍂', description: 'Satu karung kecil pupuk kompos premium buatan komunitas warga.' }
];

export default function App() {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'misi' | 'leaderboard' | 'shop'>('misi');
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Chat Mode States
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [resultTab, setResultTab] = useState<'panduan' | 'info' | 'chat'>('panduan');

  // Gamified Quests States
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);

  // Load points, quests, and rewards from local storage
  useEffect(() => {
    const savedPoints = localStorage.getItem('vibe_points');
    if (savedPoints) setTotalPoints(parseInt(savedPoints, 10));

    const savedQuests = localStorage.getItem('vibe_quests');
    if (savedQuests) setCompletedQuests(JSON.parse(savedQuests));

    const savedRedeemed = localStorage.getItem('vibe_redeemed');
    if (savedRedeemed) setRedeemedRewards(JSON.parse(savedRedeemed));
  }, []);

  // Clear toastMessage automatically
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleRedeemReward = (reward: Reward) => {
    if (totalPoints < reward.cost) {
      setToastMessage(`❌ Yah, poin VP kamu kurang ${reward.cost - totalPoints} VP nih!`);
      return;
    }
    
    const newPoints = totalPoints - reward.cost;
    setTotalPoints(newPoints);
    localStorage.setItem('vibe_points', newPoints.toString());

    const updatedRedeemed = [...redeemedRewards, reward.id];
    setRedeemedRewards(updatedRedeemed);
    localStorage.setItem('vibe_redeemed', JSON.stringify(updatedRedeemed));

    setToastMessage(`🎉 Hore! Berhasil menukarkan "${reward.title}". Makasih banyak sob sudah menjaga bumi!`);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
      analyzeImage(imageSrc);
    }
  }, [webcamRef]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultSrc = reader.result as string;
        setImgSrc(resultSrc);
        analyzeImage(resultSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (image: string) => {
    setAnalyzing(true);
    setResult(null);
    setResultTab('panduan');
    setChatMessages([]);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      setResult(data);
      const newTotal = totalPoints + (data.vibe_points || 0);
      setTotalPoints(newTotal);
      localStorage.setItem('vibe_points', newTotal.toString());
      
      // Seed first introductory comment in interactive chat
      setChatMessages([
        { sender: 'bot' as const, text: `Halo sob! Aku siap bantu kamu buat upcycle atau olah ${data.object_name} ini. Ada yang mau ditanyain?` }
      ]);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getLevelInfo = (points: number) => {
    if (points < 150) {
      return { title: 'Kadet Hijau', badge: '🌱', nextLimit: 150, prevLimit: 0, desc: 'Pemula pejuang hemat sampah bumi!' };
    } else if (points < 450) {
      return { title: 'Pahlawan Kompos', badge: '🍂', nextLimit: 450, prevLimit: 150, desc: 'Dewa pemilah sampah rumah tangga sejati.' };
    } else {
      return { title: 'Pelindung Bumi', badge: '🌎', nextLimit: 1000, prevLimit: 450, desc: 'Penguasa Vibe Daur Ulang Lestari Nusantara!' };
    }
  };

  const sendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const newMessages: Message[] = [...chatMessages, { sender: 'user' as const, text: textToSend }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages,
          itemContext: result ? {
            objectName: result.object_name,
            wasteCategory: result.waste_category,
            description: result.detailed_description,
          } : undefined
        }),
      });
      const data = await response.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { sender: 'bot' as const, text: data.reply }]);
      }
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { sender: 'bot' as const, text: 'Ups, koneksi chatbot lagi ngadat sob! Coba kirim ulang ya.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClaimQuest = (questId: string, reward: number) => {
    if (completedQuests.includes(questId)) return;
    const updated = [...completedQuests, questId];
    setCompletedQuests(updated);
    localStorage.setItem('vibe_quests', JSON.stringify(updated));

    const newPoints = totalPoints + reward;
    setTotalPoints(newPoints);
    localStorage.setItem('vibe_points', newPoints.toString());
  };

  const reset = () => {
    setImgSrc(null);
    setResult(null);
    setResultTab('panduan');
    setChatMessages([]);
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200">
            <Leaf size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">PilahVibe AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold">Smart Recycling Hub</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowDashboard(!showDashboard)}
          className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-95"
          id="summary-button"
        >
          <Award size={18} className="text-emerald-500" />
          <span>{totalPoints} VP</span>
        </button>
      </header>

      <main className="mx-auto max-w-md px-6 py-8">
        {/* Welcome Section */}
        {!imgSrc && !showDashboard && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-4 rounded-3xl bg-white p-6 shadow-sm border border-stone-100"
          >
            <img src={mascotUrl} alt="VibeBot" className="h-20 w-20 object-contain" />
            <div>
              <h2 className="text-lg font-bold text-stone-800">Halo, Sobat Vibe!</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                Bingung mau buang sampah apa? Cukup foto, biar VibeBot yang bantu pilah! 🌍
              </p>
            </div>
          </motion.div>
        )}

        {/* Dashboard View */}
        <AnimatePresence>
          {showDashboard && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-3xl bg-white p-6 shadow-xl border border-stone-100 text-left"
            >
              <div className="mb-6 flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="text-yellow-500 animate-bounce" size={24} />
                  <h3 className="text-xl font-black text-stone-900 tracking-tight">Vibe Eco-Cloud</h3>
                </div>
                <button 
                  onClick={() => setShowDashboard(false)}
                  className="rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Toast Message Notification */}
              {toastMessage && (
                <div className={cn(
                  "mb-4 p-3 rounded-xl text-xs font-bold leading-relaxed border shadow-sm",
                  toastMessage.startsWith('❌') 
                    ? "bg-red-50 border-red-105 text-red-700"
                    : "bg-emerald-50 border-emerald-100 text-emerald-800"
                )}>
                  <span>{toastMessage}</span>
                </div>
              )}

              <div className="space-y-6">
                {/* Gamified Level Progress Bar */}
                {(() => {
                  const level = getLevelInfo(totalPoints);
                  const range = level.nextLimit - level.prevLimit;
                  const currentProgress = Math.min(totalPoints - level.prevLimit, range);
                  const percentage = Math.max(0, Math.min(100, (currentProgress / range) * 100));

                  return (
                    <div className="rounded-2xl bg-stone-900 text-white p-5 shadow-inner border border-stone-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{level.badge}</span>
                          <div>
                            <div className="text-xs uppercase tracking-widest font-black text-emerald-400">Level Anda</div>
                            <div className="text-lg font-black tracking-tight">{level.title}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-emerald-300">{totalPoints}</span>
                          <span className="text-[10px] text-stone-400 font-bold block uppercase">VP Milikmu</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-stone-300 italic mb-4">"{level.desc}"</p>

                      {/* Progress Bar Container */}
                      <div className="relative h-2.5 w-full rounded-full bg-stone-800 overflow-hidden">
                        <motion.div 
                          className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mt-2 text-[9px] font-bold uppercase text-stone-400">
                        <span>{level.prevLimit} VP</span>
                        <span>Level Berikutnya: {level.nextLimit} VP</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Pilah Impact Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Emisi CO2 Dihindari', val: `${(totalPoints * 0.15).toFixed(1)} kg`, icon: BarChart3, color: 'text-blue-500 bg-blue-50' },
                    { label: 'Tercegah Masuk TPA', val: `${Math.round(totalPoints / 15)} Barang`, icon: Trash2, color: 'text-amber-600 bg-amber-50' },
                  ].map((item, i) => {
                    const StatIcon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-2.5 rounded-xl bg-stone-50 p-3.5 border border-stone-100">
                        <div className={cn("h-8 w-8 shrink-0 flex items-center justify-center rounded-lg font-bold", item.color)}>
                          <StatIcon size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-stone-800 leading-tight">{item.val}</div>
                          <div className="text-[8.5px] font-semibold text-stone-400 uppercase tracking-tight">{item.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tabs switcher: Misi Harian vs Vibe Champions vs Tukar Poin */}
                <div className="flex border-b border-stone-150 gap-2 mt-2">
                  <button
                    onClick={() => setDashboardTab('misi')}
                    className={cn(
                      "flex-1 pb-2.5 text-xs font-black tracking-wide uppercase border-b-2 transition-all cursor-pointer",
                      dashboardTab === 'misi'
                        ? "border-emerald-500 text-emerald-700"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Sparkles size={12} />
                      Misi
                    </span>
                  </button>
                  <button
                    onClick={() => setDashboardTab('leaderboard')}
                    className={cn(
                      "flex-1 pb-2.5 text-xs font-black tracking-wide uppercase border-b-2 transition-all cursor-pointer",
                      dashboardTab === 'leaderboard'
                        ? "border-emerald-500 text-emerald-700"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Users size={12} />
                      Jawara
                    </span>
                  </button>
                  <button
                    onClick={() => setDashboardTab('shop')}
                    className={cn(
                      "flex-1 pb-2.5 text-xs font-black tracking-wide uppercase border-b-2 transition-all cursor-pointer",
                      dashboardTab === 'shop'
                        ? "border-emerald-500 text-emerald-700"
                        : "border-transparent text-stone-400 hover:text-stone-600"
                    )}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Gift size={12} />
                      Tukar Poin
                    </span>
                  </button>
                </div>

                {dashboardTab === 'misi' ? (
                  /* Misi Harian / Daily Quest Board */
                  <div className="space-y-3">
                    <div className="space-y-2.5">
                      {DAILY_QUESTS.map((quest) => {
                        const isCompleted = completedQuests.includes(quest.id);
                        return (
                          <div 
                            key={quest.id} 
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                              isCompleted 
                                ? "bg-stone-50 border-stone-100 opacity-60" 
                                : "bg-emerald-50/20 border-emerald-100/50 hover:bg-emerald-50/40"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl shrink-0">{quest.icon}</span>
                              <div>
                                <p className={cn("text-xs font-semibold leading-tight", isCompleted ? "line-through text-stone-400" : "text-stone-800")}>
                                  {quest.title}
                                </p>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">+{quest.reward} VP</span>
                              </div>
                            </div>

                            <button
                              disabled={isCompleted}
                              onClick={() => handleClaimQuest(quest.id, quest.reward)}
                              className={cn(
                                "flex h-8 items-center justify-center rounded-lg px-3 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                isCompleted 
                                  ? "bg-stone-100 text-stone-400" 
                                  : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                              )}
                            >
                              {isCompleted ? (
                                <Check size={14} strokeWidth={3} />
                              ) : (
                                'Klaim'
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : dashboardTab === 'leaderboard' ? (
                  /* Leaderboard Mode */
                  <div className="space-y-3">
                    <p className="text-[10px] text-stone-400 leading-snug font-bold uppercase tracking-wider mb-2">Peringkat Komunitas Pilah Bulan Ini</p>
                    <div className="space-y-2.5">
                      {/* Interactive Rank Injection for Live User */}
                      {(() => {
                        const players = [...COMMUNITY_LEADERBOARD, { rank: 5, name: "Kamu (Sobat Vibe)", points: totalPoints, avatar: "🦸‍♂️" }]
                          .sort((a, b) => b.points - a.points);
                        
                        return players.map((player, index) => {
                          const isSelf = player.name.includes("Kamu");
                          const realRank = index + 1;
                          return (
                            <div 
                              key={index} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-all",
                                isSelf 
                                  ? "bg-amber-50/60 border-amber-200 shadow-md ring-1 ring-amber-300/30" 
                                  : "bg-white border-stone-100 shadow-sm"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={cn(
                                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shrink-0",
                                  realRank === 1 ? "bg-amber-100 text-amber-800" :
                                  realRank === 2 ? "bg-stone-200 text-stone-850" :
                                  realRank === 3 ? "bg-amber-50 text-amber-900 border border-amber-200" :
                                  "bg-stone-100 text-stone-500"
                                )}>
                                  {realRank}
                                </span>
                                <span className="text-lg shrink-0">{player.avatar}</span>
                                <span className={cn("text-xs font-bold leading-none truncate max-w-[150px]", isSelf ? "text-amber-955 font-black" : "text-stone-800")}>
                                  {player.name}
                                </span>
                              </div>
                              <span className="text-xs font-black text-stone-900 shrink-0">
                                {player.points} <span className="text-[9px] text-emerald-600 font-bold uppercase">VP</span>
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  /* VP Eco-Redemption Shop Tab */
                  <div className="space-y-3">
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[10.5px] italic text-emerald-800 leading-normal font-semibold">
                      🌳 Yuk sob, cairkan Vibe Points (VP) yang sudah kamu kumpulkan jadi aksi kepedulian lingkungan nyata atau voucher seru!
                    </div>
                    
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {REDEEMABLE_REWARDS.map((reward) => {
                        const isRedeemed = redeemedRewards.includes(reward.id);
                        return (
                          <div 
                            key={reward.id} 
                            className={cn(
                              "flex gap-3 p-3 rounded-xl border transition-all",
                              totalPoints >= reward.cost 
                                ? "bg-white border-stone-200/80 hover:border-emerald-200 shadow-sm hover:shadow-md" 
                                : "bg-stone-50/60 border-stone-100 opacity-75"
                            )}
                          >
                            <span className="text-2xl shrink-0 flex items-center justify-center bg-stone-100/80 h-10 w-10 rounded-xl">
                              {reward.icon}
                            </span>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h4 className="text-xs font-bold text-stone-900 leading-tight truncate">
                                  {reward.title}
                                </h4>
                                {isRedeemed && (
                                  <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-black uppercase shrink-0">
                                    Owned
                                  </span>
                                )}
                              </div>
                              <p className="text-[9.5px] text-stone-500 leading-tight mt-0.5 mb-2">
                                {reward.description}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-emerald-700">
                                  {reward.cost} <span className="text-[9px] uppercase tracking-normal">VP</span>
                                </span>
                                
                                <button
                                  onClick={() => handleRedeemReward(reward)}
                                  className={cn(
                                    "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                                    totalPoints >= reward.cost 
                                      ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-sm active:scale-95" 
                                      : "bg-stone-200 text-stone-400 font-bold"
                                  )}
                                >
                                  Tukarkan
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowDashboard(false)}
                className="mt-6 w-full rounded-2xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 pointer-events-auto cursor-pointer text-center text-sm"
              >
                Kembali Memilah
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera / Analysis View */}
        {!showDashboard && (
          <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-200 shadow-inner">
            {!imgSrc ? (
              <div className="aspect-[4/5] relative overflow-hidden group">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'environment' }}
                  className="h-full w-full object-cover"
                />
                
                {/* Advanced Tech Scanline Line Sweep Overlay */}
                <div className="absolute inset-x-0 top-0 h-1 bg-red-500/80 opacity-70 shadow-[0_0_15px_#ef4444] animate-[bounce_4s_infinite_ease-in-out] pointer-events-none z-10"></div>
                
                {/* Visual Camera Crosshair Target Guides */}
                <div className="absolute inset-6 border border-white/10 rounded-[1.8rem] pointer-events-none flex flex-col justify-between p-4 z-20">
                  <div className="flex justify-between">
                    <div className="h-5 w-5 border-t-2 border-l-2 border-white/80 rounded-tl-md"></div>
                    <div className="h-5 w-5 border-t-2 border-r-2 border-white/80 rounded-tr-md"></div>
                  </div>
                  
                  {/* Glowing Target Ring */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 border border-dashed border-emerald-400/40 rounded-full animate-spin"></div>
                  </div>

                  <div className="flex justify-between">
                    <div className="h-5 w-5 border-b-2 border-l-2 border-white/80 rounded-bl-md"></div>
                    <div className="h-5 w-5 border-b-2 border-r-2 border-white/80 rounded-br-md"></div>
                  </div>
                </div>

                {/* Action Controls Section */}
                <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3.5 px-6 z-30">
                  <div className="flex items-center gap-5">
                    {/* Gallery uploads button */}
                    <label className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-all active:scale-95 cursor-pointer shadow-lg border border-white/10">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                      <Upload size={18} />
                    </label>

                    {/* Camera Capture button */}
                    <button
                      onClick={capture}
                      className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl transition-all hover:bg-white/30 active:scale-90 shadow-2xl"
                      id="capture-button"
                    >
                      <div className="h-16 w-16 rounded-full bg-white shadow-xl transition-transform group-hover:scale-110" />
                      <Camera className="absolute text-emerald-600" size={28} />
                    </button>

                    {/* balanced decoration icon or helper info */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-emerald-400 backdrop-blur-md shadow-lg border border-white/10">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                  </div>
                  
                  <p className="text-[10px] bg-black/65 text-stone-200 px-3.5 py-1.5 rounded-full font-bold tracking-wider backdrop-blur-sm shadow-md uppercase">
                    📸 JEPRET ATAU UPLOAD FOTO SAMPAH
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-6 shadow-md border border-stone-100 flex flex-col gap-6">
                {/* Captured Image Preview Header */}
                <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-stone-900 flex items-center justify-center shadow-inner">
                  <img src={imgSrc} alt="captured" className="h-full w-full object-cover opacity-85" />
                  
                  <AnimatePresence>
                    {analyzing && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-sm"
                      >
                        <dt className="relative">
                          <RefreshCw className="h-12 w-12 animate-spin text-emerald-400" />
                          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                            <span className="text-sm font-bold text-emerald-400">🌱</span>
                          </div>
                        </dt>
                        <p className="mt-4 text-xs font-black text-white tracking-widest uppercase">Menghitung Vibe...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!analyzing && (
                    <button
                      onClick={reset}
                      className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950/40 text-white backdrop-blur-md transition-colors hover:bg-stone-950/60"
                      title="Ambil Ulang Foto"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Analysis Loading & Results Details */}
                {!analyzing && result && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-5 text-left"
                  >
                    {/* Item Name, Category and Point */}
                    <div className="flex justify-between items-start gap-4 border-b border-stone-100 pb-3">
                      <div>
                        {(() => {
                          const categoryStyle = CATEGORIES[result.waste_category] || { color: 'bg-stone-500', icon: Leaf };
                          const CategoryIcon = categoryStyle.icon;
                          return (
                            <div className={cn(
                              "mb-2 inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm",
                              categoryStyle.color
                            )}>
                              <CategoryIcon size={12} strokeWidth={3} />
                              <span>{result.waste_category}</span>
                            </div>
                          );
                        })()}
                        <h3 className="text-2xl font-black text-stone-900 leading-tight tracking-tight">{result.object_name}</h3>
                      </div>
                      
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                        <span className="text-[9px] font-black uppercase text-emerald-600 tracking-tighter">Impact</span>
                        <span className="text-2xl font-black text-emerald-700">+{result.vibe_points}</span>
                      </div>
                    </div>

                    {/* VibeBot Interactive Speech Bubble */}
                    <div className="flex flex-col gap-3 bg-emerald-50/20 p-4 rounded-3xl border border-emerald-100/20 shadow-sm">
                      <div className="flex items-start gap-3">
                        <img src={mascotUrl} alt="VibeBot" className="h-12 w-12 shrink-0 object-contain animate-pulse" />
                        <div className="relative rounded-xl bg-white px-3.5 py-3 border border-stone-200/40 shadow-sm text-stone-800 text-xs flex-1">
                          <div className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-l border-b border-stone-200/40 bg-white"></div>
                          <span className="font-black text-[9px] text-emerald-600 block mb-1 uppercase tracking-wider">💬 Celoteh VibeBot :</span>
                          <p className="font-bold italic text-stone-700 leading-relaxed">
                            "{result.bot_commentary || "Wih mantap banget sob! Terus jaga bumi kita!"}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Segmented Controller Tab Bar */}
                    <div className="grid grid-cols-3 bg-stone-100 p-1 rounded-2xl border border-stone-200/40 font-black text-[11px]">
                      <button
                        onClick={() => setResultTab('panduan')}
                        className={cn(
                          "flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer",
                          resultTab === 'panduan' 
                            ? "bg-white text-emerald-800 shadow-sm" 
                            : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        <span>🗳️</span>
                        <span>Panduan</span>
                      </button>
                      <button
                        onClick={() => setResultTab('info')}
                        className={cn(
                          "flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer",
                          resultTab === 'info' 
                            ? "bg-white text-emerald-800 shadow-sm" 
                            : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        <span>🌱</span>
                        <span>Fakta</span>
                      </button>
                      <button
                        onClick={() => setResultTab('chat')}
                        className={cn(
                          "flex items-center justify-center gap-1 py-2 rounded-xl transition-all cursor-pointer relative",
                          resultTab === 'chat' 
                            ? "bg-white text-emerald-800 shadow-sm" 
                            : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        <span>💬</span>
                        <span>Tanya AI</span>
                        <span className="absolute top-1 right-2 flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                      </button>
                    </div>

                    {/* Conditional Result Tab Body */}
                    {resultTab === 'chat' ? (
                      /* Chat Room Interface */
                      <div className="flex flex-col gap-3">
                        {/* Chat Messages */}
                        <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto px-1 py-1 text-xs">
                          {chatMessages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-2 max-w-[85%] rounded-xl p-3 border shadow-sm",
                                msg.sender === 'user'
                                  ? "ml-auto bg-emerald-600 text-white border-emerald-500 rounded-tr-none text-right font-bold"
                                  : "bg-stone-50 text-stone-800 border-stone-100 rounded-tl-none text-left font-semibold"
                              )}
                            >
                              {msg.sender === 'bot' && (
                                <span className="text-xs">🤖</span>
                              )}
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          ))}

                          {chatLoading && (
                            <div className="flex items-center gap-2 text-[10px] uppercase font-black text-emerald-600 animate-pulse bg-emerald-50/50 p-2 rounded-xl self-start border border-emerald-100/50">
                              <RefreshCw size={10} className="animate-spin" />
                              <span>VibeBot sedang mengetik...</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Helper Chips */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            "💡 Ide upcycle kreatif dong!",
                            "🛠️ Beri tutorial DIY-nya",
                            "🌿 Dampak lingkungannya apa?",
                          ].map((preset, pIdx) => (
                            <button
                              key={pIdx}
                              disabled={chatLoading}
                              onClick={() => sendChatMessage(preset)}
                              className="text-[9px] font-black bg-stone-50 border border-stone-200 text-stone-600 px-2.5 py-1.5 rounded-full hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Chat inputs */}
                        <div className="flex h-10 gap-2">
                          <input
                            type="text"
                            placeholder="Tanya tips daur ulang kreatif..."
                            disabled={chatLoading}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') sendChatMessage();
                            }}
                            className="bg-stone-50 hover:bg-stone-100/50 focus:bg-white text-xs border border-stone-200/80 rounded-xl px-3 flex-1 font-semibold focus:outline-emerald-500"
                          />
                          <button
                            disabled={chatLoading || !chatInput.trim()}
                            onClick={() => sendChatMessage()}
                            className="h-10 w-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    ) : resultTab === 'info' ? (
                      <div className="flex flex-col gap-4">
                        {/* Detailed Description */}
                        <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100/80">
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            <Info size={12} className="text-stone-400" />
                            Deskripsi Lengkap Barang
                          </div>
                          <p className="text-sm text-stone-650 leading-relaxed font-normal">
                            {result.detailed_description}
                          </p>
                        </div>

                        {/* Fun Vibe Fact */}
                        <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-100/80">
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            <Award size={12} />
                            Fakta Unik Vibe
                          </div>
                          <p className="text-xs text-amber-900/80 italic leading-relaxed">
                            "{result.fun_fact}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {/* Specific Disposal Bin / Space */}
                        {(() => {
                          const categoryStyle = CATEGORIES[result.waste_category] || { color: 'bg-emerald-500', text: 'text-emerald-700' };
                          return (
                            <div className={cn(
                              "rounded-2xl p-4 border-l-4 shadow-sm",
                              result.waste_category === 'Organik' ? 'bg-emerald-50/40 border-emerald-500/80 border-y border-r border-emerald-100' :
                              result.waste_category === 'Anorganik' ? 'bg-blue-50/40 border-blue-500/80 border-y border-r border-blue-100' :
                              result.waste_category === 'B3' ? 'bg-red-50/40 border-red-500/80 border-y border-r border-red-100' :
                              'bg-purple-50/40 border-purple-500/80 border-y border-r border-purple-100'
                            )}>
                              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                                <Trash2 size={12} className={categoryStyle.text} />
                                <span className={categoryStyle.text}>Petunjuk Wadah Pembuangan</span>
                              </div>
                              <p className="text-sm font-black text-stone-850 leading-snug">
                                {result.disposal_bin_instruction}
                              </p>
                              <div className="mt-2 text-[10.5px] italic text-stone-500 flex items-center gap-1">
                                <span>💡 Sapa Pahlawan Kebersihan:</span> Pisahkan sampah dengan benar membantu mempermudah pengolahan sampah lingkungan!
                              </div>
                            </div>
                          );
                        })()}

                        {/* Instant Action */}
                        <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100/80">
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Panduan Langkah Cepat
                          </div>
                          <p className="text-sm font-semibold text-stone-800 leading-snug">
                            {result.instant_action}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Button Controls */}
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-stone-100 py-3.5 text-sm font-bold text-stone-600 hover:bg-stone-200 transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw size={18} />
                        Pilah Lagi
                      </button>
                      <button
                        onClick={reset}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all active:scale-95 hover:bg-emerald-700 cursor-pointer"
                      >
                        Selesai
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto px-6 py-8 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          Built for #JuaraVibeCoding • Google AI Studio
        </p>
      </footer>
    </div>
  );
}
