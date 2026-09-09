const API="https://api.themoviedb.org/3", IMG="https://image.tmdb.org/t/p/";
const state={token:localStorage.getItem("tmdbToken")||"",mode:"random",genre:"all",era:"all",color:"all",movie:null,saved:JSON.parse(localStorage.getItem("stillRandomSaved")||"[]"),seen:[]};
const $=id=>document.getElementById(id);
const genres={28:"액션",12:"모험",16:"애니메이션",35:"코미디",80:"범죄",99:"다큐멘터리",18:"드라마",10751:"가족",14:"판타지",36:"역사",27:"공포",10402:"음악",9648:"미스터리",10749:"로맨스",878:"SF",10770:"TV 영화",53:"스릴러",10752:"전쟁",37:"서부"};
const genreIds=Object.fromEntries(Object.entries(genres).map(([k,v])=>[v,k]));
const eras=["all","1960s","1970s","1980s","1990s","2000s","2010s","2020s"];
const colors=["all","블루","레드","옐로우","그린","퍼플","어두운 톤","밝은 톤","다채로운 톤"];

function chips(id,items,key){const box=$(id);items.forEach(v=>{let b=document.createElement("button");b.className="chip"+(v==="all"?" active":"");b.textContent=v==="all"?"전체":v;b.onclick=()=>{state[key]=v;box.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");};box.appendChild(b)})}
chips("genreChips",["all",...Object.values(genres)],"genre");chips("eraChips",eras,"era");chips("colorChips",colors,"color");

async function api(path,params={}){
 if(!state.token) throw new Error("TMDB_TOKEN_REQUIRED");
 const u=new URL(API+path);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
 const r=await fetch(u,{headers:{Authorization:`Bearer ${state.token}`,accept:"application/json"}});
 if(!r.ok) throw new Error(`TMDB ${r.status}`);
 return r.json();
}
function setStatus(text,ok=false){$("statusText").textContent=text;document.querySelector(".live-status").classList.toggle("ok",ok)}
function loading(on){$("loading").classList.toggle("hidden",!on)}
function yearRange(){if(state.era==="all")return{};let y=parseInt(state.era);return {"primary_release_date.gte":`${y}-01-01`,"primary_release_date.lte":`${y+9}-12-31`}}

async function getRandomMovie(){
 if(!state.token){$("settingsModal").classList.remove("hidden");return}
 loading(true);setStatus("TMDB 검색 중…");
 try{
  let p={language:"ko-KR",include_adult:false,sort_by:"popularity.desc",vote_count_gte:30,page:1,...yearRange()};
  if(state.mode==="filter"&&state.genre!=="all")p.with_genres=genreIds[state.genre];
  let pageCount=state.mode==="random"?500:100;
  p.page=Math.floor(Math.random()*pageCount)+1;
  let list=await api("/discover/movie",p);
  let candidates=(list.results||[]).filter(m=>m.backdrop_path);
  if(!candidates.length)throw new Error("NO_MOVIE");
  let movie=candidates[Math.floor(Math.random()*candidates.length)];
  await showMovie(movie);
 }catch(e){console.error(e);setStatus("연결 오류");alert(e.message==="TMDB_TOKEN_REQUIRED"?"먼저 TMDB API 토큰을 입력해주세요.":"영화를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");}
 finally{loading(false)}
}

async function showMovie(m){
 state.movie=m;
 let [detail,credits,images]=await Promise.all([
  api(`/movie/${m.id}`,{language:"ko-KR"}),
  api(`/movie/${m.id}/credits`,{language:"ko-KR"}),
  api(`/movie/${m.id}/images`,{include_image_language:"ko,en,null"})
 ]);
 const backs=images.backdrops||[];
 let still=backs.length?backs[Math.floor(Math.random()*backs.length)]:null;
 if(!still && m.backdrop_path)still={file_path:m.backdrop_path};
 if(!still)throw new Error("NO_IMAGE");
 const image=IMG+"w1280"+still.file_path;
 const img=$("stillImage");img.classList.remove("loaded");img.src=image;
 img.onload=async()=>{img.classList.add("loaded");$("movieColor").textContent=await analyzeColor(img)};
 const director=(credits.crew||[]).find(x=>x.job==="Director");
 $("movieTitle").textContent=detail.title||m.title;
 $("movieMeta").textContent=`${(detail.release_date||"").slice(0,4)||"—"} · ${detail.original_title||""}`;
 $("movieDescription").textContent=detail.overview||"설명이 제공되지 않습니다.";
 $("movieDirector").textContent=director?.name||"—";
 $("movieGenre").textContent=(detail.genres||[]).map(g=>g.name).join(" / ")||"—";
 $("movieRating").textContent=detail.vote_average?`${detail.vote_average.toFixed(1)} / 10`:"—";
 $("movieCountry").textContent=(detail.production_countries||[]).map(c=>c.name).slice(0,2).join(" / ")||"—";
 $("movieRuntime").textContent=detail.runtime?`${detail.runtime}분`:"—";
 const y=parseInt((detail.release_date||"0").slice(0,4));$("movieTags").innerHTML=`<span>${y?`${Math.floor(y/10)*10}s`:"YEAR"}</span><span>LIVE</span><span>TMDB</span>`;
 $("tmdbLink").href=`https://www.themoviedb.org/movie/${m.id}`;
 $("saveBtn").classList.toggle("saved",state.saved.includes(m.id));$("saveBtn").textContent=state.saved.includes(m.id)?"♥":"♡";
 setStatus("LIVE / TMDB",true);
}

async function analyzeColor(img){
 try{
  const c=document.createElement("canvas"),x=c.getContext("2d"),w=60,h=40;c.width=w;c.height=h;x.drawImage(img,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data;let r=0,g=0,b=0,n=0;
  for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++}
  r/=n;g/=n;b/=n;let max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(max<65)return"어두운 톤";if(min>190)return"밝은 톤";
  if(max-min<35)return"다채로운 톤";
  if(b>r*1.2&&b>g*1.05)return"블루";if(r>g*1.25&&r>b*1.2)return"레드";if(r>150&&g>120&&b<100)return"옐로우";if(g>r*1.15&&g>b*1.05)return"그린";if(r>b*1.15&&b>g*1.1)return"퍼플";return"다채로운 톤";
 }catch{return"분석 불가"}
}

function toggleSave(){
 if(!state.movie)return;let id=state.movie.id;
 state.saved=state.saved.includes(id)?state.saved.filter(x=>x!==id):[...state.saved,id];
 localStorage.setItem("stillRandomSaved",JSON.stringify(state.saved));$("savedCount").textContent=state.saved.length;
 $("saveBtn").classList.toggle("saved",state.saved.includes(id));$("saveBtn").textContent=state.saved.includes(id)?"♥":"♡";renderSaved();
}
function renderSaved(){
 $("savedCount").textContent=state.saved.length;let grid=$("savedGrid");grid.innerHTML="";
 let all=JSON.parse(localStorage.getItem("stillRandomCache")||"{}");
 let items=state.saved.map(id=>all[id]).filter(Boolean);$("emptySaved").classList.toggle("hidden",items.length>0);
 items.forEach(m=>{let c=document.createElement("div");c.className="saved-card";c.innerHTML=`<img src="${IMG}w500${m.backdrop_path}"><div><h3>${m.title}</h3><p>${(m.release_date||"").slice(0,4)}</p></div>`;c.onclick=()=>showMovie(m);grid.appendChild(c)})
}
function cacheMovie(m){let all=JSON.parse(localStorage.getItem("stillRandomCache")||"{}");all[m.id]=m;localStorage.setItem("stillRandomCache",JSON.stringify(all))}

$("randomBtn").onclick=getRandomMovie;$("nextBtn").onclick=getRandomMovie;$("saveBtn").onclick=()=>{if(state.movie)cacheMovie(state.movie);toggleSave()};
$("savedBtn").onclick=()=>{$("savedPanel").classList.remove("hidden");renderSaved();$("savedPanel").scrollIntoView({behavior:"smooth"})};
$("closeSaved").onclick=()=>$("savedPanel").classList.add("hidden");
$("settingsBtn").onclick=()=>{$("tokenInput").value=state.token;$("settingsModal").classList.remove("hidden")};
$("closeSettings").onclick=()=>$("settingsModal").classList.add("hidden");
$("connectBtn").onclick=async()=>{
 const t=$("tokenInput").value.trim();if(!t)return alert("TMDB Read Access Token을 입력해주세요.");
 state.token=t;
 try{await api("/configuration");if($("rememberToken").checked)localStorage.setItem("tmdbToken",t);else localStorage.removeItem("tmdbToken");$("settingsModal").classList.add("hidden");setStatus("TMDB 연결 완료",true);getRandomMovie()}catch{state.token="";alert("토큰이 올바르지 않거나 TMDB에 연결할 수 없습니다.")}
};
document.querySelectorAll("#modeChips .chip").forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll("#modeChips .chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("filterPanel").classList.toggle("hidden",state.mode!=="filter")});
$("savedCount").textContent=state.saved.length;
if(state.token)getRandomMovie();else setStatus("API 토큰 필요");
