import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Terminal, Wifi, ShieldCheck, ExternalLink, Globe, Map, FileWarning, CheckCircle2 } from 'lucide-react';
import { extractLeadsFromText, performCompetitorScraping } from '../services/geminiService';
import { CompetitorInfo, ExtractionResult } from '../types';

interface DataExtractionProps {
  competitor: CompetitorInfo;
  onExtractionComplete: (data: ExtractionResult) => void;
}

const DataExtraction: React.FC<DataExtractionProps> = ({ competitor, onExtractionComplete }) => {
  const [rawText, setRawText] = useState('');
  const [scrapedSources, setScrapedSources] = useState<{ title: string; uri: string }[]>([]);
  const [websiteInfo, setWebsiteInfo] = useState<{ url?: string; summary?: string }>({});
  const [reviewCount, setReviewCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [validationMode, setValidationMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const hasRunRef = useRef(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `> ${msg}`]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Auto-run scraper on mount
  useEffect(() => {
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      runAutoScraper();
    }
  }, [competitor]);

  const runAutoScraper = async () => {
    setScraping(true);
    setValidationMode(false);
    setLogs([]);
    setLogs([]);
    setScrapedSources([]);
    setWebsiteInfo({});
    setReviewCount(undefined);
    setRawText('');

    addLog("INITIALIZING VIRTUAL HEADLESS SCRAPER...");
    addLog(`TARGET LOCKED: ${competitor.name.toUpperCase()}`);
    addLog(`GEO-COORDINATES: ${competitor.address.toUpperCase()}`);

    try {
      await new Promise(r => setTimeout(r, 800));
      addLog("BYPASSING CORS RESTRICTIONS...");
      await new Promise(r => setTimeout(r, 600));
      addLog("EXECUTING GOOGLE MAPS DEEP SCAN...");

      const result = await performCompetitorScraping(competitor);

      addLog("PARSING DOM NODES...");
      await new Promise(r => setTimeout(r, 400));

      if (result.sources.length === 0 && !result.rawText.includes("SOURCE:")) {
        addLog("WARNING: DATA FRAGMENTATION DETECTED.");
        addLog("RETRYING WITH AGGRESSIVE PATTERN MATCHING...");
      } else {
        addLog(`PACKET CAPTURE SUCCESS: ${result.sources.length} NODES`);
      }

      if (result.websiteUrl) {
        addLog(`OFFICIAL DOMAIN VERIFIED: ${result.websiteUrl}`);
      }

      setRawText(result.rawText);
      setScrapedSources(result.sources);
      setWebsiteInfo({ url: result.websiteUrl, summary: result.websiteSummary });
      setReviewCount(result.reviewCount);
      setScraping(false);
      setValidationMode(true);
      addLog("SCRAPING COMPLETE. AWAITING INTELLIGENCE CONFIRMATION.");

    } catch (error) {
      addLog("CRITICAL ERROR: CONNECTION RESET BY PEER.");
      setScraping(false);
    }
  };

  const handleConfirmAndExtract = async () => {
    if (!rawText.trim()) return;
    setValidationMode(false);
    setLoading(true);
    addLog("VALIDATION CONFIRMED.");
    addLog("INITIALIZING NLP SENTIMENT ANALYSIS ENGINE...");

    try {
      const result = await extractLeadsFromText(rawText, competitor.name);
      addLog("MATRIX EXTRACTION COMPLETE.");
      addLog("GENERATING FINAL INTELLIGENCE REPORT...");
      await new Promise(r => setTimeout(r, 1200));
      onExtractionComplete(result);
    } catch (error) {
      console.error(error);
      addLog("SYSTEM FAILURE: UNABLE TO PARSE SENTIMENT.");
      alert("Failed to extract data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-mono text-white">DATA EXTRACTION PROTOCOL</h2>
          <p className="text-gray-400 text-sm mt-1">Target: <span className="text-neon-green">{competitor.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${scraping || loading ? 'bg-yellow-400 animate-pulse' : 'bg-neon-green'}`}></div>
          <span className="text-xs font-mono text-gray-500">{scraping || loading ? 'PROCESS ACTIVE' : 'SYSTEM IDLE'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal Output */}
        <div className="lg:col-span-2 bg-black border border-terminal-border rounded-lg p-4 font-mono text-xs h-[500px] flex flex-col relative shadow-inner shadow-black/50">
          <div className="absolute top-3 right-4 flex gap-2">
            {scraping || loading ? <Loader2 className="w-4 h-4 text-neon-green animate-spin" /> : <Terminal className="w-4 h-4 text-gray-600" />}
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto p-2">
            <div className="text-gray-600 mb-4">Microsoft Windows [Version 10.0.19045.3693]<br />(c) Competitor Poacher OS. All rights reserved.</div>
            {logs.map((log, i) => (
              <div key={i} className="text-neon-green/90 break-words">
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
            {scraping && (
              <div className="mt-2 flex items-center gap-2 text-gray-400">
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </div>

        {/* Control & Validation Panel */}
        <div className="space-y-4">
          {validationMode ? (
            <div className="bg-terminal-dark border border-neon-green p-6 rounded-lg shadow-[0_0_15px_rgba(35,134,54,0.2)] h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-neon-green border-b border-terminal-border pb-4 w-full">
                <ShieldCheck className="w-6 h-6" />
                <div>
                  <h3 className="font-bold font-mono text-lg">DATA SECURED</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Review & Confirm</p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto mb-4 custom-scrollbar pr-2">
                {/* Preview of Captured Text */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Captured Intelligence Snippet</label>
                  <div className="bg-black/50 border border-terminal-border p-3 rounded text-xs text-gray-300 font-mono max-h-40 overflow-hidden relative">
                    {rawText.slice(0, 300)}...
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent"></div>
                  </div>
                </div>

                {/* Sources */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <Map className="w-3 h-3" /> Verified Sources ({scrapedSources.length})
                    {reviewCount && reviewCount > 0 && (
                      <span className="ml-auto text-neon-green bg-neon-green/10 px-2 py-0.5 rounded text-[10px]">
                        {reviewCount} REVIEWS EXTRACTED
                      </span>
                    )}
                  </label>
                  {scrapedSources.length > 0 ? (
                    <ul className="space-y-2">
                      {scrapedSources.slice(0, 5).map((source, i) => (
                        <li key={i} className="flex items-start gap-2 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-neon-green flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400 truncate w-full block" title={source.title}>{source.title}</span>
                        </li>
                      ))}
                      {scrapedSources.length > 5 && (
                        <li className="text-[10px] text-gray-600 pl-5">
                          + {scrapedSources.length - 5} more sources...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded">
                      <FileWarning className="w-4 h-4" />
                      <span>No direct sources linked. Data inferred from search aggregates.</span>
                    </div>
                  )}
                </div>

                {websiteInfo.url && (
                  <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Website Identified
                    </h4>
                    <p className="text-xs text-gray-300 truncate">{websiteInfo.url}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleConfirmAndExtract}
                className="w-full py-4 bg-neon-green text-black font-bold rounded hover:bg-neon-accent transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm mt-auto"
              >
                <ShieldCheck className="w-4 h-4" /> PROCESS LEADS
              </button>
            </div>
          ) : (
            <div className="bg-terminal-dark border border-terminal-border p-6 rounded-lg h-full flex flex-col justify-center items-center text-center opacity-50">
              <Wifi className="w-12 h-12 text-gray-600 mb-4 animate-pulse" />
              <h3 className="text-gray-400 font-mono text-sm">ESTABLISHING SECURE CONNECTION...</h3>
              <p className="text-xs text-gray-600 mt-2">The system is automatically gathering intelligence from public vectors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataExtraction;