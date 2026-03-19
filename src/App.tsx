/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Upload, 
  Download, 
  LogOut, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  MessageSquare, 
  Target,
  ChevronRight,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointer2,
  Coins,
  Percent,
  BarChart3,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface AdData {
  campaign_advertising_channel_type: string;
  event_date: string;
  account_name: string;
  campaign_name: string;
  ads_cost: number;
  ads_impressions: number;
  ads_clicks: number;
  ads_conversions: number;
  reservation_all: number;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  client: string;
  targetConversions: number;
  targetCPA: number;
  comment: string;
  actualConversions: number;
  actualCPA: number;
}

// --- Mock Data ---
const DEFAULT_CLIENTS = [
  { id: 'rieden', name: '株式会社Rieden', color: '#4F46E5' },
  { id: 'client_b', name: 'Demo Client B', color: '#10B981' },
];

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentClient, setCurrentClient] = useState(DEFAULT_CLIENTS[0]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  
  // Data State
  const [adData, setAdData] = useState<AdData[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // Date Filter State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Goal State
  const [targetConversions, setTargetConversions] = useState<string>('100');
  const [targetCPA, setTargetCPA] = useState<string>('3000');
  const [commentInput, setCommentInput] = useState('');

  // --- Handlers ---
  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as any[]).map(row => {
          // Format date from 20260221 to 2026/02/21
          let dateStr = String(row.event_date || '');
          if (dateStr.length === 8) {
            dateStr = `${dateStr.substring(0, 4)}/${dateStr.substring(4, 6)}/${dateStr.substring(6, 8)}`;
          }

          return {
            campaign_advertising_channel_type: row.campaign_advertising_channel_type || row.media_type || 'unknown',
            event_date: dateStr,
            account_name: row.account_name || '',
            campaign_name: row.campaign_name || '',
            ads_cost: Number(row.ads_cost || 0),
            ads_impressions: Number(row.ads_impressions || 0),
            ads_clicks: Number(row.ads_clicks || 0),
            ads_conversions: Number(row.ads_conversions || 0),
            reservation_all: Number(row.reservation_all || 0),
          };
        }).filter(d => d.event_date !== '');
        
        setAdData(parsed);
        
        // Set initial date range
        if (parsed.length > 0) {
          const dates = parsed.map(d => d.event_date).sort();
          setStartDate(dates[0]);
          setEndDate(dates[dates.length - 1]);
        }
      }
    });
  };

  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return adData;
    return adData.filter(d => d.event_date >= startDate && d.event_date <= endDate);
  }, [adData, startDate, endDate]);

  const totals = useMemo(() => {
    const cost = filteredData.reduce((a, b) => a + b.ads_cost, 0);
    const conv = filteredData.reduce((a, b) => a + b.reservation_all, 0);
    const imp = filteredData.reduce((a, b) => a + b.ads_impressions, 0);
    const clicks = filteredData.reduce((a, b) => a + b.ads_clicks, 0);
    
    const cpa = conv > 0 ? cost / conv : 0;
    const ctr = imp > 0 ? (clicks / imp) * 100 : 0;
    const cvr = clicks > 0 ? (conv / clicks) * 100 : 0;
    
    const targetConv = targetConversions === '' ? 1 : Number(targetConversions);
    return { cost, conv, cpa, targetConv, imp, clicks, ctr, cvr };
  }, [filteredData, targetConversions]);

  const handleSaveHistory = () => {
    if (targetConversions === '' || targetCPA === '') return;

    const newEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString('ja-JP'),
      client: currentClient.name,
      targetConversions: Number(targetConversions),
      targetCPA: Number(targetCPA),
      comment: commentInput,
      actualConversions: totals.conv,
      actualCPA: totals.cpa,
    };
    
    setHistory([newEntry, ...history]);
    setCommentInput('');
  };

  const exportHistoryToCSV = () => {
    const csv = Papa.unparse(history);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `analytics_history_${currentClient.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Computed Data ---
  const campaignSummary = useMemo(() => {
    const map: Record<string, { name: string; cost: number; conv: number; imp: number; clicks: number }> = {};
    filteredData.forEach(d => {
      const name = d.campaign_name;
      if (!map[name]) map[name] = { name, cost: 0, conv: 0, imp: 0, clicks: 0 };
      map[name].cost += d.ads_cost;
      map[name].conv += d.reservation_all;
      map[name].imp += d.ads_impressions;
      map[name].clicks += d.ads_clicks;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [filteredData]);

  const channelTypeData = useMemo(() => {
    const map: Record<string, { name: string; cost: number; conv: number; imp: number; clicks: number }> = {};
    filteredData.forEach(d => {
      const type = d.campaign_advertising_channel_type;
      if (!map[type]) map[type] = { name: type, cost: 0, conv: 0, imp: 0, clicks: 0 };
      map[type].cost += d.ads_cost;
      map[type].conv += d.reservation_all;
      map[type].imp += d.ads_impressions;
      map[type].clicks += d.ads_clicks;
    });
    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [filteredData]);

  const timeSeriesData = useMemo(() => {
    const map: Record<string, { cost: number; conv: number }> = {};
    filteredData.forEach(d => {
      if (!map[d.event_date]) map[d.event_date] = { cost: 0, conv: 0 };
      map[d.event_date].cost += d.ads_cost;
      map[d.event_date].conv += d.reservation_all;
    });
    return Object.entries(map)
      .map(([date, vals]) => ({ date, cost: Math.round(vals.cost), conv: vals.conv }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // --- Components ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 rotate-3">
              <TrendingUp className="text-white w-10 h-10 -rotate-3" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">分析スタジオ</h1>
            <p className="text-slate-400 font-medium mt-2">高機能広告分析ダッシュボード v2.0</p>
          </div>

          <div className="space-y-4">
            {DEFAULT_CLIENTS.map(client => (
              <button
                key={client.id}
                onClick={() => {
                  setCurrentClient(client);
                  handleLogin();
                }}
                className="w-full p-5 flex items-center justify-between rounded-2xl border-2 border-slate-50 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm" style={{ backgroundColor: client.color }}>
                    {client.name[0]}
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800">{client.name}</span>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ダッシュボードを表示</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const convBehind = totals.conv < targetConversions;
  const cpaBehind = totals.cpa > targetCPA;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <TrendingUp className="text-white w-7 h-7" />
          </div>
          <span className="font-black text-xl tracking-tighter">STUDIO+</span>
        </div>

        <nav className="flex-1 px-6 space-y-3 mt-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group",
              activeTab === 'dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <LayoutDashboard size={22} />
            ダッシュボード
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group",
              activeTab === 'history' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            <History size={22} />
            分析履歴
          </button>
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-5 bg-slate-900 rounded-[2rem] mb-6 text-white overflow-hidden relative group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">選択中のクライアント</span>
              </div>
              <p className="font-bold text-sm truncate">{currentClient.name}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-bold"
          >
            <LogOut size={22} />
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900">ダッシュボード</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-slate-400 font-semibold">クライアント:</span>
                    <span className="text-indigo-600 font-bold">{currentClient.name}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Date Range Toggle */}
                  <div className="flex items-center gap-2 bg-white border-2 border-slate-100 p-2 rounded-2xl shadow-sm">
                    <Calendar size={18} className="text-slate-400 ml-2" />
                    <input 
                      type="date" 
                      value={startDate.replace(/\//g, '-')}
                      onChange={(e) => setStartDate(e.target.value.replace(/-/g, '/'))}
                      className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 p-1"
                    />
                    <span className="text-slate-300">~</span>
                    <input 
                      type="date" 
                      value={endDate.replace(/\//g, '-')}
                      onChange={(e) => setEndDate(e.target.value.replace(/-/g, '/'))}
                      className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 p-1"
                    />
                  </div>

                  <label className="cursor-pointer bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-3 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm group">
                    <Upload size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-slate-700">CSVインポート</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {adData.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-32 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                    <FileText className="text-slate-200 w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">分析の準備ができました</h3>
                  <p className="text-slate-400 max-w-sm mt-3 font-medium leading-relaxed">広告実績のCSVファイルをアップロードして、リアルタイムな可視化と目標管理を開始しましょう。</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                      { label: 'IMP', value: totals.imp.toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'クリック', value: totals.clicks.toLocaleString(), icon: MousePointer2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { label: '費用', value: `¥${totals.cost.toLocaleString()}`, icon: Coins, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { label: 'CV', value: totals.conv.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      { label: 'CTR', value: `${totals.ctr.toFixed(2)}%`, icon: Percent, color: 'text-rose-500', bg: 'bg-rose-50' },
                      { label: 'CVR', value: `${totals.cvr.toFixed(2)}%`, icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'CPA', value: `¥${Math.round(totals.cpa).toLocaleString()}`, icon: Target, color: 'text-slate-700', bg: 'bg-slate-100' },
                    ].map((card, i) => (
                      <motion.div 
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center"
                      >
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", card.bg)}>
                          <card.icon className={card.color} size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-lg font-black text-slate-900 truncate w-full">{card.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Goal Progress Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                          <Target className="text-indigo-600" size={24} />
                          コンバージョン進捗
                        </h3>
                        <div className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2",
                          convBehind ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {convBehind ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                          {convBehind ? "目標未達" : "順調"}
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-sm font-bold mb-3">
                            <span className="text-slate-400 uppercase tracking-widest">目標 {totals.targetConv} CV への進捗</span>
                            <span className="text-slate-900">{Math.round((totals.conv / totals.targetConv) * 100)}%</span>
                          </div>
                          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((totals.conv / totals.targetConv) * 100, 100)}%` }}
                              className={cn("h-full rounded-full", convBehind ? "bg-amber-500" : "bg-emerald-500")}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="p-5 bg-slate-50 rounded-3xl">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">実績 CV</p>
                            <p className="text-3xl font-black text-slate-900">{totals.conv}</p>
                          </div>
                          <div className="p-5 bg-slate-50 rounded-3xl">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">目標 CV</p>
                            <p className="text-3xl font-black text-slate-900">{targetConversions === '' ? '-' : Number(targetConversions).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-indigo-400" size={24} />
                        CPA効率
                      </h3>
                      
                      <div className="mt-8">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">実績 CPA</p>
                        <div className="flex items-baseline gap-3">
                          <span className="text-5xl font-black tracking-tighter">¥{Math.round(totals.cpa).toLocaleString()}</span>
                          <div className={cn(
                            "flex items-center text-sm font-bold",
                            cpaBehind ? "text-rose-400" : "text-emerald-400"
                          )}>
                            {cpaBehind ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                            {targetCPA === '' || Number(targetCPA) === 0 ? '0' : Math.abs(Math.round(((totals.cpa - Number(targetCPA)) / Number(targetCPA)) * 100))}%
                          </div>
                        </div>
                        <p className="text-slate-500 text-sm mt-4 font-medium italic">目標: ¥{targetCPA === '' ? '0' : Number(targetCPA).toLocaleString()}</p>
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold text-sm">状態</span>
                          <span className={cn(
                            "font-black text-sm uppercase tracking-widest",
                            cpaBehind ? "text-rose-400" : "text-emerald-400"
                          )}>
                            {cpaBehind ? "効率低下" : "最適"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                      <h3 className="text-xl font-black mb-8 tracking-tight">費用とCVの推移</h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={timeSeriesData}>
                            <defs>
                              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 600 }} />
                            <Tooltip 
                              formatter={(value: number, name: string) => {
                                if (name === "費用") return [`¥${value.toLocaleString()}`, name];
                                return [value.toLocaleString(), name];
                              }}
                              contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '20px' }}
                            />
                            <Area yAxisId="left" type="monotone" dataKey="cost" name="費用" stroke="#4F46E5" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" />
                            <Bar yAxisId="right" dataKey="conv" name="CV数" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                      <h3 className="text-xl font-black mb-8 tracking-tight">費用上位キャンペーン</h3>
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={campaignSummary.slice(0, 10)}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={120}
                              paddingAngle={8}
                              dataKey="cost"
                              stroke="none"
                            >
                              {campaignSummary.slice(0, 10).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => `¥${value.toLocaleString()}`}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Input */}
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <MessageSquare className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">戦略分析・振り返り</h3>
                        <p className="text-slate-400 font-medium">目標設定と期間内の気づきを記録</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">目標コンバージョン数</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={targetConversions}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                            setTargetConversions(val);
                          }}
                          className={cn(
                            "w-full bg-slate-50 border-2 rounded-2xl py-4 px-6 transition-all outline-none font-bold text-lg",
                            targetConversions === '' || targetConversions === '0' ? "border-red-500 bg-red-50/30" : "border-transparent focus:border-indigo-600 focus:bg-white"
                          )}
                        />
                        {(targetConversions === '' || targetConversions === '0') && (
                          <p className="text-red-500 text-xs font-bold mt-1">値を入力してください</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">目標CPA (円)</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={targetCPA}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                            setTargetCPA(val);
                          }}
                          className={cn(
                            "w-full bg-slate-50 border-2 rounded-2xl py-4 px-6 transition-all outline-none font-bold text-lg",
                            targetCPA === '' || targetCPA === '0' ? "border-red-500 bg-red-50/30" : "border-transparent focus:border-indigo-600 focus:bg-white"
                          )}
                        />
                        {(targetCPA === '' || targetCPA === '0') && (
                          <p className="text-red-500 text-xs font-bold mt-1">値を入力してください</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">分析コメント</label>
                        <textarea 
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="例：クリエイティブの刷新によりパフォーマンスが向上..."
                          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 focus:border-indigo-600 focus:bg-white transition-all outline-none font-bold min-h-[60px] resize-none"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleSaveHistory}
                      disabled={targetConversions === '' || targetCPA === ''}
                      className={cn(
                        "mt-8 px-10 py-4 font-black rounded-2xl transition-all shadow-lg flex items-center gap-3 active:scale-95",
                        (targetConversions === '' || targetCPA === '') 
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                          : "bg-slate-900 text-white hover:bg-indigo-600"
                      )}
                    >
                      <Plus size={20} />
                      この期間の履歴を保存
                    </button>
                  </div>

                  {/* Campaign & Type Summary */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {/* Campaign Summary Table */}
                    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                      <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                          <BarChart3 className="text-indigo-600" size={24} />
                          キャンペーン別実績
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">キャンペーン名</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">費用</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">CV</th>
                              <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">CPA</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {campaignSummary.slice(0, 10).map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-10 py-5 font-bold text-sm text-slate-700 max-w-[250px] truncate">{row.name}</td>
                                <td className="px-6 py-5 text-right font-mono text-sm">¥{row.cost.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right font-bold text-indigo-600">{row.conv.toLocaleString()}</td>
                                <td className="px-6 py-5 text-right font-mono text-sm">¥{row.conv > 0 ? Math.round(row.cost / row.conv).toLocaleString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Campaign Type Summary */}
                    <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                      <div className="p-10 border-b border-slate-50">
                        <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                          <PieChartIcon className="text-indigo-600" size={24} />
                          キャンペーンタイプ別実績
                        </h3>
                      </div>
                      <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                          <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-6">
                            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">コスト比率</p>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={channelTypeData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={5}
                                  dataKey="cost"
                                  stroke="none"
                                >
                                  {channelTypeData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="h-[250px] bg-slate-50/50 rounded-[2rem] p-6">
                            <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CV比率</p>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={channelTypeData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={5}
                                  dataKey="conv"
                                  stroke="none"
                                >
                                  {channelTypeData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString()} CV`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div className="overflow-x-auto border border-slate-50 rounded-2xl">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">タイプ</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">費用</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">CV</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">CPA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {channelTypeData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 font-bold text-sm text-slate-700 flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    {row.name}
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-sm">¥{row.cost.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-right font-bold text-indigo-600">{row.conv.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-right font-mono text-sm">¥{row.conv > 0 ? Math.round(row.cost / row.conv).toLocaleString() : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table View */}
                  <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                      <h3 className="text-xl font-black tracking-tight">詳細パフォーマンス</h3>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{adData.length} 件のデータを読み込み済み</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">日付</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">キャンペーン</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">費用</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">CV数</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">CPA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {adData.slice(0, 15).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-5 text-sm font-bold text-slate-500">{row.event_date}</td>
                              <td className="px-8 py-5">
                                <span className="font-bold text-slate-700 truncate block max-w-xs">{row.campaign_name}</span>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-slate-900 text-right">¥{Math.round(row.ads_cost).toLocaleString()}</td>
                              <td className="px-8 py-5 text-sm font-bold text-slate-900 text-right">{row.reservation_all}</td>
                              <td className="px-8 py-5 text-right">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                  ¥{row.reservation_all > 0 ? Math.round(row.ads_cost / row.reservation_all).toLocaleString() : '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter text-slate-900">分析履歴</h2>
                  <p className="text-slate-400 font-medium mt-2">{currentClient.name} の目標と分析の履歴</p>
                </div>
                <button 
                  onClick={exportHistoryToCSV}
                  disabled={history.length === 0}
                  className="bg-white border-2 border-slate-100 px-8 py-4 rounded-2xl flex items-center gap-3 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Download size={20} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-slate-700">履歴をエクスポート</span>
                </button>
              </div>

              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">記録日時</th>
                      <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">目標 CV / CPA</th>
                      <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">実績 CV / CPA</th>
                      <th className="px-10 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">考察・コメント</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-10 py-32 text-center">
                          <div className="flex flex-col items-center opacity-20">
                            <History size={48} className="mb-4" />
                            <p className="text-xl font-black italic">履歴はまだありません。</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      history.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-10 py-6 text-sm font-bold text-slate-500">{entry.timestamp}</td>
                          <td className="px-10 py-6 text-right">
                            <div className="text-sm font-black text-slate-400">{entry.targetConversions} CV</div>
                            <div className="text-xs font-bold text-slate-300">¥{entry.targetCPA.toLocaleString()}</div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <div className={cn(
                              "text-sm font-black",
                              entry.actualConversions < entry.targetConversions ? "text-rose-500" : "text-emerald-500"
                            )}>
                              {entry.actualConversions} CV
                            </div>
                            <div className={cn(
                              "text-xs font-bold",
                              entry.actualCPA > entry.targetCPA ? "text-rose-400" : "text-emerald-400"
                            )}>
                              ¥{Math.round(entry.actualCPA).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-10 py-6">
                            <p className="text-slate-600 font-bold leading-relaxed max-w-md">{entry.comment || '-'}</p>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
