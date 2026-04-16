import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Search, FolderOpen, Terminal, Shield } from 'lucide-react';

function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'DASHBOARD', icon: LayoutDashboard },
    { path: '/search', label: 'QUERY_ENGINE', icon: Search },
    { path: '/files', label: 'FILE_SYSTEM', icon: FolderOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0b0f1a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/40 rounded-lg flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Terminal size={20} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0b0f1a] rounded-full"></div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-black tracking-widest text-white leading-none">
                DSA_CORE
              </h1>
              <p className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-tighter">
                Sub-millisecond Indexing
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center bg-slate-900/50 border border-white/5 rounded-xl p-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-lg font-mono text-xs tracking-widest transition-all duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <item.icon size={14} className={isActive ? 'text-indigo-400' : ''} />
                  <span className="hidden sm:inline">{item.label}</span>
                  
                  {/* Active Indicator Line */}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-glow"
                      className="absolute inset-0 bg-indigo-500/5 border border-indigo-500/20 rounded-lg -z-10"
                    />
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-line"
                      className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-indigo-400 shadow-[0_0_8px_#818cf8]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* System Info Right */}
          <div className="hidden lg:flex items-center gap-6">
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex flex-col items-end font-mono">
              <span className="text-[10px] text-slate-500 uppercase">Latency_Optimized</span>
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-emerald-500" />
                <span className="text-xs text-slate-300">SECURE_NODE</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Header;