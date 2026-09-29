(() => {
  const defaults = window.RIBAT_DEFAULT_CONTENT || {};
  const cfg = window.RIBAT_CONFIG || {};
  const deepMerge = (base, override) => {
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (!base || typeof base !== 'object') return override === undefined ? base : override;
    const out = {...base};
    if (override && typeof override === 'object') {
      Object.keys(override).forEach(k => out[k] = deepMerge(base[k], override[k]));
    }
    return out;
  };
  const local = (() => { try { return JSON.parse(localStorage.getItem('ribat_site_content') || '{}'); } catch { return {}; } })();
  window.RIBAT_CONTENT = deepMerge(defaults, local);

  const text = (sel, value) => document.querySelectorAll(sel).forEach(el => { if (value !== undefined && value !== null) el.textContent = value; });
  const hrefText = (sel, value) => document.querySelectorAll(sel).forEach(el => { if (value) el.textContent = value; });
  const path = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

  function applyGeneral(c){
    text('.topbar-note', c.general?.topbar);
    text('.brand span', c.general?.shortName);
    text('.footer-logo strong', c.general?.associationName);
    text('.footer-text:first-of-type', undefined);
    document.querySelectorAll('.footer-logo').forEach(box => {
      const p = box.parentElement?.querySelector(':scope > .footer-text');
      if(p && c.general?.footerText) p.textContent = c.general.footerText;
    });
    text('.location-value', c.general?.locationLabel);
    text('.copyright .container', c.general?.copyright);
    const contact = c.general?.contact || {};
    document.querySelectorAll('.contact-value').forEach(el => {
      const key = el.dataset.key, val = contact[key];
      if(val){ el.textContent = val; el.closest('[data-contact-row]')?.removeAttribute('hidden'); }
      else el.closest('[data-contact-row]')?.setAttribute('hidden','');
    });
  }

  function applyPageDescription(c){
    const map = {
      'about.html':'aboutDescription','services.html':'servicesDescription','programs.html':'programsDescription',
      'news.html':'newsDescription','volunteer.html':'volunteerDescription','beneficiaries.html':'beneficiariesDescription',
      'contact.html':'contactDescription','privacy.html':'privacyDescription'
    };
    const key = map[path()];
    if(key) text('.page-hero p', c.pages?.[key]);
  }

  function applyHome(c){
    if(path() !== 'index.html') return;
    const h = c.home || {};
    text('.hero .eyebrow', h.eyebrow);
    const h1 = document.querySelector('.hero h1');
    if(h1) h1.innerHTML = `${escapeHtml(h.heroPrefix)} <strong>${escapeHtml(h.heroHighlight)}</strong><br>${escapeHtml(h.heroSuffix)}`;
    const intro = document.querySelector('.hero-grid > div:first-child > p'); if(intro) intro.textContent = h.heroDescription || '';
    const actions = document.querySelectorAll('.hero-grid > div:first-child > .actions a');
    if(actions[0]) actions[0].textContent = h.primaryCta || '';
    if(actions[1]) actions[1].textContent = h.secondaryCta || '';
    text('.hero-card h2', h.heroCardTitle); text('.hero-card p', h.heroCardText);
    const sectionHeads = document.querySelectorAll('main > .section .section-head');
    if(sectionHeads[0]){ sectionHeads[0].querySelector('.section-title').textContent=h.quickTitle||''; sectionHeads[0].querySelector('.section-sub').textContent=h.quickSub||''; }
    if(sectionHeads[1]){ sectionHeads[1].querySelector('.section-title').textContent=h.serviceTitle||''; sectionHeads[1].querySelector('.section-sub').textContent=h.serviceSub||''; }
    if(sectionHeads[2]){ sectionHeads[2].querySelector('.section-title').textContent=h.audienceTitle||''; sectionHeads[2].querySelector('.section-sub').textContent=h.audienceSub||''; }
    const band = document.querySelector('.info-band'); if(band){ const t=band.querySelector('h2'), p=band.querySelector('p'); if(t)t.textContent=h.infoTitle||''; if(p)p.textContent=h.infoText||''; }
    const serviceGrid=document.querySelector('main > .section.alt .grid-3');
    if(serviceGrid && Array.isArray(c.services)){serviceGrid.innerHTML=c.services.slice(0,3).map(x=>`<div class="card"><div class="icon">${escapeHtml(x.icon)}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description)}</p></div>`).join('');}
  }

  function applyAbout(c){
    if(path() !== 'about.html') return;
    const cards = document.querySelectorAll('main .section:first-of-type .card p');
    ['vision','mission','values'].forEach((k,i)=>{ if(cards[i]) cards[i].textContent=c.about?.[k]||''; });
    const more = document.querySelectorAll('main .section.alt .card p');
    ['board','governance','reports','partners'].forEach((k,i)=>{ if(more[i]) more[i].textContent=c.about?.[k]||''; });
  }

  function applyServices(c){
    if(path() !== 'services.html') return;
    const grid = document.querySelector('main .section .grid-3'); if(!grid) return;
    const items = c.services || [];
    grid.innerHTML = items.map(x => `<div class="card"><div class="icon">${escapeHtml(x.icon)}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description)}</p><a class="card-link" href="${escapeHtml(x.link||'#')}">${escapeHtml(x.label||'التفاصيل ←')}</a></div>`).join('');
  }

  function applyPrograms(c){
    if(path() !== 'programs.html') return;
    const categories = document.querySelector('main .grid-4');
    if(categories) categories.innerHTML=(c.programs?.categories||[]).map(x=>`<div class="card"><div class="icon">${escapeHtml(x.icon)}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description)}</p></div>`).join('');
    let holder=document.getElementById('programItems');
    if(!holder){ holder=document.createElement('div'); holder.id='programItems'; holder.className='news-grid'; holder.style.marginTop='28px'; categories?.parentElement?.appendChild(holder); }
    const items=c.programs?.items||[];
    holder.innerHTML=items.length ? items.map(x=>`<article class="card"><span class="tag">${escapeHtml(x.category||'برنامج')}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.summary||'')}</p><p class="admin-meta">${escapeHtml([x.date,x.place,x.audience].filter(Boolean).join(' • '))}</p>${x.url?`<a class="card-link" href="${escapeHtml(x.url)}" target="_blank" rel="noopener">التسجيل / التفاصيل ←</a>`:''}</article>`).join('') : '';
    const empty=document.querySelector('.empty-state'); if(empty) empty.style.display=items.length?'none':'';
  }

  function applyNews(c){
    if(path() !== 'news.html') return;
    const grid=document.querySelector('.news-grid'); if(!grid)return;
    const items=c.news?.items||[];
    if(items.length){
      grid.innerHTML=items.map(x=>`<article class="card news-card"><div class="news-cover"></div><div class="news-body"><span class="tag">${escapeHtml(x.type||'خبر')}</span><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.summary||'')}</p>${x.date?`<p class="admin-meta">${escapeHtml(x.date)}</p>`:''}${x.url?`<a class="card-link" href="${escapeHtml(x.url)}" target="_blank" rel="noopener">التفاصيل ←</a>`:''}</div></article>`).join('');
      const empty=document.querySelector('.empty-state'); if(empty) empty.style.display='none';
    }
  }


  function applyContact(c){
    if(path() !== 'contact.html') return;
    const grid=document.querySelector('main .section .grid-3'); if(!grid)return;
    grid.querySelectorAll('.cms-extra-contact').forEach(x=>x.remove());
    const contact=c.general?.contact||{};
    const extras=[
      ['whatsapp','💬','واتساب',v=>v.startsWith('http')?v:'https://wa.me/'+v.replace(/\D/g,'')],
      ['x','𝕏','منصة X',v=>v],['instagram','◎','إنستغرام',v=>v],['youtube','▶','يوتيوب',v=>v]
    ];
    extras.forEach(([key,icon,title,toUrl])=>{const v=contact[key];if(!v)return;const card=document.createElement('div');card.className='card cms-extra-contact';card.innerHTML=`<div class="icon">${icon}</div><h3>${title}</h3><p><a class="card-link" target="_blank" rel="noopener" href="${escapeHtml(toUrl(String(v)))}">فتح القناة الرسمية ←</a></p>`;grid.appendChild(card);});
  }

  function applyContent(c){
    window.RIBAT_CONTENT=c;
    applyGeneral(c); applyPageDescription(c); applyHome(c); applyAbout(c); applyServices(c); applyPrograms(c); applyNews(c); applyContact(c);
    document.dispatchEvent(new CustomEvent('ribat:content',{detail:c}));
  }
  window.ribatApplyContent=applyContent;
  window.ribatDeepMerge=deepMerge;
  applyContent(window.RIBAT_CONTENT);

  const endpoint = (cfg.forms?.endpoint || '').trim();
  if(endpoint && location.protocol !== 'file:'){
    const url = endpoint + (endpoint.includes('?')?'&':'?') + 'action=publicContent&_=' + Date.now();
    fetch(url,{cache:'no-store'}).then(r=>r.json()).then(res=>{
      if(res?.ok && res.content){
        const merged=deepMerge(defaults,res.content);
        localStorage.setItem('ribat_site_content',JSON.stringify(res.content));
        applyContent(merged);
      }
    }).catch(()=>{});
  }
})();
