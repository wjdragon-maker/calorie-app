import React, { useState, useEffect, useRef } from 'react';
import { parseNaturalLanguageInput } from './services/gemini';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { CalorieEntry, EntryType, UserStats } from './types';
import { ProgressRing } from './components/ProgressRing';
import { LogItem } from './components/LogItem';

// Constants based on user persona: 44y Male, 81kg
// BMR (Mifflin-St Jeor) approx 1750. TDEE (Sedentary 1.2) approx 2050.
// Goal: 500 deficit -> 1550 kcal net daily target.
const INITIAL_STATS: UserStats = {
  weight: 81,
  age: 44,
  gender: 'male',
  tdee: 2050,
  targetDeficit: 500,
  dailyBudget: 1550
};

const STORAGE_KEY = 'calorie_commander_entries';

function App() {
  // Load entries from local storage or start empty
  const [entries, setEntries] = useState<CalorieEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load entries", e);
      return [];
    }
  });

  // View state for date navigation
  const [viewDate, setViewDate] = useState(new Date());

  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: isSpeechSupported 
  } = useSpeechRecognition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save to local storage whenever entries change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // Update input with transcript
  useEffect(() => {
    if (isListening) {
      setInputValue(transcript);
    }
  }, [transcript, isListening]);

  // Date helpers
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    if (isSameDay(date, today)) return 'Today';
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, yesterday)) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const changeDay = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + offset);
    setViewDate(newDate);
  };

  // Filter entries for the currently viewed date
  const dayEntries = entries.filter(e => isSameDay(new Date(e.timestamp), viewDate));

  // Calculate totals for the viewed day
  const caloriesConsumed = dayEntries
    .filter(e => e.type === EntryType.FOOD)
    .reduce((acc, curr) => acc + curr.calories, 0);

  const caloriesBurned = dayEntries
    .filter(e => e.type === EntryType.EXERCISE)
    .reduce((acc, curr) => acc + curr.calories, 0);

  const remainingCalories = INITIAL_STATS.dailyBudget + caloriesBurned - caloriesConsumed;
  const progressPercentage = Math.min(100, Math.max(0, (remainingCalories / INITIAL_STATS.dailyBudget) * 100));
  
  // Determine ring color based on status
  let ringColor = "stroke-emerald-500";
  if (remainingCalories < 500) ringColor = "stroke-amber-500";
  if (remainingCalories < 0) ringColor = "stroke-rose-500";

  const handleProcessInput = async () => {
    if (!inputValue.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const userContext = `Male, 44 years old, 81kg. TDEE approx ${INITIAL_STATS.tdee}.`;
      const results = await parseNaturalLanguageInput(inputValue, userContext);

      if (results && results.length > 0) {
        // Create timestamp based on viewDate but current time
        const now = new Date();
        const entryTimestamp = new Date(viewDate);
        entryTimestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        
        const newEntries: CalorieEntry[] = results.map((result, index) => ({
          id: `${entryTimestamp.getTime()}-${index}`,
          timestamp: entryTimestamp.getTime(),
          type: result.entryType,
          item: result.item,
          calories: result.calories,
          quantity: result.quantity,
          originalText: inputValue
        }));
        
        setEntries(prev => [...prev, ...newEntries]);
        setInputValue('');
        resetTranscript();
        
        // Scroll to bottom after adding
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        setError("I couldn't understand that. Try '2 eggs' or '30 mins running'.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProcessInput();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Header / Status Bar */}
      <div className="pt-8 pb-4 px-6 bg-slate-900 z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-xl font-bold text-slate-100">{formatDate(viewDate)}</h1>
              <div className="flex space-x-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                 <button 
                   onClick={() => changeDay(-1)} 
                   className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
                   aria-label="Previous Day"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => changeDay(1)} 
                   className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded transition-colors"
                   aria-label="Next Day"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
              </div>
            </div>
            <p className="text-sm text-slate-400">Deficit Goal: {INITIAL_STATS.targetDeficit} kcal</p>
          </div>
          <div className="text-right">
             <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Net Target</div>
             <div className="text-xl font-mono text-slate-200">{INITIAL_STATS.dailyBudget}</div>
          </div>
        </div>

        {/* Main Visual */}
        <div className="flex flex-col items-center justify-center py-4 relative">
           <div className="relative">
             <ProgressRing 
               radius={120} 
               stroke={12} 
               progress={progressPercentage} 
               color={ringColor}
             />
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter">{Math.round(remainingCalories)}</span>
                <span className="text-slate-400 text-sm font-medium uppercase tracking-wide mt-1">Left</span>
             </div>
           </div>
           
           <div className="flex w-full justify-between mt-8 px-4">
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 mb-1">Eaten</span>
                <span className="text-2xl font-semibold text-rose-400">{caloriesConsumed}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-400 mb-1">Burned</span>
                <span className="text-2xl font-semibold text-emerald-400">{caloriesBurned}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-900/50 px-4 pb-32 overflow-y-auto">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
          Logs for {formatDate(viewDate)}
        </h2>
        
        {dayEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
             </svg>
             <p>No entries for this day.</p>
             {isSameDay(viewDate, new Date()) && (
               <p className="text-xs mt-1">Try saying "I ate an apple"</p>
             )}
          </div>
        ) : (
          dayEntries.map(entry => (
            <LogItem key={entry.id} entry={entry} onDelete={handleDelete} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800">
        {error && (
          <div className="absolute -top-12 left-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-pulse">
            {error}
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          {isSpeechSupported && (
            <button
              onClick={toggleListening}
              className={`p-4 rounded-full transition-all duration-300 flex-shrink-0 ${
                isListening 
                ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-110' 
                : 'bg-slate-800 text-sky-400 hover:bg-slate-700'
              }`}
            >
              {isListening ? (
                 <div className="flex space-x-1 h-6 items-center">
                    <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-5 bg-white animate-bounce" style={{ animationDelay: '100ms' }}></div>
                    <div className="w-1 h-3 bg-white animate-bounce" style={{ animationDelay: '200ms' }}></div>
                 </div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}

          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Describe food or activity..."}
              className="w-full bg-slate-800 text-slate-100 rounded-full py-3 pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-sky-500 border border-slate-700 placeholder-slate-500"
              disabled={isProcessing}
            />
            <button
              onClick={handleProcessInput}
              disabled={!inputValue.trim() || isProcessing}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-sky-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500 transition-colors"
            >
              {isProcessing ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;