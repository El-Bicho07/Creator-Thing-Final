"use client";
import {useRef,useState} from "react";
import {toPng} from "html-to-image";
import type {TConcept,TResult} from "@/lib/schema";

const TYPES=["Lifestyle / Vlog","GRWM","Makeup / Beauty","Storytime","Fashion","Food","Fitness","Travel","Educational / Tech","Product / Review","Art / Creative","Other"];
const STYLES=["Let AI decide","Natural","Aesthetic","Editorial","Minimal","Bold","Playful","Cinematic"];
const FONTS=["Inter","DM Sans","Playfair Display","Cormorant Garamond","Space Grotesk","Bebas Neue"];
const EX=[
 ["Lifestyle / Vlog","A day in my life at college: getting ready, going to class, getting coffee and hanging out with friends."],
 ["Makeup / Beauty","Doing a simple everyday makeup routine using five products."],
 ["Storytime","Doing my makeup while telling the story of the most embarrassing thing that happened to me in college."],
 ["Other","Deep cleaning my bedroom after letting it become a complete mess."],
 ["Educational / Tech","Explaining why your phone battery dies so quickly and showing the battery settings."],
 ["Art / Creative","Painting a detailed fantasy eye artwork from a blank canvas."]];
const BGS=["linear-gradient(160deg,#D3C1C3,#EEE5BF)","linear-gradient(160deg,#708D81,#EEE5BF)","linear-gradient(160deg,#8B1E3F,#D3C1C3)"];
const LOAD=["Understanding your Reel...","Finding the visual hook...","Choosing the cover direction...","Building your concepts..."];

type Edit={text:string;font:string;size:number;color:string;pos:"top"|"center"|"bottom";overlay:number};
const initEdit=(c:TConcept):Edit=>({text:c.text,font:"DM Sans",size:64,color:"#FFFFFF",pos:/top/i.test(c.textPlacement)?"top":/cent|middle/i.test(c.textPlacement)?"center":"bottom",overlay:0.15});

