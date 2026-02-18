
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
  ChevronRight
} from 'lucide-react';
import { RollResult, DicePreset } from './types';

const DICE_PRESETS: DicePreset[] = [
  { type: 6, label: 'D6', icon: '■' },
  { type: 8, label: 'D8', icon: '◆' },
  { type: 10, label: 'D10', icon: '◈' },
  { type: 12, label: 'D12', icon: '⬢' },
  { type: 16, label: 'D16', icon: '❖' },
  { type: 20, label: 'D20', icon: '★' },
  { type: 32, label: 'D32', icon: '❈' },
  { type: 100, label: 'D100', icon: '◎' },
];

const App: React.FC = () => {
  const [history, setHistory] = useState<RollResult[]>([]);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [modifier, setModifier] = useState<number>(0);
  const [customSides, setCustomSides] = useState<number>(100);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [history]);

  const rollDice = useCallback(async (type: number) => {
    if (isRolling) return;
    setIsRolling(true);
    
    await new Promise(resolve => setTimeout(resolve, 150));

    const results: number[] = Array.from({ length: diceCount }, () => 
      Math.floor(Math.random() * type) + 1
    );
    const total = results.reduce((a, b) => a + b, 0) + modifier;

    const newRoll: RollResult = {
      id: crypto.randomUUID(),
      diceType: type,
      count: diceCount,
      modifier: modifier,
      results,
      total,
      timestamp: Date.now(),
    };

    setLastRoll(newRoll);
    setHistory(prev => [newRoll, ...prev]);
    setIsRolling(false);
  }, [diceCount, modifier, isRolling]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastRoll(null);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-3 md:p-8 max-w-full overflow-x-hidden">
      
      {/* HEADER */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 mb-8 border-b-4 border-black pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#ff4d00] neo-btn p-3 shadow-none hover:transform-none cursor-default">
            <Dices size={32} color="white" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-heavy tracking-tight leading-none uppercase">Dice System</h1>
            <p className="text-[10px] font-bold text-gray-500 mt-1 flex items-center gap-1 uppercase">
              <span className="bg-black text-white px-1">Modern</span> Professional Utility
            </p>
          </div>
        </div>
        <div className="bg-yellow-300 border-2 border-black px-3 py-1 font-bold text-[10px] tracking-widest uppercase">
          Ready
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: MAIN CONTROLS */}
        <div className="lg:col-span-8 space-y-6 w-full">
          
          {/* CONFIGURATION CARD */}
          <section className="neo-card p-4 md:p-8 w-full">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={20} strokeWidth={3} />
              <h2 className="text-lg font-heavy uppercase">設定 / <span className="text-gray-400">CONFIG</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* COUNT CONTROL */}
              <div className="space-y-2">
                <label className="text-sm font-black flex items-center gap-1">
                  <Hash size={16} strokeWidth={3} /> 個数 / COUNT
                </label>
                <div className="flex items-stretch h-14 w-full">
                  <button 
                    onClick={() => setDiceCount(Math.max(1, diceCount - 1))} 
                    className="w-14 bg-red-50 neo-btn flex items-center justify-center rounded-l-md"
                  >
                    <Minus size={20} strokeWidth={3} />
                  </button>
                  <input 
                    type="number" 
                    value={diceCount}
                    onChange={(e) => setDiceCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 border-y-2 border-black text-center text-2xl font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none min-w-0"
                  />
                  <button 
                    onClick={() => setDiceCount(Math.min(99, diceCount + 1))} 
                    className="w-14 bg-blue-50 neo-btn flex items-center justify-center rounded-r-md"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* MODIFIER CONTROL */}
              <div className="space-y-2">
                <label className="text-sm font-black flex items-center gap-1">
                  <Plus size={16} strokeWidth={3} /> 修正値 / MODIFIER
                </label>
                <div className="flex items-stretch h-14 w-full">
                  <button 
                    onClick={() => setModifier(modifier - 1)} 
                    className="w-14 bg-red-50 neo-btn flex items-center justify-center rounded-l-md"
                  >
                    <Minus size={20} strokeWidth={3} />
                  </button>
                  <input 
                    type="number" 
                    value={modifier}
                    onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                    className="flex-1 border-y-2 border-black text-center text-2xl font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none min-w-0"
                  />
                  <button 
                    onClick={() => setModifier(modifier + 1)} 
                    className="w-14 bg-blue-50 neo-btn flex items-center justify-center rounded-r-md"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* PRESET DICE GRID */}
            <div className="space-y-3 mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">ダイス選択 / SELECT & ROLL</label>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                {DICE_PRESETS.map((dice) => (
                  <button
                    key={dice.type}
                    onClick={() => rollDice(dice.type)}
                    disabled={isRolling}
                    className={`
                      group flex flex-col items-center justify-center py-3 md:py-4 neo-btn bg-white hover:bg-yellow-300
                      ${isRolling ? 'opacity-30' : ''}
                    `}
                  >
                    <span className="text-xl md:text-3xl mb-1">{dice.icon}</span>
                    <span className="text-[9px] md:text-[10px] font-heavy font-mono text-center">D{dice.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOM DICE INPUT */}
            <div className="pt-6 border-t-2 border-dashed border-gray-300 flex flex-col md:flex-row gap-4 items-end w-full">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">カスタム面数 / CUSTOM SIDES</label>
                <input 
                  type="number" 
                  value={customSides}
                  onChange={(e) => setCustomSides(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full h-12 border-2 border-black px-4 text-lg font-heavy bg-[#f3f4f6] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => rollDice(customSides)}
                disabled={isRolling}
                className="h-12 px-8 bg-black text-white font-heavy text-xs flex items-center gap-2 justify-center neo-btn hover:bg-yellow-500 hover:text-black transition-colors w-full md:w-auto"
              >
                ROLL D{customSides} <ChevronRight size={14} />
              </button>
            </div>
          </section>

          {/* MAIN RESULT DISPLAY */}
          <section className="neo-card p-6 md:p-12 min-h-[250px] flex flex-col justify-center items-center bg-white relative overflow-hidden w-full">
            {lastRoll ? (
              <div className="w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="space-y-1">
                  <div className="inline-block bg-yellow-300 border-2 border-black px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                    Result Total
                  </div>
                  <div className="text-[7rem] sm:text-[9rem] md:text-[12rem] font-heavy leading-none text-black tracking-tighter">
                    {lastRoll.total}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto w-full">
                  <div className="p-3 md:p-4 bg-[#f3f4f6] border-2 border-black">
                    <div className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-tighter">計算式 / Formula</div>
                    <div className="text-lg md:text-xl font-heavy">
                      {lastRoll.count}D{lastRoll.diceType}
                      {lastRoll.modifier !== 0 && (
                        <span className={lastRoll.modifier > 0 ? 'text-blue-600' : 'text-red-600'}>
                          {lastRoll.modifier > 0 ? ` + ${lastRoll.modifier}` : ` - ${Math.abs(lastRoll.modifier)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 md:p-4 bg-[#f3f4f6] border-2 border-black overflow-hidden">
                    <div className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-tighter">個別の出目 / Breakdown</div>
                    <div className="text-sm font-bold text-gray-700 font-mono break-all line-clamp-2">
                      {lastRoll.results.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center opacity-10 flex flex-col items-center gap-4 py-10">
                <Dices size={80} strokeWidth={2} />
                <p className="text-xl md:text-2xl font-heavy uppercase tracking-widest">Waiting for Roll</p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: HISTORY PANEL */}
        <aside className="lg:col-span-4 h-full w-full">
          <div className="neo-card !p-0 flex flex-col h-[500px] lg:h-[840px] bg-white w-full overflow-hidden">
            <div className="p-4 border-b-4 border-black flex justify-between items-center bg-yellow-300">
              <div className="flex items-center gap-3">
                <History size={20} strokeWidth={3} />
                <h2 className="text-xs md:text-sm font-heavy leading-none">履歴 / HISTORY</h2>
              </div>
              <button 
                onClick={clearHistory}
                className="neo-btn bg-white p-2 hover:bg-red-500 hover:text-white flex items-center justify-center"
                title="履歴を削除 / Clear All"
              >
                <Trash2 size={20} strokeWidth={2.5} className="pointer-events-none" />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 w-full"
            >
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                  <RotateCcw size={40} strokeWidth={2} className="opacity-10" />
                  <p className="font-heavy text-[9px] uppercase tracking-widest">Empty</p>
                </div>
              ) : (
                history.map((roll) => (
                  <div 
                    key={roll.id} 
                    className="p-3 border-2 border-black bg-[#f3f4f6] flex items-center justify-between group hover:bg-white transition-colors shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center text-lg font-heavy border-2 border-black bg-white group-hover:bg-yellow-300 transition-colors">
                        {roll.total}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-gray-400 uppercase leading-none">
                          {roll.count}D{roll.diceType} 
                          {roll.modifier !== 0 && (
                            <span className={roll.modifier > 0 ? 'text-blue-500' : 'text-red-500'}>
                              {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] font-bold text-gray-800 mt-1 truncate">
                          [{roll.results.join(', ')}]
                        </div>
                      </div>
                    </div>
                    <div className="text-[7px] font-black text-gray-300 uppercase">
                      {new Date(roll.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>

      <footer className="w-full py-10 text-center mt-10 border-t-2 border-dashed border-gray-400 opacity-30">
        <p className="text-[8px] md:text-[9px] font-heavy tracking-[0.4em] uppercase">Built for Adventure / MODERN v2.6</p>
      </footer>
    </div>
  );
};

export default App;
