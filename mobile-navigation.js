export function bindMobileNavigation(root,lang='en'){
 const header=root.querySelector('header');
 if(!header)return ()=>{};
 const row=header.querySelector('.header-row');
 const media=matchMedia('(max-width: 800px)');
 const controls=document.createElement('div');
 controls.className='mobile-menu-controls';
 const definitions=[
  ['.nav','main-navigation',lang==='he'?'תפריט ראשי':'Main menu','<path d="M4 6h16M4 12h16M4 18h16"/>'],
  ['.mag-submenu','editorial-navigation',lang==='he'?'תפריט מדורים':'Sections menu','<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>']
 ];
 const panels=definitions.map(([selector,id,label,icon])=>{
  const nav=header.querySelector(selector);
  const marker=document.createComment(id);nav.before(marker);
  const panel=document.createElement('div');panel.className='mobile-nav-panel';panel.id=id;
  const inner=document.createElement('div');inner.className='mobile-nav-inner';inner.append(nav);panel.append(inner);header.append(panel);
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','false');
  button.innerHTML=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${icon}</svg>`;
  controls.append(button);
  const setOpen=open=>{button.setAttribute('aria-expanded',String(open));panel.classList.toggle('is-open',open);panel.inert=media.matches&&!open;};
  button.onclick=()=>setOpen(button.getAttribute('aria-expanded')!=='true');
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&media.matches){setOpen(false);button.focus();}});
  return {panel,button,setOpen,nav,marker,inner};
 });
 row.append(controls);
 const reset=()=>panels.forEach(({setOpen,nav,marker,inner})=>{if(media.matches)inner.append(nav);else marker.after(nav);setOpen(false);});
 media.addEventListener('change',reset);reset();
 return ()=>media.removeEventListener('change',reset);
}
