import React, { useState } from 'react';
import Header from './components/Header';
import TargetRecon from './components/TargetRecon';
import DataExtraction from './components/DataExtraction';
import TheRaid from './components/TheRaid';
import { CompetitorInfo, ExtractionResult, PageState } from './types';
import { Map, Database, Crosshair } from 'lucide-react';

const App: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>(PageState.RECON);
  const [competitor, setCompetitor] = useState<CompetitorInfo | null>(null);
  const [extractionData, setExtractionData] = useState<ExtractionResult | null>(null);

  const handleTargetConfirmed = (info: CompetitorInfo) => {
    setCompetitor(info);
    setPageState(PageState.EXTRACTION);
  };

  const handleExtractionComplete = (data: ExtractionResult) => {
    setExtractionData(data);
    setPageState(PageState.THE_RAID);
  };

  return (
    <div className="min-h-screen bg-terminal-black flex flex-col font-sans">
      <Header />
      
      {/* Progress Stepper */}
      <div className="w-full border-b border-terminal-border bg-black/50 backdrop-blur-sm sticky top-[73px] z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center py-4 px-4">
          <div className={`flex items-center gap-2 ${pageState === PageState.RECON ? 'text-neon-green' : 'text-gray-600'}`}>
             <div className="p-1.5 rounded bg-current/10"><Map className="w-4 h-4" /></div>
             <span className="text-sm font-bold tracking-wide hidden sm:inline">RECON</span>
          </div>
          <div className="h-px bg-terminal-border flex-1 mx-4"></div>
          
          <div className={`flex items-center gap-2 ${pageState === PageState.EXTRACTION ? 'text-neon-green' : 'text-gray-600'}`}>
             <div className="p-1.5 rounded bg-current/10"><Database className="w-4 h-4" /></div>
             <span className="text-sm font-bold tracking-wide hidden sm:inline">EXTRACTION</span>
          </div>
          <div className="h-px bg-terminal-border flex-1 mx-4"></div>

          <div className={`flex items-center gap-2 ${pageState === PageState.THE_RAID ? 'text-neon-green' : 'text-gray-600'}`}>
             <div className="p-1.5 rounded bg-current/10"><Crosshair className="w-4 h-4" /></div>
             <span className="text-sm font-bold tracking-wide hidden sm:inline">THE RAID</span>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        {pageState === PageState.RECON && (
          <TargetRecon onTargetConfirmed={handleTargetConfirmed} />
        )}

        {pageState === PageState.EXTRACTION && competitor && (
          <DataExtraction 
            competitor={competitor} 
            onExtractionComplete={handleExtractionComplete} 
          />
        )}

        {pageState === PageState.THE_RAID && extractionData && competitor && (
          <TheRaid 
            data={extractionData} 
            competitorName={competitor.name} 
          />
        )}
      </main>
    </div>
  );
};

export default App;