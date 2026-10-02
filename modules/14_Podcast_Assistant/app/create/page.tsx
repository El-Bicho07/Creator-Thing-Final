"use client";
import { useEffect, useRef, useState } from "react";import { useRouter } from "next/navigation";import { Upload, Sparkles, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/Toast";import { DEMO_NAME, DEMO_TRANSCRIPT } from "@/lib/demo";import { MIN_CHARS } from "@/lib/types";
const STEPS=["Analyzing transcript…","Finding topics…","Creating chapters…","Finding highlights…"];
export default function Create(){
  const [name,setName]=useState("");const [text,setText]=useState("");const [busy,setBusy]=useState(false);const [step,setStep]=useState(0);
  const toast=useToast();const router=useRouter();const file=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(!busy)return;setStep(0);const i=setInterval(()=>setStep(s=>Math.min(s+1,3)),2500);return()=>clearInterval(i)},[busy]);
  const upload=async(f?:File)=>{if(!f)return;if(!f.name.toLowerCase().endsWith(".txt"))return toast("Please upload a .txt file.","err");
    if(f.size>2_000_000)return toast("File is too large (max 2 MB).","err");setText(await f.text());if(!name)setName(f.name.replace(/\.txt$/i,""));toast("Transcript loaded.")};
  const go=async()=>{const t=text.trim();
    if(!t)return toast("Paste a transcript first, or try the demo.","err");
    if(t.length<MIN_CHARS)return toast(`Transcript is too short (${t.length}/${MIN_CHARS} characters minimum).`,"err");
    setBusy(true);
    try{const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:t})});
      const d=await r.json().catch(()=>null);
      if(!r.ok||!d||d.error)throw new Error(d?.error||"Something went wrong. Please try again.");
      sessionStorage.setItem("podcraft:result",JSON.stringify(d));sessionStorage.setItem("podcraft:transcript",t);sessionStorage.setItem("podcraft:name",name);
      if(d.demo)toast(d.notice||"Showing demo results.","info");router.push("/results");
    }catch(e){toast(e instanceof Error&&e.message!=="Failed to fetch"?e.message:"Network error. Check your connection and try again.","err");setBusy(false)}};
  return <div className="mx-auto max-w-3xl animate-up">
    <h1 className="text-3xl font-bold tracking-tight">Create episode</h1><p className="mt-1 text-slate-600">Paste your transcript. Timestamps like [12:30] are used when present.</p>
    <div className="card mt-6 space-y-4 p-4 sm:p-6">
      <div><label className="text-sm font-medium">Episode name <span className="text-slate-400">(optional)</span></label><input className="inp mt-1" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Episode 42"/></div>
      <div><div className="flex items-center justify-between"><label className="text-sm font-medium">Transcript</label>
        <span className={`text-xs ${text.trim().length&&text.trim().length<MIN_CHARS?"text-rose-500":"text-slate-500"}`}>{text.length.toLocaleString()} characters</span></div>
        <textarea className="inp mt-1 h-72 resize-y font-mono text-[13px] leading-relaxed" value={text} onChange={e=>setText(e.target.value)} placeholder="[00:00] HOST: Welcome to the show…"/></div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-g" onClick={()=>{setText(DEMO_TRANSCRIPT);setName(DEMO_NAME)}} disabled={busy}><FileText className="h-4 w-4"/>Use Demo Transcript</button>
        <button className="btn-g" onClick={()=>file.current?.click()} disabled={busy}><Upload className="h-4 w-4"/>Upload .txt</button>
        <input ref={file} type="file" accept=".txt,text/plain" hidden onChange={e=>{upload(e.target.files?.[0]);e.target.value=""}}/>
        <button className="btn-p sm:ml-auto w-full sm:w-auto" onClick={go} disabled={busy}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:null}Generate Content ✨</button></div>
    </div>
    {busy&&<div className="fixed inset-0 z-50 grid place-items-center bg-white/80 backdrop-blur-sm"><div className="card w-80 p-6 animate-up"><Sparkles className="mx-auto h-8 w-8 animate-pulse text-indigo-600"/>
      <ul className="mt-4 space-y-2 text-sm">{STEPS.map((s,i)=><li key={s} className={`flex items-center gap-2 transition ${i<=step?"text-slate-900":"text-slate-300"}`}>
        {i<step?<span className="text-emerald-500">✓</span>:i===step?<Loader2 className="h-4 w-4 animate-spin text-indigo-600"/>:<span className="w-4"/>}{s}</li>)}</ul></div></div>}
  </div>}
