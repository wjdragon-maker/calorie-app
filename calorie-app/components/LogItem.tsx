import React from 'react';
import { CalorieEntry, EntryType } from '../types';

interface LogItemProps {
  entry: CalorieEntry;
  onDelete: (id: string) => void;
}

export const LogItem: React.FC<LogItemProps> = ({ entry, onDelete }) => {
  const isFood = entry.type === EntryType.FOOD;

  return (
    <div className="group flex items-center justify-between p-4 mb-3 bg-slate-800 rounded-xl border border-slate-700 shadow-sm hover:border-slate-600 transition-all">
      <div className="flex items-center space-x-4">
        <div className={`p-2 rounded-full ${isFood ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {isFood ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="font-medium text-slate-200">{entry.item}</h3>
          <p className="text-sm text-slate-400 capitalize">{entry.quantity}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className={`font-bold ${isFood ? 'text-rose-400' : 'text-emerald-400'}`}>
          {isFood ? '-' : '+'}{entry.calories}
        </span>
        <button 
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-opacity"
          aria-label="Delete entry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};