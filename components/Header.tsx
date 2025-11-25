import React from 'react';
import { ShieldAlert, Terminal } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-terminal-border bg-terminal-dark p-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-neon-green/20 p-2 rounded-md">
          <Terminal className="w-6 h-6 text-neon-green" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">COMPETITOR POACHER <span className="text-neon-green">OS</span></h1>
          <p className="text-xs text-gray-500 font-mono">v2.0.1 // INTELLIGENCE_MODE</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-900/50 rounded-full">
        <ShieldAlert className="w-4 h-4 text-alert-red" />
        <span className="text-xs font-bold text-alert-red uppercase tracking-wider">Restricted Access</span>
      </div>
    </header>
  );
};

export default Header;