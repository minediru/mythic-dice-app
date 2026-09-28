import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Minus, 
  Dices, 
  Settings, 
  Hash, 
  ChevronRight, 
  Zap, 
  Shield, 
  Skull, 
  Trophy, 
  ToggleLeft, 
  ToggleRight, 
  Target, 
  AlertCircle,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RollResult, DicePreset, AdvancedSettings } from './types';

const DICE_PRESETS: DicePreset[] = [
  { type: 2, label: 'D2', icon: '◑' },
  { type: 6, label: 'D6', icon: '■' },
  { type: 8, label: 'D8', icon: '◆' },
  { type: 12, label: 'D12', icon: '⬢' },
  { type: 16, label: 'D16', icon: '❖' },
  { type: 20, label: 'D20', icon: '★' },
  { type: 32, label: 'D32', icon: '❈' },
  { type: 100, label: 'D100', icon: '◎' },
];

// Web Audio API Sound Synthesizer (Zero-latency, zero external dependencies)
const playSound = (
  type: 'click' | 'land' | 'critical' | 'fumble' | 'success' | 'fail', 
  enabled: boolean
) => {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'critical') {
      // Fanfare: bright rising arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.24);
      });
    } else if (type === 'fumble') {
      // Fumble: descending dissonant drone
      [220, 185, 146.83, 110].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.18, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.28);
      });
    } else if (type === 'success') {
      // High bright major chime
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.2, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } else if (type === 'fail') {
      // Dull low thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.15);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      // Standard dice roll impact: punchy tactile rattle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    }
  } catch {
    // Graceful fallback if audio is not permitted
  }
};

