import React from 'react';
import { 
  Sparkles, RefreshCw, Award, User, ChevronDown, CheckCircle2, 
  BookOpen, BrainCircuit, Activity
} from 'lucide-react';

export default function Navbar({
  profiles,
  activeProfileId,
  onSelectProfile,
  onRegenerate,
  isRegenerating,
  activeTab,
  onResetDemo
}) {
  const currentProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const getPersonaBadge = (id) => {
    switch (id) {
      case 1:
        return { label: 'Beginner', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 2:
        return { label: 'Intermediate', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 3:
        return { label: 'Advanced', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      default:
        return { label: 'Custom', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  const badge = getPersonaBadge(currentProfile?.id);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Hackathon Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight font-['Outfit'] bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  StudySync AI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                  VIT AI 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Intelligent Personalised Study Planner • Q7
              </p>
            </div>
          </div>

          {/* Persona Switcher & Controls */}
          <div className="flex items-center gap-3">
            
            {/* Student Profile Selector */}
            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-xs font-semibold text-white">
                  {currentProfile?.name?.charAt(0) || 'S'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200">{currentProfile?.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                    {currentProfile?.target_exam}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 py-2 hidden group-hover:block transition-all z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  Switch Demo Persona
                </div>
                {profiles.map(p => {
                  const pBadge = getPersonaBadge(p.id);
                  const isSelected = p.id === currentProfile?.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectProfile(p.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors ${
                        isSelected ? 'bg-indigo-950/40 text-indigo-300' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-medium">{p.name}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.target_exam}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${pBadge.color}`}>
                        {pBadge.label}
                      </span>
                    </button>
                  );
                })}

                <div className="mt-1 pt-1 border-t border-slate-800 px-3 py-1">
                  <button
                    onClick={() => onResetDemo(currentProfile?.id)}
                    className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset {currentProfile?.name?.split(' ')[0]}'s Baseline Data
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Regenerate Button */}
            <button
              onClick={() => onRegenerate(false)}
              disabled={isRegenerating}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Recalculate remaining schedule with intelligent constraints"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerate Plan</span>
            </button>

            {/* Live Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI & SQLite Live
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
