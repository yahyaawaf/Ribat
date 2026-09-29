(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const endpoint=(window.RIBAT_CONFIG?.forms?.endpoint||'').trim();
  const defaults=window.RIBAT_DEFAULT_CONTENT||{};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const merge=(a,b)=>{ if(Array.isArray(a))return Array.isArray(b)?b:a; if(!a||typeof a!=='object')return b===undefined?a:b; const o={...a}; if(b&&typeof b==='object')Object.keys(b).forEach(k=>o[k]=merge(a[k],b[k])); return o; };
  const getPath=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
  const setPath=(o,path,val)=>{const p=path.split('.');let x=o;p.slice(0,-1).forEach(k=>x=x[k]??(x[k]={}));x[p.at(-1)]=val;};
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  let content=merge(defaults,(()=>{try{return JSON.parse(localStorage.getItem('ribat_site_content')||'{}')}catch{return {}}})());
  let token=sessionStorage.getItem('ribat_admin_token')||'';
  let localAuth=sessionStorage.getItem('ribat_admin_local')==='1';
  let requests=[];

  function toast(msg){const t=$('#adminToast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}
  function setSync(msg){$('#syncBadge').textContent=msg}
  async function sha256(s){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  async function api(data){
    if(!endpoint) throw new Error('NO_ENDPOINT');
    const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)});
    const out=await res.json(); if(!res.ok||out.ok===false)throw new Error(out.error||'تعذر تنفيذ الطلب'); return out;
  }

  function showAdmin(){
    $('#loginView').classList.add('hidden'); $('#adminView').classList.remove('hidden');
    $('#adminModeText').textContent=endpoint?'وضع الإدارة المتصل':'وضع المعاينة المحلي';
    $('#securityNotice').textContent=endpoint?'بيانات الدخول تُتحقق في Google Apps Script ولا تُحفظ داخل ملفات الموقع العامة.':'وضع المعاينة يحمي الواجهة فقط داخل المتصفح، وليس بديلاً عن المصادقة الخادمية عند النشر العام.';
    bindContentFields(); renderEditors(); updateDashboard(); loadRequests();
  }
  function showLogin(){
    $('#loginView').classList.remove('hidden');$('#adminView').classList.add('hidden');
    $('#loginModeNotice').innerHTML=endpoint?'الاتصال بالخادم مفعّل. يتم التحقق من بيانات الدخول في Google Apps Script.':'<b>وضع المعاينة:</b> استخدمي اسم المستخدم <b>admin</b> وكلمة المرور الافتراضية الموضحة في README، ثم غيّريها من قسم الأمان.';
  }

  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault(); const user=$('#adminUser').value.trim(), password=$('#adminPassword').value; const err=$('#loginError');err.classList.add('hidden');
    try{
      if(endpoint){setSync('جارٍ الدخول...'); const r=await api({action:'login',username:user,password}); token=r.token;sessionStorage.setItem('ribat_admin_token',token);localAuth=false; await loadRemoteContent();}
      else{
        const custom=JSON.parse(localStorage.getItem('ribat_admin_preview')||'null');
        const expectedUser=custom?.username||'admin'; const expectedHash=custom?.passwordHash||'bd6b69aca3fd356ca22fdc3e0be9c729b8a1cbc502a4b38327ed3fc5e85d1710';
        if(user!==expectedUser || await sha256(password)!==expectedHash) throw new Error('بيانات الدخول غير صحيحة');
        localAuth=true;sessionStorage.setItem('ribat_admin_local','1');
      }
      setSync(endpoint?'متصل بالخادم':'معاينة محلية'); showAdmin();
    }catch(ex){err.textContent=ex.message==='NO_ENDPOINT'?'لم يتم إعداد رابط الخادم بعد.':(ex.message||'تعذر تسجيل الدخول');err.classList.remove('hidden');setSync('غير متصل')}
  });

  async function loadRemoteContent(){
    if(!endpoint)return; const url=endpoint+(endpoint.includes('?')?'&':'?')+'action=publicContent&_='+Date.now();
    const r=await fetch(url,{cache:'no-store'}).then(x=>x.json()); if(r?.ok&&r.content){content=merge(defaults,r.content);localStorage.setItem('ribat_site_content',JSON.stringify(r.content));}
  }
  function collectBoundFields(){
    $$('[data-bind]').forEach(el=>{let v=el.value;if(el.type==='number')v=Number(v);setPath(content,el.dataset.bind,v)});
    const dt=$('#launchDateInput')?.value;if(dt){const offset='+03:00';content.launch.date=dt.length===16?dt+':00'+offset:dt+offset;}
    if($('#popupEnabled'))content.launch.popupEnabled=$('#popupEnabled').value==='true';
    if($('#showOnce'))content.launch.showOncePerSession=$('#showOnce').value==='true';
  }
  function bindContentFields(){
    $$('[data-bind]').forEach(el=>{const v=getPath(content,el.dataset.bind);el.value=v??''});
    if($('#launchDateInput')){const d=content.launch?.date||'';$('#launchDateInput').value=d.slice(0,16)}
    if($('#popupEnabled'))$('#popupEnabled').value=String(content.launch?.popupEnabled!==false);
    if($('#showOnce'))$('#showOnce').value=String(content.launch?.showOncePerSession!==false);
  }
  async function saveContent(){
    collectBoundFields(); collectEditors(); setSync('جارٍ الحفظ...');
    try{
      const override=content; localStorage.setItem('ribat_site_content',JSON.stringify(override));
      if(endpoint){await api({action:'adminContentSave',token,content:override});setSync('تم الحفظ بالخادم')}else setSync('حُفظ محليًا');
      updateDashboard();toast('تم حفظ التغييرات بنجاح');
    }catch(e){setSync('خطأ في الحفظ');toast('تعذر الحفظ: '+e.message)}
  }
  $$('.save-content').forEach(b=>b.addEventListener('click',saveContent));$('#saveAllTop').addEventListener('click',saveContent);

  function serviceRow(x,i){return `<div class="editor-row" data-service-row><div class="editor-grid"><div class="field"><label>الأيقونة</label><input data-f="icon" value="${esc(x.icon)}"></div><div class="field"><label>اسم الخدمة</label><input data-f="title" value="${esc(x.title)}"></div><div class="field"><label>نص الرابط</label><input data-f="label" value="${esc(x.label)}"></div><div class="field wide"><label>الوصف</label><textarea data-f="description">${esc(x.description)}</textarea></div><div class="field wide"><label>الرابط</label><input data-f="link" value="${esc(x.link)}"></div></div><div class="editor-actions"><button class="btn btn-danger remove-row" type="button">حذف</button></div></div>`}
  function categoryRow(x){return `<div class="editor-row" data-category-row><div class="editor-grid"><div class="field"><label>الأيقونة</label><input data-f="icon" value="${esc(x.icon)}"></div><div class="field"><label>العنوان</label><input data-f="title" value="${esc(x.title)}"></div><div class="field"><label>الوصف</label><input data-f="description" value="${esc(x.description)}"></div></div><div class="editor-actions"><button class="btn btn-danger remove-row" type="button">حذف</button></div></div>`}
  function programRow(x){return `<div class="editor-row" data-program-row><div class="editor-grid"><div class="field"><label>التصنيف</label><input data-f="category" value="${esc(x.category||'')}"></div><div class="field"><label>اسم البرنامج</label><input data-f="title" value="${esc(x.title||'')}"></div><div class="field"><label>التاريخ</label><input data-f="date" value="${esc(x.date||'')}"></div><div class="field"><label>المكان</label><input data-f="place" value="${esc(x.place||'')}"></div><div class="field"><label>الفئة المستهدفة</label><input data-f="audience" value="${esc(x.audience||'')}"></div><div class="field"><label>رابط التسجيل</label><input data-f="url" value="${esc(x.url||'')}"></div><div class="field wide"><label>الملخص</label><textarea data-f="summary">${esc(x.summary||'')}</textarea></div></div><div class="editor-actions"><button class="btn btn-danger remove-row" type="button">حذف</button></div></div>`}
  function newsRow(x){return `<div class="editor-row" data-news-row><div class="editor-grid"><div class="field"><label>النوع</label><input data-f="type" value="${esc(x.type||'خبر')}"></div><div class="field"><label>العنوان</label><input data-f="title" value="${esc(x.title||'')}"></div><div class="field"><label>التاريخ</label><input data-f="date" value="${esc(x.date||'')}"></div><div class="field wide"><label>الملخص</label><textarea data-f="summary">${esc(x.summary||'')}</textarea></div><div class="field wide"><label>رابط التفاصيل</label><input data-f="url" value="${esc(x.url||'')}"></div></div><div class="editor-actions"><button class="btn btn-danger remove-row" type="button">حذف</button></div></div>`}
  function renderEditors(){
    $('#servicesEditor').innerHTML=(content.services||[]).map(serviceRow).join('');
    $('#programCategoriesEditor').innerHTML=(content.programs?.categories||[]).map(categoryRow).join('');
    $('#programsEditor').innerHTML=(content.programs?.items||[]).map(programRow).join('')||'<div class="empty">لا توجد برامج منشورة حتى الآن.</div>';
    $('#newsEditor').innerHTML=(content.news?.items||[]).map(newsRow).join('')||'<div class="empty">لا توجد أخبار منشورة حتى الآن.</div>';
    bindRemoveRows();
  }
  function rowData(row){const o={};row.querySelectorAll('[data-f]').forEach(el=>o[el.dataset.f]=el.value.trim());return o}
  function collectEditors(){
    content.services=$$('[data-service-row]').map(rowData);
    content.programs=content.programs||{};content.programs.categories=$$('[data-category-row]').map(rowData);content.programs.items=$$('[data-program-row]').map(rowData);
    content.news=content.news||{};content.news.items=$$('[data-news-row]').map(rowData);
  }
  function bindRemoveRows(){$$('.remove-row').forEach(b=>b.onclick=()=>{b.closest('.editor-row').remove();collectEditors();updateDashboard()})}
  $('#addService').onclick=()=>{collectEditors();content.services.push({icon:'🌿',title:'خدمة جديدة',description:'',link:'beneficiaries.html',label:'طلب الخدمة ←'});renderEditors()};
  $('#addProgramCategory').onclick=()=>{collectEditors();content.programs.categories.push({icon:'✦',title:'تصنيف جديد',description:''});renderEditors()};
  $('#addProgram').onclick=()=>{collectEditors();content.programs.items.push({category:'برنامج',title:'برنامج جديد',summary:'',date:'',place:'',audience:'',url:''});renderEditors()};
  $('#addNews').onclick=()=>{collectEditors();content.news.items.push({type:'خبر',title:'خبر جديد',summary:'',date:'',url:''});renderEditors()};

  function updateDashboard(){collectEditors();$('#statPrograms').textContent=content.programs?.items?.length||0;$('#statNews').textContent=content.news?.items?.length||0;$('#statServices').textContent=content.services?.length||0;$('#statBeneficiaries').textContent=requests.filter(r=>r.formType==='beneficiary').length;$('#launchSummary').textContent=`موعد الإطلاق: ${content.launch?.dateLabel||content.launch?.date||'غير محدد'} — النافذة ${content.launch?.popupEnabled?'مفعّلة':'موقوفة'} لمدة ${content.launch?.popupSeconds||30} ثانية.`}

  async function loadRequests(){
    setSync(endpoint?'جارٍ جلب الطلبات...':'قراءة الطلبات المحلية...');
    try{
      if(endpoint){const r=await api({action:'adminRequestsList',token});requests=r.records||[];}
      else{
        requests=[];['beneficiary','volunteer','contact'].forEach(type=>{const arr=JSON.parse(localStorage.getItem('ribat_preview_'+type)||'[]');arr.forEach((x,i)=>requests.push({...x,formType:type,_localIndex:i,id:x._localId||`${type}-${i}`}))});
      }
      renderRequests();updateDashboard();setSync(endpoint?'متصل بالخادم':'معاينة محلية');
    }catch(e){setSync('تعذر جلب الطلبات');toast(e.message)}
  }
  function typeLabel(t){return ({beneficiary:'مستفيد',volunteer:'تطوع/شراكة',contact:'تواصل'})[t]||t||'طلب'}
  function filteredRequests(){const q=$('#requestSearch').value.trim().toLowerCase(),type=$('#requestTypeFilter').value;return requests.filter(r=>(!type||r.formType===type)&&(!q||JSON.stringify(r).toLowerCase().includes(q)))}
  function renderRequests(){
    const body=$('#requestsBody'), rows=filteredRequests(); if(!rows.length){body.innerHTML='<tr><td colspan="8" class="empty">لا توجد طلبات مطابقة.</td></tr>';return}
    body.innerHTML=rows.map(r=>`<tr data-id="${esc(r.id||'')}"><td>${esc(typeLabel(r.formType))}</td><td>${esc(formatDate(r.submittedAt))}</td><td><b>${esc(r.fullName||'')}</b><br><span class="small">${esc(r.email||'')}</span></td><td>${esc(r.mobile||'')}</td><td>${esc(r.serviceType||r.participationType||r.subject||'')}</td><td>${esc(r.details||r.message||'')}</td><td><select class="status-select" data-status><option ${sel(r.status,'جديد')}>جديد</option><option ${sel(r.status,'قيد المتابعة')}>قيد المتابعة</option><option ${sel(r.status,'مكتمل')}>مكتمل</option><option ${sel(r.status,'مغلق')}>مغلق</option></select></td><td><button class="btn btn-danger" data-delete>حذف</button></td></tr>`).join('');
    body.querySelectorAll('tr[data-id]').forEach(tr=>{const r=requests.find(x=>String(x.id)===tr.dataset.id);tr.querySelector('[data-status]').onchange=e=>updateRequest(r,e.target.value);tr.querySelector('[data-delete]').onclick=()=>deleteRequest(r)});
  }
  function sel(a,b){return (a||'جديد')===b?'selected':''} function formatDate(v){if(!v)return'';try{return new Date(v).toLocaleString('ar-SA')}catch{return v}}
  async function updateRequest(r,status){try{if(endpoint)await api({action:'adminRequestStatus',token,sheetName:r.sheetName,row:r.row,status});else{const arr=JSON.parse(localStorage.getItem('ribat_preview_'+r.formType)||'[]');if(arr[r._localIndex]){arr[r._localIndex].status=status;localStorage.setItem('ribat_preview_'+r.formType,JSON.stringify(arr));}}r.status=status;toast('تم تحديث حالة الطلب')}catch(e){toast('تعذر تحديث الحالة: '+e.message)}}
  async function deleteRequest(r){if(!confirm('هل تريدين حذف هذا الطلب؟ لا يمكن التراجع عن الحذف.'))return;try{if(endpoint)await api({action:'adminRequestDelete',token,sheetName:r.sheetName,row:r.row});else{const arr=JSON.parse(localStorage.getItem('ribat_preview_'+r.formType)||'[]');arr.splice(r._localIndex,1);localStorage.setItem('ribat_preview_'+r.formType,JSON.stringify(arr));}await loadRequests();toast('تم حذف الطلب')}catch(e){toast('تعذر الحذف: '+e.message)}}
  $('#requestSearch').oninput=renderRequests;$('#requestTypeFilter').onchange=renderRequests;$('#refreshRequests').onclick=loadRequests;$('#refreshDashboard').onclick=()=>{loadRequests();updateDashboard()};
  $('#exportRequests').onclick=()=>{const rows=filteredRequests();const cols=['formType','submittedAt','fullName','mobile','email','ageGroup','serviceType','participationType','subject','details','message','status'];const csv='\ufeff'+[cols.join(','),...rows.map(r=>cols.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='ribat-requests.csv';a.click();URL.revokeObjectURL(a.href)};

  $('#changeCredentials').onclick=async()=>{const username=$('#newAdminUser').value.trim(),password=$('#newAdminPassword').value;if(!username||password.length<10){toast('أدخلي اسم مستخدم وكلمة مرور لا تقل عن 10 أحرف');return}try{if(endpoint){await api({action:'adminChangeCredentials',token,username,password});token='';sessionStorage.removeItem('ribat_admin_token');toast('تم التحديث. أعيدي تسجيل الدخول.');setTimeout(()=>location.reload(),900)}else{localStorage.setItem('ribat_admin_preview',JSON.stringify({username,passwordHash:await sha256(password)}));toast('تم تحديث بيانات المعاينة المحلية')}}catch(e){toast('تعذر التحديث: '+e.message)}};

  $$('#adminNav button').forEach(b=>b.onclick=()=>{$$('#adminNav button').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(x=>x.classList.toggle('active',x.dataset.panelView===b.dataset.panel));$('#topTitle').textContent=b.textContent.replace(/^[^\s]+\s*/,'');$('#adminSidebar').classList.remove('open')});
  $('#mobileMenu').onclick=()=>$('#adminSidebar').classList.toggle('open');
  $('#logoutBtn').onclick=()=>{sessionStorage.removeItem('ribat_admin_token');sessionStorage.removeItem('ribat_admin_local');token='';localAuth=false;location.reload()};

  if((endpoint&&token)||(!endpoint&&localAuth)){ if(endpoint)loadRemoteContent().then(showAdmin).catch(()=>showLogin()); else showAdmin(); } else showLogin();
})();
