/* Shared booking form for /issledovanie/, /fokus/, /prozharka/.
   Booking.mount(el, {page:"fokus", gift:false, cta:"Оставить заявку"}) renders the form into el.
   A request goes to the ChatPlace hook (src:"zayavka", the watcher picks it up) and, when GS is set,
   straight to the owner's Google Sheet, so a copy exists outside the server. */
(function(){
var HOOK="https://api.chatplace.io/hooks/01a1e5445c2b71c6bbd1183090abe683b55929c62e3b3b7024e0f079cc2b0a1e2f393a003088b865";
var GS="";
var WD=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"], MON=["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function days(){
  // dates in Moscow time (UTC+3, no DST), starting tomorrow
  var msk=new Date(Date.now()+3*3600e3), out=[];
  // Larisa's meeting windows (25.11): Tue, Wed, Thu 11:00-18:00 MSK, last start 18:00; next 5 such days
  for(var k=1;out.length<5&&k<=21;k++){
    var d=new Date(Date.UTC(msk.getUTCFullYear(),msk.getUTCMonth(),msk.getUTCDate()+k)), w=d.getUTCDay();
    if(w<2||w>4) continue;
    out.push({wd:WD[w],date:d.getUTCDate()+" "+MON[d.getUTCMonth()],times:["11:00","14:00","18:00"]});
  }
  return out;
}
function mount(el,o){
  var V=o.vy?{l:"Какую задачу хотите решить?",ph:"Пара предложений своими словами",nm:"Как к вам обращаться",e1:"Напишите, какую задачу хотите решить",e2:"Выберите день и время",e3:"Напишите имя",e4:"Проверьте ник в Telegram: латиница, цифры и _",ok:"Напишем вам в Telegram в течение часа и подтвердим время.",ne:"Не отправилось, попробуйте ещё раз"}:
    {l:"Какую задачу хочешь решить?",ph:"Пара предложений своими словами",nm:"Как к тебе обращаться",e1:"Напиши, какую задачу хочешь решить",e2:"Выбери день и время",e3:"Напиши имя",e4:"Проверь ник в Telegram: латиница, цифры и _",ok:"Напишем тебе в Telegram в течение часа и подтвердим время.",ne:"Не отправилось, попробуй ещё раз"};
  var test=/[?&]test=1/.test(location.search), slot="";
  var rows=days().map(function(d){
    return '<div class="bk-day"><div class="bk-dn">'+d.wd+'<small>'+d.date+'</small></div><div class="bk-slots">'+
      d.times.map(function(t){var v=d.wd+" "+d.date+" "+t+" МСК";return '<button type="button" class="bk-s" data-v="'+esc(v)+'">'+t+'</button>';}).join("")+'</div></div>';
  }).join("");
  el.classList.add("bk");
  el.innerHTML='<label class="bk-l">'+V.l+'</label><textarea data-f="task" placeholder="'+V.ph+'"></textarea>'+
    '<label class="bk-l">День и время<small>время московское</small></label><div class="bk-days">'+rows+'</div>'+
    '<label class="bk-l">Имя</label><input data-f="name" autocomplete="given-name" placeholder="'+V.nm+'">'+
    '<label class="bk-l">Ник в Telegram</label><input data-f="tg" autocomplete="off" placeholder="@ник">'+
    '<button type="button" class="bk-go">'+esc(o.cta||"Оставить заявку")+'</button>'+
    '<p class="bk-note">Подтвердим заявку и время в личных сообщениях Telegram</p>';
  var go=el.querySelector(".bk-go"), daysEl=el.querySelector(".bk-days");
  function f(n){return el.querySelector('[data-f="'+n+'"]');}
  function err(msg,bad){
    var old=el.querySelector(".bk-err"); if(old) old.remove();
    var d=document.createElement("div"); d.className="bk-err"; d.textContent=msg; go.insertAdjacentElement("afterend",d);
    if(bad){ bad.classList.add("bad"); if(bad.focus) bad.focus(); }
  }
  el.querySelectorAll(".bk-s").forEach(function(b){ b.onclick=function(){
    el.querySelectorAll(".bk-s").forEach(function(x){x.classList.remove("on")}); b.classList.add("on"); slot=b.dataset.v;
    daysEl.classList.remove("bad"); var e=el.querySelector(".bk-err"); if(e) e.remove();
  };});
  el.querySelectorAll("[data-f]").forEach(function(i){ i.addEventListener("input",function(){ i.classList.remove("bad"); var e=el.querySelector(".bk-err"); if(e) e.remove(); }); });
  go.onclick=function(){
    var task=f("task").value.trim(), name=f("name").value.trim(), tg=f("tg").value.trim().replace(/^@+/,"").replace(/^https?:\/\/t\.me\//,"");
    if(!task) return err(V.e1,f("task"));
    if(!slot){ err(V.e2); daysEl.scrollIntoView({behavior:"smooth",block:"center"}); return; }
    if(!name) return err(V.e3,f("name"));
    if(!/^[A-Za-z0-9_]{4,32}$/.test(tg)) return err(V.e4,f("tg"));
    go.disabled=true; go.textContent="Отправляем…";
    var p={src:"zayavka",page:o.page,gift:!!o.gift,paid:!!o.paid,task:task,slot:slot,name:name,tg:"@"+tg,ts:new Date().toISOString()};
    if(test) p.test=true;
    if(GS) try{fetch(GS,{method:"POST",mode:"no-cors",body:JSON.stringify({form:"Заявки на встречу",
      "Страница":o.page,"Подарок":o.gift?"да":"нет","Оплачено":o.paid?"да":"","Задача":task,"Время":slot,"Имя":name,"Ник":"@"+tg,"Тест":test?"да":""})})}catch(e){}
    fetch(HOOK,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(p)})
    .then(function(r){ if(!r.ok) throw 0;
      el.innerHTML='<div class="bk-ok"><b>Заявка принята</b><p>'+V.ok+'</p></div>';
      if(o.onDone) try{o.onDone()}catch(e){}
    })
    .catch(function(){ go.disabled=false; go.textContent=o.cta||"Оставить заявку"; err(V.ne); });
  };
}
window.Booking={mount:mount};
})();
