"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
type T={id:number;msg:string;kind:"ok"|"err"|"info"};
const Ctx=createContext<(m:string,k?:T["kind"])=>void>(()=>{});
export const useToast=()=>useContext(Ctx);
export function ToastProvider({children}:{children:ReactNode}){
  const [items,set]=useState<T[]>([]);
  const push=useCallback((msg:string,kind:T["kind"]="ok")=>{const id=Date.now()+Math.random();set(s=>[...s,{id,msg,kind}]);setTimeout(()=>set(s=>s.filter(t=>t.id!==id)),4000)},[]);
  return <Ctx.Provider value={push}>{children}
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-50 flex flex-col gap-2" role="status">
      {items.map(t=><div key={t.id} className="animate-up card flex items-start gap-3 p-3 text-sm">
        {t.kind==="ok"?<CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0"/>:t.kind==="err"?<AlertCircle className="h-5 w-5 text-rose-500 shrink-0"/>:<Info className="h-5 w-5 text-indigo-500 shrink-0"/>}
        <span>{t.msg}</span></div>)}
    </div></Ctx.Provider>;
}
