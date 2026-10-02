"use client";
import { ReactNode, useEffect, useState } from "react";import Link from "next/link";import { useRouter } from "next/navigation";
import { Copy, Pencil, RefreshCw, Check, Plus, Type, FileText, ListOrdered, Star, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";import { Result } from "@/lib/types";
type Sec="title"|"description"|"chapters"|"highlights";
function Section({id,icon:I,label,editing,busy,onCopy,onEdit,onRegen,extra,children}:{id:Sec;icon:any;label:string;editing:boolean;busy:boolean;onCopy:()=>void;onEdit:()=>void;onRegen:()=>void;extra?:string;children:ReactNode}){
  return <section className="card animate-up p-4 sm:p-6"><div className="flex flex-wrap items-center gap-2">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><I className="h-4 w-4"/></span><h2 className="font-semibold">{label}</h2>
    {extra&&<span className="text-xs text-slate-500">{extra}</span>}
    <div className="ml-auto flex gap-1.5">
      <button className="btn-g !px-2.5 !py-1.5" onClick={onCopy} aria-label={`Copy ${id}`}><Copy className="h-4 w-4"/></button>
      <button className={`btn-g !px-2.5 !py-1.5 ${editing?"!border-indigo-300 !bg-indigo-50 !text-indigo-700":""}`} onClick={onEdit} aria-label={`Edit ${id}`}>{editing?<Check className="h-4 w-4"/>:<Pencil className="h-4 w-4"/>}</button>
      <button className="btn-g !px-2.5 !py-1.5" onClick={onRegen} disabled={busy} aria-label={`Regenerate ${id}`}>{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}</button></div></div>
    <div className={`mt-4 space-y-3 transition ${busy?"opacity-40":""}`}>{children}</div></section>}
const Tag=({t}:{t:string})=><span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700">{t}</span>;
export default function Results(){
  const [r,setR]=useState<Result|null>(null);const [ed,setEd]=useState<Record<string,boolean>>({});const [busy,setBusy]=useState<Sec|null>(null);
  const toast=useToast();const router=useRouter();
  useEffect(()=>{try{const s=sessionStorage.getItem("podcraft:result");if(s)setR(JSON.parse(s));else router.replace("/create")}catch{router.replace("/create")}},[router]);
  if(!r)return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-indigo-600"/></div>;
  const save=(n:Result)=>{setR(n);sessionStorage.setItem("podcraft:result",JSON.stringify(n))};
  const copy=async(t:string,m="Copied to clipboard.")=>{try{await navigator.clipboard.writeText(t);toast(m)}catch{toast("Couldn't access the clipboard. Select the text and copy manually.","err")}};
  const txt={
    title:()=>`${r.title}\n\nAlternatives:\n${r.alternativeTitles.map(t=>`- ${t}`).join("\n")}`,
    description:()=>r.description,
    chapters:()=>r.chapters.map(c=>`${c.timestamp} ${c.title}\n${c.summary}`).join("\n\n"),
    highlights:()=>r.highlights.map(h=>`${h.timestamp} ${h.title} [${h.type}]\n"${h.text}"\nWhy: ${h.reason}`).join("\n\n")};
  const all=()=>`TITLE\n${txt.title()}\n\nDESCRIPTION\n${txt.description()}\n\nCHAPTERS\n${txt.chapters()}\n\nHIGHLIGHTS\n${txt.highlights()}`;
  const regen=async(s:Sec)=>{const t=sessionStorage.getItem("podcraft:transcript");if(!t)return toast("Original transcript not found. Start a new episode.","err");
    setBusy(s);try{const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transcript:t,section:s})});
      const d=await res.json().catch(()=>null);if(!res.ok||!d||d.error)throw new Error(d?.error||"Regeneration failed.");
      if(d.demo){toast("Demo Mode: regenerated content is the same sample.","info");}
      else{const n={...r};if(s==="title"){n.title=d.title;n.alternativeTitles=d.alternativeTitles}else if(s==="description")n.description=d.description;else if(s==="chapters")n.chapters=d.chapters;else n.highlights=d.highlights;save(n);toast("Section regenerated.")}
    }catch(e){toast(e instanceof Error&&e.message!=="Failed to fetch"?e.message:"Network error. Please try again.","err")}finally{setBusy(null)}};
  const p=(s:Sec)=>({id:s,editing:!!ed[s],busy:busy===s,onCopy:()=>copy(txt[s](),`${s[0].toUpperCase()+s.slice(1)} copied.`),onEdit:()=>setEd({...ed,[s]:!ed[s]}),onRegen:()=>regen(s)});
  const name=typeof window!=="undefined"?sessionStorage.getItem("podcraft:name"):"";
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="flex flex-wrap items-center gap-3"><div><h1 className="text-2xl font-bold tracking-tight">Content Studio</h1>{name&&<p className="text-sm text-slate-500">{name}</p>}</div>
      {r.demo&&<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Demo Mode</span>}
      <div className="ml-auto flex gap-2"><button className="btn-p" onClick={()=>copy(all(),"Everything copied.")}><ClipboardList className="h-4 w-4"/>Copy All</button>
        <Link href="/create" className="btn-g" onClick={()=>sessionStorage.clear()}><Plus className="h-4 w-4"/>New Episode</Link></div></div>

    <Section {...p("title")} icon={Type} label="Title">
      {ed.title?<input className="inp text-lg font-semibold" value={r.title} onChange={e=>save({...r,title:e.target.value})}/>:<h3 className="text-xl font-bold">{r.title}</h3>}
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Alternatives</p>
      {r.alternativeTitles.map((t,i)=>ed.title?<input key={i} className="inp" value={t} onChange={e=>save({...r,alternativeTitles:r.alternativeTitles.map((x,j)=>j===i?e.target.value:x)})}/>:
        <button key={i} onClick={()=>copy(t,"Title copied.")} className="block w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition hover:border-indigo-200 hover:bg-indigo-50">{t}</button>)}
    </Section>

    <Section {...p("description")} icon={FileText} label="Description" extra={`${r.description.length} characters`}>
      {ed.description?<textarea className="inp h-48" value={r.description} onChange={e=>save({...r,description:e.target.value})}/>:<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.description}</p>}
    </Section>

    <Section {...p("chapters")} icon={ListOrdered} label="Chapters" extra={`${r.chapters.length} chapters`}>
      {r.chapters.map((c,i)=><div key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3">
        {ed.chapters?<div className="w-full space-y-2">
          <div className="flex gap-2"><input className="inp !w-32 font-mono" value={c.timestamp} onChange={e=>save({...r,chapters:r.chapters.map((x,j)=>j===i?{...x,timestamp:e.target.value}:x)})}/><input className="inp font-semibold" value={c.title} onChange={e=>save({...r,chapters:r.chapters.map((x,j)=>j===i?{...x,title:e.target.value}:x)})}/></div>
          <textarea className="inp h-16" value={c.summary} onChange={e=>save({...r,chapters:r.chapters.map((x,j)=>j===i?{...x,summary:e.target.value}:x)})}/></div>
        :<><Tag t={c.timestamp}/><div><h4 className="text-sm font-semibold">{c.title}</h4><p className="text-sm text-slate-600">{c.summary}</p></div></>}</div>)}
    </Section>

    <Section {...p("highlights")} icon={Star} label="Highlights" extra={`${r.highlights.length} highlights`}>
      {r.highlights.map((h,i)=>{const up=(k:keyof typeof h,v:string)=>save({...r,highlights:r.highlights.map((x,j)=>j===i?{...x,[k]:v}:x)});
        return <div key={i} className="rounded-xl border border-slate-100 p-3">
        {ed.highlights?<div className="space-y-2">
          <div className="flex gap-2"><input className="inp !w-32 font-mono" value={h.timestamp} onChange={e=>up("timestamp",e.target.value)}/><input className="inp font-semibold" value={h.title} onChange={e=>up("title",e.target.value)}/></div>
          <textarea className="inp h-16" value={h.text} onChange={e=>up("text",e.target.value)}/><input className="inp" value={h.reason} onChange={e=>up("reason",e.target.value)} placeholder="Reason"/><input className="inp" value={h.type} onChange={e=>up("type",e.target.value)} placeholder="Type"/></div>
        :<><div className="flex flex-wrap items-center gap-2"><Tag t={h.timestamp}/><h4 className="text-sm font-semibold">{h.title}</h4><span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{h.type}</span></div>
          <blockquote className="mt-2 border-l-2 border-indigo-300 pl-3 text-sm italic text-slate-700">“{h.text}”</blockquote><p className="mt-2 text-xs text-slate-500">Why it matters: {h.reason}</p></>}</div>})}
    </Section></div>}
