
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const io=new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&x.target.classList.add('in')),{threshold:.12});
function observe(){$$('.rev:not(.in)').forEach(el=>io.observe(el))}
addEventListener('mousemove',e=>{const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;$$('.o>div').forEach(o=>{const d=+o.dataset.d||0;o.style.transform=`translate(${x*d}px,${y*d}px)`})});

$$('nav a[data-r]').forEach(a=>a.classList.toggle('on',a.dataset.r===document.body.dataset.page));observe();
