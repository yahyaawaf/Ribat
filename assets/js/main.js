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

  let countdownTimer=null, popupTimer=null;
  function countdownMarkup(){return '<div class="launch-countdown" id="launchCountdown"><div class="unit"><b data-cd="days">--</b><span>يوم</span></div><div class="unit"><b data-cd="hours">--</b><span>ساعة</span></div><div class="unit"><b data-cd="minutes">--</b><span>دقيقة</span></div><div class="unit"><b data-cd="seconds">--</b><span>ثانية</span></div></div>';}
  function renderCountdown(content){
    const launchCfg=content?.launch||{}; const launch=launchCfg.date?new Date(launchCfg.date):null;
    if(!launch || isNaN(launch.getTime())) return;
    if(countdownTimer) clearInterval(countdownTimer);
    const render=()=>{
      let diff=launch.getTime()-Date.now();
      const root=$('#launchCountdown'); if(!root)return;
      if(diff<=0){root.innerHTML='<div class="unit launch-open"><b>تم الافتتاح 🎉</b><span>مرحبًا بكم في بوابة جمعية رباط</span></div>';return;}
      const d=Math.floor(diff/86400000); diff%=86400000; const h=Math.floor(diff/3600000); diff%=3600000; const m=Math.floor(diff/60000); const s=Math.floor((diff%60000)/1000);
      [['days',d],['hours',h],['minutes',m],['seconds',s]].forEach(([id,v])=>{const el=root.querySelector(`[data-cd="${id}"]`);if(el)el.textContent=String(v).padStart(2,'0');});
    }; render(); countdownTimer=setInterval(render,1000);
  }
  function hideLaunchPopup(){ const p=$('#launchPopup'); if(!p)return; p.classList.add('closing'); setTimeout(()=>p.remove(),250); if(popupTimer)clearTimeout(popupTimer); }
  function showLaunchPopup(content){
    if(document.body.classList.contains('admin-page')) return;
    const l=content?.launch||{}; if(!l.popupEnabled) return;
    if(l.showOncePerSession && sessionStorage.getItem('ribat_launch_popup_seen')==='1') return;
    $('#launchPopup')?.remove();
    const seconds=Math.max(5,Math.min(300,Number(l.popupSeconds)||30));
    const el=document.createElement('div'); el.id='launchPopup'; el.className='launch-popup'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label',l.title||'العد التنازلي للإطلاق');
    el.innerHTML=`<div class="launch-popup-card"><button class="launch-close" type="button" aria-label="إغلاق">×</button><img src="assets/images/logo-small.png" alt="شعار جمعية رباط"><p class="launch-kicker">قريبًا بإذن الله</p><h2>${escapeHtml(l.title||'العد التنازلي للإطلاق الرسمي للجمعية والموقع')}</h2>${countdownMarkup()}<p class="launch-date-popup">${escapeHtml(l.dateLabel||'')}</p><div class="launch-progress"><span></span></div><p class="launch-auto">تُغلق هذه النافذة تلقائيًا بعد ${seconds} ثانية.</p></div>`;
    document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
    el.querySelector('.launch-close')?.addEventListener('click',hideLaunchPopup);
    el.addEventListener('click',e=>{if(e.target===el)hideLaunchPopup();});
    sessionStorage.setItem('ribat_launch_popup_seen','1');
    renderCountdown(content);
    const bar=el.querySelector('.launch-progress span'); if(bar){bar.style.animationDuration=seconds+'s';}
    popupTimer=setTimeout(hideLaunchPopup,seconds*1000);
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}

  let popupStarted=false;
  function initLaunch(content){
    if(popupStarted) return; popupStarted=true;
    setTimeout(()=>showLaunchPopup(window.RIBAT_CONTENT||content||{}),450);
  }
  if(window.RIBAT_CONTENT) initLaunch(window.RIBAT_CONTENT);
  document.addEventListener('ribat:content',e=>{ if(!popupStarted){initLaunch(e.detail);return;} if($('#launchPopup')){const l=e.detail?.launch||{};const title=$('#launchPopup h2');const date=$('#launchPopup .launch-date-popup');if(title)title.textContent=l.title||'';if(date)date.textContent=l.dateLabel||'';renderCountdown(e.detail);} });

  $$('.year').forEach(el=>el.textContent=String(new Date().getFullYear()));
  const toast=$('#toast');
  window.ribatToast=(msg)=>{if(!toast)return;toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)};
})();

if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
