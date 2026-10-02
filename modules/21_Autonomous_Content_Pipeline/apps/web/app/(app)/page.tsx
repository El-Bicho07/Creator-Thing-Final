'use client';
import React, { useState } from 'react';
import { IdeaBox } from '@contentyou/ui';

export default function AppHome() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
      } else {
        alert("Error: " + data.error);
      }
    } catch (e) {
      alert("Error generating plan: " + e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#06141B] text-[#CCD0CF] flex flex-col items-center justify-center relative overflow-hidden font-sans pb-24">
      {/* Background gradients and noise */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] bg-[#FF69B4] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
        <div className="absolute bottom-[0%] right-[-10%] w-[50%] h-[50%] bg-[#243A66] rounded-full blur-[150px] opacity-20"></div>
      </div>
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-4xl w-full px-6 space-y-12 pt-12">
        
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-[#9BA8AB] drop-shadow-lg">
            ContentYou
          </h1>
          <p className="text-xl md:text-2xl text-[#9BA8AB] max-w-2xl mx-auto font-light leading-relaxed">
            What are we creating today? Drop your core idea and let the autonomous agents handle the research, planning, and publishing.
          </p>
        </div>

        {/* Input Box - Glassmorphism */}
        <div className="w-full relative group max-w-3xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF69B4] via-[#C24366] to-[#243A66] rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-300"></div>
          <div className="relative bg-[#11212D]/60 backdrop-blur-2xl border border-[#4A5C6A]/50 p-6 rounded-2xl shadow-2xl flex flex-col gap-6">
            <IdeaBox 
              placeholder="e.g. A breakdown of the latest AI agent frameworks for a YouTube Short and Twitter thread..." 
              className="bg-transparent border-none text-white placeholder:text-[#4A5C6A] text-xl focus-visible:ring-0 focus-visible:outline-none min-h-[160px] p-0"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <div className="flex justify-between items-center pt-4 border-t border-[#4A5C6A]/30">
              <span className="text-sm text-[#9BA8AB] flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-ping'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                </span>
                {loading ? 'Agent network researching...' : 'Agent network idle'}
              </span>
              <button 
                onClick={handleGenerate}
                disabled={loading || !idea}
                className="bg-gradient-to-r from-[#FF69B4] to-[#C24366] text-white px-8 py-3 rounded-xl font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,105,180,0.3)] hover:shadow-[0_0_30px_rgba(255,105,180,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* Plan Display Area */}
        {plan && (
          <div className="w-full max-w-3xl bg-[#11212D]/80 backdrop-blur-md border border-[#4A5C6A]/30 p-8 rounded-2xl shadow-xl mt-8">
            <h2 className="text-3xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Generated Content Plan</h2>
            <div className="space-y-8">
              {plan.sections?.map((section: any, idx: number) => (
                <div key={idx} className="space-y-4">
                  <h3 className="text-xl font-semibold text-[#FF69B4] border-b border-[#4A5C6A]/30 pb-2">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.claims?.map((claim: any, cidx: number) => (
                      <li key={cidx} className="flex gap-4 text-gray-300">
                        <span className="text-[#C24366] shrink-0 mt-1">✦</span>
                        <div>
                          <p>{claim.text}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Sources: {claim.citationIds?.map((id: string) => (
                              <span key={id} className="inline-block bg-[#253745] px-2 py-1 rounded mx-1">{id}</span>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
