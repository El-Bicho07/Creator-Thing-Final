import {NextRequest,NextResponse} from "next/server";
import {GoogleGenAI} from "@google/genai";
import {Result,Refined} from "@/lib/schema";
import {fallback} from "@/lib/fallback";
export const maxDuration=60;
const SYS=`You are an expert Instagram content strategist and visual creative director.
You are creating cover concepts specifically for Instagram Reels.
Your job is to identify the strongest visual hook for the content.
Do not automatically add text. Instagram creators often use their face, the result of their work, an aesthetic scene, a transformation, or a meaningful visual as the entire cover.
Choose from: FACE_FIRST, VISUAL_FIRST, TEXT_FIRST, HYBRID, COMPARISON, STORY_MOMENT, MINIMAL.
FACE_FIRST: creator's expression/personality is the hook. VISUAL_FIRST: finished result, object, food, makeup, artwork, outfit or environment. TEXT_FIRST: topic needs immediate context (educational/technical). HYBRID: creator and concise text work together. COMPARISON: before/after. STORY_MOMENT: narrative with an emotional reaction. MINIMAL: the image is enough.
Never force text. For lifestyle, vlog, GRWM and personal content prefer authentic creator-led compositions over YouTube-style clickbait.
Do not invent claims not supported by the user's content. Do not be misleading.
If text is unnecessary return textLevel NONE and empty text. Minimal text: 1-3 words. Headline: ideally 2-6 words.
textPlacement should say top, center or bottom. Prioritize hierarchy, authenticity, readability and grid appearance.
Return ONLY JSON. Exactly 3 meaningfully different concepts. Shape: {"analysis":{"contentType","visualHook","emotionalHook","creatorImportance":"high|medium|low","recommendedStrategy","textLevel":"NONE|MINIMAL|HEADLINE","reason"},"concepts":[{"name","strategy","visualDirection","creatorPlacement","facialExpression","background","supportingVisuals","text","textPlacement","composition","aesthetic","whyItWorks"}]}`;
export async function POST(req:NextRequest){
 let b:any; try{b=await req.json()}catch{return NextResponse.json({error:"Bad request."},{status:400})}
 const {contentType="Other",description="",style="Let AI decide",creatorImage,mode="generate",concept,instruction,previous}=b;
 if(!String(description).trim()) return NextResponse.json({error:"Please describe your Reel first."},{status:400});
 if(creatorImage&&String(creatorImage).length>7_000_000) return NextResponse.json({error:"That image is too large. Try one under 5 MB."},{status:400});
 const key=process.env.GEMINI_API_KEY;
 const demo=()=>{const f=fallback(description,contentType);
  if(mode==="refine"&&concept){const c={...concept};const i=String(instruction||"").toLowerCase();
   if(/remove.*text|no text/.test(i))c.text="";if(/top/.test(i))c.textPlacement="top";if(/minimal/.test(i)){c.strategy="MINIMAL";c.text="";}
   c.whyItWorks+=" (Refined: "+instruction+")";return NextResponse.json({demo:true,concept:c});}
  if(mode==="variations"){f.concepts=f.concepts.map(c=>({...c,name:c.name+" II",textPlacement:c.textPlacement==="top"?"bottom":"top"}))}
  return NextResponse.json({demo:true,...f});};
 if(!key) return demo();
 try{
  const ai=new GoogleGenAI({apiKey:key});
  const parts:any[]=[];
  const m=typeof creatorImage==="string"&&creatorImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if(m) parts.push({inlineData:{mimeType:m[1],data:m[2]}});
  let prompt=`Content type: ${contentType}\nStyle: ${style}\nReel: ${description}\n${m?"A creator photo is attached; do not replace the creator.":"No creator photo."}`;
  if(mode==="refine") prompt+=`\nRevise this concept: ${JSON.stringify(concept)}\nInstruction: ${instruction}\nReturn ONLY {"concept":{...}}.`;
  if(mode==="variations") prompt+=`\nThese concepts already exist, make 3 clearly different new ones: ${JSON.stringify(previous||[])}`;
  parts.push({text:prompt});
  const r=await ai.models.generateContent({model:"gemini-2.5-flash",contents:[{role:"user",parts}],config:{systemInstruction:SYS,responseMimeType:"application/json"}});
  const json=JSON.parse((r.text||"").replace(/```json|```/g,"").trim());
  if(mode==="refine") return NextResponse.json({demo:false,...Refined.parse(json)});
  return NextResponse.json({demo:false,...Result.parse(json)});
 }catch(e){console.error("gemini failed",(e as Error).message);return demo();}
}
