(() => {
  async function submitRibatForm(form){
    const status=form.querySelector('.form-status');
    status.className='form-status'; status.textContent='';
    if(!form.reportValidity()) return;
    const btn=form.querySelector('[type="submit"]'); const old=btn.textContent; btn.disabled=true; btn.textContent='جاري الإرسال...';
    const data=Object.fromEntries(new FormData(form).entries());
    data.action='formSubmit'; data.formType=form.dataset.formType || 'general'; data.submittedAt=new Date().toISOString();
    const endpoint=window.RIBAT_CONFIG?.forms?.endpoint?.trim();
    try{
      if(endpoint){
        const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(data)});
        const out=await res.json().catch(async()=>({ok:res.ok,text:await res.text()}));
        if(!res.ok || out.ok===false) throw new Error(out.error||'تعذر الإرسال');
        status.textContent='تم استلام الطلب بنجاح. شكرًا لتواصلكم مع جمعية رباط.';
      }else{
        const key='ribat_preview_'+data.formType; const arr=JSON.parse(localStorage.getItem(key)||'[]');
        data._localId=Date.now()+'-'+Math.random().toString(16).slice(2); data.status='جديد'; arr.push(data); localStorage.setItem(key,JSON.stringify(arr));
        status.textContent='تم حفظ الطلب على هذا الجهاز في وضع المعاينة. فعّلي رابط Google Apps Script قبل الإطلاق العام.';
      }
      status.classList.add('success'); form.reset();
    }catch(e){status.textContent='تعذر إرسال الطلب حاليًا. يرجى المحاولة لاحقًا.';status.classList.add('error');}
    finally{btn.disabled=false;btn.textContent=old;}
  }
  document.querySelectorAll('form[data-ribat-form]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();submitRibatForm(f)}));
})();
