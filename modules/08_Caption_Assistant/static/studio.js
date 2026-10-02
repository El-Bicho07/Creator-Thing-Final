const opts={tone:['Witty','Warm','Bold','Playful','Aesthetic','Sarcastic','Inspirational','Professional','Raw & honest','Nostalgic'],vibe:['Soft girl','Main character','Cozy','Minimal','Chaotic','Luxury','Street','Dreamy'],hook:['Question','Bold claim','Confession','Number / list','Mystery'],goal:['Saves','Shares (DM)','Comments','Reach','Follows']};
const cols=['--lilac','--blush','--mint','--butter','--sky','--peach'];
for(const k in opts){const box=$('#'+k);opts[k].forEach((v,i)=>{const b=document.createElement('button');b.className='chip';b.textContent=v;b.style.setProperty('--c',`var(${cols[i%6]})`);box.appendChild(b)});if(box.dataset.one)box.firstElementChild.classList.add('on')}
$$('#tone .chip').slice(0,1).forEach(c=>c.classList.add('on'));
document.addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;const box=c.parentElement;if(box.dataset.one){box.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on')}else if(c.classList.contains('on'))c.classList.remove('on');else if(box.querySelectorAll('.on').length<(+box.dataset.max||9))c.classList.add('on')});
const sel=id=>$$('#'+id+' .on').map(x=>x.textContent);
$('#len').oninput=e=>$('#lv').textContent=['Short','Medium','Long'][e.target.value];
let img=null;const drop=$('#drop');
const DZ='<input type="file" id="file" accept="image/*" hidden><div><b>Drop a photo</b><br><span class="par">or click to upload</span></div>';
function bind(){const f=$('#file');if(f)f.onchange=e=>setImg(e.target.files[0])}
function setImg(f){if(!f||!f.type.startsWith('image/'))return;img=f;$('#fn').textContent=f.name.slice(0,22);drop.innerHTML=`<img src="${URL.createObjectURL(f)}" alt="Your upload"><button class="x" type="button" id="rm">×</button>`}
bind();
drop.ondragover=e=>{e.preventDefault();drop.classList.add('dv')};drop.ondragleave=()=>drop.classList.remove('dv');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dv');setImg(e.dataTransfer.files[0])};
drop.addEventListener('click',e=>{if(e.target.id==='rm'){e.preventDefault();img=null;$('#fn').textContent='';drop.innerHTML=DZ;bind()}});
const out=$('#out');
function shrink(f){return new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>{const k=Math.min(1,1024/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);ok({mime:'image/jpeg',data:c.toDataURL('image/jpeg',.85).split(',')[1]})};i.onerror=()=>no(new Error('Could not read image'));i.src=u})}let picks=[],cur=-1;
function choose(i){cur=i;$$('.cap').forEach(c=>{const on=+c.dataset.i===i;c.classList.toggle('pick',on);const b=c.querySelector('.ch');if(b){b.textContent=on?'✓ Chosen':'Choose this one';b.classList.toggle('sel',on)}});let bar=$('.pbar');if(!bar){bar=document.createElement('div');bar.className='pbar';bar.innerHTML='<b></b><button class="btn" id="pc">Copy</button><button class="btn" id="pd">Download .txt</button><button class="btn" id="pa">Download all 4</button>';out.appendChild(bar);$('#pc').onclick=()=>navigator.clipboard.writeText(picks[cur]).then(()=>{$('#pc').textContent='Copied ✓';setTimeout(()=>$('#pc').textContent='Copy',1400)}).catch(()=>{});$('#pd').onclick=()=>save('captioncraft-pick.txt',picks[cur]);$('#pa').onclick=()=>save('captioncraft-all.txt',picks.map((p,k)=>'— Option '+(k+1)+' —\n'+p).join('\n\n\n'))}bar.querySelector('b').textContent='Your pick: option '+(i+1)}
function blobSave(name,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'text/plain'}));a.download=name;a.click()}
async function save(name,data){if(typeof claude==='undefined'){blobSave(name,data);return}try{const dl=await claude.use('downloads');if(!dl){navigator.clipboard.writeText(data).catch(()=>{});alert('Downloads are unavailable here, so the text was copied instead.');return}await dl.save({filename:name,data})}catch(e){}}
function score(v){const first=(v.hook||'').length,txt=(v.hook||'')+' '+(v.body||'')+' '+(v.cta||''),tags=v.hashtags||[],emo=txt.match(/\p{Extended_Pictographic}/gu)?.length||0;
 const c=[['Hook under 125 chars',first>0&&first<=125],['Clear CTA',!!(v.cta&&v.cta.length>3)],['Save/share trigger',/save|share|send|tag|bookmark|for later|dm/i.test(txt)],['1–5 hashtags',tags.length>=1&&tags.length<=5],['Keywords present',(v.keywords||[]).some(k=>txt.toLowerCase().includes(String(k).toLowerCase()))],['Emoji not overdone',emo<=4]];
 return{pts:Math.round(c.filter(x=>x[1]).length/c.length*100),c}}
