(function(){
  const STORAGE_KEY = 'habit-planner-rpg-v28';
  const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
  const REVIEW_WINDOW_MS = 12 * 60 * 60 * 1000;
  const REVIEW_DEFAULT_START = 9 * 60;
  let busy = false;
  function todayStart(d=new Date()){const x=new Date(d); x.setHours(0,0,0,0); return x;}
  function addDays(d,n){const x=new Date(d); x.setDate(x.getDate()+n); return x;}
  function sameDate(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
  function dayDate(weekStartIso,day){return addDays(new Date(weekStartIso),DAYS.indexOf(day));}
  function currentDay(weekStartIso,now=new Date()){return DAYS.find(day=>sameDate(dayDate(weekStartIso,day),now));}
  function isReview(state,block){return state?.tasks?.[block.taskId]?.kind==='review';}
  function hasAnySealed(state){return DAYS.some(day=>state?.week?.daySeals&&state.week.daySeals[day]);}
  function reviewStart(state,block){const d=dayDate(state.weekStartIso,block.day); const mins=typeof block.timeStart==='number'?block.timeStart:REVIEW_DEFAULT_START; d.setHours(Math.floor(mins/60),mins%60,0,0); return d;}
  function reviewEnd(state,block){return new Date(reviewStart(state,block).getTime()+REVIEW_WINDOW_MS);}
  function reviewEligible(state,block){if(!isReview(state,block))return false; if(block.status==='planned')return true; if(block.status==='done'&&(!block.reviewOpenedAt||!sameDate(new Date(block.reviewOpenedAt),dayDate(state.weekStartIso,block.day))))return true; return false;}
  function fmtTime(d){return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});}
  function read(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;}}
  function write(state){localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,toast:state.toast}));}
  function saveAndReload(state){write(state); window.setTimeout(()=>location.reload(),60);}
  function removeGateButtons(){document.querySelectorAll('button').forEach(btn=>{const text=(btn.textContent||'').trim(); if(text==='Review Gate'||text.startsWith('Gate ')||text==='Open Gate') btn.style.display='none'; if(text==='Open Review'){btn.disabled=true; btn.textContent='Opens automatically';}});}
  function renderBanner(state){
    let banner=document.querySelector('.system-window-banner.runtime-review-banner');
    const topbar=document.querySelector('.topbar');
    if(!topbar)return;
    let title='', detail='', active=false;
    const now=new Date();
    if(state?.week?.mode==='reviewOpen'&&state.week.reviewOpenUntil&&now<new Date(state.week.reviewOpenUntil)){
      active=true; title='Review window open'; detail=`All sealed days are editable until ${fmtTime(new Date(state.week.reviewOpenUntil))}. Reseal when done.`;
    }else{
      const next=(state?.blocks||[]).filter(b=>reviewEligible(state,b)).map(b=>({b,start:reviewStart(state,b),end:reviewEnd(state,b)})).filter(w=>w.end>now).sort((a,b)=>a.start-b.start)[0];
      if(next){title='Next review window'; detail=`${next.start.toLocaleString([], {weekday:'long',hour:'numeric',minute:'2-digit'})}–${fmtTime(next.end)}`;}
    }
    if(!title){banner&&banner.remove(); return;}
    if(!banner){banner=document.createElement('section'); banner.className='system-window-banner runtime-review-banner'; topbar.insertAdjacentElement('afterend',banner);}
    banner.className=`system-window-banner runtime-review-banner ${active?'active':'scheduled'}`;
    banner.innerHTML=`<strong>${title}</strong><span>${detail}</span>`;
  }
  function cleanSameDayReviewAdds(state,now=new Date()){
    const today=currentDay(state.weekStartIso,now); if(!today)return state;
    const before=state.blocks.length;
    const blocks=state.blocks.filter(b=>!(isReview(state,b)&&b.day===today&&sameDate(new Date(b.createdAt),now)&&b.status==='planned'));
    if(blocks.length!==before)return {...state,blocks,toast:'Review blocks must be planned before the review day.'};
    return state;
  }
  function sync(){
    if(busy)return; busy=true;
    try{
      removeGateButtons();
      let state=read(); if(!state||!state.week||!Array.isArray(state.blocks)){busy=false; return;}
      const now=new Date();
      const cleaned=cleanSameDayReviewAdds(state,now);
      if(cleaned!==state){saveAndReload(cleaned); busy=false; return;}
      const openUntil=state.week.reviewOpenUntil?new Date(state.week.reviewOpenUntil):null;
      if(state.week.mode==='reviewOpen'&&(!openUntil||now>=openUntil)){
        const sealed=hasAnySealed(state);
        state={...state,week:{...state.week,mode:sealed?'sealed':'draft',reviewOpenUntil:undefined,emergencyReviewRequestedAt:undefined,emergencyReviewUnlockAt:undefined},toast:sealed?'Review window closed. Plan resealed.':'Review window closed.'};
        saveAndReload(state); busy=false; return;
      }
      if(state.week.mode!=='reviewOpen'&&hasAnySealed(state)){
        const today=currentDay(state.weekStartIso,now);
        const due=today&&(state.blocks||[]).filter(b=>b.day===today&&reviewEligible(state,b)).map(b=>({b,start:reviewStart(state,b),end:reviewEnd(state,b)})).find(w=>now>=w.start&&now<w.end);
        if(due){
          state={...state,week:{...state.week,mode:'reviewOpen',reviewOpenUntil:due.end.toISOString(),emergencyReviewRequestedAt:undefined,emergencyReviewUnlockAt:undefined},blocks:state.blocks.map(b=>b.id===due.b.id?{...b,status:'done',reviewOpenedAt:now.toISOString()}:b),toast:'Review window open. Sealed days are editable for 12 hours.'};
          saveAndReload(state); busy=false; return;
        }
      }
      renderBanner(state);
    }finally{busy=false;}
  }
  document.addEventListener('DOMContentLoaded',sync);
  window.addEventListener('focus',sync);
  window.setInterval(sync,3000);
  sync();
})();
