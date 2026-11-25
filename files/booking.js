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
  for(var k=1;k<=5;k++){
    var d=new Date(Date.UTC(msk.getUTCFullYear(),msk.getUTCMonth(),msk.getUTCDate()+k)), w=d.getUTCDay();
    out.push({wd:WD[w],date:d.getUTCDate()+" "+MON[d.getUTCMonth()],times:(w===0||w===6)?["12:00","17:00"]:["11:00","15:00","19:00"]});
  }
  return out;
}
function mount(el,o){
  var test=/[?&]test=1/.test(location.search), slot="";
  var rows=days().map(function(d){
    return '<div class="bk-day"><div class="bk-dn">'+d.wd+'<small>'+d.date+'</small></div><div class="bk-slots">'+
      d.times.map(function(t){var v=d.wd+" "+d.date+" "+t+" МСК";return '<button type="button" class="bk-s" data-v="'+esc(v)+'">'+t+'</button>';}).join("")+'</div></div>';
  }).join("");
  el.classList.add("bk");
  el.innerHTML='<label class="bk-l">Какую задачу хочешь решить?</label><textarea data-f="task" placeholder="Пара предложений своими словами"></textarea>'+
    '<label class="bk-l">День и время<small>время московское</small></label><div class="bk-days">'+rows+'</div>'+
    '<label class="bk-l">Имя</label><input data-f="name" autocomplete="given-name" placeholder="Как к тебе обращаться">'+
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
    if(!task) return err("Напиши, какую задачу хочешь решить",f("task"));
    if(!slot){ err("Выбери день и время"); daysEl.scrollIntoView({behavior:"smooth",block:"center"}); return; }
    if(!name) return err("Напиши имя",f("name"));
    if(!/^[A-Za-z0-9_]{4,32}$/.test(tg)) return err("Проверь ник в Telegram: латиница, цифры и _",f("tg"));
    go.disabled=true; go.textContent="Отправляем…";
    var p={src:"zayavka",page:o.page,gift:!!o.gift,task:task,slot:slot,name:name,tg:"@"+tg,ts:new Date().toISOString()};
    if(test) p.test=true;
    if(GS) try{fetch(GS,{method:"POST",mode:"no-cors",body:JSON.stringify({form:"Заявки на встречу",
      "Страница":o.page,"Подарок":o.gift?"да":"нет","Задача":task,"Время":slot,"Имя":name,"Ник":"@"+tg,"Тест":test?"да":""})})}catch(e){}
    fetch(HOOK,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(p)})
    .then(function(r){ if(!r.ok) throw 0;
      el.innerHTML='<div class="bk-ok"><b>Заявка принята</b><p>Напишем тебе в Telegram в течение часа и подтвердим время.</p></div>';
      if(o.onDone) try{o.onDone()}catch(e){}
    })
    .catch(function(){ go.disabled=false; go.textContent=o.cta||"Оставить заявку"; err("Не отправилось, попробуй ещё раз"); });
  };
}
window.Booking={mount:mount};
})();
