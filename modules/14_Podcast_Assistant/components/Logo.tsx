import Link from "next/link";import { Mic } from "lucide-react";
export default function Logo(){return <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
<span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"><Mic className="h-4 w-4"/></span>PodCraft</Link>}
