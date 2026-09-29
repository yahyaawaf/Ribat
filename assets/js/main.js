(() => {
  const cfg = window.RIBAT_CONFIG || {};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const menu = $('#menuBtn'), nav = $('#navLinks');
  if(menu && nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});}

  const saved = JSON.parse(localStorage.getItem('ribat_access') || '{}');
  if(saved.scale) document.documentElement.style.setProperty('--font-scale', saved.scale);
  if(saved.contrast) document.body.classList.add('high-contrast');
  if(saved.motion) document.body.classList.add('reduce-motion');
  const saveAccess=()=>localStorage.setItem('ribat_access',JSON.stringify({scale:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'))||1,contrast:document.body.classList.contains('high-contrast'),motion:document.body.classList.contains('reduce-motion')}));
  $('#fontUp')?.addEventListener('click',()=>{let x=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'))||1;x=Math.min(1.25,x+.08);document.documentElement.style.setProperty('--font-scale',x);saveAccess();});
  $('#fontDown')?.addEventListener('click',()=>{let x=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'))||1;x=Math.max(.9,x-.08);document.documentElement.style.setProperty('--font-scale',x);saveAccess();});
  $('#fontReset')?.addEventListener('click',()=>{document.documentElement.style.setProperty('--font-scale',1);saveAccess();});
  $('#contrastBtn')?.addEventListener('click',()=>{document.body.classList.toggle('high-contrast');saveAccess();});
  $('#motionBtn')?.addEventListener('click',()=>{document.body.classList.toggle('reduce-motion');saveAccess();});

  const launch = cfg.launchDate ? new Date(cfg.launchDate) : null;
  const countdown = $('#countdown');
  if(countdown && launch){
    const render=()=>{
      let diff=launch.getTime()-Date.now();
      if(diff<=0){countdown.innerHTML='<div class="unit" style="grid-column:1/-1"><b>تم الافتتاح 🎉</b><span>مرحبًا بكم في بوابة جمعية رباط</span></div>';$('#launchDate')?.remove();return;}
      const d=Math.floor(diff/86400000); diff%=86400000;
      const h=Math.floor(diff/3600000); diff%=3600000;
      const m=Math.floor(diff/60000); const s=Math.floor((diff%60000)/1000);
      const vals=[['days',d,'يوم'],['hours',h,'ساعة'],['minutes',m,'دقيقة'],['seconds',s,'ثانية']];
      vals.forEach(([id,v])=>{const el=$('#'+id); if(el) el.textContent=String(v).padStart(2,'0');});
    }; render(); setInterval(render,1000);
    const dateEl=$('#launchDate'); if(dateEl) dateEl.textContent='موعد الإطلاق: 29 أكتوبر 2026م';
  }

  $$('.contact-value').forEach(el=>{const key=el.dataset.key;const val=cfg.contact?.[key];if(val){el.textContent=val;el.closest('[data-contact-row]')?.removeAttribute('hidden');}});
  $$('.location-value').forEach(el=>el.textContent=cfg.locationLabel || 'الطوال، المملكة العربية السعودية');
  $$('.year').forEach(el=>el.textContent='2026');

  const toast=$('#toast');
  window.ribatToast=(msg)=>{if(!toast)return;toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)};
})();

if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