const App: React.FC = () => {
  const [history, setHistory] = useState<RollResult[]>([]);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [modifier, setModifier] = useState<number>(0);
  
  // Custom Sides: String state allows empty state and single-digit numbers smoothly
  const [customSides, setCustomSides] = useState<string>('100');
  
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);
  
  // Advanced TRPG Settings
  const [advanced, setAdvanced] = useState<AdvancedSettings>({
    criticalRange: 1,
    fumbleRange: 100,
    targetNumber: null,
    isEnabled: false,
    judgmentMode: 'none',
    binaryMode: false
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultCardRef = useRef<HTMLElement>(null);
  const [isResultInView, setIsResultInView] = useState<boolean>(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [history]);

  useEffect(() => {
    const el = resultCardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsResultInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Immediate roll execution: Instant answer visibility the moment dice is selected
  const rollDice = useCallback((type: number) => {
    if (type < 1 || isNaN(type)) return;

    const results: number[] = Array.from({ length: diceCount }, () => 
      Math.floor(Math.random() * type) + 1
    );
    const total = results.reduce((a, b) => a + b, 0) + modifier;

    let isCritical = false;
    let isFumble = false;
    let isSuccess: boolean | undefined = undefined;

    if (advanced.isEnabled) {
      const checkValue = diceCount === 1 ? results[0] : total;
      
      if (type === 100) {
        isCritical = checkValue <= advanced.criticalRange;
        isFumble = checkValue >= advanced.fumbleRange;
      } else {
        // Universal critical/fumble for other dice:
        // Max possible roll is critical, min possible roll (1 * diceCount) is fumble
        isCritical = checkValue >= (type * diceCount);
        isFumble = checkValue <= (1 * diceCount);
      }

      if (advanced.targetNumber !== null && advanced.judgmentMode !== 'none') {
        if (advanced.judgmentMode === 'higher') {
          isSuccess = total >= advanced.targetNumber;
        } else if (advanced.judgmentMode === 'lower') {
          isSuccess = total <= advanced.targetNumber;
        }
      }
    }

    const newRoll: RollResult = {
      id: crypto.randomUUID(),
      diceType: type,
      count: diceCount,
      modifier: modifier,
      results,
      total,
      timestamp: Date.now(),
      isCritical,
      isFumble,
      isSuccess,
      targetNumber: advanced.targetNumber ?? undefined
    };

    // Instant sound effect based on judgment
    if (isCritical) {
      playSound('critical', soundEnabled);
    } else if (isFumble) {
      playSound('fumble', soundEnabled);
    } else if (isSuccess === true) {
      playSound('success', soundEnabled);
    } else if (isSuccess === false) {
      playSound('fail', soundEnabled);
    } else {
      playSound('land', soundEnabled);
    }

    // Set result immediately so answer is recognizable in 0ms!
    setLastRoll(newRoll);
    setHistory(prev => [newRoll, ...prev]);
    setPulseTrigger(Date.now());
  }, [diceCount, modifier, advanced, soundEnabled]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastRoll(null);
  }, []);

  // Custom sides input validation helpers
  const customSidesTrimmed = customSides.trim();
  const isCustomEmpty = customSidesTrimmed === '';
  const customSidesNumber = parseInt(customSidesTrimmed, 10);
  const isCustomValid = !isCustomEmpty && !isNaN(customSidesNumber) && customSidesNumber >= 2;
  const isCustomTooLow = !isCustomEmpty && !isNaN(customSidesNumber) && customSidesNumber < 2;

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-3 md:p-8 max-w-full overflow-x-hidden relative">
      
      {/* STICKY FLOATING RESULT BAR - ALWAYS VISIBLE WHEN SCROLLED DOWN (TALL & HIGH IMPACT) */}
      <AnimatePresence>
        {!isResultInView && lastRoll && (
          <motion.div
            key={`sticky-hud-${lastRoll.id}-${pulseTrigger}`}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 w-[94%] max-w-xl z-50 bg-yellow-300 border-4 border-black p-4 sm:p-5 shadow-[6px_6px_0px_#000] flex flex-col gap-2.5"
          >
            {/* TOP ROW: META & JUMP BUTTON */}
            <div className="flex items-center justify-between border-b-2 border-black/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white font-mono text-xs px-2.5 py-1 font-heavy">
                  {lastRoll.count}D{lastRoll.diceType}
                  {lastRoll.modifier !== 0 && (lastRoll.modifier > 0 ? ` + ${lastRoll.modifier}` : ` - ${Math.abs(lastRoll.modifier)}`)}
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  最新出目
                </span>
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-white border-2 border-black px-2.5 py-1 text-xs font-heavy neo-btn hover:bg-black hover:text-white cursor-pointer transition-colors"
                title="最上部へスクロール"
              >
                上部へ ↑
              </button>
            </div>

            {/* CENTER ROW: HUGE NUMBER & BADGES */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-6xl font-heavy text-black leading-none">
                  {advanced.binaryMode && lastRoll.isSuccess !== undefined ? (
                    <span className={lastRoll.isSuccess ? 'text-green-800' : 'text-red-700'}>
                      {lastRoll.isSuccess ? 'PASS' : 'FAIL'}
                    </span>
                  ) : (
                    lastRoll.total
                  )}
                </span>
                {advanced.binaryMode && lastRoll.isSuccess !== undefined && (
                  <span className="text-xs font-mono font-bold text-gray-700">
                    (合計: {lastRoll.total})
                  </span>
                )}
              </div>

              {/* JUDGMENT OVERLAY BADGES */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {lastRoll.isCritical && (
                  <span className="bg-red-600 text-white text-xs sm:text-sm font-heavy px-3 py-1 border-2 border-black shadow-[3px_3px_0px_#000] animate-bounce">
                    💥 CRITICAL!!
                  </span>
                )}
                {lastRoll.isFumble && (
                  <span className="bg-black text-white text-xs sm:text-sm font-heavy px-3 py-1 border-2 border-red-500 shadow-[3px_3px_0px_#f00] animate-bounce">
                    💀 FUMBLE...
                  </span>
                )}
                {lastRoll.isSuccess !== undefined && !lastRoll.isCritical && !lastRoll.isFumble && (
                  <span className={`text-xs sm:text-sm font-heavy px-3 py-1 border-2 border-black shadow-[2px_2px_0px_#000] ${
                    lastRoll.isSuccess ? 'bg-green-400 text-black' : 'bg-red-200 text-red-900'
                  }`}>
                    {lastRoll.isSuccess ? '✓ SUCCESS' : '✗ FAILURE'}
                  </span>
                )}
              </div>
            </div>

            {/* BOTTOM ROW: BREAKDOWN DETAILS */}
            <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-800 pt-1 border-t-2 border-black/10">
              <span className="truncate">
                出目内訳: [{lastRoll.results.join(', ')}]
              </span>
              <span className="text-[10px] text-gray-600 font-mono shrink-0 ml-2">
                {new Date(lastRoll.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b-4 border-black pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-[#ff4d00] neo-btn p-2.5 shadow-none hover:transform-none cursor-default">
            <Dices size={30} color="white" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-heavy tracking-tight leading-none uppercase">Dice System</h1>
            <p className="text-[10px] font-bold text-gray-500 mt-1 flex items-center gap-1.5 uppercase">
              <span className="bg-black text-white px-1">Modern</span> Instant Response Tabletop Utility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SOUND TOGGLE */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`h-9 px-3 border-2 border-black flex items-center gap-1.5 text-xs font-heavy transition-all neo-btn ${
              soundEnabled ? 'bg-white text-black hover:bg-yellow-300' : 'bg-gray-200 text-gray-500'
            }`}
            title={soundEnabled ? '効果音: ON' : '効果音: OFF'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
          </button>

          <div className="bg-yellow-300 border-2 border-black px-3 py-1.5 font-heavy text-[11px] tracking-widest uppercase shadow-[2px_2px_0px_#000]">
            ⚡ INSTANT READY
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: RESULT FIRST, CONTROLS DIRECTLY UNDER */}
        <div className="lg:col-span-8 space-y-6 w-full">
          
          {/* 1. HERO RESULT DISPLAY (TOP PRIORITY: VISIBLE IMMEDIATELY ON SELECTION) */}
          <section ref={resultCardRef} className="neo-card p-5 md:p-8 bg-white relative overflow-hidden w-full transition-all">
            
            <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-dashed border-gray-300">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#ff4d00]" />
                <span className="text-xs font-heavy uppercase tracking-widest text-gray-600">
                  結果表示 / RESULT DISPLAY
                </span>
              </div>
              {lastRoll && (
                <span className="bg-black text-white font-mono text-[11px] px-2.5 py-0.5 font-bold uppercase">
                  {lastRoll.count}D{lastRoll.diceType}
                  {lastRoll.modifier !== 0 && (lastRoll.modifier > 0 ? ` + ${lastRoll.modifier}` : ` - ${Math.abs(lastRoll.modifier)}`)}
                </span>
              )}
            </div>

            <div className="min-h-[220px] md:min-h-[260px] flex flex-col justify-center items-center relative">
              <AnimatePresence mode="wait">
                {lastRoll ? (
                  <motion.div 
                    key={lastRoll.id + '-' + pulseTrigger}
                    initial={{ opacity: 0, scale: 0.88, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 22,
                      duration: 0.15 
                    }}
                    className="w-full text-center space-y-4"
                  >
                    <div className="space-y-1 relative">
                      
                      {/* GIANT MAIN NUMBER / PASS-FAIL */}
                      <div className="relative flex items-center justify-center min-h-[9rem] md:min-h-[11rem]">
                        
                        <div className="text-[6.5rem] sm:text-[8rem] md:text-[10.5rem] font-heavy leading-none text-black tracking-tighter relative z-10 select-none">
                          {advanced.binaryMode && lastRoll.isSuccess !== undefined ? (
                            <div className={`flex flex-col items-center ${lastRoll.isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="leading-none">{lastRoll.isSuccess ? 'PASS' : 'FAIL'}</span>
                              <span className="text-xs font-mono font-bold text-gray-500 tracking-normal mt-1">
                                合計値: {lastRoll.total}
                              </span>
                            </div>
                          ) : (
                            lastRoll.total
                          )}
                        </div>
                        
                        {/* CRITICAL / FUMBLE DRAMATIC OVERLAYS */}
                        <AnimatePresence>
                          {lastRoll.isCritical && (
                            <motion.div 
                              key="critical-overlay"
                              initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
                              animate={{ scale: 1, rotate: -4, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 350, damping: 15 }}
                              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                            >
                              <div className="bg-red-600 text-white border-4 md:border-8 border-black px-6 md:px-12 py-3 md:py-6 text-3xl sm:text-5xl md:text-7xl font-heavy shadow-[10px_10px_0px_#000] transform whitespace-nowrap">
                                💥 CRITICAL!!
                              </div>
                            </motion.div>
                          )}
                          {lastRoll.isFumble && (
                            <motion.div 
                              key="fumble-overlay"
                              initial={{ scale: 0.2, rotate: 15, opacity: 0 }}
                              animate={{ scale: 1, rotate: 4, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 350, damping: 15 }}
                              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                            >
                              <div className="bg-black text-white border-4 md:border-8 border-red-600 px-6 md:px-12 py-3 md:py-6 text-3xl sm:text-5xl md:text-7xl font-heavy shadow-[10px_10px_0px_#f00] transform whitespace-nowrap">
                                💀 FUMBLE...
                              </div>
                            </motion.div>
                          )}
                          
                          {/* TARGET SUCCESS / FAILURE BANNER */}
                          {lastRoll.isSuccess !== undefined && !lastRoll.isCritical && !lastRoll.isFumble && (
                            <motion.div 
                              key="success-overlay"
                              initial={{ y: 25, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className={`absolute -bottom-4 md:-bottom-6 left-1/2 -translate-x-1/2 border-4 border-black px-6 md:px-10 py-1.5 md:py-2.5 text-lg md:text-2xl font-heavy z-20 shadow-[6px_6px_0px_#000] whitespace-nowrap flex items-center gap-2 ${
                                lastRoll.isSuccess ? 'bg-green-400 text-black' : 'bg-red-100 text-red-900'
                              }`}
                            >
                              {lastRoll.isSuccess ? (
                                <>
                                  <CheckCircle2 size={22} className="stroke-[3]" />
                                  <span>SUCCESS (目標値: {lastRoll.targetNumber})</span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={22} className="stroke-[3]" />
                                  <span>FAILURE (目標値: {lastRoll.targetNumber})</span>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Subtle background energy mark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none -z-10">
                          <Zap size={220} fill="currentColor" />
                        </div>
                      </div>
                    </div>

                    {/* FORMULA & BREAKDOWN ROW */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto w-full pt-2">
                      <div className="p-3 bg-[#f3f4f6] border-2 border-black shadow-[2px_2px_0px_#000]">
                        <div className="text-[9px] font-black text-gray-500 mb-0.5 uppercase tracking-wider">
                          計算式 / Formula
                        </div>
                        <div className="text-base md:text-lg font-heavy text-black">
                          {lastRoll.count}D{lastRoll.diceType}
                          {lastRoll.modifier !== 0 && (
                            <span className={lastRoll.modifier > 0 ? 'text-blue-600' : 'text-red-600'}>
                              {lastRoll.modifier > 0 ? ` + ${lastRoll.modifier}` : ` - ${Math.abs(lastRoll.modifier)}`}
                            </span>
                          )}
                          <span className="text-gray-400 font-normal ml-1">=</span> {lastRoll.total}
                        </div>
                      </div>

                      <div className="p-3 bg-[#f3f4f6] border-2 border-black shadow-[2px_2px_0px_#000] overflow-hidden">
                        <div className="text-[9px] font-black text-gray-500 mb-0.5 uppercase tracking-wider">
                          個別の出目 / Breakdown
                        </div>
                        <div className="text-sm md:text-base font-bold text-gray-800 font-mono truncate">
                          [{lastRoll.results.join(', ')}]
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center flex flex-col items-center justify-center gap-3 py-8"
                  >
                    <div className="w-16 h-16 border-4 border-black bg-yellow-300 flex items-center justify-center shadow-[4px_4px_0px_#000]">
                      <Dices size={36} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-lg md:text-xl font-heavy uppercase tracking-tight">Ready to Roll</p>
                      <p className="text-xs text-gray-500 font-bold mt-1">下のダイスをクリックすると、瞬時にここに結果が表示されます</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* 2. CONFIGURATION & DICE SELECTION CARD */}
          <section className="neo-card p-4 md:p-8 w-full space-y-7">
            
            {/* PRESET DICE GRID (SELECT & ROLL INSTANTLY) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                  <Dices size={16} strokeWidth={3} className="text-[#ff4d00]" />
                  ダイス選択 / SELECT & ROLL (クリックで即判定)
                </label>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 border border-black/20">
                  即時表示
                </span>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                {DICE_PRESETS.map((dice) => (
                  <button
                    key={dice.type}
                    onClick={() => rollDice(dice.type)}
                    className="group flex flex-col items-center justify-center py-3 md:py-4 neo-btn bg-white hover:bg-yellow-300 active:scale-95 transition-transform"
                    title={`D${dice.type} を振る`}
                  >
                    <span className="text-2xl md:text-3xl mb-1 select-none group-hover:scale-110 transition-transform">
                      {dice.icon}
                    </span>
                    <span className="text-[10px] md:text-xs font-heavy font-mono text-center">
                      D{dice.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* COUNT & MODIFIER CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t-2 border-black/10">
              
              {/* COUNT CONTROL */}
              <div className="space-y-2">
                <label className="text-xs font-black flex items-center gap-1 uppercase">
                  <Hash size={14} strokeWidth={3} /> 個数 / COUNT (ダイスの個数)
                </label>
                <div className="flex items-stretch h-12 w-full">
                  <button 
                    onClick={() => setDiceCount(Math.max(1, diceCount - 1))} 
                    className="w-12 bg-red-50 neo-btn flex items-center justify-center rounded-l-none"
                    title="1個減らす"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <input 
                    type="number" 
                    value={diceCount}
                    onChange={(e) => setDiceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 border-y-2 border-black text-center text-xl font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none min-w-0"
                  />
                  <button 
                    onClick={() => setDiceCount(Math.min(99, diceCount + 1))} 
                    className="w-12 bg-blue-50 neo-btn flex items-center justify-center rounded-r-none"
                    title="1個増やす"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* MODIFIER CONTROL */}
              <div className="space-y-2">
                <label className="text-xs font-black flex items-center gap-1 uppercase">
                  <Plus size={14} strokeWidth={3} /> 修正値 / MODIFIER (合計への加減算)
                </label>
                <div className="flex items-stretch h-12 w-full">
                  <button 
                    onClick={() => setModifier(modifier - 1)} 
                    className="w-12 bg-red-50 neo-btn flex items-center justify-center rounded-l-none"
                    title="1減らす"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <input 
                    type="number" 
                    value={modifier}
                    onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
                    className="flex-1 border-y-2 border-black text-center text-xl font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none min-w-0"
                  />
                  <button 
                    onClick={() => setModifier(modifier + 1)} 
                    className="w-12 bg-blue-50 neo-btn flex items-center justify-center rounded-r-none"
                    title="1増やす"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* CUSTOM DICE INPUT SECTION */}
            <div className="pt-5 border-t-2 border-dashed border-gray-300 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Settings size={14} strokeWidth={3} /> カスタム面数 / CUSTOM SIDES
              </label>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start w-full">
                <div className="flex-1 w-full">
                  <div className="flex items-center">
                    <span className="h-12 px-3.5 bg-black text-white font-heavy text-sm flex items-center justify-center border-2 border-r-0 border-black">
                      D
                    </span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="面数を入力 (例: 7, 24, 100)"
                      value={customSides}
                      onChange={(e) => {
                        // Allow completely empty string and numbers only
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setCustomSides(val);
                      }}
                      className="flex-1 h-12 border-2 border-black px-4 text-lg font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none w-full"
                    />
                  </div>

                  {/* Empty Warning notice or Error notice in small red text */}
                  {isCustomEmpty && (
                    <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1.5 animate-pulse">
                      <AlertCircle size={14} className="shrink-0" />
                      ※面数を入力してください（2以上の半角数字を入力できます）
                    </p>
                  )}
                  {isCustomTooLow && (
                    <p className="text-xs text-red-600 font-bold mt-1.5 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      ※2以上の面数を入力してください（1面のダイスは振れません）
                    </p>
                  )}
                  {isCustomValid && (
                    <p className="text-[10px] font-bold text-gray-500 mt-1">
                      ※D{customSidesNumber}（1〜{customSidesNumber}のランダム）のダイスをロールします
                    </p>
                  )}
                </div>

                <button
                  onClick={() => isCustomValid && rollDice(customSidesNumber)}
                  disabled={!isCustomValid}
                  className={`h-12 px-7 font-heavy text-xs flex items-center gap-2 justify-center neo-btn transition-colors w-full sm:w-auto ${
                    isCustomValid 
                      ? 'bg-black text-white hover:bg-yellow-400 hover:text-black cursor-pointer' 
                      : 'bg-gray-200 text-gray-400 border-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  ROLL D{isCustomValid ? customSidesNumber : '?'} <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* TRPG ADVANCED MENU (COLLAPSIBLE) */}
            <div className="pt-2 border-t-4 border-black">
              <button 
                onClick={() => setAdvanced(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                className={`w-full py-3 px-4 flex items-center justify-between font-heavy text-xs md:text-sm uppercase tracking-widest transition-colors ${
                  advanced.isEnabled ? 'bg-black text-white' : 'bg-gray-100 text-black border-2 border-black hover:bg-yellow-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield size={18} />
                  TRPG ADVANCED MENU (判定・クリティカル設定)
                </div>
                {advanced.isEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>

              <AnimatePresence>
                {advanced.isEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-yellow-50 border-2 border-black border-t-0">
                      
                      {/* CRITICAL SETTING */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black flex items-center gap-1 uppercase">
                          <Trophy size={14} className="text-yellow-600" /> クリティカル範囲 / Critical Range
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600">D100で ≦</span>
                          <input 
                            type="number" 
                            value={advanced.criticalRange}
                            onChange={(e) => setAdvanced(prev => ({ ...prev, criticalRange: parseInt(e.target.value, 10) || 1 }))}
                            className="flex-1 h-10 border-2 border-black px-3 text-sm font-heavy bg-white"
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold">※D100以外は出目の最大値で判定されます</p>
                      </div>

                      {/* FUMBLE SETTING */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black flex items-center gap-1 uppercase">
                          <Skull size={14} className="text-red-600" /> ファンブル範囲 / Fumble Range
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600">D100で ≧</span>
                          <input 
                            type="number" 
                            value={advanced.fumbleRange}
                            onChange={(e) => setAdvanced(prev => ({ ...prev, fumbleRange: parseInt(e.target.value, 10) || 100 }))}
                            className="flex-1 h-10 border-2 border-black px-3 text-sm font-heavy bg-white"
                          />
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold">※D100以外は出目の最小値(1)で判定されます</p>
                      </div>

                      {/* TARGET NUMBER & MODE */}
                      <div className="space-y-3 md:col-span-2 pt-4 mt-2 border-t-2 border-black/20">
                        <label className="text-xs font-heavy flex items-center gap-2 uppercase tracking-wider">
                          <Target size={18} className="text-blue-600" /> 
                          <span>目標値判定設定 / TARGET JUDGMENT</span>
                        </label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase">目標値 / Target Number</span>
                            <div className="flex gap-2">
                              <input 
                                type="number" 
                                placeholder="例: 15 (未設定でOFF)"
                                value={advanced.targetNumber ?? ''}
                                onChange={(e) => setAdvanced(prev => ({ 
                                  ...prev, 
                                  targetNumber: e.target.value === '' ? null : parseInt(e.target.value, 10) 
                                }))}
                                className="flex-1 h-12 border-2 border-black px-3 text-xl font-heavy bg-white focus:bg-blue-50 outline-none shadow-[2px_2px_0px_#000]"
                              />
                              <button 
                                onClick={() => setAdvanced(prev => ({ ...prev, targetNumber: null }))}
                                className="w-12 h-12 border-2 border-black flex items-center justify-center bg-white hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_#000]"
                                title="目標値をクリア"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase">判定条件 / Mode</span>
                            <div className="grid grid-cols-3 gap-2 h-12">
                              {(['none', 'higher', 'lower'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setAdvanced(prev => ({ ...prev, judgmentMode: mode }))}
                                  className={`border-2 border-black text-xs font-heavy uppercase transition-all shadow-[2px_2px_0px_#000] ${
                                    advanced.judgmentMode === mode ? 'bg-black text-white' : 'bg-white hover:bg-gray-100 text-black'
                                  }`}
                                >
                                  {mode === 'none' ? '判定OFF' : mode === 'higher' ? '≧ (以上)' : '≦ (以下)'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BINARY RESULT MODE TOGGLE */}
                      <div className="md:col-span-2 pt-3 border-t-2 border-black/10">
                        <button
                          onClick={() => setAdvanced(prev => ({ ...prev, binaryMode: !prev.binaryMode }))}
                          className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 border-2 border-black font-heavy text-xs uppercase transition-all shadow-[2px_2px_0px_#000] ${
                            advanced.binaryMode ? 'bg-blue-600 text-white' : 'bg-white text-black hover:bg-blue-50'
                          }`}
                        >
                          <Zap size={15} />
                          判定のみ表示 (Binary Result Mode): {advanced.binaryMode ? 'ON (PASS/FAIL強調)' : 'OFF'}
                        </button>
                        <p className="text-[9px] font-bold text-gray-500 mt-1 text-center">
                          ※ONの場合、数値よりも「成功 (PASS)」・「失敗 (FAIL)」を主役に大文字表示します。
                        </p>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </section>
        </div>

        {/* RIGHT COLUMN: HISTORY PANEL */}
        <aside className="lg:col-span-4 h-full w-full">
          <div className="neo-card !p-0 flex flex-col h-[480px] lg:h-[720px] bg-white w-full overflow-hidden">
            <div className="p-3.5 border-b-4 border-black flex justify-between items-center bg-yellow-300">
              <div className="flex items-center gap-2.5">
                <History size={18} strokeWidth={3} />
                <h2 className="text-xs md:text-sm font-heavy leading-none">履歴 / HISTORY</h2>
                {history.length > 0 && (
                  <span className="bg-black text-white text-[10px] font-mono px-1.5 py-0.2 rounded-none">
                    {history.length}
                  </span>
                )}
              </div>
              <button 
                onClick={clearHistory}
                disabled={history.length === 0}
                className={`neo-btn p-1.5 flex items-center justify-center ${
                  history.length === 0 ? 'opacity-40 cursor-not-allowed bg-gray-200 shadow-none' : 'bg-white hover:bg-red-500 hover:text-white'
                }`}
                title="履歴を削除 / Clear All"
              >
                <Trash2 size={16} strokeWidth={2.5} className="pointer-events-none" />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 w-full"
            >
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 py-12">
                  <RotateCcw size={36} strokeWidth={2} className="opacity-20" />
                  <p className="font-heavy text-[10px] uppercase tracking-widest text-gray-400">履歴はありません</p>
                </div>
              ) : (
                history.map((roll) => (
                  <div 
                    key={roll.id} 
                    className="p-2.5 border-2 border-black bg-[#f3f4f6] flex items-center justify-between group hover:bg-white transition-colors shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 shrink-0 flex items-center justify-center text-base font-heavy border-2 border-black bg-white group-hover:bg-yellow-300 transition-colors relative">
                        {roll.total}
                        {roll.isCritical && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 border border-black rounded-full" title="CRITICAL" />
                        )}
                        {roll.isFumble && (
                          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-red-600 rounded-full" title="FUMBLE" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-gray-500 uppercase leading-none flex items-center gap-1 flex-wrap">
                          <span>{roll.count}D{roll.diceType}</span>
                          {roll.modifier !== 0 && (
                            <span className={roll.modifier > 0 ? 'text-blue-600' : 'text-red-600'}>
                              {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}
                            </span>
                          )}
                          {roll.isCritical && (
                            <span className="bg-red-600 text-white px-1 text-[7px] font-heavy">CRIT</span>
                          )}
                          {roll.isFumble && (
                            <span className="bg-black text-white px-1 text-[7px] font-heavy">FUMB</span>
                          )}
                          {roll.isSuccess !== undefined && !roll.isCritical && !roll.isFumble && (
                            <span className={`px-1 text-[7px] border border-black font-heavy ${roll.isSuccess ? 'bg-green-300 text-black' : 'bg-gray-300 text-gray-800'}`}>
                              {roll.isSuccess ? 'PASS' : 'FAIL'}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-bold text-gray-800 mt-1 font-mono truncate">
                          [{roll.results.join(', ')}]
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] font-mono text-gray-400 shrink-0 ml-1">
                      {new Date(roll.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>

      {/* FOOTER */}
      <footer className="w-full py-8 text-center mt-6 border-t-2 border-dashed border-gray-400 opacity-40">
        <p className="text-[9px] font-heavy tracking-[0.3em] uppercase">Built for Tabletop RPG Adventure / MODERN DICE</p>
      </footer>
    </div>
  );
};

export default App;
