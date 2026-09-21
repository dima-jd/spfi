export function bindHorizontalRails(root,lang){
 const controller=new AbortController(),signal=controller.signal;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const desk=root.querySelector('#desk-rail');
 root.querySelectorAll('[data-desk-step]').forEach(button=>button.addEventListener('click',()=>{
  desk?.scrollBy({left:Number(button.dataset.deskStep)*desk.clientWidth*(lang==='he'?-1:1),behavior:reduced.matches?'instant':'smooth'});
 },{signal}));
 const rail=root.querySelector('#organisation-rail');
 if(!rail)return ()=>controller.abort();
 const toggle=root.querySelector('#organisation-motion');
 let paused=reduced.matches,hover=false,visible=false,frame=0,last=0,direction=1,distance=0;
 const update=()=>{toggle.textContent=paused?(lang==='he'?'הפעלת גלילה':'Play scrolling'):(lang==='he'?'השהיית גלילה':'Pause scrolling');toggle.setAttribute('aria-pressed',String(paused));};
 update();
 toggle.addEventListener('click',()=>{paused=!paused;update();},{signal});
 reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;update();}},{signal});
 rail.addEventListener('pointerenter',()=>hover=true,{signal});
 rail.addEventListener('pointerleave',()=>hover=false,{signal});
 for(const event of ['pointerdown','wheel','keydown','focusin'])rail.addEventListener(event,()=>{paused=true;update();},{signal,passive:true});
 root.querySelectorAll('[data-org-step]').forEach(button=>button.addEventListener('click',()=>{paused=true;update();rail.scrollBy({left:Number(button.dataset.orgStep)*Math.min(rail.clientWidth,360),behavior:reduced.matches?'instant':'smooth'});},{signal}));
 const observer=new IntersectionObserver(entries=>visible=entries[0].isIntersecting);
 observer.observe(rail);
 function tick(time){
  const elapsed=last?Math.min(time-last,50):0;last=time;
  if(visible&&!paused&&!hover&&!document.hidden&&!document.querySelector('dialog[open]')){
   const max=rail.scrollWidth-rail.clientWidth;
   if(max>0){distance+=elapsed*.025;const step=Math.floor(distance);distance-=step;rail.scrollLeft+=direction*step;if(rail.scrollLeft>=max-1)direction=-1;else if(rail.scrollLeft<=0)direction=1;}
  }
  frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);
 return ()=>{controller.abort();observer.disconnect();cancelAnimationFrame(frame);};
}
