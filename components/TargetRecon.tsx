import React, { useState } from 'react';
import { Search, MapPin, AlertCircle, Loader2, Globe, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { findBusinessCandidates } from '../services/geminiService';
import { CompetitorInfo } from '../types';

interface TargetReconProps {
  onTargetConfirmed: (info: CompetitorInfo) => void;
}

const TargetRecon: React.FC<TargetReconProps> = ({ onTargetConfirmed }) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CompetitorInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
        setError("Please provide both Business Name and Location.");
        return;
    }
    
    setLoading(true);
    setError(null);
    setCandidates([]);
    setSearched(false);

    try {
      const results = await findBusinessCandidates(name, location);
      setCandidates(results);
      setSearched(true);
      if (results.length === 0) {
          setError("No businesses found. Try broadening your location search.");
      }
    } catch (err) {
      setError("System error: Unable to access Maps Grounding API. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: CompetitorInfo) => {
    // Merge the selected candidate info with the manually provided website (if any)
    onTargetConfirmed({
        ...candidate,
        userProvidedUrl: website.trim() // Pass the user input URL if present
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold font-mono text-white">TARGET IDENTIFICATION</h2>
        <p className="text-gray-400">
            Enter business details to analyze yourself or a competitor. 
            <br/>
            <span className="text-xs text-gray-500">We use Google Maps Grounding to verify the entity.</span>
        </p>
      </div>

      <div className="bg-terminal-dark border border-terminal-border rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500">BUSINESS NAME *</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bob's Kitchens"
                            className="w-full bg-black border border-terminal-border rounded py-3 pl-10 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green font-mono text-sm transition-all"
                        />
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-500">LOCATION / ADDRESS *</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Seattle, WA"
                            className="w-full bg-black border border-terminal-border rounded py-3 pl-10 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green font-mono text-sm transition-all"
                        />
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                    </div>
                </div>
            </div>
            
            <div className="space-y-1">
                <label className="text-xs font-mono text-gray-500 flex justify-between">
                    <span>WEBSITE URL (OPTIONAL)</span>
                    <span className="text-[10px] text-neon-green uppercase">Enables Site Scraping</span>
                </label>
                <div className="relative">
                    <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://www.example.com"
                        className="w-full bg-black border border-terminal-border rounded py-3 pl-10 pr-4 text-white placeholder-gray-700 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green font-mono text-sm transition-all"
                    />
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-neon-green hover:bg-neon-accent text-white py-3 rounded font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest mt-4"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find Business
            </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Candidate List */}
      {searched && candidates.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-sm font-mono text-gray-400 uppercase">Select Correct Entity</h3>
                 <span className="text-xs text-gray-600">{candidates.length} matches found</span>
              </div>
              
              <div className="grid gap-3">
                  {candidates.map((candidate, idx) => (
                      <div 
                        key={idx} 
                        className="bg-terminal-dark border border-terminal-border hover:border-neon-green rounded-lg p-4 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                          <div className="absolute inset-0 bg-neon-green/0 group-hover:bg-neon-green/5 transition-colors"></div>
                          <div className="flex items-start justify-between relative z-10">
                              <div className="space-y-1">
                                  <h4 className="text-white font-bold text-lg">{candidate.name}</h4>
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                      <MapPin className="w-3 h-3" />
                                      {candidate.address}
                                  </div>
                                  {candidate.rating && candidate.rating > 0 && (
                                      <div className="flex items-center gap-1 text-xs font-mono text-yellow-500 mt-2">
                                          {'★'.repeat(Math.round(candidate.rating))}
                                          <span className="text-gray-500">({candidate.rating})</span>
                                      </div>
                                  )}
                              </div>
                              <div className="h-full flex items-center">
                                  <div className="bg-black border border-terminal-border group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green text-gray-500 p-2 rounded-full transition-all">
                                      <ArrowRight className="w-5 h-5" />
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default TargetRecon;