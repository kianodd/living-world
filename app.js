/* LIVING WORLD — web simulation engine (Node-compatible core + browser UI)
   Deterministic seeded sim. No fake systems: every panel reads live sim state. */
(function(global){
'use strict';
// ---------- RNG ----------
function RNG(seed){ this.s=seed>>>0||1; }
RNG.prototype.next=function(){ let t=this.s+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
RNG.prototype.range=function(a,b){ return a+(b-a)*this.next(); };
RNG.prototype.int=function(a,b){ return Math.floor(this.range(a,b+1)); };
RNG.prototype.pick=function(arr){ return arr[Math.floor(this.next()*arr.length)]; };
RNG.prototype.chance=function(p){ return this.next()<p; };
function hash2(x,y,seed){ let h=(x*374761393+y*668265263+seed*974634211)>>>0; h=Math.imul(h^(h>>>13),1274126177); return (((h^(h>>>16))>>>0)/4294967296); }
function smooth(t){ return t*t*(3-2*t); }
function valueNoise(x,y,seed){ const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const a=hash2(xi,yi,seed), b=hash2(xi+1,yi,seed), c=hash2(xi,yi+1,seed), d=hash2(xi+1,yi+1,seed);
  const u=smooth(xf), v=smooth(yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
function fbm(x,y,seed){ return valueNoise(x,y,seed)*0.6+valueNoise(x*2.1,y*2.1,seed+7)*0.28+valueNoise(x*4.3,y*4.3,seed+13)*0.12; }

// ---------- static data ----------
const MALE=['آرش','کیان','بردیا','سهراب','پارسا','مهرداد','فرهاد','بهروز','نیما','داریوش','کوروش','امیر','رضا','سعید','حامد','میلاد','آریا','پویا','شهریار','رستم'];
const FEMALE=['سارا','نیلوفر','آیدا','مهسا','نگار','لیلا','مریم','زهرا','الهه','تارا','شیرین','پریسا','یاسمین','رها','آتنا','سحر','مونا','نازنین','باران','گلنار'];
const FAMILY=['کیان‌فرد','رستمی','مهرابی','نیک‌نام','شریفی','احمدی','کریمی','محمدی','جعفری','حسینی','رضایی','قاسمی','موسوی','علوی','نادری','سلیمانی','فرهادی','بهرامی','یوسفی','طاهری'];
const TRAITS=['شجاعت','ترس','جاه‌طلبی','مهربانی','خشونت','کنجکاوی','خلاقیت','تنبلی','نظم','وفاداری','خودخواهی','اجتماعی‌بودن','ریسک‌پذیری','طمع','اعتماد','همدلی'];
const SKILLS=['کشاورزی','شکار','ماهیگیری','ساخت‌وساز','معدن‌کاری','آهنگری','نجاری','آشپزی','پزشکی','تجارت','مذاکره','مدیریت','رهبری','جنگاوری','تیراندازی','مهندسی','تحقیق','هنر','موسیقی','آموزش','دیپلماسی'];
const GENES=['قد','وزن','رنگ‌پوست','رنگ‌چشم','ساختاربدن','قدرت','سرعت','استقامت','هوش','حافظه','طول‌عمر','مقاومت‌بیماری','باروری','سازگاری‌اقلیم','یادگیری','رفتار'];
// 12 core genes used by engine (subset of 16 named above mapped): use 12:
const GENE_KEYS=['height','strength','speed','stamina','intelligence','memory','lifespan','immunity','fertility','climate','learning','skin'];
const JOBS=[
 {id:'gatherer',name:'گردآورنده',skill:'شکار',wage:2,risk:0.02},{id:'hunter',name:'شکارچی',skill:'شکار',wage:4,risk:0.08},
 {id:'farmer',name:'کشاورز',skill:'کشاورزی',wage:4,risk:0.02},{id:'fisher',name:'ماهیگیر',skill:'ماهیگیری',wage:4,risk:0.05},
 {id:'smith',name:'آهنگر',skill:'آهنگری',wage:7,risk:0.05},{id:'miner',name:'معدنچی',skill:'معدن‌کاری',wage:6,risk:0.12},
 {id:'builder',name:'سازنده',skill:'ساخت‌وساز',wage:6,risk:0.06},{id:'cook',name:'آشپز',skill:'آشپزی',wage:4,risk:0.01},
 {id:'doctor',name:'پزشک',skill:'پزشکی',wage:9,risk:0.04},{id:'teacher',name:'معلم',skill:'آموزش',wage:6,risk:0.01},
 {id:'scientist',name:'دانشمند',skill:'تحقیق',wage:9,risk:0.01},{id:'trader',name:'تاجر',skill:'تجارت',wage:8,risk:0.03},
 {id:'guard',name:'نگهبان',skill:'جنگاوری',wage:5,risk:0.07},{id:'soldier',name:'سرباز',skill:'جنگاوری',wage:6,risk:0.15},
 {id:'judge',name:'قاضی',skill:'مذاکره',wage:8,risk:0.01},{id:'artist',name:'هنرمند',skill:'هنر',wage:3,risk:0.01},
 {id:'herder',name:'دامدار',skill:'کشاورزی',wage:4,risk:0.03},{id:'carpenter',name:'نجار',skill:'نجاری',wage:6,risk:0.04},
 {id:'engineer',name:'مهندس',skill:'مهندسی',wage:9,risk:0.02},{id:'diplomat',name:'دیپلمات',skill:'دیپلماسی',wage:8,risk:0.02},
 {id:'worker',name:'کارگر',skill:'ساخت‌وساز',wage:3,risk:0.05}];
const GOODS=['food','wood','stone','iron','tool','herb'];
const GOOD_FA={food:'غذا',wood:'چوب',stone:'سنگ',iron:'آهن',tool:'ابزار',herb:'گیاه‌دارویی'};
const TECHS=[
 {id:'tools',name:'ابزار ابتدایی',era:0,branch:'صنعت',cost:20,pre:[]},
 {id:'fire',name:'آتش',era:0,branch:'صنعت',cost:15,pre:[]},
 {id:'hunting2',name:'شکار پیشرفته',era:0,branch:'نظامی',cost:25,pre:['tools']},
 {id:'pottery',name:'سفالگری',era:0,branch:'صنعت',cost:30,pre:['fire']},
 {id:'agriculture',name:'کشاورزی',era:1,branch:'کشاورزی',cost:50,pre:['tools']},
 {id:'irrigation',name:'آبیاری',era:1,branch:'کشاورزی',cost:60,pre:['agriculture']},
 {id:'herding',name:'دامداری',era:1,branch:'کشاورزی',cost:45,pre:['agriculture']},
 {id:'spear',name:'نیزه',era:0,branch:'نظامی',cost:25,pre:['tools']},
 {id:'bow',name:'کمان',era:1,branch:'نظامی',cost:55,pre:['hunting2']},
 {id:'herbal',name:'گیاهان دارویی',era:0,branch:'پزشکی',cost:25,pre:[]},
 {id:'writing',name:'زبان نوشتاری',era:2,branch:'دانش',cost:70,pre:['pottery']},
 {id:'wheel',name:'چرخ',era:2,branch:'صنعت',cost:70,pre:['pottery']},
 {id:'smelting',name:'ذوب فلز',era:3,branch:'صنعت',cost:90,pre:['fire','tools']},
 {id:'smithing',name:'آهنگری',era:3,branch:'صنعت',cost:100,pre:['smelting']},
 {id:'sword',name:'شمشیر',era:3,branch:'نظامی',cost:90,pre:['smithing']},
 {id:'armor',name:'زره',era:3,branch:'نظامی',cost:95,pre:['smithing']},
 {id:'stonebuild',name:'سازه‌های سنگی',era:2,branch:'معماری',cost:80,pre:['tools']},
 {id:'bridge',name:'پل',era:2,branch:'معماری',cost:85,pre:['stonebuild','wheel']},
 {id:'qanat',name:'قنات',era:2,branch:'معماری',cost:90,pre:['irrigation']},
 {id:'cropRotation',name:'تناوب زراعی',era:2,branch:'کشاورزی',cost:75,pre:['agriculture']},
 {id:'fertilizer',name:'کوددهی',era:2,branch:'کشاورزی',cost:80,pre:['cropRotation']},
 {id:'surgery',name:'جراحی ابتدایی',era:2,branch:'پزشکی',cost:85,pre:['herbal']},
 {id:'hygiene',name:'بهداشت',era:3,branch:'پزشکی',cost:90,pre:['surgery']},
 {id:'school',name:'آموزش رسمی',era:3,branch:'دانش',cost:95,pre:['writing']},
 {id:'library',name:'کتابخانه',era:4,branch:'دانش',cost:110,pre:['school']},
 {id:'university',name:'دانشگاه',era:5,branch:'دانش',cost:160,pre:['library']},
 {id:'printing',name:'چاپ',era:5,branch:'دانش',cost:140,pre:['writing']},
 {id:'gunpowder',name:'باروت',era:5,branch:'نظامی',cost:150,pre:['smithing']},
 {id:'firearm',name:'سلاح گرم',era:6,branch:'نظامی',cost:180,pre:['gunpowder']},
 {id:'machines',name:'ماشین‌آلات',era:6,branch:'صنعت',cost:170,pre:['smithing','wheel']},
 {id:'factory',name:'کارخانه',era:7,branch:'صنعت',cost:200,pre:['machines']},
 {id:'electricity',name:'برق',era:8,branch:'صنعت',cost:220,pre:['factory']},
 {id:'vaccine',name:'واکسیناسیون',era:6,branch:'پزشکی',cost:170,pre:['hygiene']},
 {id:'medicine',name:'پزشکی علمی',era:7,branch:'پزشکی',cost:200,pre:['vaccine']},
 {id:'pharma',name:'داروسازی',era:8,branch:'پزشکی',cost:230,pre:['medicine']},
 {id:'mechanized',name:'کشاورزی مکانیزه',era:7,branch:'کشاورزی',cost:200,pre:['machines','fertilizer']},
 {id:'rail',name:'حمل‌ونقل ریلی',era:7,branch:'صنعت',cost:210,pre:['machines']},
 {id:'radio',name:'ارتباطات بی‌سیم',era:8,branch:'دانش',cost:220,pre:['electricity']},
 {id:'computer',name:'رایانه',era:9,branch:'دانش',cost:260,pre:['electricity']},
 {id:'ai',name:'هوش مصنوعی',era:10,branch:'دانش',cost:320,pre:['computer']},
 {id:'robotics',name:'رباتیک',era:10,branch:'صنعت',cost:320,pre:['computer','machines']},
 {id:'space',name:'فناوری فضایی',era:11,branch:'دانش',cost:380,pre:['computer','rocket']},
 {id:'rocket',name:'موشک',era:9,branch:'صنعت',cost:280,pre:['machines','gunpowder']},
 {id:'genetics',name:'ژنتیک',era:10,branch:'پزشکی',cost:330,pre:['medicine','computer']}];
const ERAS=['شکار و گردآوری','کشاورزی','روستاها','فلزات','شهرنشینی','امپراتوری‌ها','علم','صنعت','برق','دیجیتال','اتوماسیون','پیشرفته'];
const CULTURE_NAMES=['ساحل‌نشین','کوهستان','جنگل','بیابان','دشت','رودخانه','شمال','جنوب'];
const LANG_CONS=['b','d','g','k','l','m','n','p','r','s','t','z','sh','ch'];
const LANG_VOW=['a','e','i','o','u','aa','ei'];
function makeWord(rng,cons,vow){ const n=rng.int(2,3); let w=''; for(let i=0;i<n;i++){ w+=rng.pick(cons)+rng.pick(vow); } return w; }
function makeLanguage(rng,name){ const cons=rng.pick([LANG_CONS.slice(0,8),LANG_CONS.slice(4),LANG_CONS]); const vow=LANG_VOW.slice(0,rng.int(4,7));
  const vocab={}; ['سلام','غذا','آب','خانه','جنگ','صلح','پدر','مادر','خورشید','ماه'].forEach(k=>vocab[k]=makeWord(rng,cons,vow));
  return {name,cons,vow,vocab,order:rng.pick(['SVO','SOV','VSO']),writing:0,divergence:0,parent:null,family:name,words:Object.keys(vocab).length}; }
function sentence(lang,rng){ const w=lang.vocab; const s=[w['سلام'],w['غذا'],w['آب']]; return s.join(' ')+' — ('+lang.order+')'; }

// ---------- helpers ----------
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function lifeStage(age){ return age<1?'نوزاد':age<7?'کودک':age<14?'نوجوان':age<35?'بزرگسال':age<60?'میان‌سال':'سالمند'; }
function phenotypeFromGenome(g,env){ // polygenic: average of 2 alleles per gene + env
  const ph={}; for(const k of GENE_KEYS){ const a=g[k]; ph[k]=clamp((a[0]+a[1])/2,0,1); }
  ph.height=150+ph.height*45; ph.lifespan=45+ph.lifespan*45; ph.immunity=ph.immunity; ph.climate=ph.climate;
  if(env) ph.climateFit=1-Math.abs(ph.climate-env); return ph; }
function newGenome(rng,mother,father){ const g={};
  for(const k of GENE_KEYS){ let a,b;
    if(mother&&father){ a=rng.chance(0.5)?mother.genome[k][0]:mother.genome[k][1]; b=rng.chance(0.5)?father.genome[k][0]:father.genome[k][1]; }
    else { a=rng.next(); b=rng.next(); }
    if(rng.chance(0.03)){ a=clamp(a+rng.range(-0.2,0.2),0,1); } // mutation
    if(rng.chance(0.03)){ b=clamp(b+rng.range(-0.2,0.2),0,1); }
    g[k]=[a,b]; } return g; }

// ---------- World ----------
function World(seed){
  this.seed=seed; this.rng=new RNG(seed);
  this.W=96; this.H=60; this.day=1; this.year=1; this.seasonIdx=0;
  this.nextId=1; this.generationMax=1;
  this.agents=[]; this.archive=[]; this.deadCount=0; this.births=0; this.deaths=0;
  this.tiles=[]; this.tribes=[]; this.cities=[]; this.nations=[]; this.companies=[];
  this.cultures=[]; this.languages=[]; this.wars=[]; this.events=[]; this.history=[];
  this.relations={}; // "a-b" -> {v,history[]}
  this.prices={food:5,wood:3,stone:3,iron:12,tool:25,herb:8};
  this.supply={food:100,wood:100,stone:100,iron:20,tool:10,herb:20};
  this.demand={food:100,wood:50,stone:50,iron:20,tool:10,herb:15};
  this.weather={rain:0,snow:0,storm:false,drought:false,flood:false,fire:false,climateDrift:0};
  this.series={pop:[],births:[],deaths:[],foodPrice:[],gdp:[],tech:[]};
  this.snapshots={}; // year -> ownership string
  this.warMemory={}; // "natA-natB" -> wars count
  this.stats={crime:0,epidemics:0,warsStarted:0,techs:0};
  this.genWorld();
  this.genAgents(120);
  this.formTribes();
}
World.prototype.log=function(type,title,detail,actors){
  const e={day:this.day,year:this.year,type,title,detail:detail||'',actors:actors||[]};
  this.events.unshift(e); if(this.events.length>600) this.events.length=600;
  this.history.push(e); if(this.history.length>2000) this.history.splice(0,500);
  return e;
};
World.prototype.genWorld=function(){
  const rng=this.rng;
  for(let y=0;y<this.H;y++) for(let x=0;x<this.W;x++){
    const e=fbm(x*0.045,y*0.045,this.seed);
    const m=fbm(x*0.06+40,y*0.06+40,this.seed+99);
    let biome, temp, fert, water, minerals, food;
    const elev=e;
    if(e<0.32){ biome='ocean'; temp=18; fert=0; water=1; minerals=0; food=0.2; }
    else if(e<0.36){ biome='coast'; temp=22; fert=0.4; water=0.9; minerals=0.1; food=0.5; }
    else if(m>0.72&&e>0.4){ biome='swamp'; temp=24; fert=0.7; water=1; minerals=0.1; food=0.6; }
    else if(e>0.78){ biome='snow'; temp=-5; fert=0.1; water=0.4; minerals=0.3; food=0.1; }
    else if(e>0.68){ biome='mountain'; temp=8; fert=0.15; water=0.3; minerals=0.9; food=0.15; }
    else if(m<0.28){ biome='desert'; temp=34; fert=0.1; water=0.05; minerals=0.2; food=0.1; }
    else if(m>0.55){ biome='forest'; temp=20; fert=0.7; water=0.6; minerals=0.2; food=0.9; }
    else { biome='plains'; temp=24; fert=0.85; water=0.5; minerals=0.15; food=0.8; }
    // lakes & rivers: low moisture pockets inland
    if(biome!=='ocean'&&biome!=='coast'&&fbm(x*0.11+9,y*0.11+9,this.seed+5)>0.72){ biome='lake'; water=1; food=0.6; fert=0.3; }
    if(biome==='plains'&&Math.abs(fbm(x*0.03,y*0.2,this.seed+21)-0.5)<0.02){ biome='river'; water=1; fert=0.9; food=0.7; }
    const t={x,y,elev,moist:m,biome,temp,humidity:m,rainfall:m*1200,fertility:fert,water,minerals,foodDensity:food,owner:null,tribe:null,nation:null,city:null,pop:0,resource:biome==='forest'?'wood':biome==='mountain'?'iron':biome==='plains'?'food':'none'};
    this.tiles.push(t);
  }
};
World.prototype.tileAt=function(x,y){ if(x<0||y<0||x>=this.W||y>=this.H) return null; return this.tiles[y*this.W+x]; };
World.prototype.landTiles=function(){ return this.tiles.filter(t=>t.biome!=='ocean'); };
World.prototype.newAgent=function(opts){
  opts=opts||{}; const rng=this.rng;
  const sex=opts.sex||(rng.chance(0.5)?'male':'female');
  const fam=opts.family||rng.pick(FAMILY);
  const genome=newGenome(rng,opts.mother,opts.father);
  const ph=phenotypeFromGenome(genome,{});
  const a={ id:this.nextId++, name:(sex==='male'?rng.pick(MALE):rng.pick(FEMALE)), family:fam, sex,
    age:opts.age!=null?opts.age:rng.int(18,40), birthYear:this.year-Math.floor((opts.age!=null?opts.age:25)),
    birthDay:this.day, x:opts.x!=null?opts.x:rng.int(10,this.W-10), y:opts.y!=null?opts.y:rng.int(10,this.H-10),
    genome, ph, generation:opts.generation||1,
    traits:{}, skills:{}, needs:{food:80,water:80,sleep:80,safety:70,shelter:60,temp:80,health:90,social:60,belonging:50,repro:40,achievement:50},
    money:opts.money!=null?opts.money:rng.int(5,60), food:opts.food!=null?opts.food:20, wood:0, stone:0, iron:0, tool:0, herb:0,
    job:opts.job||null, tribe:opts.tribe||null, city:opts.city||null, nation:opts.nation||null,
    culture:opts.culture||null, lang:opts.lang||null, spouse:null, mother:opts.mother?opts.mother.id:null, father:opts.father?opts.father.id:null,
    children:[], health:90, sick:null, sickDays:0, pregnant:null, pregnantDays:0, alive:true, memories:[], goal:'زنده ماندن', lastAction:'—',
    home:null, debt:0, savings:0, income:0, expense:0, crime:0, loyal:50 };
  TRAITS.forEach(t=>a.traits[t]=rng.int(5,95));
  SKILLS.forEach(s=>a.skills[s]={lvl:rng.int(0,3),xp:0});
  if(opts.mother) opts.mother.children.push(a.id);
  if(opts.father) opts.father.children.push(a.id);
  this.generationMax=Math.max(this.generationMax,a.generation);
  return a;
};
World.prototype.genAgents=function(n){
  const land=this.landTiles().filter(t=>t.biome!=='ocean'&&t.biome!=='mountain'&&t.biome!=='snow');
  for(let i=0;i<n;i++){ const t=this.rng.pick(land); const a=this.newAgent({x:t.x,y:t.y}); this.agents.push(a); }
};
World.prototype.formTribes=function(){
  // cluster agents by proximity into tribes (up to 6)
  const rng=this.rng; const unassigned=this.agents.slice(); let ti=0;
  while(unassigned.length>0 && ti<6){
    const seedA=unassigned.shift(); const cx=seedA.x, cy=seedA.y;
    const members=[seedA]; const rest=[];
    for(const a of unassigned){ const d=Math.hypot(a.x-cx,a.y-cy); if(d<14) members.push(a); else rest.push(a); }
    unassigned.length=0; unassigned.push(...rest);
    if(members.length<4){ // too small: leave tribaless for now, they join later
      members.forEach(a=>{a.tribe=null;}); continue; }
    let cname=rng.pick(CULTURE_NAMES)+'‌ها'; if(this.cultures.find(c=>c.name==='فرهنگ '+cname)) cname=cname+' '+(ti+2);
    const culture={id:this.cultures.length+1,name:'فرهنگ '+cname,origin:{x:cx,y:cy},year:this.year,values:{war:rng.int(10,90),trade:rng.int(20,95),science:rng.int(10,90),family:rng.int(50,98),religion:rng.int(10,90)},customs:['جشن برداشت','آیین ازدواج','مراسم تدفین'],food:rng.pick(['نان و گوشت','ماهی و برنج','میوه جنگل','خرما و نان']),art:rng.pick(['سفال','بافت','نقاشی سنگی','موسیقی']),followers:members.length,extinct:false};
    this.cultures.push(culture);
    const lang=makeLanguage(rng,'زبان '+cname); lang.id=this.languages.length+1; this.languages.push(lang);
    const tribe={id:this.tribes.length+1,name:'قبیله '+cname,leader:null,pop:members.length,x:cx,y:cy,culture:culture.id,lang:lang.id,tech:{},research:0,era:0,wealth:0,food:200};
    this.tribes.push(tribe);
    members.forEach(a=>{a.tribe=tribe.id;a.culture=culture.id;a.lang=lang.id;});
    // leader: highest leadership+strength+support
    let best=null,bs=-1; members.forEach(a=>{ const s=a.traits['رهبری']||a.traits['جاه‌طلبی']+a.ph.strength*40; if(s>bs){bs=s;best=a;} });
    tribe.leader=best?best.id:null;
    this.log('tribe','تأسیس قبیله '+tribe.name,'قبیله‌ای با '+members.length+' نفر در ('+cx+','+cy+') شکل گرفت.',members.map(m=>m.id));
    ti++;
  }
  // stragglers join nearest tribe
  this.agents.forEach(a=>{ if(!a.tribe&&this.tribes.length){ let best=this.tribes[0],bd=1e9; this.tribes.forEach(t=>{const d=Math.hypot(a.x-t.x,a.y-t.y); if(d<bd){bd=d;best=t;}}); a.tribe=best.id;a.culture=best.culture;a.lang=best.lang; } });
};
World.prototype.agentById=function(id){ return this.agents.find(a=>a.id===id)||this.archive.find(a=>a.id===id)||null; };
World.prototype.relKey=function(a,b){ return a<b?a+'-'+b:b+'-'+a; };
World.prototype.getRel=function(a,b){ const k=this.relKey(a,b); if(!this.relations[k]) this.relations[k]={v:0,history:[],type:'none'}; return this.relations[k]; };
World.prototype.addRel=function(a,b,dv,type){ const r=this.getRel(a,b); r.v=clamp(r.v+dv,-100,100); if(type) r.type=type; r.history.push({year:this.year,dv}); if(r.history.length>20) r.history.shift(); };

// ---------- daily tick ----------
World.prototype.seasonName=function(){ return ['بهار','تابستان','پاییز','زمستان'][this.seasonIdx]; };
World.prototype.updateWeather=function(){
  const rng=this.rng; const drift=Math.sin(this.year*0.05)*2+this.weather.climateDrift;
  const s=this.seasonIdx;
  this.weather.rain=s===0?rng.chance(0.4):s===1?rng.chance(0.15):s===2?rng.chance(0.35):rng.chance(0.25);
  this.weather.snow=s===3&&rng.chance(0.3);
  this.weather.storm=rng.chance(0.03);
  this.weather.drought=rng.chance(0.008);
  this.weather.flood=this.weather.rain&&rng.chance(0.02);
  this.weather.fire=s===1&&rng.chance(0.01);
  if(this.weather.drought) this.weather.climateDrift+=0.01;
  this.weather.tempDrift=drift;
};
World.prototype.tileOf=function(a){ return this.tileAt(Math.round(a.x),Math.round(a.y))||this.tiles[0]; };
World.prototype.nearestTile=function(a,fn){ let best=null,bd=1e9; for(const t of this.tiles){ if(!fn(t)) continue; const d=Math.hypot(t.x-a.x,t.y-a.y); if(d<bd){bd=d;best=t;} } return best; };

World.prototype.decide=function(a){
  // Utility AI: score each option by need urgency x personality x skill x money x law x env
  const n=a.needs, t=a.traits, rng=this.rng;
  const tile=this.tileOf(a);
  const foodPrice=this.prices.food;
  const opts=[];
  const urg=(k)=> (100-n[k])/100;
  opts.push({act:'gather',s:urg('food')*0.9*(0.5+a.skills['شکار'].lvl*0.15)*(tile.foodDensity+0.3)*(this.weather.drought?0.4:1)*(this.weather.rain?1.1:1)});
  opts.push({act:'hunt',s:urg('food')*0.8*(0.4+a.skills['شکار'].lvl*0.2)*(0.5+t['شجاعت']/100)*(tile.biome==='forest'||tile.biome==='plains'?1.2:0.6)});
  opts.push({act:'fish',s:urg('food')*0.8*(0.4+a.skills['ماهیگیری'].lvl*0.2)*(tile.water>0.7?1.5:0.2)});
  opts.push({act:'farm',s:urg('food')*0.7*(0.4+a.skills['کشاورزی'].lvl*0.2)*(tile.fertility)*(a.tribe&&this.tribeHasTech(a.tribe,'agriculture')?1.5:0.8)*(this.seasonIdx===3?0.3:1)});
  opts.push({act:'mine',s:urg('achievement')*0.6*(0.4+a.skills['معدن‌کاری'].lvl*0.2)*(tile.minerals+0.2)*(a.money<20?1.3:0.7)});
  opts.push({act:'craft',s:urg('achievement')*0.6*(0.4+a.skills['آهنگری'].lvl*0.2)*(a.iron>0?1.4:0.3)});
  opts.push({act:'trade',s:urg('food')*0.7*(a.money>foodPrice?1.2:0.2)*(0.5+t['تجارت']?0:0)*(0.5+a.skills['تجارت'].lvl*0.15)});
  opts.push({act:'rest',s:urg('sleep')*1.0+urg('health')*0.5});
  opts.push({act:'social',s:urg('social')*0.9*(t['اجتماعی‌بودن']/100+0.3)});
  opts.push({act:'marry',s:(a.age>=16&&a.age<=50&&!a.spouse)?urg('repro')*0.8*(t['اجتماعی‌بودن']/100+0.3):0});
  opts.push({act:'repro',s:(a.spouse&&a.sex==='female'&&a.age>=16&&a.age<=42&&!a.pregnant)?urg('repro')*0.9*(a.ph.fertility):0});
  opts.push({act:'migrate',s:(tile.foodDensity<0.25||this.weather.drought)?0.9*(t['کنجکاوی']/100+0.4):urg('food')*0.2});
  opts.push({act:'work',s:0.45*(a.job?1:0.3)*(a.money<15?1.4:0.8)});
  opts.push({act:'learn',s:(a.age<25?0.5:0.2)*(a.ph.learning)*(t['کنجکاوی']/100+0.3)});
  opts.sort((x,y)=>y.s-x.s);
  return opts[0].act;
};
World.prototype.tribeHasTech=function(tribeId,techId){ const tr=this.tribes.find(t=>t.id===tribeId); return tr&&tr.tech[techId]; };
World.prototype.doAction=function(a,act){
  const rng=this.rng, tile=this.tileOf(a); a.lastAction=act;
  const gainSkill=(name,amt)=>{ const sk=a.skills[name]; sk.xp+=amt; if(sk.xp>=10){sk.lvl=Math.min(10,sk.lvl+1); sk.xp=0; a.memories.push({year:this.year,text:'مهارت '+name+' به سطح '+sk.lvl+' رسید'});} };
  if(act==='gather'){ const y=Math.round(tile.foodDensity*8*(this.weather.rain?1.2:1)*(this.weather.drought?0.3:1)); a.food+=y; this.supply.food+=y*0.5; gainSkill('شکار',1); a.needs.food=clamp(a.needs.food+15,0,100); }
  else if(act==='hunt'){ if(rng.chance(0.5+a.skills['شکار'].lvl*0.04)){ a.food+=10; this.supply.food+=5; } a.needs.food=clamp(a.needs.food+10,0,100); gainSkill('شکار',2); if(rng.chance(0.05)) a.health-=5; }
  else if(act==='fish'){ if(tile.water>0.5){ a.food+=8; this.supply.food+=4; gainSkill('ماهیگیری',2);} a.needs.food=clamp(a.needs.food+8,0,100); }
  else if(act==='farm'){ const tr=this.tribes.find(t=>t.id===a.tribe); const y=Math.round(tile.fertility*10*(this.weather.rain?1.3:0.8)*(this.weather.drought?0.2:1)*(tr&&tr.tech['agriculture']?1.5:1)); a.food+=y; if(tr) tr.food+=y; this.supply.food+=y; gainSkill('کشاورزی',2); }
  else if(act==='mine'){ const y=Math.round(1+tile.minerals*3); a.stone+=y; if(rng.chance(tile.minerals)) a.iron+=1; this.supply.stone+=y; gainSkill('معدن‌کاری',2); if(rng.chance(0.08)) a.health-=4; }
  else if(act==='craft'){ if(a.iron>=1){ a.iron--; a.tool++; this.supply.tool++; gainSkill('آهنگری',3); a.money+=5; } else if(a.wood>=2){ a.wood-=2; a.tool++; } }
  else if(act==='trade'){ this.buyFood(a); }
  else if(act==='rest'){ a.needs.sleep=100; a.health=clamp(a.health+5,0,100); a.needs.health=clamp(a.needs.health+5,0,100); }
  else if(act==='social'){ a.needs.social=clamp(a.needs.social+25,0,100); a.needs.belonging=clamp(a.needs.belonging+10,0,100);
    const others=this.agents.filter(o=>o!==a&&o.alive&&Math.hypot(o.x-a.x,o.y-a.y)<6); if(others.length){ const o=rng.pick(others); this.addRel(a.id,o.id,2,'friend'); if(rng.chance(0.1)) a.memories.push({year:this.year,text:'با '+o.name+' دوست شد'}); } }
  else if(act==='marry'){ this.tryMarry(a); }
  else if(act==='repro'){ this.tryPregnancy(a); }
  else if(act==='migrate'){ const dest=this.nearestTile(a,t=>t.biome!=='ocean'&&t.foodDensity>0.6); if(dest){ a.x=dest.x+rng.int(-3,3); a.y=dest.y+rng.int(-3,3); a.memories.push({year:this.year,text:'به منطقه حاصلخیزتر مهاجرت کرد'}); this.log('migration',a.name+' مهاجرت کرد','کمبود غذا باعث مهاجرت شد.',[a.id]); } }
  else if(act==='work'){ this.doJob(a); }
  else if(act==='learn'){ gainSkill(rng.pick(SKILLS),2); a.needs.achievement=clamp(a.needs.achievement+8,0,100); const tr=this.tribes.find(t=>t.id===a.tribe); if(tr&&a.skills['تحقیق'].lvl>=2) tr.research+=a.ph.intelligence*0.2; }
  // eat & drink every day (real consumption)
  if(a.food>0){ a.food--; a.needs.food=clamp(a.needs.food+20,0,100); } else { a.needs.food=clamp(a.needs.food-25,0,100); a.health-=6; }
  if(tile.water>0.1||a.city){ a.needs.water=clamp(a.needs.water+20,0,100); } else { a.needs.water-=15; a.health-=3; }
  a.needs.sleep=clamp(a.needs.sleep-8,0,100); a.needs.social=clamp(a.needs.social-3,0,100);
  if(a.needs.food<20) a.health-=4; if(a.needs.water<20) a.health-=4;
  if(a.health<30&&rng.chance(0.1)) a.sick='ضعف عمومی';
};
World.prototype.buyFood=function(a){
  const p=this.prices.food; if(a.money>=p&&this.supply.food>0){ a.money-=p; a.food+=3; this.supply.food-=1; this.demand.food+=1; a.expense+=p; }
  else if(a.food<=0&&a.traits['طمع']>70&&rng_chance(this)){ /* steal attempt */ }
  function rng_chance(w){ return w.rng.chance(0.1); }
};
World.prototype.doJob=function(a){
  if(!a.job){ // pick best job by skill & wage & demand
    let best=null,bs=-1; for(const j of JOBS){ const crowded=this.agents.filter(o=>o.job===j.id).length; const s=a.skills[j.skill].lvl*2+j.wage*(this.demand[j.id]||1)/10-crowded*1.5; if(s>bs){bs=s;best=j;} } a.job=best.id; }
  const j=JOBS.find(x=>x.id===a.job); if(!j) return;
  const wage=j.wage*(1+(this.demand[j.id]||0)/50);
  a.money+=wage; a.income+=wage;
  const sk=a.skills[j.skill]; sk.xp+=2; if(sk.xp>=10){sk.lvl=Math.min(10,sk.lvl+1);sk.xp=0;}
  if(j.id==='farmer'){ const y=4; a.food+=y; this.supply.food+=y; }
  if(j.id==='miner'){ a.iron+=this.rng.chance(0.4)?1:0; a.stone+=2; }
  if(j.id==='smith'&&a.iron>0){ a.iron--; a.tool++; this.supply.tool++; }
  if(j.id==='fisher'){ a.food+=6; this.supply.food+=3; }
  if(j.id==='hunter'){ a.food+=7; this.supply.food+=3; }
  if(j.id==='doctor'){ // treat nearby sick
    const sick=this.agents.find(o=>o.alive&&o.sick&&Math.hypot(o.x-a.x,o.y-a.y)<8); if(sick){ sick.sick=null; sick.health=clamp(sick.health+20,0,100); a.money+=3; } }
  if(j.id==='scientist'){ const tr=this.tribes.find(t=>t.id===a.tribe); if(tr) tr.research+=0.3*a.ph.intelligence; }
  if(j.id==='trader'){ a.money+=2; }
  if(this.rng.chance(j.risk*0.1)) a.health-=5;
  a.needs.achievement=clamp(a.needs.achievement+6,0,100);
};
World.prototype.tryMarry=function(a){
  const cand=this.agents.filter(o=>o.alive&&o!==a&&o.sex!==a.sex&&!o.spouse&&o.age>=16&&o.age<=50&&Math.hypot(o.x-a.x,o.y-a.y)<10&&o.tribe===a.tribe);
  if(!cand.length) return;
  const o=this.rng.pick(cand); const rel=this.getRel(a.id,o.id);
  if(rel.v>-20||this.rng.chance(0.4)){ a.spouse=o.id; o.spouse=a.id; this.addRel(a.id,o.id,40,'marriage'); this.addRel(a.id,o.id,0,'marriage');
    this.log('marriage','ازدواج '+a.name+' و '+o.name,'ازدواج در قبیله '+(this.tribes.find(t=>t.id===a.tribe)||{}).name,[a.id,o.id]);
    if((a.culture!==o.culture)&&this.rng.chance(0.3)) this.log('culture','ازدواج سیاسی/فرهنگی','دو فرهنگ از طریق ازدواج به هم نزدیک شدند.',[a.id,o.id]); }
};
World.prototype.tryPregnancy=function(a){
  const sp=this.agentById(a.spouse); if(!sp) return;
  if(this.rng.chance(0.25*a.ph.fertility*(sp.ph.fertility+0.5))){ a.pregnant={father:sp.id,days:0}; a.pregnantDays=0; }
};
World.prototype.giveBirth=function(a){
  const father=this.agentById(a.pregnant?a.pregnant.father:null);
  const child=this.newAgent({x:a.x+this.rng.int(-2,2),y:a.y+this.rng.int(-2,2),age:0,sex:this.rng.chance(0.5)?'male':'female',mother:a,father:father||null,tribe:a.tribe,culture:a.culture,lang:a.lang,generation:a.generation+1,money:0,food:5});
  child.birthYear=this.year; this.agents.push(child); this.births++;
  a.pregnant=null; a.pregnantDays=0; a.children.push(child.id);
  this.log('birth','تولد '+child.name+' '+child.family,'فرزند '+a.name+' در نسل '+child.generation+' به دنیا آمد.',[child.id,a.id]);
  if(a.health<50&&this.rng.chance(0.15)){ a.health-=20; this.log('health','عوارض بارداری برای '+a.name,'سلامت مادر پایین بود.',[a.id]); }
};
World.prototype.die=function(a,cause){
  a.alive=false; this.deaths++;
  const idx=this.agents.indexOf(a); if(idx>=0) this.agents.splice(idx,1);
  // inheritance: money/house to spouse or eldest child
  const heirs=[a.spouse,a.children[0]].map(id=>id?this.agentById(id):null).filter(x=>x&&x.alive);
  if(heirs.length&&a.money>0){ const h=heirs[0]; h.money+=Math.floor(a.money*0.8); h.savings+=Math.floor(a.money*0.2); }
  this.archive.push({id:a.id,name:a.name,family:a.family,sex:a.sex,age:a.age,birthYear:a.birthYear,deathYear:this.year,cause,generation:a.generation,mother:a.mother,father:a.father,children:a.children.slice(),job:a.job,money:a.money,genome:a.genome});
  if(this.archive.length>5000) this.archive.splice(0,1000);
  this.log('death','مرگ '+a.name+' '+a.family,'علت: '+cause+' — سن '+Math.floor(a.age)+' — نسل '+a.generation,[a.id]);
  if(a.spouse){ const sp=this.agentById(a.spouse); if(sp) sp.spouse=null; }
};
World.prototype.spreadDisease=function(){
  const sick=this.agents.filter(a=>a.sick);
  for(const s of sick){ const near=this.agents.filter(o=>o.alive&&o!==s&&Math.hypot(o.x-s.x,o.y-s.y)<4);
    for(const o of near){ if(!o.sick&&this.rng.chance(0.03*(1-o.ph.immunity))){ o.sick='بیماری واگیردار'; o.sickDays=0; o.health-=10; } } }
  if(sick.length>15&&!this._epidemicLogged){ this._epidemicLogged=true; this.stats.epidemics++; this.log('epidemic','اپیدمی در جهان','بیش از ۱۵ نفر هم‌زمان بیمار شدند.',[]); }
  if(sick.length<5) this._epidemicLogged=false;
};

// ---------- tick ----------
World.prototype.tick=function(){
  this.day++;
  if(this.day>365){ this.day=1; this.year++; this.onYear(); }
  this.seasonIdx=Math.floor(((this.day-1)/91.25))%4;
  this.updateWeather();
  // staggered decisions: all agents decide daily (120-300, cheap)
  const snapshot=this.agents.slice();
  for(const a of snapshot){
    if(!a.alive) continue;
    a.age+=1/365;
    if(a.pregnant){ a.pregnantDays++; if(a.pregnantDays>=270) this.giveBirth(a); }
    if(a.sick){ a.sickDays++; a.health-=1; if(a.sickDays>20||this.rng.chance(a.ph.immunity*0.3)){ a.sick=null; a.health=clamp(a.health+10,0,100); } }
    const act=this.decide(a); this.doAction(a,act);
    // natural death: lifespan phenotype + age
    const lifeExp=a.ph.lifespan;
    if(a.age>lifeExp&&this.rng.chance(0.02)) { this.die(a,'پیری'); continue; }
    if(a.health<=0){ this.die(a,a.sick?'بیماری':'گرسنگی'); continue; }
    if(a.age>90){ this.die(a,'پیری'); continue; }
    // crime: poor + greedy may steal
    if(a.money<5&&a.food<2&&a.traits['طمع']>60&&this.rng.chance(0.02)){ a.crime++; this.stats.crime++; const v=this.agents.find(o=>o.alive&&o!==a&&Math.hypot(o.x-a.x,o.y-a.y)<5&&o.money>10); if(v){ v.money-=5; a.money+=5; a.memories.push({year:this.year,text:'دزدی کرد'}); } }
  }
  this.spreadDisease();
  // monthly-ish every 30 days
  if(this.day%30===0) this.onMonth();
  // cap population: if >300, oldest sick/starving die faster (handled by health), archive handled in die()
};
World.prototype.onMonth=function(){
  // market prices from real supply/demand
  for(const g of GOODS){ const s=this.supply[g]||1, d=this.demand[g]||1; const ratio=Math.min(3,d/Math.max(1,s));
    this.prices[g]=clamp(this.prices[g]*(0.75+ratio*0.25),1,120); this.supply[g]=Math.max(0,this.supply[g]*0.9); this.demand[g]=Math.max(5,this.demand[g]*0.95); }
  // wages rise when labour scarce: encoded in doJob via demand; update job demand from city needs
  this.formCities(); this.formNations(); this.updateTech(); this.updateDiplomacy(); this.updateCultures(); this.updateLanguages();
  // companies: profit/debt/bankruptcy from real trade
  for(const c of this.companies.slice()){
    const rev=c.employees.length*8+this.rng.int(0,20); const cost=c.employees.length*5+10; c.profit=rev-cost; c.money+=c.profit;
    if(c.money<-50){ this.log('economy','ورشکستگی '+c.name,'شرکت ورشکست شد.',[c.owner]); this.companies.splice(this.companies.indexOf(c),1); }
  }
  // rich agents may found a company
  const rich=this.agents.filter(a=>a.money>200&&!this.companies.find(c=>c.owner===a.id));
  if(rich.length&&this.rng.chance(0.3)){ const a=this.rng.pick(rich); const co={id:this.companies.length+1,name:'شرکت '+a.family,owner:a.id,employees:[],money:100,profit:0,debt:0,product:this.rng.pick(GOODS),city:a.city}; a.money-=100; this.companies.push(co); this.log('economy','تأسیس شرکت '+co.name,a.name+' شرکتی تأسیس کرد.',[a.id]); }
  // hire employees
  for(const c of this.companies){ const idle=this.agents.filter(a=>a.alive&&!a.job&&Math.hypot(a.x-(this.cities.find(ci=>ci.id===c.city)||{x:a.x}).x||0,0)<20); if(idle.length&&c.employees.length<5){ const e=idle[0]; e.job='worker'; c.employees.push(e.id); } }
};
World.prototype.formCities=function(){
  // cluster agents: settlement if >=8 within radius 6, upgrade by pop/security/resources
  const un=this.agents.filter(a=>a.alive&&!a.city);
  for(const a of un){
    const near=this.agents.filter(o=>o.alive&&Math.hypot(o.x-a.x,o.y-a.y)<6);
    if(near.length>=8){
      const cx=Math.round(near.reduce((s,o)=>s+o.x,0)/near.length), cy=Math.round(near.reduce((s,o)=>s+o.y,0)/near.length);
      const existing=this.cities.find(c=>Math.hypot(c.x-cx,c.y-cy)<8);
      if(existing){ near.forEach(o=>o.city=existing.id); existing.pop=near.length; }
      else {
        const city={id:this.cities.length+1,name:'شهر '+this.cities.length+1+' — '+this.rng.pick(FAMILY),x:cx,y:cy,pop:near.length,stage:'اردوگاه',buildings:[{type:'house',n:2}],food:100,crime:0,unemployment:0,tribe:a.tribe,nation:null,culture:a.culture,foundedYear:this.year};
        this.cities.push(city); near.forEach(o=>o.city=city.id);
        this.log('city','تأسیس '+city.name,'سکونتگاهی با '+near.length+' نفر شکل گرفت.',near.map(o=>o.id));
      }
    }
  }
  for(const c of this.cities){
    const pop=this.agents.filter(a=>a.alive&&a.city===c.id).length; c.pop=pop;
    const stage=pop<10?'اردوگاه':pop<25?'روستا':pop<50?'شهرک':pop<100?'شهر':pop<200?'شهر بزرگ':'کلان‌شهر';
    if(stage!==c.stage){ c.stage=stage; this.log('city',c.name+' به '+stage+' رسید','جمعیت: '+pop,[]); }
    // buildings with real function
    const has=(t)=>c.buildings.find(b=>b.type===t);
    if(pop>=15&&!has('farm')) c.buildings.push({type:'farm',n:1,yield:20});
    if(pop>=20&&!has('market')) c.buildings.push({type:'market',n:1});
    if(pop>=25&&!has('storage')) c.buildings.push({type:'storage',n:1,cap:500});
    if(pop>=30&&!has('workshop')) c.buildings.push({type:'workshop',n:1});
    if(pop>=35&&!has('school')) c.buildings.push({type:'school',n:1});
    if(pop>=40&&!has('hospital')) c.buildings.push({type:'hospital',n:1,cap:10});
    if(pop>=45&&!has('barracks')) c.buildings.push({type:'barracks',n:1});
    if(pop>=50&&!has('temple')) c.buildings.push({type:'temple',n:1});
    // farm yield by fertility+season
    const farm=has('farm'); if(farm){ const t=this.tileAt(c.x,c.y); farm.yield=Math.round((t?t.fertility:0.5)*20*(this.seasonIdx===3?0.3:1)*(this.weather.drought?0.3:1)); c.food+=farm.yield; this.supply.food+=farm.yield; }
    // hospital treats
    if(has('hospital')){ const sick=this.agents.filter(a=>a.alive&&a.city===c.id&&a.sick); sick.slice(0,3).forEach(s=>{s.sick=null;s.health=clamp(s.health+25,0,100);}); }
    // school teaches
    if(has('school')){ this.agents.filter(a=>a.alive&&a.city===c.id&&a.age<20).forEach(s=>{ s.skills['آموزش'].xp+=1; }); }
    c.crime=this.agents.filter(a=>a.alive&&a.city===c.id).reduce((s,a)=>s+a.crime,0);
    c.unemployment=this.agents.filter(a=>a.alive&&a.city===c.id&&!a.job).length;
    // tile ownership
    const t=this.tileAt(c.x,c.y); if(t){ t.city=c.id; t.owner=c.nation||c.tribe; }
  }
};
World.prototype.formNations=function(){
  for(const c of this.cities){
    if(c.pop>=25&&!c.nation){
      const gov=this.rng.pick(['قبیله‌سالاری','پادشاهی','جمهوری','دموکراسی','الیگارشی','فئودالی']);
      const nat={id:this.nations.length+1,name:'کشور '+c.name,capital:c.id,gov,leader:null,pop:c.pop,tech:{},research:0,era:0,tax:0.1,treasury:200,relations:{},army:0,foundedYear:this.year,culture:c.culture};
      // leader = city leader / richest / highest leadership
      const members=this.agents.filter(a=>a.alive&&a.city===c.id); let best=null,bs=-1; members.forEach(a=>{const s=(a.traits['رهبری']||50)+a.money/10; if(s>bs){bs=s;best=a;}});
      nat.leader=best?best.id:null; this.nations.push(nat); c.nation=nat.id;
      members.forEach(a=>a.nation=nat.id);
      this.log('nation','تأسیس '+nat.name,'کشوری با حکومت '+gov+' و پایتخت '+c.name+' شکل گرفت.',best?[best.id]:[]);
    }
  }
  for(const tr of this.tribes){
    const tpop=this.agents.filter(a=>a.alive&&a.tribe===tr.id).length;
    if(tpop>=60&&!this.nations.find(n=>n.culture===tr.culture)){
      const tc=this.cities.filter(c=>c.tribe===tr.id||Math.hypot(c.x-tr.x,c.y-tr.y)<20).sort((a,b)=>b.pop-a.pop)[0]; if(!tc) continue;
      const gov=this.rng.pick(['پادشاهی','جمهوری','قبیله‌سالاری','الیگارشی']);
      const nat={id:this.nations.length+1,name:'کشور '+tr.name,capital:tc.id,gov,leader:tr.leader,pop:tpop,tech:tr.tech,research:0,era:tr.era,tax:0.1,treasury:200,relations:{},army:0,foundedYear:this.year,culture:tr.culture};
      this.nations.push(nat); tc.nation=nat.id; this.agents.filter(a=>a.alive&&a.tribe===tr.id).forEach(a=>a.nation=nat.id);
      this.log('nation','تأسیس '+nat.name,'قبیله‌ای با '+tpop+' نفر به کشور تبدیل شد.',[tr.leader].filter(Boolean));
    }
  }
  for(const n of this.nations){ n.pop=this.agents.filter(a=>a.alive&&a.nation===n.id).length; n.army=this.agents.filter(a=>a.alive&&a.nation===n.id&&a.job==='soldier').length; n.treasury+=Math.round(n.pop*n.tax*2)-10; }
  // collapse if pop 0
  for(const n of this.nations.slice()){ if(n.pop===0){ this.log('nation','سقوط '+n.name,'کشور بدون جمعیت فروپاشید.',[]); this.nations.splice(this.nations.indexOf(n),1); } }
};
World.prototype.updateTech=function(){
  for(const tr of this.tribes){
    const scholars=this.agents.filter(a=>a.alive&&a.tribe===tr.id&&a.job==='scientist').length;
    tr.research+=scholars*2+this.agents.filter(a=>a.alive&&a.tribe===tr.id).length*0.05;
    for(const tech of TECHS){ if(tr.tech[tech.id]) continue; if(!tech.pre.every(p=>tr.tech[p])) continue;
      const effCost=tech.cost*(1+tech.era*0.4);
      if(tr.research>=effCost){ tr.tech[tech.id]=true; tr.research-=effCost; tr.era=Math.max(tr.era,tech.era); this.stats.techs++; this.log('tech','اختراع '+tech.name+' در '+tr.name,'فناوری جدید توسط دانشمندان قبیله کشف شد.',[]); break; } }
  }
  for(const n of this.nations){ const tr=this.tribes.find(t=>t.id===(this.cities.find(c=>c.id===n.capital)||{}).tribe); if(tr){ n.tech=tr.tech; n.era=tr.era; } }
};
World.prototype.updateDiplomacy=function(){
  if(this.nations.length<2) return;
  for(let i=0;i<this.nations.length;i++) for(let j=i+1;j<this.nations.length;j++){
    const A=this.nations[i], B=this.nations[j]; const k=A.id+'-'+B.id;
    if(!this.nationRelations) this.nationRelations={};
    if(this.nationRelations[k]==null){ this.nationRelations[k]=this.rng.int(-20,40); }
    let v=this.nationRelations[k];
    // trade increases relations, war memory decreases
    const mem=this.warMemory[k]||0; v-=mem*5;
    if(this.rng.chance(0.1)) v+=this.rng.int(-3,4);
    // trade: if both have food surplus
    if(this.rng.chance(0.05)){ v+=3; }
    this.nationRelations[k]=clamp(v,-100,100);
    // war trigger: very hostile + resources + army
    if(v<-50&&!this.wars.find(w=>w.active&&((w.a===A.id&&w.b===B.id)||(w.a===B.id&&w.b===A.id)))){
      if(A.army+B.army>2||this.rng.chance(0.2)){ this.startWar(A,B,'اختلاف مرزی و رقابت بر سر منابع'); }
    }
  }
  // resolve active wars monthly
  for(const w of this.wars.filter(w=>w.active)){
    w.months++;
    const A=this.nations.find(n=>n.id===w.a), B=this.nations.find(n=>n.id===w.b); if(!A||!B){ w.active=false; continue; }
    const powerA=A.army*10+A.pop+(A.era*20), powerB=B.army*10+B.pop+(B.era*20);
    const cas=Math.round(this.rng.int(1,5));
    // casualties from real soldiers
    const soldiersA=this.agents.filter(a=>a.alive&&a.nation===A.id&&a.job==='soldier');
    const soldiersB=this.agents.filter(a=>a.alive&&a.nation===B.id&&a.job==='soldier');
    const deadA=soldiersA.slice(0,Math.min(cas,soldiersA.length)); const deadB=soldiersB.slice(0,Math.min(cas,soldiersB.length));
    deadA.forEach(s=>this.die(s,'جنگ')); deadB.forEach(s=>this.die(s,'جنگ'));
    w.casualties+=deadA.length+deadB.length; w.cost+=cas*20;
    // displacement
    const civ=this.agents.filter(a=>a.alive&&a.nation===(powerA<powerB?A.id:B.id)); civ.slice(0,2).forEach(a=>{ a.x=clamp(a.x+this.rng.int(-10,10),0,this.W-1); a.y=clamp(a.y+this.rng.int(-10,10),0,this.H-1); });
    if(w.months>6||deadA.length+deadB.length===0&&w.months>3||this.rng.chance(0.15)){
      w.active=false; w.endYear=this.year; w.result=powerA>powerB?A.name+' پیروز شد':powerB>powerA?B.name+' پیروز شد':'صلح بدون پیروز';
      const loser=powerA>powerB?B:A, winner=powerA>powerB?A:B;
      // border change: loser city transfers
      const lc=this.cities.find(c=>c.nation===loser.id); if(lc&&this.rng.chance(0.5)){ lc.nation=winner.id; this.log('war','تغییر مرز پس از جنگ',lc.name+' به '+winner.name+' پیوست.',[]); }
      const k=w.a+'-'+w.b; this.warMemory[k]=(this.warMemory[k]||0)+1;
      if(!this.nationRelations) this.nationRelations={}; this.nationRelations[k]=-40;
      this.log('war','پایان جنگ '+w.name,'نتیجه: '+w.result+' — تلفات: '+w.casualties+' — هزینه: '+w.cost,[ ]);
    }
  }
};
World.prototype.startWar=function(A,B,cause){
  const war={id:this.wars.length+1,name:'جنگ '+A.name+' و '+B.name,a:A.id,b:B.id,startYear:this.year,cause,active:true,months:0,casualties:0,cost:0,result:null};
  this.wars.push(war); this.stats.warsStarted++;
  this.log('war','آغاز '+war.name,'علت: '+cause,[A.leader,B.leader].filter(Boolean));
  return war;
};
World.prototype.updateCultures=function(){
  for(const c of this.cultures){ if(c.extinct) continue; c.followers=this.agents.filter(a=>a.alive&&a.culture===c.id).length;
    if(c.followers===0){ c.extinct=true; this.log('culture','انقراض فرهنگ '+c.name,'دیگر پیروی ندارد.',[]); continue; }
    // gradual drift
    if(this.rng.chance(0.1)){ const k=this.rng.pick(Object.keys(c.values)); c.values[k]=clamp(c.values[k]+this.rng.int(-5,5),0,100); }
    // merge when two cultures meet in same city
  }
};
World.prototype.updateLanguages=function(){
  for(const l of this.languages){
    const speakers=this.agents.filter(a=>a.alive&&a.lang===l.id).length; if(speakers===0) continue;
    l.divergence+=this.rng.range(0,0.08);
    // dialect split: if divergence high and speakers separated, split
    if(l.divergence>12){ const nl=makeLanguage(this.rng,l.name+' (گویش)'); nl.id=this.languages.length+1; nl.parent=l.id; nl.family=l.family; this.languages.push(nl);
      // half speakers adopt new dialect
      const sp=this.agents.filter(a=>a.alive&&a.lang===l.id); sp.slice(0,Math.floor(sp.length/2)).forEach(a=>a.lang=nl.id);
      l.divergence=0; this.log('language','انشعاب زبان '+l.name,'گویش جدیدی شکل گرفت: '+nl.name,[]); }
    if(this.rng.chance(0.05)){ const k=this.rng.pick(Object.keys(l.vocab)); l.vocab[k]=makeWord(this.rng,l.cons,l.vow); }
  }
};
World.prototype.onYear=function(){
  const pop=this.agents.length;
  const gdp=this.agents.reduce((s,a)=>s+a.income,0)+this.companies.reduce((s,c)=>s+Math.max(0,c.profit),0);
  const techLevel=this.tribes.reduce((s,t)=>s+t.era,0)/Math.max(1,this.tribes.length);
  this.series.pop.push(pop); this.series.births.push(this.births); this.series.deaths.push(this.deaths); this.series.foodPrice.push(this.prices.food); this.series.gdp.push(gdp); this.series.tech.push(techLevel);
  // snapshot ownership for historical map
  let snap=''; for(const t of this.tiles){ snap+=String.fromCharCode(97+((t.nation||t.tribe||0)%26)); }
  this.snapshots[this.year]=snap;
  this.births=0; this.deaths=0;
  // reset yearly income
  this.agents.forEach(a=>{ a.income=0; a.expense=0; });
  if(this.year%10===0) this.log('history','سال '+this.year+' سپری شد','جمعیت: '+pop+' — شهرها: '+this.cities.length+' — کشورها: '+this.nations.length,[]);
};
World.prototype.macro=function(){
  const pop=this.agents.length; const incomes=this.agents.map(a=>a.money).sort((a,b)=>a-b);
  const mean=incomes.reduce((s,v)=>s+v,0)/Math.max(1,pop);
  let gini=0; if(pop>1){ let sum=0; for(let i=0;i<pop;i++) for(let j=0;j<pop;j++) sum+=Math.abs(incomes[i]-incomes[j]); gini=sum/(2*pop*pop*mean||1); }
  const poor=this.agents.filter(a=>a.money<10).length;
  const unemployed=this.agents.filter(a=>a.alive&&!a.job&&a.age>=16&&a.age<60).length;
  const gdp=this.agents.reduce((s,a)=>s+a.income,0);
  return {pop,mean:Math.round(mean),gini:+gini.toFixed(2),poor,unemployed,gdp,foodPrice:this.prices.food,cities:this.cities.length,nations:this.nations.length,tribes:this.tribes.length,wars:this.wars.filter(w=>w.active).length,tech:this.tribes.reduce((s,t)=>s+t.era,0)/Math.max(1,this.tribes.length)};
};
// ---------- God mode ----------
World.prototype.god=function(action,arg){
  const rng=this.rng;
  if(action==='createAgent'){ const t=this.rng.pick(this.landTiles()); const a=this.newAgent({x:t.x,y:t.y,age:20}); this.agents.push(a); this.log('god','خدا: ایجاد موجود','موجود جدید '+a.name+' ساخته شد.',[a.id]); return a; }
  if(action==='removeAgent'){ const a=this.agents[0]; if(a) this.die(a,'مداخله خدا'); return a; }
  if(action==='spawnFood'){ this.supply.food+=200; this.log('god','خدا: ایجاد غذا','۲۰۰ واحد غذا به جهان اضافه شد.',[]); }
  if(action==='disease'){ const a=this.rng.pick(this.agents); if(a){ a.sick='بیماری واگیردار'; this.log('god','خدا: ایجاد بیماری',a.name+' بیمار شد.',[a.id]); } }
  if(action==='disaster'){ this.weather.storm=true; this.agents.slice(0,5).forEach(a=>a.health-=20); this.log('god','خدا: بلای طبیعی','طوفان به جهان آسیب زد.',[]); }
  if(action==='drought'){ this.weather.drought=true; this.log('god','خدا: خشکسالی','خشکسالی آغاز شد.',[]); }
  if(action==='rain'){ this.weather.rain=true; this.log('god','خدا: باران','باران فراوان بارید.',[]); }
  if(action==='grantTech'){ const tr=this.tribes[0]; if(tr){ const un=TECHS.find(t=>!tr.tech[t.id]); if(un){ tr.tech[un.id]=true; this.log('god','خدا: اعطای فناوری',un.name+' به '+tr.name+' داده شد.',[]); } } }
  if(action==='startWar'){ if(this.nations.length>=2) this.startWar(this.nations[0],this.nations[1],'مداخله خدا'); else if(this.tribes.length>=2){ this.log('god','خدا: جنگ قبیله‌ای','دو قبیله درگیر شدند.',[]); } }
  if(action==='endWar'){ this.wars.filter(w=>w.active).forEach(w=>{w.active=false;w.result='پایان با مداخله خدا';}); this.log('god','خدا: پایان جنگ','همه جنگ‌ها متوقف شدند.',[]); }
  if(action==='createCity'){ const t=this.rng.pick(this.landTiles()); const c={id:this.cities.length+1,name:'شهر خدا',x:t.x,y:t.y,pop:10,stage:'روستا',buildings:[{type:'house',n:2}],food:100,crime:0,unemployment:0,tribe:null,nation:null,culture:1,foundedYear:this.year}; this.cities.push(c); this.log('god','خدا: ایجاد شهر','شهری جدید ساخته شد.',[]); }
  if(action==='money'){ this.agents.forEach(a=>a.money+=50); this.log('god','خدا: ثروت','به همه ۵۰ سکه داده شد.',[]); }
  return null;
};
// ---------- save/load ----------
World.prototype.serialize=function(){
  return JSON.stringify({seed:this.seed,day:this.day,year:this.year,nextId:this.nextId,agents:this.agents,archive:this.archive,tribes:this.tribes,cities:this.cities,nations:this.nations,companies:this.companies,cultures:this.cultures,languages:this.languages,wars:this.wars,events:this.events.slice(0,200),history:this.history.slice(-500),prices:this.prices,supply:this.supply,demand:this.demand,series:this.series,snapshots:this.snapshots,stats:this.stats,relations:this.relations});
};
World.deserialize=function(json){
  const d=JSON.parse(json); const w=new World(d.seed); Object.assign(w,{day:d.day,year:d.year,nextId:d.nextId,agents:d.agents,archive:d.archive||[],tribes:d.tribes,cities:d.cities,nations:d.nations,companies:d.companies||[],cultures:d.cultures,languages:d.languages,wars:d.wars||[],events:d.events||[],history:d.history||[],prices:d.prices,supply:d.supply,demand:d.demand,series:d.series,snapshots:d.snapshots||{},stats:d.stats||w.stats,relations:d.relations||{}});
  // regenerate tiles deterministically (terrain is seed-derived)
  return w;
};

// ---------- Browser UI (only when DOM exists) ----------
if(typeof document!=='undefined' && typeof window!=='undefined'){
let W=new World(1405);
let speed=1, paused=false, mapMode='geo', selected=null, selType=null, tab='world', histYear=null;
const $=id=>document.getElementById(id);
const BIOME_COLOR={ocean:'#14425e',coast:'#3d7a8c',lake:'#2a6a8c',river:'#2a7a9c',plains:'#7a9a4a',forest:'#2f6b2f',desert:'#c2a15a',mountain:'#7a7a7a',snow:'#e8eef2',swamp:'#4a6b3a',fertile:'#8ab04a'};
const NATION_COLORS=['#c0392b','#2980b9','#27ae60','#8e44ad','#d35400','#16a085','#c0392b','#7f8c8d','#b7950b','#2e86c1'];
function fa(n){ return Math.round(n*10)/10; }
function drawMap(){
  const cv=$('map'), ctx=cv.getContext('2d'); const tw=cv.width/W.W, th=cv.height/W.H;
  const snap=histYear?W.snapshots[histYear]:null;
  for(let i=0;i<W.tiles.length;i++){ const t=W.tiles[i]; let col=BIOME_COLOR[t.biome]||'#555';
    if(mapMode==='pop'){ const p=W.agents.filter(a=>Math.round(a.x)===t.x&&Math.round(a.y)===t.y).length; col=p>2?'#e74c3c':p>0?'#e8b04b':BIOME_COLOR[t.biome]; }
    if(mapMode==='res'){ col=t.minerals>0.7?'#b0b0b0':t.foodDensity>0.7?'#7fb069':t.water>0.9?'#3d7a8c':BIOME_COLOR[t.biome]; }
    if(mapMode==='culture'){ col=t.tribe?NATION_COLORS[(t.tribe-1)%10]:BIOME_COLOR[t.biome]; }
    if(mapMode==='tribe'){ col=t.tribe?NATION_COLORS[(t.tribe-1)%10]:'#222'; }
    if(mapMode==='nation'||mapMode==='border'){ if(snap){ const ch=snap.charCodeAt(i)-97; col=ch>0?NATION_COLORS[(ch-1)%10]:BIOME_COLOR[t.biome]; } else col=t.nation?NATION_COLORS[(t.nation-1)%10]:BIOME_COLOR[t.biome]; }
    if(mapMode==='war'){ const atWar=W.wars.some(w=>w.active); col=atWar&&t.nation?'#c0392b':BIOME_COLOR[t.biome]; }
    if(mapMode==='trade'){ col=W.cities.some(c=>c.x===t.x&&c.y===t.y)?'#d9a441':BIOME_COLOR[t.biome]; }
    if(mapMode==='econ'){ col=W.prices.food>10?'#c0392b':W.prices.food>6?'#e8b04b':'#7fb069'; }
    if(mapMode==='tech'){ const tr=W.tribes.find(x=>x.id===t.tribe); col=tr?(tr.era>4?'#8e44ad':tr.era>2?'#2980b9':BIOME_COLOR[t.biome]):BIOME_COLOR[t.biome]; }
    ctx.fillStyle=col; ctx.fillRect(t.x*tw,t.y*th,tw+0.5,th+0.5);
  }
  // night overlay
  const hour=(W.day%1); if(W.seasonIdx===3){ ctx.fillStyle='rgba(200,220,255,0.08)'; ctx.fillRect(0,0,cv.width,cv.height); }
  // cities
  for(const c of W.cities){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(c.x*tw+tw/2,c.y*th+th/2,Math.max(3,c.pop/8),0,7); ctx.fill(); ctx.fillStyle='#000'; ctx.font='9px sans-serif'; ctx.fillText(c.stage[0],c.x*tw+2,c.y*th+8); }
  // agents as dots
  for(const a of W.agents){ ctx.fillStyle=a.sick?'#ff4444':a.pregnant?'#ff9ff3':'#ffe9a8'; ctx.fillRect(a.x*tw+2,a.y*th+2,3,3); }
  $('mapLegend').textContent='حالت: '+$('mapMode').selectedOptions[0].text+' — '+(histYear?('نقشه تاریخی سال '+histYear):'نقشه فعلی')+' — نقطه‌های روشن: موجودات (قرمز=بیمار) — دایره سفید: شهر';
}
function renderDash(){
  const m=W.macro();
  $('dash').innerHTML=['سال '+W.year+' — روز '+W.day+' — '+W.seasonName(),'جمعیت '+m.pop,'زنده '+W.agents.length,'شهرها '+m.cities,'کشورها '+m.nations,'قبیله‌ها '+m.tribes,'قیمت غذا '+fa(m.foodPrice),'تولید ناخالص '+m.gdp,'جنگ فعال '+m.wars,'سطح فناوری '+fa(m.tech),'بیکاری '+m.unemployed,'فقر '+m.poor,'نابرابری (جینی) '+m.gini].map(s=>'<span class="stat">'+s+'</span>').join('');
  $('weatherBar').textContent='آب‌وهوا: '+(W.weather.rain?'باران ':'')+(W.weather.snow?'برف ':'')+(W.weather.storm?'طوفان ':'')+(W.weather.drought?'خشکسالی ':'')+(W.weather.flood?'سیل ':'')+(W.weather.fire?'آتش‌سوزی جنگل ':'')+'— دما متأثر از فصل و جابه‌جایی اقلیمی بلندمدت';
}
function bar(v){ return '<div class="bar"><i style="width:'+clamp(v,0,100)+'%"></i></div>'; }
function agentCard(a){
  const fam=W.agents.filter(o=>o.mother===a.id||o.father===a.id);
  return '<div class="rowitem"><h3>'+a.name+' '+a.family+' — شناسه '+a.id+'</h3>'
  +'<p>سن '+Math.floor(a.age)+' ('+lifeStage(a.age)+') — جنس '+(a.sex==='male'?'مرد':'زن')+' — نسل '+a.generation+' — شغل '+(JOBS.find(j=>j.id===a.job)||{name:'—'}).name+' — سلامت '+Math.round(a.health)+' '+(a.sick?'— بیمار: '+a.sick:'')+(a.pregnant?' — باردار ('+a.pregnantDays+'/۲۷۰ روز)':'')+'</p>'
  +'<p>پول '+Math.round(a.money)+' — غذا '+a.food+' — چوب '+a.wood+' — سنگ '+a.stone+' — آهن '+a.iron+' — ابزار '+a.tool+' — بدهی '+a.debt+'</p>'
  +'<p>قد '+Math.round(a.ph.height)+' سانتی‌متر — طول عمر مورد انتظار '+Math.round(a.ph.lifespan)+' سال — ایمنی '+Math.round(a.ph.immunity*100)+'٪ — باروری '+Math.round(a.ph.fertility*100)+'٪</p>'
  +'<h4>ژنوم (۱۲ ژن، هر کدام ۲ آلل)</h4><table>'+GENE_KEYS.map(k=>'<tr><td>'+k+'</td><td>'+a.genome[k][0].toFixed(2)+' / '+a.genome[k][1].toFixed(2)+'</td></tr>').join('')+'</table>'
  +'<h4>شخصیت</h4><p>'+TRAITS.map(t=>t+': '+a.traits[t]).join(' — ')+'</p>'
  +'<h4>مهارت‌ها</h4><p>'+SKILLS.map(s=>s+' '+a.skills[s].lvl).join(' — ')+'</p>'
  +'<h4>نیازها</h4>'+Object.keys(a.needs).map(k=>k+': '+Math.round(a.needs[k])+bar(a.needs[k])).join('')
  +'<h4>خانواده</h4><p>مادر: '+(a.mother||'—')+' — پدر: '+(a.father||'—')+' — همسر: '+(a.spouse||'—')+' — فرزندان: '+(a.children.join(', ')||'—')+'</p>'
  +'<h4>خاطرات</h4><p>'+(a.memories.slice(-5).map(m=>'سال '+m.year+': '+m.text).join('<br>')||'—')+'</p>'
  +'<p>هدف فعلی: '+a.goal+' — آخرین اقدام: '+a.lastAction+'</p></div>';
}
function drawChart(canvasId,series,label,color){
  const cv=$(canvasId); if(!cv) return; const ctx=cv.getContext('2d'); const w=cv.width=cv.offsetWidth||600, h=cv.height=180;
  ctx.clearRect(0,0,w,h); ctx.strokeStyle='#444'; ctx.strokeRect(0,0,w,h);
  if(series.length<2){ ctx.fillStyle='#aaa'; ctx.fillText('داده کافی نیست — زمان را جلو ببرید',10,20); return; }
  const mx=Math.max(...series,1); ctx.beginPath(); ctx.strokeStyle=color||'#d9a441'; ctx.lineWidth=2;
  series.forEach((v,i)=>{ const x=i/(series.length-1)*(w-20)+10, y=h-10-(v/mx)*(h-20); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.stroke();
  ctx.fillStyle='#efe6d8'; ctx.fillText(label+' — آخرین: '+series[series.length-1],10,16);
}
const TABS=[['world','جهان'],['agents','موجودات'],['cities','شهرها'],['nations','کشورها'],['family','خانواده'],['culture','فرهنگ'],['language','زبان'],['history','تاریخ'],['charts','نمودارها'],['god','خدا']];
function renderPanel(){
  const el=$('panelBody');
  if(tab==='world'){
    const m=W.macro();
    el.innerHTML='<h3>داشبورد جهان</h3><p>سال '+W.year+' روز '+W.day+' — فصل '+W.seasonName()+'</p>'
    +'<table><tr><th>شاخص</th><th>مقدار واقعی</th></tr>'
    +'<tr><td>جمعیت زنده</td><td>'+m.pop+'</td></tr><tr><td>آرشیو درگذشتگان</td><td>'+W.archive.length+'</td></tr>'
    +'<tr><td>میانگین ثروت</td><td>'+m.mean+'</td></tr><tr><td>نابرابری جینی</td><td>'+m.gini+'</td></tr>'
    +'<tr><td>فقر (پول زیر ۱۰)</td><td>'+m.poor+'</td></tr><tr><td>بیکاری</td><td>'+m.unemployed+'</td></tr>'
    +'<tr><td>قیمت غذا / چوب / آهن / ابزار</td><td>'+fa(W.prices.food)+' / '+fa(W.prices.wood)+' / '+fa(W.prices.iron)+' / '+fa(W.prices.tool)+'</td></tr>'
    +'<tr><td>جرم ثبت‌شده</td><td>'+W.stats.crime+'</td></tr><tr><td>اپیدمی‌ها</td><td>'+W.stats.epidemics+'</td></tr><tr><td>فناوری‌های اختراع‌شده</td><td>'+W.stats.techs+'</td></tr><tr><td>جنگ‌های آغازشده</td><td>'+W.stats.warsStarted+'</td></tr></table>'
    +'<h4>رویدادهای اخیر</h4>'+W.events.slice(0,15).map(e=>'<p>سال '+e.year+' — <b>'+e.title+'</b>: '+e.detail+'</p>').join('');
  }
  else if(tab==='agents'){
    const list=W.agents.slice(0,60);
    el.innerHTML='<h3>موجودات زنده ('+W.agents.length+') — برای جزئیات روی یکی بزنید</h3>'+list.map(a=>'<div class="rowitem" data-agent="'+a.id+'">'+a.name+' '+a.family+' — '+Math.floor(a.age)+' ساله — '+(JOBS.find(j=>j.id===a.job)||{name:'بیکار'}).name+' — سلامت '+Math.round(a.health)+' — پول '+Math.round(a.money)+'</div>').join('');
    el.querySelectorAll('[data-agent]').forEach(d=>d.onclick=()=>{ selected=+d.dataset.agent; selType='agent'; renderPanel(); });
    if(selType==='agent'){ const a=W.agentById(selected); if(a&&a.alive) el.innerHTML=agentCard(a)+el.innerHTML; }
  }
  else if(tab==='cities'){
    el.innerHTML='<h3>شهرها ('+W.cities.length+')</h3>'+W.cities.map(c=>'<div class="rowitem"><b>'+c.name+'</b> — '+c.stage+' — جمعیت '+c.pop+' — غذا '+Math.round(c.food)+' — جرم '+c.crime+' — بیکاری '+c.unemployment+'<br>ساختمان‌ها: '+c.buildings.map(b=>b.type+' ×'+b.n+(b.yield?' (بازده '+b.yield+')':'')).join('، ')+'<br>تأسیس سال '+c.foundedYear+'</div>').join('')||'<p>هنوز شهری شکل نگرفته — جمعیت باید خوشه‌ای شود.</p>';
  }
  else if(tab==='nations'){
    el.innerHTML='<h3>کشورها ('+W.nations.length+')</h3>'+W.nations.map(n=>{ const cap=W.cities.find(c=>c.id===n.capital); const leader=W.agentById(n.leader);
      return '<div class="rowitem"><b>'+n.name+'</b> — حکومت '+n.gov+' — پایتخت '+(cap?cap.name:'—')+' — رهبر '+(leader?leader.name+' '+leader.family:'—')+' — جمعیت '+n.pop+' — ارتش '+n.army+' — خزانه '+Math.round(n.treasury)+' — مالیات '+(n.tax*100)+'٪ — عصر '+ERAS[n.era]+'<br>فناوری: '+Object.keys(n.tech||{}).length+' مورد — تأسیس سال '+n.foundedYear+'</div>'; }).join('')||'<p>هنوز کشوری شکل نگرفته — شهرها باید به ۴۰ نفر برسند.</p>'
    +'<h4>جنگ‌ها</h4>'+W.wars.map(w=>'<p>'+w.name+' — شروع سال '+w.startYear+' — '+(w.active?'در جریان':'پایان: '+w.result)+' — تلفات '+w.casualties+' — علت: '+w.cause+'</p>').join('');
  }
  else if(tab==='family'){
    const roots=W.agents.slice(0,20);
    el.innerHTML='<h3>کاوشگر خانواده — نسل‌ها تا '+W.generationMax+' (بدون سقف مصنوعی)</h3><p>روی یک فرد بزنید تا اجداد و نوادگانش دیده شوند.</p>'
    +roots.map(a=>'<div class="rowitem" data-agent="'+a.id+'">'+a.name+' '+a.family+' — نسل '+a.generation+' — فرزندان: '+(a.children.length)+'</div>').join('')
    +'<h4>خاندان‌ها (بر اساس نام خانوادگی)</h4>'+FAMILY.map(f=>{ const mem=W.agents.filter(a=>a.family===f); const dead=W.archive.filter(a=>a.family===f); const wealth=mem.reduce((s,a)=>s+a.money,0); return mem.length||dead.length?'<p><b>'+f+'</b> — زنده '+mem.length+' — درگذشته '+dead.length+' — ثروت زنده‌ها '+Math.round(wealth)+'</p>':''; }).join('');
    el.querySelectorAll('[data-agent]').forEach(d=>d.onclick=()=>{ const a=W.agentById(+d.dataset.agent); if(!a) return; const anc=[]; let cur=a; while(cur&&(cur.mother||cur.father)){ const m=cur.mother?W.agentById(cur.mother):null; const f=cur.father?W.agentById(cur.father):null; if(m) anc.push('مادر: '+m.name+' (نسل '+m.generation+')'); if(f) anc.push('پدر: '+f.name+' (نسل '+f.generation+')'); cur=m||f; if(anc.length>20) break; }
      const desc=a.children.map(id=>{const c=W.agentById(id); return c?c.name+' (نسل '+c.generation+')':'#'+id;});
      el.innerHTML='<h3>شجره '+a.name+' '+a.family+'</h3><p>اجداد:<br>'+(anc.join('<br>')||'—')+'</p><p>نوادگان مستقیم:<br>'+(desc.join('<br>')||'—')+'</p><button class="btn" onclick="window.__backFamily()">بازگشت</button>'; });
  }
  else if(tab==='culture'){
    el.innerHTML='<h3>کاوشگر فرهنگ</h3>'+W.cultures.map(c=>'<div class="rowitem"><b>'+c.name+'</b> '+(c.extinct?'— منقرض شده':'')+' — پیروان '+c.followers+' — پیدایش سال '+c.year+'<br>ارزش‌ها: جنگ '+c.values.war+' — تجارت '+c.values.trade+' — علم '+c.values.science+' — خانواده '+c.values.family+' — باور '+c.values.religion+'<br>غذا: '+c.food+' — هنر: '+c.art+' — آیین‌ها: '+c.customs.join('، ')+'</div>').join('');
  }
  else if(tab==='language'){
    el.innerHTML='<h3>کاوشگر زبان</h3>'+W.languages.map(l=>'<div class="rowitem"><b>'+l.name+'</b> — خانواده '+l.family+' — ترتیب جمله '+l.order+' — نوشتار مرحله '+l.writing+' — واگرایی '+fa(l.divergence)+'<br>واژگان نمونه: '+Object.entries(l.vocab).slice(0,5).map(([k,v])=>k+'='+v).join('، ')+'<br>جمله نمونه: '+sentence(l,W.rng)+'</div>').join('')
    +'<p>زبان‌ها با جدایی جمعیت واگرا می‌شوند و گویش تازه می‌سازند؛ تجارت و ازدواج واژه وام می‌گیرد.</p>';
  }
  else if(tab==='history'){
    el.innerHTML='<h3>گاه‌شمار جهان</h3><p>رویدادهای ثبت‌شده: '+W.history.length+'</p>'+W.history.slice(-40).reverse().map(e=>'<p>سال '+e.year+' — <b>'+e.type+'</b> '+e.title+' — '+e.detail+'</p>').join('')
    +'<h4>آمار نسل‌ها</h4><p>بیشترین نسل: '+W.generationMax+' — درگذشتگان آرشیو: '+W.archive.length+' — شناسه بعدی (هرگز بازیافت نمی‌شود): '+W.nextId+'</p>';
  }
  else if(tab==='charts'){
    el.innerHTML='<h3>نمودارها</h3><canvas class="chart" id="chPop"></canvas><canvas class="chart" id="chFood"></canvas><canvas class="chart" id="chGdp"></canvas>';
    drawChart('chPop',W.series.pop,'جمعیت','#7fb069'); drawChart('chFood',W.series.foodPrice,'قیمت غذا','#d9a441'); drawChart('chGdp',W.series.gdp,'تولید ناخالص','#5b8db8');
  }
  else if(tab==='god'){
    el.innerHTML='<h3>حالت خدا</h3><p>هر مداخله در تاریخ جهان ثبت می‌شود. از نوار پایین صفحه هم می‌توانید استفاده کنید.</p>'+W.events.filter(e=>e.type==='god').slice(0,10).map(e=>'<p>سال '+e.year+' — '+e.title+': '+e.detail+'</p>').join('');
  }
}
window.__backFamily=function(){ renderPanel(); };
function loop(){
  if(!paused){ for(let i=0;i<speed;i++) W.tick(); }
  drawMap(); renderDash(); renderPanel();
  setTimeout(loop, speed>=50?50:200);
}
// init UI
(function init(){
  $('tabs').innerHTML=TABS.map(([id,n])=>'<button data-tab="'+id+'" class="'+(id===tab?'active':'')+'">'+n+'</button>').join('');
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ tab=b.dataset.tab; document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderPanel(); });
  const speeds=[1,2,5,10,50,100];
  $('speeds').innerHTML=speeds.map(s=>'<button class="btn'+(s===speed?' active':'')+'" data-s="'+s+'">'+s+'×</button>').join('');
  document.querySelectorAll('#speeds button').forEach(b=>b.onclick=()=>{ speed=+b.dataset.s; paused=false; $('btnPause').textContent='توقف'; document.querySelectorAll('#speeds button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); });
  $('btnPause').onclick=()=>{ paused=!paused; $('btnPause').textContent=paused?'ادامه':'توقف'; };
  $('mapMode').onchange=e=>{ mapMode=e.target.value; drawMap(); };
  $('btnNew').onclick=()=>{ const s=+$('seedInput').value||1405; W=new World(s); selected=null; renderPanel(); };
  $('btnJump').onclick=()=>{ const y=+$('jumpInput').value||10; const target=y*365; let guard=0; while(W.year<y&&guard++<20000){ W.tick(); } renderPanel(); };
  $('btnHist').onclick=()=>{ histYear=$('histYear').value?+$('histYear').value:null; drawMap(); };
  $('btnSave').onclick=()=>{ localStorage.setItem('livingworld-save',W.serialize()); alert('ذخیره شد'); };
  $('btnLoad').onclick=()=>{ const s=localStorage.getItem('livingworld-save'); if(s){ W=World.deserialize(s); alert('بارگذاری شد'); } else alert('ذخیره‌ای نیست'); };
  $('btnExport').onclick=()=>{ const blob=new Blob([W.serialize()],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='living-world-save.json'; a.click(); };
  $('btnImport').onclick=()=>$('importFile').click();
  $('importFile').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ W=World.deserialize(r.result); renderPanel(); }; r.readAsText(f); };
  $('map').onclick=e=>{ const r=e.target.getBoundingClientRect(); const x=Math.floor((e.clientX-r.left)/r.width*W.W), y=Math.floor((e.clientY-r.top)/r.height*W.H);
    const t=W.tileAt(x,y); const ag=W.agents.find(a=>Math.round(a.x)===x&&Math.round(a.y)===y);
    const city=W.cities.find(c=>c.x===x&&c.y===y);
    if(ag){ selected=ag.id; selType='agent'; tab='agents'; renderPanel(); $('tileInfo').textContent='موجود انتخاب شد: '+ag.name+' — پنل موجودات را ببینید.'; }
    else if(city){ tab='cities'; renderPanel(); $('tileInfo').textContent='شهر: '+city.name+' — '+city.stage+' — جمعیت '+city.pop; }
    else if(t){ $('tileInfo').textContent='کاشی ('+x+','+y+') — '+t.biome+' — دما '+Math.round(t.temp)+'° — حاصلخیزی '+fa(t.fertility)+' — آب '+fa(t.water)+' — مواد معدنی '+fa(t.minerals)+' — تراکم غذا '+fa(t.foodDensity)+' — بارش '+Math.round(t.rainfall)+' میلی‌متر'; }
  };
  const GODS=[['createAgent','ایجاد موجود'],['removeAgent','حذف موجود'],['spawnFood','ایجاد غذا'],['disease','ایجاد بیماری'],['disaster','بلای طبیعی'],['drought','خشکسالی'],['rain','باران'],['grantTech','اعطای فناوری'],['startWar','آغاز جنگ'],['endWar','پایان جنگ'],['createCity','ایجاد شهر'],['money','ثروت به همه']];
  $('godBtns').innerHTML=GODS.map(([id,n])=>'<button class="btn" data-god="'+id+'">'+n+'</button>').join('');
  document.querySelectorAll('[data-god]').forEach(b=>b.onclick=()=>{ W.god(b.dataset.god); $('godLog').textContent='مداخله ثبت شد: '+b.textContent+' — سال '+W.year; renderPanel(); });
  setInterval(()=>{ try{ localStorage.setItem('livingworld-autosave',W.serialize()); }catch(e){} },60000);
  loop();
})();
}
if(typeof module!=='undefined'&&module.exports){ module.exports={World,RNG,TECHS,JOBS,GENE_KEYS}; }
})(typeof window!=='undefined'?window:globalThis);
