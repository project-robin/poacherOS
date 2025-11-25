import React, { useState } from 'react';
import { ExtractionResult, PitchStrategy, Lead } from '../types';
import { generateRaidPitch } from '../services/geminiService';
import { UserMinus, TrendingUp, Mail, MessageSquare, Briefcase, Download, Loader2, CheckCircle2 } from 'lucide-react';

interface TheRaidProps {
  data: ExtractionResult;
  competitorName: string;
}

const TheRaid: React.FC<TheRaidProps> = ({ data, competitorName }) => {
  const [pitch, setPitch] = useState<PitchStrategy | null>(null);
  const [loadingPitch, setLoadingPitch] = useState(false);

  const handleGeneratePitch = async () => {
    setLoadingPitch(true);
    try {
      const strategy = await generateRaidPitch(competitorName, data.leads);
      setPitch(strategy);
    } catch (e) {
      alert("Failed to generate strategy.");
    } finally {
      setLoadingPitch(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Customer Name', 'Complaint', 'Category', 'Sentiment (1-10)', 'Pitch Angle'];
    const rows = data.leads.map(l => 
      `"${l.customerName}","${l.complaint.replace(/"/g, '""')}","${l.painPointCategory}","${l.sentimentScore}","${l.suggestedPitchAngle.replace(/"/g, '""')}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `poached_leads_${competitorName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-terminal-dark border border-terminal-border p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-900/20 rounded text-red-400"><UserMinus className="w-5 h-5" /></div>
            <h3 className="text-sm font-mono text-gray-400">UNHAPPY CUSTOMERS</h3>
          </div>
          <p className="text-3xl font-bold text-white">{data.leads.length}</p>
        </div>
        <div className="bg-terminal-dark border border-terminal-border p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-900/20 rounded text-orange-400"><TrendingUp className="w-5 h-5" /></div>
            <h3 className="text-sm font-mono text-gray-400">AVG ANGER SCORE</h3>
          </div>
          <p className="text-3xl font-bold text-white">
            {(data.leads.reduce((acc, curr) => acc + curr.sentimentScore, 0) / data.leads.length).toFixed(1)}
            <span className="text-sm text-gray-600 font-normal ml-2">/ 10</span>
          </p>
        </div>
        <div className="bg-terminal-dark border border-terminal-border p-4 rounded-lg flex flex-col justify-center">
           <button 
             onClick={downloadCSV}
             className="w-full h-full border border-neon-green text-neon-green hover:bg-neon-green hover:text-white transition-colors font-mono text-sm font-bold rounded flex items-center justify-center gap-2"
           >
             <Download className="w-4 h-4" /> EXPORT .CSV
           </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-terminal-dark border border-terminal-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-terminal-border bg-black/20">
          <h3 className="font-bold text-white">EXTRACTED LEAD DATA</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 text-gray-400 font-mono text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Complaint Summary</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Heat</th>
                <th className="px-4 py-3">Attack Angle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {data.leads.map((lead, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{lead.customerName}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={lead.complaint}>{lead.complaint}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-300">
                      {lead.painPointCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-mono font-bold ${lead.sentimentScore >= 8 ? 'text-red-500' : 'text-orange-400'}`}>
                      {lead.sentimentScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neon-green font-mono text-xs">{lead.suggestedPitchAngle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Pitch Section */}
      {!pitch ? (
        <div className="flex justify-center pt-8">
          <button
            onClick={handleGeneratePitch}
            disabled={loadingPitch}
            className="group relative px-8 py-4 bg-white text-black font-bold text-lg rounded overflow-hidden"
          >
             <div className="absolute inset-0 w-0 bg-neon-green transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
             <div className="relative flex items-center gap-2">
                {loadingPitch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Briefcase className="w-5 h-5" />}
                GENERATE "THE RAID" PITCH
             </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Email Strategy */}
          <div className="space-y-6">
             <div className="bg-terminal-dark border border-terminal-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 text-white">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold">Email Strategy</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-mono">Subject Line</span>
                    <div className="p-3 bg-black rounded border border-terminal-border text-white font-medium mt-1 select-all">
                      {pitch.subjectLine}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-mono">Body</span>
                    <div className="p-4 bg-black rounded border border-terminal-border text-gray-300 text-sm whitespace-pre-wrap mt-1 font-mono select-all">
                      {pitch.emailBody}
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* In Person Strategy */}
          <div className="space-y-6">
            <div className="bg-terminal-dark border border-terminal-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 text-white">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold">In-Person Script</h3>
                </div>
                 <div className="p-4 bg-black rounded border border-terminal-border text-gray-300 text-sm whitespace-pre-wrap font-mono select-all leading-relaxed">
                    {pitch.inPersonScript}
                 </div>
             </div>

             <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg p-6">
               <h3 className="font-bold text-neon-green mb-3 text-sm uppercase tracking-wide">Key Selling Points</h3>
               <ul className="space-y-2">
                 {pitch.keySellingPoints.map((point, i) => (
                   <li key={i} className="flex items-start gap-2 text-sm text-white">
                     <CheckCircle2 className="w-4 h-4 text-neon-green flex-shrink-0 mt-0.5" />
                     {point}
                   </li>
                 ))}
               </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TheRaid;