function Cover({c,e,img,i,w=270,grid=false,safe=false}:{c:TConcept;e:Edit;img:string|null;i:number;w?:number;grid?:boolean;safe?:boolean}){
 // logical canvas 1080x1920, scaled with CSS transform
 const s=w/1080, h=grid?w:w*16/9;
 return <div style={{width:w,height:h,overflow:"hidden",position:"relative",borderRadius:4}}>
  <div style={{width:1080,height:1920,transform:`scale(${s})`,transformOrigin:"top left",position:"absolute",left:0,top:grid?-(1920-1080)/2*s:0,background:BGS[i%3]}}>
   {img&&<img src={img} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
   <div style={{position:"absolute",inset:0,background:`rgba(8,7,5,${e.overlay})`}}/>
   {!img&&<div style={{position:"absolute",left:140,right:140,top:520,height:880,borderRadius:440,background:"rgba(238,229,191,.35)"}}/>}
   {e.text&&<div style={{position:"absolute",left:80,right:80,textAlign:"center",fontFamily:`'${e.font}',sans-serif`,fontSize:e.size*1.6,lineHeight:1.05,color:e.color,fontWeight:700,textShadow:"0 4px 24px rgba(0,0,0,.35)",...(e.pos==="top"?{top:260}:e.pos==="center"?{top:"50%",transform:"translateY(-50%)"}:{bottom:300})}}>{e.text}</div>}
   {safe&&<div style={{position:"absolute",left:0,right:0,top:420,height:1080,border:"6px dashed #8B1E3F"}}/>}
  </div>
 </div>;
}

function Card({c,img,i,base,onRefine}:{c:TConcept;img:string|null;i:number;base:any;onRefine:(c:TConcept,ins:string)=>Promise<TConcept|null>}){
 const [cur,setCur]=useState(c);
 const [e,setE]=useState(initEdit(c));
 const [view,setView]=useState<"reel"|"grid">("reel");
 const [safe,setSafe]=useState(false);
 const [ref,setRef]=useState(false);
 const [ins,setIns]=useState("");
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState("");
 const exportRef=useRef<HTMLDivElement>(null);
 const flash=(m:string)=>{setMsg(m);setTimeout(()=>setMsg(""),2500)};
 const dl=async()=>{try{const url=await toPng(exportRef.current!,{width:1080,height:1920,pixelRatio:1,skipFonts:false,cacheBust:true});
  const a=document.createElement("a");a.href=url;a.download=`covercraft-${cur.name.replace(/\W+/g,"-").toLowerCase()}.png`;a.click();}catch{flash("Download didn't work. Try again in a moment.")}};
 const copy=async()=>{try{await navigator.clipboard.writeText(`Strategy: ${cur.strategy}\nVisual: ${cur.visualDirection}\nText: ${e.text||"No text"}\nComposition: ${cur.composition}\nStyle: ${cur.aesthetic}`);flash("Copied")}catch{flash("Couldn't copy")}};
 const submit=async()=>{if(!ins.trim())return;setBusy(true);const n=await onRefine(cur,ins);setBusy(false);
  if(n){setCur(n);setE(x=>({...initEdit(n),font:x.font,size:x.size,color:x.color,overlay:x.overlay}));setIns("");setRef(false)}else flash("Refine didn't work. Try again.")};
 const lbl="text-[11px] tracking-widest font-bold text-teal";
 return <div className="bg-white/60 border border-silk rounded-md p-4 flex flex-col gap-3">
  <div><span className="text-[11px] font-bold tracking-widest bg-amaranth text-pearl px-2 py-1">{cur.strategy.replace("_","-")}</span>
   <h3 className="font-serif text-2xl mt-2" style={{fontFamily:"'Playfair Display',serif"}}>{cur.name}</h3></div>
  <div className="flex gap-2 text-sm">{(["reel","grid"] as const).map(v=><button key={v} onClick={()=>setView(v)} className={`px-3 py-1 border ${view===v?"bg-ink text-pearl border-ink":"border-ink/30"}`}>{v==="reel"?"Reel View":"Grid View"}</button>)}
   <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={safe} onChange={x=>setSafe(x.target.checked)}/>Show Safe Zone</label></div>
  <div className="flex justify-center bg-silk/40 p-3">
   {view==="reel"?<Cover c={cur} e={e} img={img} i={i} w={270} safe={safe}/>:
    <div className="w-[270px] grid grid-cols-3 gap-[2px] bg-white">
     <div className="col-span-3 flex items-center gap-3 p-2"><div className="w-10 h-10 rounded-full bg-silk"/><div className="text-[10px]"><b>your.handle</b><br/>Creator</div></div>
     {Array.from({length:9}).map((_,k)=>k===4?<div key={k} className="aspect-square overflow-hidden"><Cover c={cur} e={e} img={img} i={i} w={88} grid safe={safe}/></div>:<div key={k} className="aspect-square" style={{background:["#D3C1C3","#EEE5BF","#708D81"][k%3],opacity:.5+((k*7)%5)/10}}/>)}
    </div>}
  </div>
  <div className="text-sm space-y-2">
   <div><div className={lbl}>VISUAL</div>{cur.visualDirection}</div>
   <div><div className={lbl}>TEXT</div>{e.text||"No text"}</div>
   <div><div className={lbl}>COMPOSITION</div>{cur.composition}</div>
   <div><div className={lbl}>WHY IT WORKS</div>{cur.whyItWorks}</div></div>
  <details className="border-t border-silk pt-2"><summary className="cursor-pointer text-sm font-bold">Edit cover</summary>
   <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
    <label className="col-span-2">TEXT<input value={e.text} onChange={x=>setE({...e,text:x.target.value})} className="w-full border border-silk bg-white px-2 py-1"/></label>
    <label>FONT<select value={e.font} onChange={x=>setE({...e,font:x.target.value})} className="w-full border border-silk bg-white px-1 py-1">{FONTS.map(f=><option key={f}>{f}</option>)}</select></label>
    <label>SIZE<input type="range" min={32} max={140} value={e.size} onChange={x=>setE({...e,size:+x.target.value})} className="w-full"/></label>
    <label>COLOR<input type="color" value={e.color} onChange={x=>setE({...e,color:x.target.value})} className="w-full h-8"/></label>
    <label>POSITION<select value={e.pos} onChange={x=>setE({...e,pos:x.target.value as Edit["pos"]})} className="w-full border border-silk bg-white px-1 py-1"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
    <label className="col-span-2">OVERLAY<input type="range" min={0} max={0.8} step={0.05} value={e.overlay} onChange={x=>setE({...e,overlay:+x.target.value})} className="w-full"/></label>
   </div></details>
  <div className="flex flex-wrap gap-2 text-sm">
   <button onClick={()=>setRef(!ref)} className="border border-ink px-3 py-1">Refine</button>
   <button onClick={()=>base.variations()} className="border border-ink px-3 py-1">Generate variations</button>
   <button onClick={copy} className="border border-ink px-3 py-1">Copy concept</button>
   <button onClick={dl} className="bg-amaranth text-pearl px-3 py-1">Download PNG</button>
   {msg&&<span className="text-teal self-center">{msg}</span>}</div>
  {ref&&<div className="border border-silk p-3 bg-pearl/60"><div className="font-bold mb-1">Refine this concept</div>
   <input value={ins} onChange={x=>setIns(x.target.value)} onKeyDown={x=>x.key==="Enter"&&submit()} placeholder="Tell us what you'd like to change..." className="w-full border border-silk bg-white px-2 py-1 text-sm"/>
   <div className="flex flex-wrap gap-1 my-2">{["Remove the text","Make it more minimal","Move the text to the top","Make this feel more editorial"].map(s=><button key={s} onClick={()=>setIns(s)} className="text-xs border border-teal text-teal px-2 py-0.5">{s}</button>)}</div>
   <button disabled={busy} onClick={submit} className="bg-ink text-pearl px-3 py-1 text-sm">{busy?"Refining...":"Apply"}</button></div>}
  <div style={{position:"fixed",left:-99999,top:0}}><div ref={exportRef}><Cover c={cur} e={e} img={img} i={i} w={1080}/></div></div>
 </div>;
}

export default function Home(){
 const [type,setType]=useState(TYPES[0]);
 const [desc,setDesc]=useState("");
 const [style,setStyle]=useState(STYLES[0]);
 const [img,setImg]=useState<string|null>(null);
 const [err,setErr]=useState("");
 const [loading,setLoading]=useState(false);
 const [step,setStep]=useState(0);
 const [res,setRes]=useState<TResult|null>(null);
 const [demo,setDemo]=useState(false);
 const [gen,setGen]=useState(0);
 const resRef=useRef<HTMLDivElement>(null);
 const post=async(extra:object)=>{const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contentType:type,description:desc,style,creatorImage:img,...extra})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||"Something went wrong.");return j;};
 const run=async(extra:object={})=>{setErr("");if(!desc.trim()){setErr("Tell us what happens in your Reel first.");return}
  setLoading(true);setStep(0);const t=setInterval(()=>setStep(s=>(s+1)%4),1800);
  try{const j=await post(extra);setRes(j);setDemo(!!j.demo);setGen(g=>g+1);setTimeout(()=>resRef.current?.scrollIntoView({behavior:"smooth"}),100)}
  catch(e){setErr((e as Error).message||"Something went wrong. Please try again.")}finally{clearInterval(t);setLoading(false)}};
 const onFile=(f?:File)=>{setErr("");if(!f)return;
  if(!/^image\/(jpeg|png|webp)$/.test(f.type)){setErr("Please use a JPG, PNG or WEBP image.");return}
  if(f.size>5_000_000){setErr("That image is over 5 MB. Try a smaller one.");return}
  const r=new FileReader();r.onload=()=>setImg(r.result as string);r.readAsDataURL(f)};
 const refine=async(c:TConcept,instruction:string)=>{try{const j=await post({mode:"refine",concept:c,instruction});return j.concept as TConcept}catch{return null}};
 const scroll=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
 return <main>
  <header className="flex items-center justify-between px-6 py-4 border-b border-silk sticky top-0 bg-[#F6F0D8]/95 z-10">
   <div className="tracking-[.3em] font-bold" style={{fontFamily:"'Playfair Display',serif"}}>COVERCRAFT</div>
   <nav className="flex gap-6 text-sm"><button onClick={()=>scroll("create")}>Create</button><button onClick={()=>scroll("examples")}>Examples</button></nav></header>
  <section id="create" className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-10">
   <div className="space-y-6">
    <div><h1 className="text-4xl md:text-5xl leading-tight" style={{fontFamily:"'Playfair Display',serif"}}>Covers that fit the Reel, not a formula.</h1>
     <p className="mt-3 text-ink/70">Describe your Reel and get three cover directions, including ones with no text at all.</p></div>
    <div><label className="font-bold text-sm">What are you creating?</label>
     <div className="flex flex-wrap gap-2 mt-2">{TYPES.map(t=><button key={t} onClick={()=>setType(t)} className={`px-3 py-1.5 text-sm border ${type===t?"bg-ink text-pearl border-ink":"border-ink/25 bg-white/50"}`}>{t}</button>)}</div></div>
    <div><label className="font-bold text-sm">What's happening in your Reel?</label>
     <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} placeholder="Tell us what happens in the Reel, what you're showing, and what viewers will see." className="mt-2 w-full border border-silk bg-white/70 p-3"/></div>
    <div><label className="font-bold text-sm">Add a creator photo</label><p className="text-xs text-ink/60">Optional. Give CoverCraft a visual reference for the creator.</p>
     {img?<div className="mt-2 flex items-center gap-3"><img src={img} alt="Creator" className="w-20 h-28 object-cover"/>
      <label className="text-sm underline cursor-pointer">Replace<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>onFile(e.target.files?.[0])}/></label>
      <button className="text-sm underline" onClick={()=>setImg(null)}>Remove</button></div>:
      <label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0])}} className="mt-2 block border-2 border-dashed border-teal p-6 text-center text-sm cursor-pointer bg-white/40">Drag a photo here or click to upload (JPG, PNG, WEBP)<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>onFile(e.target.files?.[0])}/></label>}</div>
    <div><label className="font-bold text-sm">Visual vibe</label>
     <div className="flex flex-wrap gap-2 mt-2">{STYLES.map(s=><button key={s} onClick={()=>setStyle(s)} className={`px-3 py-1.5 text-sm border ${style===s?"bg-teal text-white border-teal":"border-ink/25 bg-white/50"}`}>{s}</button>)}</div></div>
    {err&&<p className="text-amaranth text-sm font-medium">{err}</p>}
    <button onClick={()=>run()} disabled={loading} className="w-full bg-amaranth text-pearl py-4 text-lg font-bold disabled:opacity-60">{loading?LOAD[step]:"Generate Cover Concepts ✦"}</button>
   </div>
   <div className="bg-silk/50 p-6 flex flex-col items-center justify-center text-center min-h-[380px]">
    <div className="w-40 aspect-[9/16] bg-pearl border border-ink/20 flex items-center justify-center text-xs text-ink/50 p-3">{loading?LOAD[step]:"Your cover appears here"}</div>
    <p className="mt-4 text-sm max-w-xs text-ink/70">The question isn't what text to add. It's what viewers should see first.</p></div>
  </section>
  <section id="examples" className="max-w-6xl mx-auto px-6 pb-10"><h2 className="font-bold mb-3">Try an example</h2>
   <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{EX.map(([t,d])=><button key={d} onClick={()=>{setType(t);setDesc(d);scroll("create")}} className="text-left border border-silk bg-white/50 p-3 text-sm"><b className="text-teal text-xs tracking-widest">{t.toUpperCase()}</b><br/>{d}</button>)}</div></section>
  {res&&<section ref={resRef} className="max-w-6xl mx-auto px-6 pb-20">
   <h2 className="text-3xl mb-4" style={{fontFamily:"'Playfair Display',serif"}}>Your cover directions {demo&&<span className="text-xs align-middle border border-teal text-teal px-2 py-0.5 ml-2">Demo mode</span>}</h2>
   <div className="bg-silk/60 p-5 mb-6"><div className="text-[11px] tracking-widest font-bold text-teal">RECOMMENDED DIRECTION</div>
    <div className="text-2xl font-bold text-amaranth">{res.analysis.recommendedStrategy.replace("_","-")}</div>
    <div className="text-[11px] tracking-widest font-bold text-teal mt-3">WHY</div><p>{res.analysis.reason}</p></div>
   <div className="grid lg:grid-cols-3 gap-5">{res.concepts.map((c,i)=><Card key={gen+"-"+i} c={c} i={i} img={img} onRefine={refine} base={{variations:()=>run({mode:"variations",previous:res.concepts})}}/>)}</div></section>}
 </main>;
}