function card(v,i,o){const tc=['--lilac','--blush','--mint','--butter'];const s=score(v);const tags=(v.hashtags||[]).map(h=>'#'+String(h).replace(/^#/,'')).join(' ');
 const full=[v.hook,v.body,v.cta].filter(Boolean).join('\n\n')+(tags&&o.hsh?'\n\n'+tags:'');
 const d=document.createElement('div');d.className='cap';d.style.animationDelay=i*.15+'s';
 d.dataset.i=i;d.innerHTML=(i===o.rec?'<span class="rec">★ Recommended</span>':'')+'<span class="tag"></span><p class="hk"></p><pre class="bd"></pre><div class="hs"></div><div class="score"><span class="par">Reach score</span><div class="bar"><i></i></div><b></b></div><div class="ck"></div><div class="meta"></div><div class="acts"><button class="btn cp">Copy caption</button><button class="btn ghost ct">Copy tags</button><button class="btn ghost ch">Choose this one</button></div>';
 const q=x=>d.querySelector(x);q('.tag').style.setProperty('--c',`var(${tc[i]})`);q('.tag').textContent=v.label||'Take '+(i+1);q('.hk').textContent=v.hook||'';q('.bd').textContent=[v.body,v.cta].filter(Boolean).join('\n\n');q('.hs').textContent=o.hsh?tags:'';q('.score b').textContent=s.pts;
 s.c.forEach(x=>{const p=document.createElement('span');p.textContent=(x[1]?'✓ ':'· ')+x[0];if(x[1])p.className='ok';q('.ck').appendChild(p)});
 const m=[v.why&&'Why it works: '+v.why,v.extra&&'Extra: '+v.extra,v.altText&&'Alt text: '+v.altText].filter(Boolean).join('\n');if(m)q('.meta').textContent=m;else q('.meta').remove();
 const cp=(b,txt,l)=>b.onclick=()=>navigator.clipboard.writeText(txt).then(()=>{b.textContent='Copied ✓';setTimeout(()=>b.textContent=l,1400)}).catch(()=>{});
 cp(q('.cp'),full,'Copy caption');cp(q('.ct'),tags,'Copy tags');picks[i]=full;
 d.onclick=e=>{if(e.target.closest('.cp,.ct'))return;choose(i)};
 out.appendChild(d);setTimeout(()=>q('.bar i').style.width=s.pts+'%',250)}
$('#go').onclick=async()=>{
 const desc=$('#desc').value.trim();if(!img&&!desc){out.innerHTML='<div class="err">Add a photo or a short description first.</div>';return}
 const o={fmt:sel('fmt')[0],tone:sel('tone'),vibe:sel('vibe')[0],hook:sel('hook')[0],goal:sel('goal')[0],niche:$('#niche').value.trim(),lang:$('#lang').value,len:['a hook plus one short line (under 200 characters total)','2–4 short lines (about 300–500 characters)','a storytelling caption (about 700–1000 characters)'][$('#len').value],emo:$('#emo').checked,hsh:$('#hsh').checked,seo:$('#seo').checked,cta:$('#cta').checked};
 out.innerHTML='<div class="empty"><div><div class="dots"><span></span><span></span><span></span></div><p class="par" style="margin-top:18px">'+(img?'reading your photo, then crafting four takes':'crafting four takes')+'<span id="el"></span></p></div></div>';
 const t0=Date.now(),tm=setInterval(()=>{const e=$('#el');if(e)e.textContent=' · '+Math.round((Date.now()-t0)/1000)+'s'},1000);
 $('#go').disabled=true;
 try{const image=img?await shrink(img):null;
  const res=await fetch('/api/captions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({desc,opts:o,image})});
  const r=await res.json().catch(()=>({error:'Bad response from server'}));if(!res.ok)throw new Error(r.error||'Request failed');
  out.innerHTML='';picks=[];cur=-1;o.rec=Math.min(Math.max(+r.recommended||0,0),3);const vs=(r.variants||[]).slice(0,4);
  if(r.recommendReason&&vs.length){const rc=document.createElement('p');rc.className='rc';rc.textContent='★ Our pick (option '+(o.rec+1)+'): '+r.recommendReason+' Tap any caption to choose your own.'+(r.provider?' (written by '+r.provider+')':'');out.appendChild(rc)}
  if(r.note){const nt=document.createElement('p');nt.className='rc';nt.textContent='ℹ '+r.note;out.insertBefore(nt,out.firstChild)}
  if(r.imageDescription){const sn=document.createElement('p');sn.className='rc';sn.textContent='📷 What the vision model saw: '+r.imageDescription;out.insertBefore(sn,out.firstChild)}
  vs.forEach((v,i)=>card(v,i,o));if(vs.length)choose(o.rec);
  if(!$$('.cap').length)out.innerHTML='<div class="err">No captions came back. Try again.</div>'}
 catch(e){out.innerHTML='<div class="err"></div>';out.firstChild.textContent='Something went wrong: '+(e.message||e)}
 clearInterval(tm);$('#go').disabled=false};
