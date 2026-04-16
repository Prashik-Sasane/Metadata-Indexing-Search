import { useState, useEffect } from 'react';
import { searchAPI } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Cpu, Zap, Hash } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length >= 2) {
        try {
          setIsSearching(true);
          const response: any = await searchAPI.getSuggestions(query, 10);
          setSuggestions(response.data || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative z-20">
      <form 
        onSubmit={(e) => { e.preventDefault(); onSearch(query); setShowSuggestions(false); }} 
        className="relative group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity"></div>
        
        <div className="relative flex items-center bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="pl-5 text-slate-500">
            <SearchIcon size={20} />
          </div>
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent px-4 py-5 text-white placeholder-slate-500 outline-none font-mono text-lg"
            placeholder="INITIATE_PREFIX_SCAN..."
          />

          <div className="pr-4 flex items-center gap-3">
            {isSearching && (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-mono text-sm tracking-widest transition-all active:scale-95"
            >
              EXECUTE
            </button>
          </div>
        </div>
      </form>

      {/* Suggestions HUD */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute w-full mt-2 bg-[#0f172a]/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="p-2 border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest px-4">
              Trie_Match_Results
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuery(s); onSearch(s); setShowSuggestions(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-400 font-mono text-sm border-b border-slate-800/50 last:border-0 transition-colors"
              >
                <Hash size={14} className="text-slate-600" />
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchBar;