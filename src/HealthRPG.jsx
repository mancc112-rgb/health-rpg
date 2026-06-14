import { storage } from "./storage.js";
import React, { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════
//  健康冒險者 · 像素 RPG
//  52 Boss / 12 階段進化 / 金幣 / 商城 / 角色養成
// ════════════════════════════════════════════════

const C = {
  bg:"#f5f0e6", bgAlt:"#ece4d3", panel:"#ffffff", panelAlt:"#faf6ec",
  ink:"#3a3329", inkSoft:"#6b6152", line:"#c9bca3", lineDark:"#a89878",
  gold:"#c8941f", green:"#5a9e4f", red:"#d1574e", blue:"#4a82c2",
  purple:"#9560c4", dim:"#9a9080", hp:"#d1574e", xp:"#5a9e4f", coin:"#e0a92e",
};
const F = "'DotGothic16', 'Noto Sans TC', monospace";

// ── 稀有度色系：tier 1=白 2=綠 3=藍 4=紅 5=紫 6=金 ──
// 每階給 base/亮/暗，供裝備外型上色用
const RARITY = {
  1: { name:"普通", base:"#e8e8e8", hi:"#ffffff", sh:"#b8b8b8" },
  2: { name:"優良", base:"#5fb35a", hi:"#8fd98a", sh:"#3a7a36" },
  3: { name:"稀有", base:"#4a82c2", hi:"#7aaee8", sh:"#2f578a" },
  4: { name:"史詩", base:"#d1574e", hi:"#ef8a82", sh:"#9a3530" },
  5: { name:"傳說", base:"#9560c4", hi:"#bd8ae0", sh:"#6a3f96" },
  6: { name:"神話", base:"#e0a92e", hi:"#ffd45a", sh:"#a87a16" },
};
function rarity(t){ return RARITY[Math.max(1,Math.min(6,t||1))]; }

// ── 運動 / 保健品 ──
const DEFAULT_EX = [
  { id:"run", name:"超慢跑", target:30, unit:"分", attr:"體力", spr:"run", xp:25 },
  { id:"breath_am", name:"腹式呼吸(早)", target:5, unit:"分", attr:"專注", spr:"breath", xp:10 },
  { id:"breath_pm", name:"腹式呼吸(睡前)", target:10, unit:"分", attr:"專注", spr:"moon", xp:12 },
  { id:"yoga", name:"正位瑜伽", target:40, unit:"分", attr:"敏捷", spr:"yoga", xp:20 },
  { id:"meridian", name:"拍打經絡", target:15, unit:"分", attr:"恢復", spr:"hand", xp:12 },
];
const DEFAULT_SUPP = [
  { id:"arginine", name:"精胺酸", slot:"morning", note:"超慢跑前", xp:5 },
  { id:"maca", name:"瑪卡", slot:"morning", note:"抗疲勞", xp:5 },
  { id:"fishoil", name:"魚油", slot:"morning", note:"抗發炎", xp:5 },
  { id:"lutein", name:"葉黃素+蝦紅素", slot:"noon", note:"抗藍光", xp:5 },
  { id:"natto", name:"納豆紅麴", slot:"evening", note:"血脂代謝", xp:5 },
  { id:"vinegar", name:"蘋果醋", slot:"evening", note:"勿空腹", xp:5 },
];
const SLOT_LABELS = { morning:"早晨", noon:"中午", evening:"晚上" };

// ── 12 階段進化 ──
const STAGES = [
  { lv:1,  name:"見習冒險者", color:C.dim,      desc:"踏入健康旅途的新手，手持一把舊劍。" },
  { lv:5,  name:"晨曦戰士",   color:"#7a8f6a",  desc:"開始養成每日運動的習慣，身手漸穩。" },
  { lv:10, name:"活力騎兵",   color:C.green,    desc:"體力與耐力逐漸成形，行動更敏捷。" },
  { lv:15, name:"鋼鐵武者",   color:C.blue,     desc:"規律使身體脫胎換骨，披上鋼鐵之甲。" },
  { lv:20, name:"白銀騎士",   color:"#4aa0c2",  desc:"已能對抗初階魔物，銀光閃耀。" },
  { lv:28, name:"聖盾守衛",   color:C.gold,     desc:"自律成為真正的防禦，守護自身節奏。" },
  { lv:35, name:"劍聖行者",   color:"#c27a30",  desc:"每一次鍛鍊都臻於精準，劍意如流。" },
  { lv:42, name:"蒼雷龍騎",   color:C.purple,   desc:"開始掌握龍族之力，與巨龍並肩。" },
  { lv:50, name:"星界賢者",   color:"#b0509c",  desc:"理解身心平衡的奧祕，洞悉節律。" },
  { lv:60, name:"傳說英雄",   color:C.red,      desc:"名字開始流傳世界，眾人景仰的典範。" },
  { lv:75, name:"永極守護者", color:"#c2504a",  desc:"成為健康世界的守門人，金光護體。" },
  { lv:99, name:"不朽神選者", color:"#d4af37",  desc:"超越凡人極限，達致不朽的至高存在。" },
];
function stageIndexFor(lv){ let i=0; STAGES.forEach((x,idx)=>{ if(lv>=x.lv) i=idx; }); return i; }
function xpForLevel(lv){ return 80 + (lv-1)*35; }

// ── 52 Boss ──
const SERIES = {
  fatigue:{label:"疲勞系",color:"#8e6db0",shape:"ghost",tip:"自律神經疲勞的化身。超慢跑與充足睡眠是牠的剋星。"},
  sit:{label:"久坐系",color:"#b08850",shape:"block",tip:"久坐不動所凝聚的怪物。每 50 分鐘起身活動可削弱牠。"},
  inflam:{label:"發炎系",color:"#d1714e",shape:"flame",tip:"慢性發炎的火焰。魚油、好油脂與低糖飲食能澆熄牠。"},
  insomnia:{label:"失眠系",color:"#5a82c2",shape:"swirl",tip:"擾亂睡眠的妖物。睡前腹式呼吸與遠離藍光是良方。"},
  stress:{label:"壓力系",color:"#c25070",shape:"horn",tip:"高壓生活孕育的尖角魔。呼吸與瑜伽能讓副交感神經接管。"},
  metabolic:{label:"代謝系",color:"#6aa05a",shape:"blob",tip:"代謝失衡的黏稠體。規律運動與原型飲食使牠縮小。"},
  mind:{label:"心魔系",color:"#7a7a9c",shape:"eye",tip:"來自內心的阻力。不求爆衝、每天不中斷就能戰勝牠。"},
  boss:{label:"魔王級",color:"#b03d5e",shape:"dragon",tip:"集所有威脅於一身的終極魔王，唯有長期穩定方能擊潰。"},
};
const BOSS_NAMES = [
  // 1-6 疲勞系
  ["fatigue","催牙鼠"],["fatigue","髫骨犛牛"],["fatigue","暮魅裂虎"],["fatigue","睏魔兔"],["fatigue","枯焰龍"],["fatigue","衰毒蛇"],
  // 7-13 久坐系
  ["sit","石臀戰馬"],["sit","鮇骨羊魔"],["sit","鮟尾強獸"],["sit","駝頭蹄妖"],["sit","坐牢犬"],["sit","脂眠豬"],["sit","瀝血鼠王"],
  // 14-19 發炎系
  ["inflam","赤炎犛牛"],["inflam","潰爪虎魔"],["inflam","熱瘤兔"],["inflam","廧蠊炎龍"],["inflam","毒脈虺后"],["inflam","灼心戰馬"],
  // 20-26 失眠系
  ["insomnia","夜哭羊"],["insomnia","夢囈獴"],["insomnia","暗鳴龍妖"],["insomnia","失序犬"],["insomnia","沉夢豬王"],["insomnia","月蝕鼠皇"],["insomnia","焦躁馬王"],
  // 27-33 壓力系
  ["stress","狂躁裂虎"],["stress","緊繃兔魔"],["stress","崩壓龍獸"],["stress","絞腦毒蛇"],["stress","焦蹄馬王"],["stress","壓垮羊魔"],["stress","暴怒猿王"],
  // 34-40 代謝系
  ["metabolic","糖羽雞魔"],["metabolic","油腹犬王"],["metabolic","暴食豬皇"],["metabolic","脂霜鼠魔"],["metabolic","肥炎犛牛"],["metabolic","血癰裂虎"],["metabolic","糖毒蛇妖"],
  // 41-46 心魔系
  ["mind","虛無龍影"],["mind","自噬蛇魔"],["mind","塵憶魔馬"],["mind","絕望羊皇"],["mind","幻笑猿王"],["mind","空鳴雞噩"],
  // 47-52 魔王級
  ["boss","炎厄魔犬"],["boss","深淵豬帝"],["boss","永夜鼠神"],["boss","崩界魔牛"],["boss","滅心冥虎"],["boss","終焉魔龍"],
];
// 色相旋轉：讓同系列每隻 Boss 有不同色調
function hueShift(hex, deg){
  const n=parseInt(hex.slice(1),16); let r=(n>>16)/255,g=((n>>8)&255)/255,b=(n&255)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; let h=0,s=mx===0?0:d/mx,v=mx;
  if(d){ if(mx===r)h=((g-b)/d)%6; else if(mx===g)h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0)h+=360; }
  h=(h+deg)%360; const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c; let rr=0,gg=0,bb=0;
  if(h<60){rr=c;gg=x;}else if(h<120){rr=x;gg=c;}else if(h<180){gg=c;bb=x;}else if(h<240){gg=x;bb=c;}else if(h<300){rr=x;bb=c;}else{rr=c;bb=x;}
  const to=v=>Math.round((v+m)*255).toString(16).padStart(2,'0');
  return "#"+to(rr)+to(gg)+to(bb);
}
// 十二生肖（依週次循環對應）
const ZODIAC = ["rat","ox","tiger","rabbit","dragon","snake","horse","goat","monkey","rooster","dog","pig"];
const ZODIAC_CN = { rat:"鼠",ox:"牛",tiger:"虎",rabbit:"兔",dragon:"龍",snake:"蛇",horse:"馬",goat:"羊",monkey:"猴",rooster:"雞",dog:"狗",pig:"豬" };
const BOSSES = BOSS_NAMES.map(([series,name],i)=>{
  const wk=i+1; const hp=Math.round(240+wk*22+(series==="boss"?600:0));
  const coin=Math.round(40+wk*6+(series==="boss"?200:0));
  const xp=Math.round(60+wk*5+(series==="boss"?150:0));
  // 系列內第幾隻，決定色相偏移與外型變體
  const variant = BOSS_NAMES.slice(0,i).filter(([s])=>s===series).length;
  const color = hueShift(SERIES[series].color, (variant-3)*16);
  const zodiac = ZODIAC[i % 12]; // 生肖循環
  return { week:wk, id:`b${wk}`, name, series, color, shape:zodiac, zodiac, variant, hp, coin, xp, label:SERIES[series].label, tip:SERIES[series].tip };
});
function isoWeek(d){ const dt=new Date(d); dt.setHours(0,0,0,0); const j=new Date(dt.getFullYear(),0,1); return Math.ceil((((dt-j)/86400000)+j.getDay()+1)/7); }
function bossForDate(d=new Date()){ return BOSSES[(isoWeek(d)-1)%52]; }

// ── 商城（reqLv = 解鎖所需等級）──
const SHOP = {
  weapon:[
    {id:"w1",name:"木劍",atk:3,price:60,spr:"sword",tier:1,reqLv:1},
    {id:"w2",name:"鐵劍",atk:6,price:180,spr:"sword",tier:2,reqLv:3},
    {id:"w6",name:"獵弓",atk:9,price:360,spr:"bow",tier:2,reqLv:5},
    {id:"w4",name:"法杖",atk:8,price:320,spr:"staff",tier:2,reqLv:5},
    {id:"w3",name:"騎士長劍",atk:10,price:400,spr:"sword",tier:3,reqLv:8},
    {id:"w5",name:"賢者法杖",atk:14,price:700,spr:"staff",tier:3,reqLv:11},
    {id:"w7",name:"龍焰巨劍",atk:20,price:1400,spr:"sword",tier:4,reqLv:19},
    {id:"w8",name:"聖光之刃",atk:28,price:2600,spr:"sword",tier:5,reqLv:29},
  ],
  head:[
    {id:"a1",name:"皮帽",def:2,rec:0,price:50,spr:"helm",tier:1,slot:"head",reqLv:1},
    {id:"a2",name:"鐵盔",def:5,rec:0,price:200,spr:"helm",tier:2,slot:"head",reqLv:5},
    {id:"h3",name:"騎士頭盔",def:8,rec:1,price:480,spr:"helm",tier:3,slot:"head",reqLv:11},
    {id:"h4",name:"龍首盔",def:13,rec:2,price:1200,spr:"helm",tier:4,slot:"head",reqLv:24},
  ],
  body:[
    {id:"a3",name:"皮甲",def:3,rec:1,price:90,spr:"chest",tier:1,slot:"body",reqLv:1},
    {id:"a4",name:"鎖子甲",def:7,rec:1,price:300,spr:"chest",tier:2,slot:"body",reqLv:5},
    {id:"a5",name:"騎士鎧甲",def:12,rec:2,price:650,spr:"chest",tier:3,slot:"body",reqLv:11},
    {id:"a8",name:"聖者長袍",def:15,rec:5,price:1800,spr:"chest",tier:5,slot:"body",reqLv:29},
  ],
  feet:[
    {id:"f1",name:"布靴",def:1,rec:1,price:60,spr:"boots",tier:1,slot:"feet",reqLv:1},
    {id:"f2",name:"皮革靴",def:3,rec:1,price:160,spr:"boots",tier:2,slot:"feet",reqLv:5},
    {id:"a7",name:"龍鱗靴",def:6,rec:2,price:420,spr:"boots",tier:3,slot:"feet",reqLv:11},
    {id:"f4",name:"疾風戰靴",def:9,rec:3,price:980,spr:"boots",tier:4,slot:"feet",reqLv:24},
  ],
  acc:[
    {id:"c1",name:"木護身符",def:0,rec:2,price:70,spr:"amulet",tier:1,slot:"acc",reqLv:1},
    {id:"a6",name:"恢復護符",def:1,rec:4,price:240,spr:"amulet",tier:2,slot:"acc",reqLv:5},
    {id:"c3",name:"翡翠墜飾",def:2,rec:6,price:560,spr:"amulet",tier:3,slot:"acc",reqLv:11},
    {id:"c4",name:"聖光之戒",def:3,rec:9,price:1500,spr:"amulet",tier:5,slot:"acc",reqLv:29},
  ],
};
const ARMOR_SLOTS = { head:"頭部", body:"身體", feet:"腳部", acc:"飾品" };
const SHOP_CATS = [["weapon","武器"],["head","頭部"],["body","身體"],["feet","腳部"],["acc","飾品"]];

// ── 限定掉落裝備（商城買不到，只能打龍族 Boss 取得）對齊設計圖 24 件 ──
const LOOT = {
  d1:{id:"d1",name:"炎核戰斧",atk:26,price:0,spr:"sword",tier:4,slot:"weapon",limited:true},
  d2:{id:"d2",name:"寒夢頭冠",def:14,rec:4,price:0,spr:"helm",tier:3,slot:"head",limited:true},
  d3:{id:"d3",name:"毒脈戒指",def:4,rec:10,price:0,spr:"amulet",tier:4,slot:"acc",limited:true},
  d4:{id:"d4",name:"雷鳴戰靴",def:12,rec:5,price:0,spr:"boots",tier:5,slot:"feet",limited:true},
  d5:{id:"d5",name:"疲風披肩",def:10,rec:8,price:0,spr:"chest",tier:3,slot:"body",limited:true},
  d6:{id:"d6",name:"岩鎧護腿",def:16,price:0,spr:"boots",tier:2,slot:"feet",limited:true},
  d7:{id:"d7",name:"聖體王冠",def:18,rec:12,price:0,spr:"helm",tier:6,slot:"head",limited:true},
  d8:{id:"d8",name:"冥影斗篷",def:15,rec:7,price:0,spr:"chest",tier:5,slot:"body",limited:true},
  d9:{id:"d9",name:"血能腰甲",def:17,rec:5,price:0,spr:"chest",tier:4,slot:"body",limited:true},
  d10:{id:"d10",name:"星眼項鍊",def:6,rec:14,price:0,spr:"amulet",tier:5,slot:"acc",limited:true},
  d11:{id:"d11",name:"腐蝕罪甲",def:19,rec:3,price:0,spr:"chest",tier:4,slot:"body",limited:true},
  d12:{id:"d12",name:"狂怒大劍",atk:34,price:0,spr:"sword",tier:5,slot:"weapon",limited:true},
  d13:{id:"d13",name:"蒼雷龍槍",atk:40,price:0,spr:"staff",tier:6,slot:"weapon",limited:true},
  d14:{id:"d14",name:"骨眠瞳腕",def:13,rec:9,price:0,spr:"amulet",tier:4,slot:"acc",limited:true},
  d15:{id:"d15",name:"幻心面具",def:14,rec:11,price:0,spr:"helm",tier:5,slot:"head",limited:true},
  d16:{id:"d16",name:"熔核鎧甲",def:22,rec:4,price:0,spr:"chest",tier:5,slot:"body",limited:true},
  d17:{id:"d17",name:"潮汐長靴",def:13,rec:7,price:0,spr:"boots",tier:3,slot:"feet",limited:true},
  d18:{id:"d18",name:"暴食王戒",def:8,rec:16,price:0,spr:"amulet",tier:6,slot:"acc",limited:true},
  d19:{id:"d19",name:"森幕護符",def:7,rec:13,price:0,spr:"amulet",tier:4,slot:"acc",limited:true},
  d20:{id:"d20",name:"虛空龍袍",def:24,rec:10,price:0,spr:"chest",tier:6,slot:"body",limited:true},
  d21:{id:"d21",name:"晨曦聖劍",atk:38,price:0,spr:"sword",tier:5,slot:"weapon",limited:true},
  d22:{id:"d22",name:"疫霜披風",def:16,rec:8,price:0,spr:"chest",tier:4,slot:"body",limited:true},
  d23:{id:"d23",name:"黑曜頭盔",def:20,rec:5,price:0,spr:"helm",tier:5,slot:"head",limited:true},
  d24:{id:"d24",name:"終焉聖痕",def:10,rec:20,price:0,spr:"amulet",tier:6,slot:"acc",limited:true},
};
const LOOT_BY_ID = LOOT;

// ── 龍族 Boss（24 隻，對齊設計圖，需主動回合制挑戰）──
// shape: 龍外型；rar: 稀有度(1-6)；window: 開放條件；loot: 掉落
const ELITES = [
  { id:"d1",  name:"熾炎暴龍", dragon:"火龍", theme:"發炎", shape:"dragon_fire",  color:"#e05a2a", rar:4, reqLv:20, energy:6, window:"fullEnergy",     loot:"d1",  desc:"烈焰燃燒的暴龍，發炎與紅腫的化身。", intro:"灼熱的氣息撲面而來，熾炎暴龍展翅！" },
  { id:"d2",  name:"冰眠霜龍", dragon:"冰龍", theme:"失眠", shape:"dragon_ice",   color:"#5aa8e0", rar:3, reqLv:18, energy:5, window:"weekend",        loot:"d2",  desc:"散發寒氣的霜龍，淺眠與失眠的主宰。", intro:"夢境結霜…冰眠霜龍自寒淵甦醒！" },
  { id:"d3",  name:"毒瘋蛇龍", dragon:"毒龍", theme:"發炎", shape:"dragon_venom", color:"#7ac23a", rar:4, reqLv:25, energy:6, window:"streak7",        loot:"d3",  desc:"毒液橫流的蛇龍，慢性發炎的源頭。", intro:"毒霧瀰漫，毒瘋蛇龍吐信而出！" },
  { id:"d4",  name:"雷壓天龍", dragon:"雷龍", theme:"壓力", shape:"dragon_dark",  color:"#e0c23a", rar:5, reqLv:35, energy:7, window:"weekend_streak",  loot:"d4",  desc:"雷霆纏身的天龍，壓力爆發的象徵。", intro:"雷光撕裂天際，雷壓天龍降臨！" },
  { id:"d5",  name:"裂風翼龍", dragon:"風龍", theme:"疲勞", shape:"dragon",       color:"#6ac2a8", rar:3, reqLv:16, energy:5, window:"weekend",        loot:"d5",  desc:"乘風而行的翼龍，慢性疲勞的化身。", intro:"狂風大作，裂風翼龍俯衝而下！" },
  { id:"d6",  name:"岩鎧地龍", dragon:"地龍", theme:"久坐", shape:"dragon",       color:"#a08850", rar:2, reqLv:15, energy:4, window:"fullEnergy",     loot:"d6",  desc:"岩石護甲的地龍，久坐僵硬的象徵。", intro:"大地震動，岩鎧地龍破土而出！" },
  { id:"d7",  name:"聖爛輝龍", dragon:"聖龍", theme:"平衡", shape:"dragon",       color:"#f0d86a", rar:6, reqLv:60, energy:9, window:"weekend_streak",  loot:"d7",  desc:"聖光環繞的輝龍，身心平衡的試煉。", intro:"聖光萬丈，聖爛輝龍降下試煉！" },
  { id:"d8",  name:"暗蝕冥龍", dragon:"暗龍", theme:"心魔", shape:"dragon_dark",  color:"#9560c4", rar:5, reqLv:40, energy:7, window:"streak7",        loot:"d8",  desc:"吞噬光線的冥龍，內心魔障的具現。", intro:"黑暗吞沒一切，暗蝕冥龍睜眼！" },
  { id:"d9",  name:"血渴魔龍", dragon:"血龍", theme:"代謝", shape:"dragon_fire",  color:"#c2304a", rar:4, reqLv:28, energy:6, window:"streak7",        loot:"d9",  desc:"嗜血的魔龍，代謝失衡的化身。", intro:"血色瀰漫，血渴魔龍咆哮！" },
  { id:"d10", name:"星夢幻龍", dragon:"星龍", theme:"睡眠", shape:"dragon_ice",   color:"#6a7ae0", rar:5, reqLv:38, energy:7, window:"weekend",        loot:"d10", desc:"星辰閃爍的幻龍，睡眠品質的守護試煉。", intro:"星河流轉，星夢幻龍翩然現身！" },
  { id:"d11", name:"腐食巨龍", dragon:"癘龍", theme:"飲食", shape:"dragon_venom", color:"#8aa83a", rar:4, reqLv:24, energy:6, window:"fullEnergy",     loot:"d11", desc:"腐蝕一切的癘龍，不良飲食的象徵。", intro:"腐臭瀰漫，腐食巨龍張開血盆大口！" },
  { id:"d12", name:"狂怒戰龍", dragon:"戰龍", theme:"壓力", shape:"dragon_fire",  color:"#d14a3a", rar:5, reqLv:42, energy:7, window:"weekend_streak",  loot:"d12", desc:"暴怒嗜戰的戰龍，壓力崩潰的化身。", intro:"怒火中燒，狂怒戰龍揮爪而來！" },
  { id:"d13", name:"蒼雷聖龍", dragon:"雷聖龍", theme:"運動", shape:"dragon_dark", color:"#5ac2e0", rar:6, reqLv:65, energy:9, window:"weekend_streak", loot:"d13", desc:"蒼藍雷光的聖龍，運動極致的試煉。", intro:"蒼雷貫頂，蒼雷聖龍降世！" },
  { id:"d14", name:"夜疫骨龍", dragon:"骨龍", theme:"過勞", shape:"dragon_dark",  color:"#b0b0c0", rar:4, reqLv:30, energy:6, window:"streak7",        loot:"d14", desc:"白骨森森的骨龍，過度疲勞的具現。", intro:"森冷骨響，夜疫骨龍自黑夜爬出！" },
  { id:"d15", name:"鏡界幻龍", dragon:"幻龍", theme:"自我否定", shape:"dragon_ice", color:"#a87ae0", rar:5, reqLv:45, energy:7, window:"streak7",       loot:"d15", desc:"鏡像虛幻的幻龍，自我否定的化身。", intro:"鏡面碎裂，鏡界幻龍映出心魔！" },
  { id:"d16", name:"熔核魔龍", dragon:"熔岩龍", theme:"炎症", shape:"dragon_fire", color:"#e0702a", rar:5, reqLv:48, energy:8, window:"weekend_streak", loot:"d16", desc:"熔岩流淌的魔龍，急性炎症的象徵。", intro:"熔岩噴湧，熔核魔龍破殼而出！" },
  { id:"d17", name:"深海贔龍", dragon:"海龍", theme:"疲勞", shape:"dragon_ice",   color:"#3aa8c2", rar:3, reqLv:22, energy:5, window:"weekend",        loot:"d17", desc:"深海潛行的贔龍，沉重疲勞的化身。", intro:"巨浪翻騰，深海贔龍浮出水面！" },
  { id:"d18", name:"暴食璽龍", dragon:"巨食龍", theme:"代謝", shape:"dragon_venom", color:"#c2a83a", rar:6, reqLv:70, energy:9, window:"weekend_streak", loot:"d18", desc:"貪得無厭的巨食龍，代謝崩壞的終極試煉。", intro:"大地為之顫抖，暴食璽龍張口吞天！" },
  { id:"d19", name:"翠毒森龍", dragon:"森龍", theme:"發炎", shape:"dragon_venom", color:"#4aa83a", rar:4, reqLv:26, energy:6, window:"streak7",        loot:"d19", desc:"翠綠毒霧的森龍，慢性發炎的具現。", intro:"森林低語，翠毒森龍纏繞而至！" },
  { id:"d20", name:"虛空滅龍", dragon:"虛無龍", theme:"崩潰", shape:"dragon_dark", color:"#6a4a8a", rar:6, reqLv:80, energy:10, window:"weekend_streak", loot:"d20", desc:"吞噬存在的虛無龍，精神崩潰的終極象徵。", intro:"虛空裂開，虛空滅龍湮滅一切！" },
  { id:"d21", name:"晨曦天龍", dragon:"光龍", theme:"恢復", shape:"dragon",       color:"#f0c84a", rar:5, reqLv:50, energy:8, window:"weekend_streak",  loot:"d21", desc:"晨光普照的天龍，恢復力量的試煉。", intro:"曙光乍現，晨曦天龍翱翔天際！" },
  { id:"d22", name:"霧疫毒龍", dragon:"疫龍", theme:"免疫低下", shape:"dragon_venom", color:"#7a9a6a", rar:4, reqLv:32, energy:6, window:"streak7",     loot:"d22", desc:"瘴霧繚繞的疫龍，免疫低下的化身。", intro:"疫霧四起，霧疫毒龍盤旋而下！" },
  { id:"d23", name:"黑曜罪龍", dragon:"罪龍", theme:"情緒", shape:"dragon_dark",  color:"#4a3a5a", rar:5, reqLv:55, energy:8, window:"weekend_streak",  loot:"d23", desc:"漆黑如曜石的罪龍，負面情緒的具現。", intro:"罪業纏身，黑曜罪龍自深淵升起！" },
  { id:"d24", name:"終焉神龍", dragon:"古神龍", theme:"全能", shape:"dragon",     color:"#f0d86a", rar:6, reqLv:99, energy:12, window:"weekend_streak", loot:"d24", desc:"超越一切的古神龍，健康旅途的最終試煉。", intro:"萬物臣服…終焉神龍，降臨！" },
];
// 依稀有度算 Boss 數值
ELITES.forEach(e=>{ e.hp = 300 + e.reqLv*16 + e.rar*60; e.atk = 24 + e.reqLv + e.rar*4; });
const WINDOW_LABEL = {
  weekend:"週末開放（六、日）",
  streak7:"連勝 7 天以上",
  fullEnergy:"能量槽全滿",
  weekend_streak:"週末 + 連勝 7 天",
};

function todayKey(d=new Date()){ return d.toLocaleDateString("sv-SE"); }
function weekKeyOf(d=new Date()){ const t=new Date(d); t.setHours(0,0,0,0); t.setDate(t.getDate()-((t.getDay()+6)%7)); return todayKey(t); }
function monthKeyOf(d=new Date()){ return todayKey(d).slice(0,7); }
function fmtDate(key){ const [y,m,dd]=key.split("-"); const dt=new Date(+y,+m-1,+dd); const wd=["日","一","二","三","四","五","六"][dt.getDay()]; return `${+m}/${+dd} 週${wd}`; }
function emptyDay(){ return { exercises:{}, supplements:{}, extras:[], sleep:null, note:"" }; }

export default function HealthRPG() {
  const [dateKey, setDateKey] = useState(todayKey());
  const [day, setDay] = useState(emptyDay());
  const [cfg, setCfg] = useState({ exercises:DEFAULT_EX, supplements:DEFAULT_SUPP });
  const [pg, setPg] = useState({ totalXP:0, coins:0, owned:[], equip:{weapon:null,head:null,body:null,feet:null,acc:null}, defeated:[], bossWeek:{}, _perDay:{} });
  const [allKeys, setAllKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("log");
  const [toast, setToast] = useState(null);
  const prevFull = useRef(false);

  useEffect(()=>{ (async()=>{
    try{ const r=await storage.get("config"); if(r) setCfg(JSON.parse(r.value)); }catch{}
    try{ const r=await storage.get("progress2"); if(r) setPg(p=>({...p,...JSON.parse(r.value)})); }catch{}
  })(); },[]);

  useEffect(()=>{ let a=true; setLoading(true); (async()=>{
    try{ const r=await storage.get(`day:${dateKey}`); if(a) setDay(r?JSON.parse(r.value):emptyDay()); }
    catch{ if(a) setDay(emptyDay()); } if(a) setLoading(false);
  })(); return ()=>{a=false;}; },[dateKey]);

  useEffect(()=>{ (async()=>{ try{ const r=await storage.list("day:"); if(r?.keys) setAllKeys(r.keys.map(k=>k.replace("day:","")).sort()); }catch{} })(); },[tab,dateKey]);

  async function saveDay(n){ setDay(n); try{ await storage.set(`day:${dateKey}`,JSON.stringify(n)); }catch{} }
  async function savePg(n){ setPg(n); try{ await storage.set("progress2",JSON.stringify(n)); }catch{} }
  async function saveCfg(n){ setCfg(n); try{ await storage.set("config",JSON.stringify(n)); }catch{} }
  function showToast(t){ setToast(t); setTimeout(()=>setToast(null),2400); }

  const exDone = cfg.exercises.filter(e=>day.exercises[e.id]?.done);
  const suppDone = cfg.supplements.filter(s=>day.supplements[s.id]);
  const extras = day.extras||[]; // 臨時運動：計獎勵但不入完成率分母
  const totalItems = cfg.exercises.length+cfg.supplements.length;
  const doneItems = exDone.length+suppDone.length;
  const isFull = totalItems>0 && doneItems===totalItems;

  // 等級
  let level=1, xpLeft=pg.totalXP||0;
  while(xpLeft>=xpForLevel(level)){ xpLeft-=xpForLevel(level); level++; }
  const sIdx = stageIndexFor(level); const stage = STAGES[sIdx]; const xpNeed=xpForLevel(level);

  // 裝備加成（含限定掉落裝備）
  const LOOT_ALL = Object.values(LOOT);
  const weapon = [...SHOP.weapon, ...LOOT_ALL.filter(l=>l.slot==="weapon")].find(w=>w.id===pg.equip?.weapon);
  const ALL_ARMOR = [...SHOP.head,...SHOP.body,...SHOP.feet,...SHOP.acc, ...LOOT_ALL.filter(l=>l.slot!=="weapon")];
  const equippedArmor = ["head","body","feet","acc"].map(s=>ALL_ARMOR.find(a=>a.id===pg.equip?.[s])).filter(Boolean);
  // 解析成 {head:obj, body:obj, feet:obj, acc:obj, weapon:obj} 供 Hero 外型用
  const equipObj = { weapon };
  ["head","body","feet","acc"].forEach(s=>{ equipObj[s]=ALL_ARMOR.find(a=>a.id===pg.equip?.[s])||null; });
  const atkBonus = (weapon?.atk||0);
  const defBonus = equippedArmor.reduce((s,a)=>s+a.def,0);
  const recBonus = equippedArmor.reduce((s,a)=>s+a.rec,0);

  // 連勝
  const streak=(()=>{ const pd=pg._perDay||{}; let s=0; const d=new Date(); if(!pd[`full:${todayKey(d)}`]) d.setDate(d.getDate()-1); for(let i=0;i<400;i++){ if(pd[`full:${todayKey(d)}`]){s++;d.setDate(d.getDate()-1);}else break; } return s; })();
  const combo = 1 + Math.min(streak,10)*0.1;

  // 能量槽：最近 7 天全達標天數（0~7），打精英會消耗
  const energyMax = 8;
  const energyRaw = (()=>{ const pd=pg._perDay||{}; let e=0; const d=new Date(); for(let i=0;i<7;i++){ if(pd[`full:${todayKey(d)}`]) e++; d.setDate(d.getDate()-1); } return e; })();
  const energy = Math.max(0, Math.min(energyMax, energyRaw + (pg.energyBonus||0) - (pg.energySpent||0)));
  const isWeekend = (()=>{ const w=new Date().getDay(); return w===0||w===6; })();

  function eliteOpen(el){
    if(level < el.reqLv) return { ok:false, why:`需 Lv.${el.reqLv}（目前 ${level}）` };
    if(energy < el.energy) return { ok:false, why:`需能量 ${el.energy}（目前 ${energy}）` };
    if(el.window==="weekend" && !isWeekend) return { ok:false, why:"僅週末開放" };
    if(el.window==="streak7" && streak<7) return { ok:false, why:`需連勝 7 天（目前 ${streak}）` };
    if(el.window==="fullEnergy" && energy<energyMax) return { ok:false, why:"需能量全滿" };
    if(el.window==="weekend_streak" && (!isWeekend||streak<7)) return { ok:false, why:"需週末 + 連勝 7 天" };
    return { ok:true };
  }

  // 傷害：基礎 + 武器攻擊，全達標暴擊×2，combo 加成
  const baseDmg = exDone.length*10 + suppDone.length*5 + extras.length*8 + atkBonus*2;
  const dayDmg = Math.round((isFull?baseDmg*2:baseDmg)*combo);

  // 當週 Boss
  const wkBoss = bossForDate(new Date(dateKey+"T12:00:00"));
  const wkk = weekKeyOf(new Date(dateKey+"T12:00:00"));
  const wkDmgTotal = pg.bossWeek?.[wkk]?.dmg || 0;
  const bossHP = Math.max(0, wkBoss.hp - wkDmgTotal);
  const bossDead = bossHP<=0;
  const alreadyRewarded = pg.bossWeek?.[wkk]?.rewarded;

  // 結算：累積當週傷害 + XP + 每日金幣
  useEffect(()=>{
    if(loading) return;
    const dayXP = exDone.reduce((s,e)=>s+e.xp,0)+suppDone.reduce((s,e)=>s+e.xp,0)+extras.reduce((s,e)=>s+(e.xp||15),0)+(isFull?30:0)+(day.sleep?day.sleep*(3+Math.round(recBonus/2)):0);
    const dayCoin = (exDone.length+suppDone.length)*3 + extras.length*5 + (isFull?20:0); // 每項3金、臨時運動5金、全達標+20
    const pd={...(pg._perDay||{})};
    const oldDmg=pd[`dmg:${dateKey}`]||0, oldXP=pd[`xp:${dateKey}`]||0, oldCoin=pd[`coin:${dateKey}`]||0;
    if(dayDmg!==oldDmg||dayXP!==oldXP||dayCoin!==oldCoin){
      pd[`dmg:${dateKey}`]=dayDmg; pd[`xp:${dateKey}`]=dayXP; pd[`coin:${dateKey}`]=dayCoin;
      const bw={...(pg.bossWeek||{})};
      const thisWkDmg=Object.entries(pd).filter(([k])=>k.startsWith("dmg:")&&weekKeyOf(new Date(k.slice(4)+"T12:00:00"))===wkk).reduce((s,[,v])=>s+v,0);
      bw[wkk]={...(bw[wkk]||{}), dmg:thisWkDmg};
      const totalXP=Object.entries(pd).filter(([k])=>k.startsWith("xp:")).reduce((s,[,v])=>s+v,0);
      // 每日金幣總和 + Boss 獎勵金幣（bossCoin 另記）
      const dailyCoinTotal=Object.entries(pd).filter(([k])=>k.startsWith("coin:")).reduce((s,[,v])=>s+v,0);
      const newCoins = dailyCoinTotal + (pg.bossCoinEarned||0) - (pg.coinsSpent||0);
      savePg({...pg, _perDay:pd, bossWeek:bw, totalXP, coins:Math.max(0,newCoins)});
    }
  },[day,cfg,loading,atkBonus,recBonus]);

  // 擊敗 Boss 發獎（金幣 + 收藏）
  useEffect(()=>{
    if(loading) return;
    if(bossDead && !alreadyRewarded){
      const bw={...(pg.bossWeek||{})}; bw[wkk]={...(bw[wkk]||{}), rewarded:true};
      const defeated=[...new Set([...(pg.defeated||[]), wkBoss.id])];
      savePg({...pg, coins:(pg.coins||0)+wkBoss.coin, bossCoinEarned:(pg.bossCoinEarned||0)+wkBoss.coin, totalXP:(pg.totalXP||0)+wkBoss.xp, bossWeek:bw, defeated});
      showToast({spr:"coin", text:`擊敗 ${wkBoss.name}！+${wkBoss.coin} 金幣 +${wkBoss.xp} XP`});
    }
  },[bossDead,loading]);

  // full 標記
  useEffect(()=>{
    if(loading) return;
    const pd={...(pg._perDay||{})}; const was=!!pd[`full:${dateKey}`];
    if(isFull!==was){ if(isFull) pd[`full:${dateKey}`]=1; else delete pd[`full:${dateKey}`]; savePg({...pg,_perDay:pd});
      if(isFull&&!prevFull.current) showToast({spr:"crit",text:"全達標暴擊！傷害 ×2"}); }
    prevFull.current=isFull;
  },[isFull,loading]);

  function shiftDate(delta){ const [y,m,d]=dateKey.split("-").map(Number); setDateKey(todayKey(new Date(y,m-1,d+delta))); }
  const isToday=dateKey===todayKey();

  // 精英挑戰勝利：消耗能量、發限定裝備、記錄擊敗
  function onEliteWin(el){
    const loot = LOOT[el.loot];
    const owned = [...new Set([...(pg.owned||[]), loot.id])];
    const eliteDefeated = [...new Set([...(pg.eliteDefeated||[]), el.id])];
    savePg({ ...pg, energySpent:(pg.energySpent||0)+el.energy, owned, eliteDefeated, totalXP:(pg.totalXP||0)+el.hp });
    showToast({ spr:loot.spr, text:`擊敗 ${el.name}！獲得限定 ${loot.name}` });
  }
  function toggleEx(ex){ const cur=day.exercises[ex.id]||{done:false,minutes:ex.target}; saveDay({...day,exercises:{...day.exercises,[ex.id]:{...cur,done:!cur.done}}}); if(!cur.done) showToast({spr:ex.spr,text:`${ex.name} +${ex.xp} XP`}); }
  function setMin(ex,m){ const cur=day.exercises[ex.id]||{done:true,minutes:ex.target}; saveDay({...day,exercises:{...day.exercises,[ex.id]:{...cur,minutes:m,done:true}}}); }
  function toggleSupp(s){ saveDay({...day,supplements:{...day.supplements,[s.id]:!day.supplements[s.id]}}); if(!day.supplements[s.id]) showToast({spr:"pill",text:`${s.name} +${s.xp} XP`}); }
  function setSleep(v){ saveDay({...day,sleep:day.sleep===v?null:v}); }
  function setNote(v){ saveDay({...day,note:v}); }
  function addExtra(ex){ // 臨時運動：當天一次性
    const item={ id:"x_"+Date.now(), name:ex.name, spr:ex.spr, minutes:ex.minutes, xp:15 };
    saveDay({...day, extras:[...(day.extras||[]), item]});
    showToast({spr:ex.spr, text:`${ex.name} +15 XP +5金`});
  }
  function delExtra(id){ saveDay({...day, extras:(day.extras||[]).filter(e=>e.id!==id)}); }

  function buy(item,type){
    const have = pg.coins||0;
    if(have < item.price){ showToast({spr:"coin",text:`金幣不足（差 ${item.price-have}）`}); return; }
    if(pg.owned?.includes(item.id)){ showToast({spr:item.spr||"chest",text:"已擁有"}); return; }
    savePg({...pg, coins: have-item.price, coinsSpent:(pg.coinsSpent||0)+item.price, owned:[...(pg.owned||[]),item.id]});
    showToast({spr:item.spr||"chest", text:`購買 ${item.name}！`});
  }
  function equip(item,type){
    const slot = type==="weapon" ? "weapon" : item.slot;
    const cur = pg.equip?.[slot]===item.id;
    savePg({...pg, equip:{...pg.equip, [slot]: cur?null:item.id}});
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:F, maxWidth:480, margin:"0 auto", paddingBottom:30, position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Noto+Sans+TC:wght@400;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        @keyframes pop{0%{transform:scale(.5);opacity:0}50%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
        @keyframes float{0%{transform:translateY(0)}50%{transform:translateY(-5px)}100%{transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes flicker{0%{transform:scale(1) translateY(0);opacity:1}100%{transform:scale(1.15) translateY(-1px);opacity:.82}}
        /* DQ 藍框指令視窗 */
        .dqwin{background:linear-gradient(#2f4ea0,#22397e);color:#fff;border:3px solid #fff;box-shadow:0 0 0 3px #16285c, 0 3px 0 3px rgba(0,0,0,.25);font-family:${F};}
        .dqbtn{background:linear-gradient(#3a5ab0,#2a4490);color:#fff;border:2px solid #fff;box-shadow:0 0 0 2px #16285c;cursor:pointer;font-family:${F};font-weight:700;transition:transform .05s;}
        .dqbtn:active{transform:translateY(2px)}
        .dqbtn:disabled{background:#9aa0b0;box-shadow:0 0 0 2px #6a7080;cursor:default}
        .pix{box-shadow:0 3px 0 ${C.line};border:3px solid ${C.lineDark}}
        input[type=range]{-webkit-appearance:none;appearance:none;height:14px;background:${C.bgAlt};border:2px solid ${C.lineDark};border-radius:0}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;height:22px;width:14px;background:${C.gold};border:2px solid ${C.ink};cursor:pointer}
        .btn:active{transform:translateY(2px)}
        ::-webkit-scrollbar{width:8px}::-webkit-scrollbar-thumb{background:${C.line}}
      `}</style>

      {/* ▼ 凍結區：角色經驗值 + 分頁 + 日期，固定在頂端 */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:C.bg, boxShadow:"0 3px 8px rgba(0,0,0,.12)" }}>
      {/* 角色頂列 */}
      <div style={{ padding:"14px 16px", background:C.panelAlt, borderBottom:`3px solid ${C.lineDark}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div className="pix" style={{ width:64, height:64, background:`linear-gradient(135deg, ${stage.color}22, ${C.bg})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
            <HeroPortrait stage={sIdx} color={stage.color} armor={equipObj} size={60} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ color:stage.color, fontSize:15, fontWeight:700 }}>{stage.name}</span>
              <span style={{ fontSize:12, color:C.gold }}>Lv.{level}</span>
            </div>
            <div style={{ marginTop:5 }}><Gauge value={xpLeft} max={xpNeed} color={C.xp} bg={C.bgAlt} label={`XP ${xpLeft}/${xpNeed}`} /></div>
            <div style={{ display:"flex", gap:10, marginTop:5, fontSize:11, alignItems:"center" }}>
              <span style={{ color:C.coin, display:"flex", alignItems:"center", gap:3 }}><Mini kind="coin" size={14}/>{pg.coins||0}</span>
              <span style={{ color:C.red }}>連勝{streak}</span>
              <span style={{ color:C.green }}>×{combo.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:`3px solid ${C.lineDark}`, overflowX:"auto" }}>
        {[["log","記錄"],["stats","統計"],["battle","戰鬥"],["elite","挑戰"],["char","角色"],["dex","圖鑑"],["shop","商城"],["edit","設定"]].map(([k,l])=>(
          <button key={k} className="btn" onClick={()=>setTab(k)} style={{ flex:"1 0 auto", minWidth:64, padding:"12px 4px", border:"none", cursor:"pointer", fontFamily:F, fontSize:13, fontWeight:700, background: tab===k?C.panel:C.bgAlt, color: tab===k?C.gold:C.dim, borderRight:`2px solid ${C.bg}` }}>{l}</button>
        ))}
      </div>

      {tab==="log" && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:C.bgAlt }}>
          <button className="btn" onClick={()=>shiftDate(-1)} style={dateBtn}>◀</button>
          <span style={{ fontSize:14, fontWeight:700, color:C.gold }}>{fmtDate(dateKey)}{isToday?" (今天)":""}</span>
          <button className="btn" onClick={()=>shiftDate(1)} disabled={isToday} style={{...dateBtn,opacity:isToday?0.3:1}}>▶</button>
        </div>
      )}
      </div>
      {/* ▲ 凍結區結束 */}

      {loading ? <div style={{ padding:40, textAlign:"center", color:C.dim }}>載入中…</div> : (
        <div style={{ padding:"16px" }}>
          {tab==="battle" && <Battle boss={wkBoss} bossHP={bossHP} bossDead={bossDead} dayDmg={dayDmg} isFull={isFull} doneItems={doneItems} totalItems={totalItems} combo={combo} atkBonus={atkBonus} weekNum={isoWeek(new Date(dateKey+"T12:00:00"))} />}
          {tab==="elite" && <EliteTab pg={pg} level={level} energy={energy} energyMax={energyMax} streak={streak} isWeekend={isWeekend} eliteOpen={eliteOpen} atkBonus={atkBonus} defBonus={defBonus} recBonus={recBonus} onWin={onEliteWin} />}
          {tab==="log" && <LogTab cfg={cfg} day={day} toggleEx={toggleEx} setMin={setMin} toggleSupp={toggleSupp} setSleep={setSleep} setNote={setNote} addExtra={addExtra} delExtra={delExtra} />}
          {tab==="char" && <CharTab level={level} sIdx={sIdx} stage={stage} pg={pg} weapon={weapon} equippedArmor={equippedArmor} equipObj={equipObj} atkBonus={atkBonus} defBonus={defBonus} recBonus={recBonus} />}
          {tab==="dex" && <DexTab sIdx={sIdx} pg={pg} />}
          {tab==="shop" && <ShopTab pg={pg} buy={buy} equip={equip} level={level} />}
          {tab==="stats" && <Stats allKeys={allKeys} cfg={cfg} />}
          {tab==="edit" && <EditTab cfg={cfg} saveCfg={saveCfg} />}
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:C.panel, border:`3px solid ${C.gold}`, padding:"10px 16px", fontSize:14, color:C.ink, animation:"pop .3s", zIndex:50, boxShadow:`0 3px 0 ${C.line}`, maxWidth:"92%", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:22, height:22, display:"inline-flex" }}><Mini kind={toast.spr}/></span>{toast.text}
        </div>
      )}
    </div>
  );
}

// ════ 戰鬥 ════
function Battle({ boss, bossHP, bossDead, dayDmg, isFull, doneItems, totalItems, combo, atkBonus, weekNum }) {
  return (
    <div>
      <div className="pix" style={{ background:C.panel, padding:16, marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:12, color:C.dim }}>今日進度 {doneItems}/{totalItems}{atkBonus>0?` · 武器+${atkBonus}`:""}</div>
        <div style={{ fontSize:26, fontWeight:700, color:isFull?C.gold:C.green, margin:"6px 0", animation:isFull?"blink 1s infinite":"none" }}>{isFull?"暴擊 ":"傷害 "}{dayDmg}</div>
        <div style={{ fontSize:11, color:C.dim }}>{isFull?`全達標 ×2 · Combo ×${combo.toFixed(1)}`:"完成所有項目觸發暴擊"}</div>
      </div>

      <div className="pix" style={{ background:C.panelAlt, padding:16, marginBottom:16, opacity:bossDead?0.7:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:12, color:C.dim }}>第 {weekNum} 週 · {boss.label} · 生肖{ZODIAC_CN[boss.zodiac]}</span>
          <span style={{ fontSize:11, color:C.coin, display:"flex", alignItems:"center", gap:3 }}>獎勵 <Mini kind="coin" size={12}/>{boss.coin}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div className="pix" style={{ width:78, height:78, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", animation:bossDead?"none":"float 2.6s infinite", flexShrink:0 }}>
            <BossSprite shape={bossDead?"dead":boss.shape} color={boss.color} variant={boss.variant} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:boss.color, marginBottom:8 }}>{bossDead?`${boss.name} 已擊敗`:boss.name}</div>
            <Gauge value={bossHP} max={boss.hp} color={C.hp} bg={C.bgAlt} label={`HP ${bossHP}/${boss.hp}`} />
          </div>
        </div>
        {bossDead && <div style={{ fontSize:12, color:C.gold, textAlign:"center", marginTop:10 }}>勝利！金幣與經驗已入帳</div>}
      </div>

      <div style={{ fontSize:11, color:C.dim, textAlign:"center", lineHeight:1.8 }}>
        每週對應不同 Boss（全年 52 隻），達標即造成傷害<br/>擊敗後獲得金幣，到商城購買武器防具變更強<br/>全達標暴擊 ×2，連勝越長傷害加成越高
      </div>
    </div>
  );
}

// ════ 精英挑戰列表 ════
function EliteTab({ pg, level, energy, energyMax, streak, isWeekend, eliteOpen, atkBonus, defBonus, recBonus, onWin }) {
  const [fight, setFight] = useState(null); // 進入戰鬥的精英

  if(fight){
    return <BattleScreen el={fight} level={level} atkBonus={atkBonus} defBonus={defBonus} recBonus={recBonus}
      onWin={()=>{ onWin(fight); setFight(null); }} onFlee={()=>setFight(null)} />;
  }

  return (
    <div>
      {/* 能量槽 */}
      <div className="pix" style={{ background:C.panelAlt, padding:14, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:12, color:C.dim }}>能量槽（近 7 日全達標累積）</span>
          <span style={{ fontSize:12, fontWeight:700, color:C.purple }}>{energy}/{energyMax}</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {Array.from({length:energyMax}).map((_,i)=>(
            <div key={i} style={{ flex:1, height:14, background:i<energy?C.purple:C.bgAlt, border:`2px solid ${C.lineDark}` }}/>
          ))}
        </div>
        <div style={{ fontSize:10, color:C.dim, marginTop:8, lineHeight:1.6 }}>
          每天全達標 +1 能量 · 挑戰精英需消耗能量 · 連勝 {streak} 天 · {isWeekend?"今天是週末 ✓":"平日"}
        </div>
      </div>

      <div style={{ fontSize:12, color:C.dim, marginBottom:12, lineHeight:1.7 }}>
        透過平日養成累積等級與能量，條件滿足時可主動挑戰龍族魔王。<br/>採回合制對戰，勝利可獲得商城買不到的限定裝備。
        <div style={{ marginTop:8, color:C.purple, fontWeight:700 }}>龍族討伐：{(pg.eliteDefeated||[]).length} / {ELITES.length}</div>
      </div>

      {[...ELITES].sort((a,b)=>a.reqLv-b.reqLv).map(el=>{ const st=eliteOpen(el); const beaten=(pg.eliteDefeated||[]).includes(el.id); const loot=LOOT[el.loot];
        return (
          <div key={el.id} className="pix" style={{ background:C.panel, padding:14, marginBottom:14, opacity:st.ok||beaten?1:0.82 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div className="pix" style={{ width:64, height:64, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`3px solid ${el.color}`, animation:st.ok?"float 2.4s infinite":"none", filter:st.ok||beaten?"none":"grayscale(.5)", flexShrink:0 }}>
                <BossSprite shape={el.shape} color={el.color} variant={el.reqLv%7} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:el.color }}>{el.name}{beaten?" ✓":""}</div>
                <div style={{ fontSize:10, marginTop:3, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ color:rarity(el.rar).base, fontWeight:700 }}>{rarity(el.rar).name}</span>
                  <span style={{ color:C.dim }}>{el.dragon} · {el.theme}</span>
                </div>
                <div style={{ fontSize:11, color:C.dim, marginTop:3 }}>HP {el.hp} · 攻 {el.atk} · 建議 Lv.{el.reqLv}</div>
                <div style={{ fontSize:11, color:C.coin, marginTop:2, display:"flex", alignItems:"center", gap:4 }}>掉落：<Mini kind={loot.spr} size={13} tier={loot.tier}/>{loot.name}</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:C.inkSoft, marginTop:10, lineHeight:1.6, background:C.panelAlt, padding:10, border:`2px solid ${C.line}` }}>{el.desc}</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
              <span style={{ fontSize:10, color:C.dim }}>開放：{WINDOW_LABEL[el.window]} · 耗能 {el.energy}</span>
              <button className="btn" onClick={()=>st.ok&&setFight(el)} disabled={!st.ok} style={{ padding:"10px 18px", border:`3px solid ${st.ok?el.color:C.line}`, background:st.ok?el.color:C.bgAlt, color:st.ok?"#fff":C.dim, cursor:st.ok?"pointer":"default", fontFamily:F, fontWeight:700, fontSize:13 }}>
                {beaten?"再戰":st.ok?"挑戰":"未開放"}
              </button>
            </div>
            {!st.ok && <div style={{ fontSize:10, color:C.red, marginTop:6, textAlign:"right" }}>{st.why}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ════ 回合制戰鬥畫面 ════
function BattleScreen({ el, level, atkBonus, defBonus, recBonus, onWin, onFlee }) {
  const myMaxHP = 60 + level*6 + defBonus*3;
  const myAtk = 8 + level*2 + atkBonus;
  const [myHP, setMyHP] = useState(myMaxHP);
  const [bossHP, setBossHP] = useState(el.hp);
  const [log, setLog] = useState([el.intro]);
  const [turn, setTurn] = useState("me"); // me | boss
  const [over, setOver] = useState(null); // win | lose
  const [shake, setShake] = useState(false);
  const [defending, setDefending] = useState(false);
  const logRef = useRef(null);

  function pushLog(t){ setLog(l=>[...l.slice(-6), t]); }
  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[log]);

  function rng(base,spread){ return Math.max(1, Math.round(base + (Math.random()*2-1)*spread)); }

  function myAction(kind){
    if(turn!=="me"||over) return;
    if(kind==="attack"){
      const dmg = rng(myAtk, myAtk*0.25);
      const nb = Math.max(0, bossHP-dmg); setBossHP(nb);
      pushLog(`你發動攻擊，造成 ${dmg} 傷害！`);
      setShake(true); setTimeout(()=>setShake(false),250);
      if(nb<=0){ setOver("win"); pushLog(`${el.name} 被擊敗了！`); return; }
      setDefending(false); setTurn("boss");
    } else if(kind==="defend"){
      setDefending(true); pushLog("你擺出防禦姿態，下次受到的傷害減半。"); setTurn("boss");
    } else if(kind==="heal"){
      const h = rng(12+recBonus*3, 4); const nh=Math.min(myMaxHP, myHP+h); setMyHP(nh);
      pushLog(`你進行治療，恢復 ${nh-myHP} HP。`); setDefending(false); setTurn("boss");
    }
  }

  // Boss 回合
  useEffect(()=>{
    if(turn!=="boss"||over) return;
    const t=setTimeout(()=>{
      let dmg = rng(el.atk, el.atk*0.2);
      const reduce = Math.round(defBonus*0.5);
      dmg = Math.max(1, dmg - reduce);
      if(defending) dmg = Math.round(dmg/2);
      const nh=Math.max(0, myHP-dmg); setMyHP(nh);
      pushLog(`${el.name} 反擊，造成 ${dmg} 傷害！`);
      if(nh<=0){ setOver("lose"); pushLog("你倒下了…下次累積更多能量再來吧。"); return; }
      setDefending(false); setTurn("me");
    }, 900);
    return ()=>clearTimeout(t);
  },[turn,over]);

  const loot = LOOT[el.loot];

  return (
    <div>
      {/* Boss */}
      <div className="pix" style={{ background:"linear-gradient(#e8dcc0,#f0e8d4)", padding:16, marginBottom:12, textAlign:"center" }}>
        <div style={{ fontSize:13, color:el.color, fontWeight:700, marginBottom:8 }}>{el.name}</div>
        <div className="pix" style={{ width:90, height:90, background:C.bg, display:"inline-flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`3px solid ${el.color}`, animation:over==="win"?"none":(shake?"shake .25s":"float 2.6s infinite"), filter:over==="win"?"grayscale(1)":"none" }}>
          <BossSprite shape={over==="win"?"dead":el.shape} color={el.color} variant={el.reqLv%7} />
        </div>
        <div style={{ marginTop:10 }}><Gauge value={bossHP} max={el.hp} color={C.hp} bg={C.bgAlt} label={`HP ${bossHP}/${el.hp}`} /></div>
      </div>

      {/* 我方 HP */}
      <div className="pix" style={{ background:C.panelAlt, padding:"10px 14px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
          <span style={{ color:C.dim }}>我方 Lv.{level} · 攻 {myAtk} · 防 {defBonus}</span>
          {defending && <span style={{ color:C.blue }}>防禦中</span>}
        </div>
        <Gauge value={myHP} max={myMaxHP} color={C.green} bg={C.bgAlt} label={`HP ${myHP}/${myMaxHP}`} />
      </div>

      {/* 戰鬥日誌 */}
      <div ref={logRef} className="dqwin" style={{ padding:12, marginBottom:12, height:96, overflowY:"auto", fontSize:12, lineHeight:1.8 }}>
        {log.map((l,i)=><div key={i}>{l}</div>)}
      </div>

      {/* 指令 / 結果 */}
      {over ? (
        <div className="pix" style={{ background:over==="win"?C.panelAlt:C.panel, padding:16, textAlign:"center" }}>
          <div style={{ fontSize:18, fontWeight:700, color:over==="win"?C.gold:C.red, marginBottom:8 }}>{over==="win"?"勝利！":"戰敗"}</div>
          {over==="win" && <div style={{ fontSize:13, color:C.inkSoft, marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>獲得限定 <Mini kind={loot.spr} size={16} tier={loot.tier}/>{loot.name}</div>}
          <button className="btn" onClick={over==="win"?onWin:onFlee} style={{ width:"100%", padding:14, background:over==="win"?C.green:C.bgAlt, border:`3px solid ${over==="win"?C.ink:C.lineDark}`, color:over==="win"?"#fff":C.ink, cursor:"pointer", fontFamily:F, fontWeight:700, fontSize:14 }}>
            {over==="win"?"領取獎勵":"返回"}
          </button>
        </div>
      ) : (
        <>
          <div className="dqwin" style={{ padding:10, marginBottom:8 }}>
            <div style={{ fontSize:11, opacity:.85, marginBottom:8, paddingLeft:2 }}>{turn==="me"?"▸ 指令":`${el.name} 行動中…`}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["attack","攻擊"],["defend","防禦"],["heal","治療"]].map(([k,l])=>(
                <button key={k} className="dqbtn" onClick={()=>myAction(k)} disabled={turn!=="me"} style={{ flex:1, padding:13, fontSize:14 }}>{l}</button>
              ))}
            </div>
          </div>
          <button className="btn" onClick={onFlee} style={{ width:"100%", padding:10, border:`3px solid ${C.lineDark}`, background:C.bgAlt, color:C.dim, cursor:"pointer", fontFamily:F, fontSize:12 }}>逃跑</button>
        </>
      )}
    </div>
  );
}

// ════ 記錄 ════
function LogTab({ cfg, day, toggleEx, setMin, toggleSupp, setSleep, setNote, addExtra, delExtra }) {
  const [showAdd, setShowAdd] = useState(false);
  const extras = day.extras||[];
  return (
    <div>
      <Header>修練（運動）</Header>
      {cfg.exercises.map(ex=>{ const rec=day.exercises[ex.id]; const done=rec?.done;
        return (
          <div key={ex.id} className="pix" style={{ background:done?C.panelAlt:C.panel, padding:12, marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span className="pix" style={{ width:38, height:38, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${C.line}` }}><Mini kind={ex.spr}/></span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{ex.name}</div>
                <div style={{ fontSize:11, color:C.dim }}>目標 {ex.target}{ex.unit} · {ex.attr} · +{ex.xp}XP</div>
              </div>
              <button className="btn" onClick={()=>toggleEx(ex)} style={{...checkBtn, background:done?C.green:"transparent", borderColor:done?C.green:C.lineDark, color:"#fff"}}>{done?"✓":""}</button>
            </div>
            {done && <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}><input type="range" min={5} max={60} step={5} value={rec.minutes} onChange={e=>setMin(ex,+e.target.value)} style={{flex:1}}/><span style={{fontSize:13,color:C.gold,minWidth:46,textAlign:"right"}}>{rec.minutes}分</span></div>}
          </div>
        );
      })}

      {/* 臨時運動（只計當天） */}
      {extras.map(x=>(
        <div key={x.id} className="pix" style={{ background:C.panelAlt, padding:12, marginBottom:10, display:"flex", alignItems:"center", gap:12, borderLeft:`4px solid ${C.coin}` }}>
          <span className="pix" style={{ width:38, height:38, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${C.coin}` }}><Mini kind={x.spr}/></span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>{x.name} <span style={{ fontSize:10, color:C.coin }}>臨時</span></div>
            <div style={{ fontSize:11, color:C.dim }}>{x.minutes}分 · +{x.xp}XP +5金</div>
          </div>
          <button className="btn" onClick={()=>delExtra(x.id)} style={{ ...miniBtn, borderColor:C.red, color:C.red }}>刪</button>
        </div>
      ))}
      <button className="btn" onClick={()=>setShowAdd(true)} style={{ width:"100%", background:C.panelAlt, border:`3px dashed ${C.coin}`, color:C.coin, padding:12, cursor:"pointer", fontFamily:F, fontSize:14, fontWeight:700, marginBottom:10 }}>＋ 臨時運動（今天額外做的）</button>

      <Header>補給（保健品）</Header>
      {["morning","noon","evening"].map(slot=>{ const items=cfg.supplements.filter(s=>s.slot===slot); if(!items.length) return null;
        return (<div key={slot} style={{ marginBottom:8 }}>
          <div style={{ fontSize:12, color:C.dim, margin:"8px 2px" }}>{SLOT_LABELS[slot]}</div>
          {items.map(s=>{ const taken=day.supplements[s.id];
            return (<button key={s.id} className="btn" onClick={()=>toggleSupp(s)} style={{ width:"100%", textAlign:"left", cursor:"pointer", fontFamily:F, ...pixBtn, background:taken?C.panelAlt:C.panel, marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
              <span className="pix" style={{ width:32, height:32, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${taken?C.green:C.line}` }}>{taken?<span style={{color:C.green,fontSize:16}}>✓</span>:<Mini kind={s.spr||"pill"}/>}</span>
              <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:700 }}>{s.name}</div><div style={{ fontSize:11, color:C.dim }}>{s.note} · +{s.xp}XP</div></div>
            </button>);
          })}
        </div>);
      })}
      <Header>睡眠品質</Header>
      <div className="pix" style={{ background:C.panel, padding:14, display:"flex", justifyContent:"space-between" }}>
        {[1,2,3,4,5].map(v=>(<button key={v} className="btn" onClick={()=>setSleep(v)} style={{ width:46, height:46, cursor:"pointer", border:`3px solid ${day.sleep>=v?C.gold:C.lineDark}`, background:day.sleep>=v?C.gold:C.bg, color:day.sleep>=v?"#fff":C.dim, fontSize:18, fontFamily:F }}>★</button>))}
      </div>
      <Header>冒險日誌</Header>
      <textarea value={day.note} onChange={e=>setNote(e.target.value)} placeholder="身體感受、痠痛部位、壓力狀態…" style={{ width:"100%", minHeight:70, background:C.panel, border:`3px solid ${C.lineDark}`, padding:12, fontSize:14, fontFamily:F, color:C.ink, resize:"vertical" }}/>
      {showAdd && <ExtraModal onAdd={(ex)=>{ addExtra(ex); setShowAdd(false); }} close={()=>setShowAdd(false)} />}
    </div>
  );
}

// 臨時運動新增彈窗
function ExtraModal({ onAdd, close }) {
  const [name, setName] = useState("");
  const [spr, setSpr] = useState("run");
  const [minutes, setMinutes] = useState(30);
  const SPR=["run","yoga","breath","hand","weight","bike","swim","star"];
  const QUICK=[["登山","star"],["球類","star"],["重訓","weight"],["游泳","swim"],["騎車","bike"],["健走","run"]];
  return (
    <div onClick={close} style={{ position:"fixed", inset:0, background:"rgba(58,51,41,.55)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} className="pix" style={{ background:C.panel, padding:20, width:"100%", maxWidth:360, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.coin, marginBottom:6 }}>臨時運動</div>
        <div style={{ fontSize:11, color:C.dim, marginBottom:14 }}>今天額外做的運動，只計當天、給 XP 與金幣，不影響每日完成率。</div>
        <div style={{ fontSize:12, color:C.dim, marginBottom:6 }}>快速選擇</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
          {QUICK.map(([n,s])=>(<button key={n} className="btn" onClick={()=>{setName(n);setSpr(s);}} style={{ padding:"6px 10px", border:`2px solid ${name===n?C.coin:C.line}`, background:name===n?C.panelAlt:C.bg, color:C.ink, cursor:"pointer", fontFamily:F, fontSize:12 }}>{n}</button>))}
        </div>
        <div style={{ fontSize:12, color:C.dim, marginBottom:6 }}>名稱</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：爬山" style={inp}/>
        <div style={{ fontSize:12, color:C.dim, margin:"14px 0 6px" }}>圖示</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{SPR.map(s=>(<button key={s} className="btn" onClick={()=>setSpr(s)} style={{ width:38, height:38, padding:4, background:spr===s?C.panelAlt:C.bg, border:`2px solid ${spr===s?C.coin:C.line}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Mini kind={s}/></button>))}</div>
        <div style={{ fontSize:12, color:C.dim, margin:"14px 0 6px" }}>時間：{minutes} 分</div>
        <input type="range" min={5} max={120} step={5} value={minutes} onChange={e=>setMinutes(+e.target.value)} style={{ width:"100%" }}/>
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button className="btn" onClick={close} style={{ flex:1, padding:12, background:C.bgAlt, border:`3px solid ${C.lineDark}`, color:C.dim, cursor:"pointer", fontFamily:F, fontWeight:700 }}>取消</button>
          <button className="btn" onClick={()=>name.trim()&&onAdd({name:name.trim(),spr,minutes})} style={{ flex:1, padding:12, background:C.coin, border:`3px solid ${C.ink}`, color:"#fff", cursor:"pointer", fontFamily:F, fontWeight:700 }}>記錄</button>
        </div>
      </div>
    </div>
  );
}

// ════ 角色養成頁 ════
function CharTab({ level, sIdx, stage, pg, weapon, equippedArmor, equipObj, atkBonus, defBonus, recBonus }) {
  return (
    <div>
      {/* 電子雞養成場景 */}
      <PetScene stage={sIdx} level={level} color={stage.color} weapon={weapon} armor={equipObj} />
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ fontSize:18, fontWeight:700, color:stage.color }}>{stage.name}</div>
        <div style={{ fontSize:13, color:C.gold }}>Lv.{level} · 階段 {sIdx+1}/12</div>
      </div>

      {/* 能力數值 */}
      <Header>能力值</Header>
      <div className="pix" style={{ background:C.panelAlt, padding:14, marginBottom:16 }}>
        <Stat label="攻擊力" value={`基礎 + ${atkBonus}`} icon="sword" color={C.red} />
        <Stat label="防禦力" value={`+ ${defBonus}`} icon="chest" color={C.blue} />
        <Stat label="恢復力" value={`+ ${recBonus}`} icon="amulet" color={C.green} />
      </div>

      {/* 當前裝備 */}
      <Header>裝備中</Header>
      <div className="pix" style={{ background:C.panel, padding:14, marginBottom:16 }}>
        <EquipRow label="武器" item={weapon} />
        {["head","body","feet","acc"].map(slot=>{ const it=equippedArmor.find(a=>a.slot===slot); return <EquipRow key={slot} label={ARMOR_SLOTS[slot]} item={it} />; })}
      </div>

      {/* 進化歷程 12 階段 */}
      <Header>進化歷程</Header>
      <div className="pix" style={{ background:C.panelAlt, padding:14, marginBottom:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {STAGES.map((st,i)=>{ const unlocked=i<=sIdx; const current=i===sIdx;
            return (<div key={i} style={{ textAlign:"center", opacity:unlocked?1:0.32 }}>
              <div className="pix" style={{ width:"100%", aspectRatio:"1", background:current?C.bg:C.panel, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${current?C.gold:C.line}` }}>
                {unlocked ? <Hero stage={i} color={st.color} small /> : <Hero stage={i} color={st.color} small silhouette />}
              </div>
              <div style={{ fontSize:9, color:unlocked?st.color:C.dim, marginTop:4, lineHeight:1.2 }}>{unlocked?st.name:`Lv.${st.lv}`}</div>
            </div>);
          })}
        </div>
      </div>

      {/* 擊敗 Boss 收藏 */}
      <Header>擊敗收藏 {(pg.defeated||[]).length}/52</Header>
      <div className="pix" style={{ background:C.panel, padding:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6 }}>
          {BOSSES.map(b=>{ const got=(pg.defeated||[]).includes(b.id);
            return (<div key={b.id} title={b.name} className="pix" style={{ aspectRatio:"1", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${got?b.color:C.line}`, opacity:got?1:0.28 }}>
              {got ? <BossSprite shape={b.shape} color={b.color} mini variant={b.variant} /> : <BossSprite shape={b.shape} color={b.color} mini silhouette variant={b.variant} />}
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value, icon, color }) {
  return (<div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.line}` }}>
    <span className="pix" style={{ width:28, height:28, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${C.line}` }}><Mini kind={icon} size={16}/></span>
    <span style={{ flex:1, fontSize:13 }}>{label}</span>
    <span style={{ fontSize:14, fontWeight:700, color }}>{value}</span>
  </div>);
}
function EquipRow({ label, item }) {
  return (<div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.line}` }}>
    <span style={{ fontSize:12, color:C.dim, width:40 }}>{label}</span>
    {item ? (<>
      <span className="pix" style={{ width:28, height:28, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${rarity(item.tier).base}` }}><Mini kind={item.spr} size={16} tier={item.tier}/></span>
      <span style={{ flex:1, fontSize:13, fontWeight:700 }}>{item.name}</span>
      <span style={{ fontSize:11, color:C.dim }}>{item.atk?`攻+${item.atk}`:""}{item.def?` 防+${item.def}`:""}{item.rec?` 復+${item.rec}`:""}</span>
    </>) : <span style={{ flex:1, fontSize:12, color:C.dim }}>未裝備</span>}
  </div>);
}

// ════ 圖鑑 ════
function DexTab({ sIdx, pg }) {
  const [mode, setMode] = useState("hero"); // hero | boss
  const [sel, setSel] = useState(null); // 選中的詳情
  const defeated = pg.defeated||[];
  const heroUnlocked = sIdx+1;
  const bossUnlocked = defeated.length;

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[["hero",`主角 ${heroUnlocked}/12`],["boss",`Boss ${bossUnlocked}/52`]].map(([k,l])=>(
          <button key={k} className="btn" onClick={()=>{setMode(k);setSel(null);}} style={{ flex:1, padding:10, border:`3px solid ${C.lineDark}`, cursor:"pointer", fontFamily:F, fontWeight:700, fontSize:13, background:mode===k?C.panel:C.bgAlt, color:mode===k?C.gold:C.dim }}>{l}</button>
        ))}
      </div>

      {mode==="hero" ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {STAGES.map((st,i)=>{ const got=i<=sIdx;
            return (<button key={i} className="btn pix" onClick={()=>got&&setSel({type:"hero",data:st,idx:i})} style={{ background:got?C.panel:C.panelAlt, padding:"12px 6px", cursor:got?"pointer":"default", textAlign:"center", opacity:got?1:0.35, fontFamily:F }}>
              <div className="pix" style={{ width:"100%", aspectRatio:"1", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${got?st.color:C.line}`, marginBottom:6 }}>
                {got ? <Hero stage={i} color={st.color} small /> : <Hero stage={i} color={st.color} small silhouette />}
              </div>
              <div style={{ fontSize:10, color:got?st.color:C.dim, lineHeight:1.3 }}>{got?st.name:`Lv.${st.lv}`}</div>
            </button>);
          })}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {BOSSES.map(b=>{ const got=defeated.includes(b.id);
            return (<button key={b.id} className="btn pix" onClick={()=>got&&setSel({type:"boss",data:b})} style={{ background:got?C.panel:C.panelAlt, padding:"8px 4px", cursor:got?"pointer":"default", textAlign:"center", opacity:got?1:0.32, fontFamily:F }}>
              <div className="pix" style={{ width:"100%", aspectRatio:"1", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${got?b.color:C.line}`, marginBottom:4 }}>
                {got ? <BossSprite shape={b.shape} color={b.color} mini variant={b.variant} /> : <BossSprite shape={b.shape} color={b.color} mini silhouette variant={b.variant} />}
              </div>
              <div style={{ fontSize:9, color:got?b.color:C.dim, lineHeight:1.2 }}>{got?b.name:`第${b.week}週`}</div>
            </button>);
          })}
        </div>
      )}

      {sel && (
        <div onClick={()=>setSel(null)} style={{ position:"fixed", inset:0, background:"rgba(58,51,41,.55)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} className="pix" style={{ background:C.panel, padding:22, width:"100%", maxWidth:340, textAlign:"center" }}>
            <div className="pix" style={{ width:96, height:96, background:C.bg, display:"inline-flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`3px solid ${sel.data.color}`, animation:"float 3s infinite" }}>
              {sel.type==="hero" ? <Hero stage={sel.idx} color={sel.data.color} big /> : <BossSprite shape={sel.data.shape} color={sel.data.color} variant={sel.data.variant} />}
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:sel.data.color, marginTop:12 }}>{sel.data.name}</div>
            {sel.type==="hero" ? (
              <div style={{ fontSize:12, color:C.gold, marginTop:2 }}>第 {sel.idx+1} 階段 · Lv.{sel.data.lv} 解鎖</div>
            ) : (
              <div style={{ fontSize:12, color:C.gold, marginTop:2 }}>第 {sel.data.week} 週 · {sel.data.label} · 生肖{ZODIAC_CN[sel.data.zodiac]}</div>
            )}
            <div style={{ fontSize:13, color:C.inkSoft, marginTop:12, lineHeight:1.7, textAlign:"left", background:C.panelAlt, padding:12, border:`2px solid ${C.line}` }}>
              {sel.type==="hero" ? sel.data.desc : sel.data.tip}
            </div>
            {sel.type==="boss" && (
              <div style={{ display:"flex", justifyContent:"space-around", marginTop:12, fontSize:12, color:C.dim }}>
                <span>HP {sel.data.hp}</span>
                <span style={{ color:C.coin, display:"flex", alignItems:"center", gap:3 }}><Mini kind="coin" size={12}/>{sel.data.coin}</span>
                <span style={{ color:C.xp }}>+{sel.data.xp}XP</span>
              </div>
            )}
            <button className="btn" onClick={()=>setSel(null)} style={{ marginTop:16, width:"100%", padding:12, background:C.bgAlt, border:`3px solid ${C.lineDark}`, color:C.ink, cursor:"pointer", fontFamily:F, fontWeight:700 }}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════ 商城 ════
function ShopTab({ pg, buy, equip, level }) {
  const [cat, setCat] = useState("weapon");
  const [detail, setDetail] = useState(null);
  const items = SHOP[cat];
  const isWeapon = cat==="weapon";
  return (
    <div>
      <div className="pix" style={{ background:C.panelAlt, padding:"10px 14px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, color:C.dim }}>持有金幣 · Lv.{level}</span>
        <span style={{ fontSize:18, fontWeight:700, color:C.coin, display:"flex", alignItems:"center", gap:5 }}><Mini kind="coin" size={18}/>{pg.coins||0}</span>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto", paddingBottom:2 }}>
        {SHOP_CATS.map(([k,l])=>(<button key={k} className="btn" onClick={()=>setCat(k)} style={{ flex:"1 0 auto", minWidth:56, padding:"8px 6px", border:`3px solid ${C.lineDark}`, cursor:"pointer", fontFamily:F, fontWeight:700, fontSize:13, background:cat===k?C.panel:C.bgAlt, color:cat===k?C.gold:C.dim }}>{l}</button>))}
      </div>
      <div style={{ fontSize:10, color:C.dim, marginBottom:8, textAlign:"center" }}>點圖示可看裝備詳情</div>
      {items.map(it=>{ const owned=pg.owned?.includes(it.id); const slot=isWeapon?"weapon":it.slot; const equipped=pg.equip?.[slot]===it.id; const afford=(pg.coins||0)>=it.price;
        const locked = level < (it.reqLv||1);
        return (<div key={it.id} className="pix" style={{ background:locked?C.panelAlt:C.panel, padding:12, marginBottom:10, display:"flex", alignItems:"center", gap:12, opacity:locked?0.6:1 }}>
          <button onClick={()=>setDetail({it,slot})} className="pix" style={{ width:42, height:42, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${locked?C.line:tierColor(it.tier)}`, filter:locked?"grayscale(1)":"none", cursor:"pointer", padding:0 }}><Mini kind={it.spr} size={22} tier={it.tier}/></button>
          <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={()=>setDetail({it,slot})}>
            <div style={{ fontSize:14, fontWeight:700 }}>{it.name} <span style={{ fontSize:10, color:tierColor(it.tier) }}>{rarity(it.tier).name}</span></div>
            <div style={{ fontSize:11, color:C.dim }}>{it.atk?`攻擊+${it.atk}`:""}{it.def?`防禦+${it.def}`:""}{it.rec?` 恢復+${it.rec}`:""}</div>
          </div>
          {locked ? (
            <div style={{ ...shopBtn, background:C.bgAlt, color:C.dim, borderColor:C.line, display:"flex", flexDirection:"column", lineHeight:1.3, cursor:"default" }}>
              <span style={{ fontSize:14 }}>🔒</span>
              <span style={{ fontSize:10 }}>Lv.{it.reqLv}</span>
            </div>
          ) : owned ? (
            <button className="btn" onClick={()=>equip(it,slot)} style={{ ...shopBtn, background:equipped?C.green:C.bgAlt, color:equipped?"#fff":C.ink, borderColor:equipped?C.green:C.lineDark }}>{equipped?"裝備中":"裝備"}</button>
          ) : (
            <button className="btn" onClick={()=>buy(it,cat)} disabled={!afford} style={{ ...shopBtn, background:afford?C.gold:C.bgAlt, color:afford?"#fff":C.dim, borderColor:afford?C.gold:C.line, display:"flex", flexDirection:"column", lineHeight:1.2 }}>
              <span style={{ display:"flex", alignItems:"center", gap:2, fontSize:11 }}><Mini kind="coin" size={11}/>{it.price}</span>
              <span style={{ fontSize:10 }}>購買</span>
            </button>
          )}
        </div>);
      })}
      {detail && <ItemCard it={detail.it} owned={pg.owned?.includes(detail.it.id)} equipped={pg.equip?.[detail.slot]===detail.it.id} close={()=>setDetail(null)} />}
    </div>
  );
}
function tierColor(t){ return rarity(t).base; }

// ════ 裝備詳情卡（深色 Tool Tip 風）════
function itemDesc(it){
  const tn = rarity(it.tier).name;
  if(it.atk){
    return `一把${tn}級的武器，鋒利而可靠。攻擊力 +${it.atk}，能對 Boss 造成更高傷害。`;
  }
  const parts=[];
  if(it.def) parts.push(`提供 +${it.def} 防禦`);
  if(it.rec) parts.push(`+${it.rec} 恢復力`);
  const slotName = {head:"頭部",body:"身體",feet:"腳部",acc:"飾品"}[it.slot]||"";
  return `一件${tn}級的${slotName}裝備，${parts.join("、")}。恢復力會提升睡眠時回復的經驗值。`;
}
function ItemCard({ it, owned, equipped, close }){
  const r = rarity(it.tier);
  const rows = [];
  if(it.atk) rows.push(["攻擊", `+${it.atk}`, C.green]);
  if(it.def) rows.push(["防禦", `+${it.def}`, C.green]);
  if(it.rec) rows.push(["恢復", `+${it.rec}`, C.green]);
  return (
    <div onClick={close} style={{ position:"fixed", inset:0, background:"rgba(20,16,12,.6)", zIndex:120, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:320, background:"linear-gradient(#2a2530,#1e1a24)", border:`3px solid ${r.base}`, boxShadow:`0 0 0 2px #0a0810, 0 8px 24px rgba(0,0,0,.5)`, fontFamily:F, color:"#e8e2d8", overflow:"hidden" }}>
        {/* 標題列 */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:14, borderBottom:`2px solid ${r.base}44` }}>
          <div style={{ width:52, height:52, background:"#15121c", display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${r.base}`, boxShadow:`inset 0 0 10px ${r.base}55` }}><Mini kind={it.spr} size={30} tier={it.tier}/></div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:r.base }}>{it.name}</div>
            <div style={{ fontSize:11, color:"#a89", display:"flex", alignItems:"center", gap:4 }}>{it.price>0 ? <><Mini kind="coin" size={12}/>{it.price}</> : "限定掉落"} · {r.name}{it.reqLv?` · Lv.${it.reqLv}`:""}</div>
          </div>
        </div>
        {/* 數值 */}
        <div style={{ padding:14 }}>
          {rows.map(([l,v,c],i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.06)", fontSize:13 }}>
              <span style={{ color:"#c8c2b8" }}>{l}</span>
              <span style={{ color:c, fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Tool Tip */}
        <div style={{ margin:"0 14px 14px", padding:10, background:"rgba(0,0,0,.3)", border:"1px solid rgba(255,255,255,.08)", fontSize:12, lineHeight:1.7, color:"#bdb6aa" }}>
          <span style={{ color:r.base, fontWeight:700 }}>說明　</span>{itemDesc(it)}
        </div>
        <button className="btn" onClick={close} style={{ width:"100%", padding:12, background:"#3a3444", border:"none", borderTop:`2px solid ${r.base}44`, color:"#e8e2d8", cursor:"pointer", fontFamily:F, fontWeight:700, fontSize:13 }}>關閉</button>
      </div>
    </div>
  );
}

// ════ 統計 ════
function Stats({ allKeys, cfg }) {
  const [mode, setMode] = useState("day"); // day | week | month
  const [anchor, setAnchor] = useState(todayKey());
  const [data, setData] = useState([]);
  const [dayData, setDayData] = useState(null); // 單日完整明細
  const [rangeLabel, setRangeLabel] = useState("");
  const totalItems = cfg.exercises.length+cfg.supplements.length;

  useEffect(()=>{ (async()=>{
    const cache={}; for(const k of allKeys){ try{ const r=await storage.get(`day:${k}`); cache[k]=r?JSON.parse(r.value):emptyDay(); }catch{} }
    const base=new Date(anchor+"T12:00:00");
    const exTot=cfg.exercises.length, spTot=cfg.supplements.length, all=exTot+spTot;
    const mk=(dy)=>{ const ex=cfg.exercises.filter(e=>dy.exercises?.[e.id]?.done).length; const sp=cfg.supplements.filter(s=>dy.supplements?.[s.id]).length;
      return { ex, sp, done:ex+sp, exRate:exTot?ex/exTot:0, spRate:spTot?sp/spTot:0, rate:all?(ex+sp)/all:0, sleep:dy.sleep||0 }; };
    if(mode==="day"){
      // 取錨點當天，組逐項明細
      let dy=cache[anchor]; if(!dy){ try{ const r=await storage.get(`day:${anchor}`); dy=r?JSON.parse(r.value):emptyDay(); }catch{ dy=emptyDay(); } }
      const wd=["日","一","二","三","四","五","六"][base.getDay()];
      setRangeLabel(`${base.getMonth()+1}/${base.getDate()} 週${wd}`);
      setDayData({ dy, ...mk(dy), extras:dy.extras||[], note:dy.note||"" });
      setData([]);
    } else if(mode==="week"){
      const mon=new Date(base); mon.setDate(base.getDate()-((base.getDay()+6)%7));
      const out=[];
      for(let i=0;i<7;i++){ const dd=new Date(mon); dd.setDate(mon.getDate()+i); const k=todayKey(dd); const dy=cache[k]||emptyDay();
        out.push({ label:["一","二","三","四","五","六","日"][i], ...mk(dy) }); }
      const sun=new Date(mon); sun.setDate(mon.getDate()+6);
      setRangeLabel(`${mon.getMonth()+1}/${mon.getDate()} – ${sun.getMonth()+1}/${sun.getDate()}`);
      setData(out); setDayData(null);
    } else {
      const y=base.getFullYear(), m=base.getMonth();
      const days=new Date(y,m+1,0).getDate(); const out=[];
      for(let d=1; d<=days; d++){ const k=todayKey(new Date(y,m,d)); const dy=cache[k]||emptyDay();
        out.push({ label:d%5===1||d===1?String(d):"", ...mk(dy) }); }
      setRangeLabel(`${y} 年 ${m+1} 月`);
      setData(out); setDayData(null);
    }
  })(); },[allKeys,mode,cfg,anchor]);

  function shift(delta){ const b=new Date(anchor+"T12:00:00");
    if(mode==="day") b.setDate(b.getDate()+delta);
    else if(mode==="week") b.setDate(b.getDate()+delta*7); else b.setMonth(b.getMonth()+delta);
    setAnchor(todayKey(b)); }

  const recorded = data.filter(d=>d.done>0);
  const avgRate = recorded.length ? Math.round(recorded.reduce((s,d)=>s+d.rate,0)/recorded.length*100) : 0;
  const fullDays = data.filter(d=>totalItems>0 && d.done===totalItems).length;
  const avgSleep = (()=>{ const v=data.filter(d=>d.sleep>0); return v.length?(v.reduce((s,d)=>s+d.sleep,0)/v.length).toFixed(1):"-"; })();
  const rateColor = (r)=> r>=1?C.gold : r>=0.7?C.green : r>=0.4?C.blue : r>0?C.dim : C.line;

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {[["day","以日查看"],["week","以週查看"],["month","以月查看"]].map(([k,l])=>(<button key={k} className="btn" onClick={()=>{setMode(k);setAnchor(todayKey());}} style={{ flex:1, padding:10, border:`3px solid ${C.lineDark}`, cursor:"pointer", fontFamily:F, fontWeight:700, fontSize:12, background:mode===k?C.panel:C.bgAlt, color:mode===k?C.gold:C.dim }}>{l}</button>))}
      </div>

      {/* 日期切換 */}
      <div className="pix" style={{ background:C.panelAlt, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", marginBottom:14 }}>
        <button className="btn" onClick={()=>shift(-1)} style={dateBtn}>◀</button>
        <span style={{ fontSize:13, fontWeight:700, color:C.gold }}>{rangeLabel}{mode==="day"&&anchor===todayKey()?" (今天)":""}</span>
        <button className="btn" onClick={()=>shift(1)} style={dateBtn} disabled={mode==="day"&&anchor===todayKey()}>▶</button>
      </div>

      {/* ── 以日查看：單日完整明細 ── */}
      {mode==="day" && dayData && (
        <div>
          {/* 當日完成率大卡 */}
          <div className="pix" style={{ background:C.panel, padding:18, marginBottom:14, textAlign:"center" }}>
            <div style={{ fontSize:40, fontWeight:700, color:rateColor(dayData.rate) }}>{Math.round(dayData.rate*100)}%</div>
            <div style={{ fontSize:12, color:C.dim }}>當日完成率</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:10, fontSize:12 }}>
              <span style={{ color:C.green }}>運動 {dayData.ex}/{cfg.exercises.length}</span>
              <span style={{ color:C.blue }}>保健 {dayData.sp}/{cfg.supplements.length}</span>
              <span style={{ color:C.coin }}>睡眠 {dayData.sleep?`${dayData.sleep}★`:"-"}</span>
            </div>
          </div>
          {/* 運動逐項 */}
          <div className="pix" style={{ background:C.panel, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:12, color:C.dim, marginBottom:10 }}>運動明細</div>
            {cfg.exercises.map(ex=>{ const rec=dayData.dy.exercises?.[ex.id]; const done=rec?.done;
              return (<div key={ex.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:`1px solid rgba(0,0,0,.04)` }}>
                <span style={{ width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", background:done?C.green:C.bgAlt, color:"#fff", fontSize:12, border:`1px solid ${done?C.green:C.line}` }}>{done?"✓":""}</span>
                <span style={{ flex:1, fontSize:13, color:done?C.ink:C.dim }}>{ex.name}</span>
                <span style={{ fontSize:11, color:C.dim }}>{done?`${rec.minutes}分`:"未做"}</span>
              </div>);
            })}
            {dayData.extras.length>0 && dayData.extras.map(x=>(
              <div key={x.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:`1px solid rgba(0,0,0,.04)` }}>
                <span style={{ width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", background:C.coin, color:"#fff", fontSize:12 }}>✓</span>
                <span style={{ flex:1, fontSize:13, color:C.ink }}>{x.name} <span style={{ fontSize:10, color:C.coin }}>臨時</span></span>
                <span style={{ fontSize:11, color:C.dim }}>{x.minutes}分</span>
              </div>
            ))}
          </div>
          {/* 保健品逐項 */}
          <div className="pix" style={{ background:C.panel, padding:14, marginBottom:12 }}>
            <div style={{ fontSize:12, color:C.dim, marginBottom:10 }}>保健品明細</div>
            {cfg.supplements.map(s=>{ const taken=dayData.dy.supplements?.[s.id];
              return (<div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:`1px solid rgba(0,0,0,.04)` }}>
                <span style={{ width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", background:taken?C.green:C.bgAlt, color:"#fff", fontSize:12, border:`1px solid ${taken?C.green:C.line}` }}>{taken?"✓":""}</span>
                <span style={{ flex:1, fontSize:13, color:taken?C.ink:C.dim }}>{s.name}</span>
                <span style={{ fontSize:11, color:C.dim }}>{SLOT_LABELS[s.slot]}</span>
              </div>);
            })}
          </div>
          {/* 當日日誌 */}
          {dayData.note && (
            <div className="pix" style={{ background:C.panelAlt, padding:14, fontSize:13, color:C.inkSoft, lineHeight:1.7 }}>
              <span style={{ color:C.dim }}>日誌　</span>{dayData.note}
            </div>
          )}
        </div>
      )}

      {/* ── 週/月：原本的長條圖視圖 ── */}
      {mode!=="day" && (<>
      {/* 摘要 */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <div className="pix" style={{ flex:1, background:C.panel, padding:"10px 6px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:rateColor(avgRate/100) }}>{avgRate}%</div>
          <div style={{ fontSize:10, color:C.dim }}>平均完成率</div>
        </div>
        <div className="pix" style={{ flex:1, background:C.panel, padding:"10px 6px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:C.gold }}>{fullDays}</div>
          <div style={{ fontSize:10, color:C.dim }}>全達標天數</div>
        </div>
        <div className="pix" style={{ flex:1, background:C.panel, padding:"10px 6px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:700, color:C.coin }}>{avgSleep}</div>
          <div style={{ fontSize:10, color:C.dim }}>平均睡眠★</div>
        </div>
      </div>

      {!data.length ? <div style={{ padding:30, textAlign:"center", color:C.dim }}>還沒有紀錄</div> : (
        <div className="pix" style={{ background:C.panel, padding:"20px 14px" }}>
          <div style={{ fontSize:12, color:C.dim, marginBottom:14, display:"flex", justifyContent:"space-between" }}>
            <span>每日完成率</span>
            <span style={{ fontSize:10 }}>滿格 = 全達標</span>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-around", height:160, gap:mode==="month"?2:6 }}>
            {data.map((d,i)=>{ const h=d.rate*100; const c=rateColor(d.rate);
              return (<div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", height:"100%", justifyContent:"flex-end" }}>
                {mode==="week" && <div style={{ fontSize:10, color:c, marginBottom:4, fontWeight:700 }}>{Math.round(d.rate*100)}%</div>}
                <div style={{ width:mode==="month"?"90%":"82%", height:`${Math.max(h,2)}%`, background:c, border:mode==="month"?`1px solid ${C.ink}`:`2px solid ${C.ink}`, transition:"height .4s", position:"relative" }}>
                  {d.rate>=1 && mode==="week" && <div style={{ position:"absolute", top:-2, left:0, right:0, height:3, background:C.gold }}/>}
                </div>
                <div style={{ fontSize:mode==="month"?8:11, color:C.dim, marginTop:6, height:12 }}>{d.label}</div>
              </div>); })}
          </div>
          {/* 圖例 */}
          <div style={{ display:"flex", justifyContent:"center", gap:12, marginTop:12, fontSize:9, color:C.dim, flexWrap:"wrap" }}>
            {[["100%",C.gold],["70%+",C.green],["40%+",C.blue],["<40%",C.dim]].map(([t,c])=>(
              <span key={t} style={{ display:"flex", alignItems:"center", gap:3 }}><span style={{ width:8, height:8, background:c, border:`1px solid ${C.ink}` }}/>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* 分項完成率：運動 vs 保健品 */}
      {data.length>0 && (
        <div className="pix" style={{ background:C.panel, padding:"16px 14px", marginTop:14 }}>
          <div style={{ fontSize:12, color:C.dim, marginBottom:12 }}>分項完成率</div>
          {[["運動", recorded.length?Math.round(recorded.reduce((s,d)=>s+d.exRate,0)/recorded.length*100):0, C.green],
            ["保健品", recorded.length?Math.round(recorded.reduce((s,d)=>s+d.spRate,0)/recorded.length*100):0, C.blue]].map(([l,v,c])=>(
            <div key={l} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <span style={{ color:C.ink }}>{l}</span><span style={{ color:c, fontWeight:700 }}>{v}%</span>
              </div>
              <div style={{ height:12, background:C.bgAlt, border:`2px solid ${C.lineDark}` }}>
                <div style={{ height:"100%", width:`${v}%`, background:c, transition:"width .4s" }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 每日明細（逐日完成率細項） */}
      {data.length>0 && (
        <div className="pix" style={{ background:C.panel, padding:"16px 14px", marginTop:14 }}>
          <div style={{ fontSize:12, color:C.dim, marginBottom:10 }}>每日明細</div>
          <div style={{ display:"flex", fontSize:10, color:C.dim, padding:"0 4px 6px", borderBottom:`1px solid ${C.line}` }}>
            <span style={{ width:mode==="month"?28:40 }}>日</span>
            <span style={{ flex:1 }}>完成率</span>
            <span style={{ width:48, textAlign:"center" }}>運動</span>
            <span style={{ width:48, textAlign:"center" }}>保健</span>
            <span style={{ width:32, textAlign:"right" }}>睡</span>
          </div>
          <div style={{ maxHeight:mode==="month"?220:"auto", overflowY:mode==="month"?"auto":"visible" }}>
          {data.map((d,i)=>{ const c=rateColor(d.rate); const has=d.done>0||d.sleep>0;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", fontSize:11, padding:"6px 4px", borderBottom:`1px solid rgba(0,0,0,.04)`, opacity:has?1:0.4 }}>
                <span style={{ width:mode==="month"?28:40, color:C.ink, fontWeight:700 }}>{mode==="month"?(i+1):d.label}</span>
                <span style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ flex:1, height:8, background:C.bgAlt, border:`1px solid ${C.lineDark}` }}>
                    <span style={{ display:"block", height:"100%", width:`${Math.round(d.rate*100)}%`, background:c }}/>
                  </span>
                  <span style={{ width:30, textAlign:"right", color:c, fontWeight:700 }}>{Math.round(d.rate*100)}%</span>
                </span>
                <span style={{ width:48, textAlign:"center", color:C.dim }}>{d.ex}/{cfg.exercises.length}</span>
                <span style={{ width:48, textAlign:"center", color:C.dim }}>{d.sp}/{cfg.supplements.length}</span>
                <span style={{ width:32, textAlign:"right", color:d.sleep?C.coin:C.line }}>{d.sleep?`${d.sleep}★`:"-"}</span>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* 睡眠趨勢 */}
      {data.length>0 && (
        <div className="pix" style={{ background:C.panel, padding:"16px 14px", marginTop:14 }}>
          <div style={{ fontSize:12, color:C.dim, marginBottom:12 }}>睡眠品質（★）</div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-around", height:80, gap:mode==="month"?2:6 }}>
            {data.map((d,i)=>(<div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", height:"100%", justifyContent:"flex-end" }}>
              <div style={{ width:mode==="month"?"90%":"70%", height:`${(d.sleep/5)*100}%`, background:C.coin, border:mode==="month"?`1px solid ${C.ink}`:`2px solid ${C.ink}`, minHeight:2 }}/>
              <div style={{ fontSize:mode==="month"?8:10, color:C.dim, marginTop:4, height:10 }}>{mode==="week"?(d.sleep?d.sleep:""):""}</div>
            </div>))}
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}

// ════ 設定 ════
function EditTab({ cfg, saveCfg }) {
  const [editing, setEditing] = useState(null);
  return (
    <div>
      <Header>運動項目</Header>
      {cfg.exercises.map(ex=>(<div key={ex.id} className="pix" style={{ background:C.panel, padding:12, marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
        <span className="pix" style={{ width:32, height:32, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${C.line}` }}><Mini kind={ex.spr}/></span>
        <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700 }}>{ex.name}</div><div style={{ fontSize:11, color:C.dim }}>{ex.target}{ex.unit} · {ex.attr} · +{ex.xp}XP</div></div>
        <button className="btn" onClick={()=>setEditing({type:"ex",item:ex})} style={miniBtn}>改</button>
        <button className="btn" onClick={()=>saveCfg({...cfg,exercises:cfg.exercises.filter(e=>e.id!==ex.id)})} style={{...miniBtn,borderColor:C.red,color:C.red}}>刪</button>
      </div>))}
      <button className="btn" onClick={()=>setEditing({type:"ex",item:{id:"ex_"+Date.now(),name:"",target:20,unit:"分",attr:"體力",spr:"star",xp:15}})} style={addBtn}>＋ 新增運動</button>
      <Header>保健品項目</Header>
      {cfg.supplements.map(s=>(<div key={s.id} className="pix" style={{ background:C.panel, padding:12, marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
        <span className="pix" style={{ width:30, height:30, background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"none", border:`2px solid ${C.line}` }}><Mini kind={s.spr||"pill"}/></span>
        <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700 }}>{s.name}</div><div style={{ fontSize:11, color:C.dim }}>{SLOT_LABELS[s.slot]} · {s.note} · +{s.xp}XP</div></div>
        <button className="btn" onClick={()=>setEditing({type:"supp",item:s})} style={miniBtn}>改</button>
        <button className="btn" onClick={()=>saveCfg({...cfg,supplements:cfg.supplements.filter(x=>x.id!==s.id)})} style={{...miniBtn,borderColor:C.red,color:C.red}}>刪</button>
      </div>))}
      <button className="btn" onClick={()=>setEditing({type:"supp",item:{id:"sp_"+Date.now(),name:"",slot:"morning",note:"",xp:5,spr:"pill"}})} style={addBtn}>＋ 新增保健品</button>
      {editing && <EditModal editing={editing} cfg={cfg} saveCfg={saveCfg} close={()=>setEditing(null)} />}
    </div>
  );
}
function EditModal({ editing, cfg, saveCfg, close }) {
  const [item, setItem] = useState(editing.item); const isEx=editing.type==="ex";
  function save(){ if(!item.name.trim()){ close(); return; }
    if(isEx){ const ex=cfg.exercises.some(e=>e.id===item.id); saveCfg({...cfg,exercises:ex?cfg.exercises.map(e=>e.id===item.id?item:e):[...cfg.exercises,item]}); }
    else { const ex=cfg.supplements.some(s=>s.id===item.id); saveCfg({...cfg,supplements:ex?cfg.supplements.map(s=>s.id===item.id?item:s):[...cfg.supplements,item]}); } close(); }
  const SPR=["run","yoga","breath","moon","hand","weight","bike","swim","star"];
  const SUPP_SPR=["pill","potion_red","potion_blue","potion_green","potion_gold","bottle","herb","leaf","scroll","flask","heart","drop","berry"];
  return (
    <div onClick={close} style={{ position:"fixed", inset:0, background:"rgba(58,51,41,.55)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()} className="pix" style={{ background:C.panel, padding:20, width:"100%", maxWidth:360, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.gold, marginBottom:16 }}>{isEx?"運動項目":"保健品"}</div>
        <Field label="名稱"><input value={item.name} onChange={e=>setItem({...item,name:e.target.value})} style={inp} placeholder="例如：重訓"/></Field>
        {isEx ? (<>
          <Field label="圖示"><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{SPR.map(sp=>(<button key={sp} className="btn" onClick={()=>setItem({...item,spr:sp})} style={{ width:38, height:38, padding:4, background:item.spr===sp?C.panelAlt:C.bg, border:`2px solid ${item.spr===sp?C.gold:C.line}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Mini kind={sp}/></button>))}</div></Field>
          <Field label="目標時間（分）"><input type="number" value={item.target} onChange={e=>setItem({...item,target:+e.target.value})} style={inp}/></Field>
          <Field label="屬性"><select value={item.attr} onChange={e=>setItem({...item,attr:e.target.value})} style={inp}>{["體力","專注","敏捷","恢復","力量"].map(a=><option key={a}>{a}</option>)}</select></Field>
        </>) : (<>
          <Field label="圖示"><div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>{SUPP_SPR.map(sp=>(<button key={sp} className="btn" onClick={()=>setItem({...item,spr:sp})} style={{ width:38, height:38, padding:4, background:(item.spr||"pill")===sp?C.panelAlt:C.bg, border:`2px solid ${(item.spr||"pill")===sp?C.gold:C.line}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Mini kind={sp}/></button>))}</div></Field>
          <Field label="時段"><select value={item.slot} onChange={e=>setItem({...item,slot:e.target.value})} style={inp}><option value="morning">早晨</option><option value="noon">中午</option><option value="evening">晚上</option></select></Field>
          <Field label="備註"><input value={item.note} onChange={e=>setItem({...item,note:e.target.value})} style={inp} placeholder="例如：飯後"/></Field>
        </>)}
        <Field label={`經驗值 +${item.xp}XP`}><input type="range" min={5} max={40} step={5} value={item.xp} onChange={e=>setItem({...item,xp:+e.target.value})} style={{width:"100%"}}/></Field>
        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <button className="btn" onClick={close} style={{ flex:1, padding:12, background:C.bgAlt, border:`3px solid ${C.lineDark}`, color:C.dim, cursor:"pointer", fontFamily:F, fontWeight:700 }}>取消</button>
          <button className="btn" onClick={save} style={{ flex:1, padding:12, background:C.green, border:`3px solid ${C.ink}`, color:"#fff", cursor:"pointer", fontFamily:F, fontWeight:700 }}>儲存</button>
        </div>
      </div>
    </div>
  );
}

// ════ 共用 ════
function Gauge({ value, max, color, bg, label }) {
  const pct=max?Math.min(100,(value/max)*100):0;
  return (<div style={{ position:"relative", height:18, background:bg, border:`2px solid ${C.lineDark}` }}>
    <div style={{ height:"100%", width:`${pct}%`, background:color, transition:"width .4s" }}/>
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", textShadow:"1px 1px 0 rgba(0,0,0,.5)" }}>{label}</div>
  </div>);
}
function Header({ children }){ return <div style={{ fontSize:14, fontWeight:700, color:C.gold, margin:"20px 0 12px", borderBottom:`2px solid ${C.line}`, paddingBottom:6 }}>{children}</div>; }
function Field({ label, children }){ return <div style={{ marginBottom:14 }}><div style={{ fontSize:12, color:C.dim, marginBottom:6 }}>{label}</div>{children}</div>; }
// ════════════════════════════════════════════════
//  精細像素美術模組（GBA 等級 / 勇者鬥惡龍風）
//  16×16 網格 · 3 階明暗 · 輪廓描邊
// ════════════════════════════════════════════════

// 通用：把一張「色碼字串陣列」轉成 SVG rect。
// 每格一字元，' '=透明。palette 對應字元→顏色。
function pixGrid(rows, palette, size, viewW, viewH) {
  const u = size / Math.max(viewW, viewH);
  const els = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === " " || ch === ".") continue;
      const c = palette[ch];
      if (!c) continue;
      els.push(<rect key={`${x}-${y}`} x={x * u} y={y * u} width={u + 0.5} height={u + 0.5} fill={c} />);
    }
  }
  return els;
}

// 顏色工具：加深/提亮
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function darken(hex, amt) { return lighten(hex, -amt); }

// ════ 半身大頭照（左上角頭像，依等級不同越來越帥）════
function HeroPortrait({ stage, color, armor, size = 60 }) {
  const skin = "#f2c79a", skinSh = "#d49b6a", skinHi = "#ffe0bc";
  const hair = stage >= 7 ? "#e8c84a" : stage >= 4 ? "#a06838" : "#6a4428";
  const hairHi = lighten(hair, 45), hairSh = darken(hair, 30);
  const helm = armor?.head, body = armor?.body;
  const helmR = helm ? rarity(helm.tier) : null;
  const bodyR = body ? rarity(body.tier) : null;
  const arm = bodyR ? bodyR.base : color, armHi = bodyR ? bodyR.hi : lighten(color, 35), armSh = bodyR ? bodyR.sh : darken(color, 35);
  const helmC = helmR ? helmR.base : null, helmHi = helmR ? helmR.hi : null;
  const O = "#2a1e14", eye = stage>=9 ? "#c8482a" : "#3a2a4a";
  const scar = stage>=5, crown = stage>=7 && !helm, halo = stage>=9, warpaint = stage>=11;
  const P = {
    O, K: skin, k: skinSh, j: skinHi, H: hair, h: hairHi, s: hairSh,
    A: arm, a: armHi, d: armSh, M: helmC || arm, m: helmHi || armHi,
    E: eye, W: "#ffffff", G: "#f4d24a", g: "#fff0a0", R: "#b03028",
  };
  const rows = [
    halo ? "    GG    GG    " : "                ",
    halo ? "   GggG  GggG   " : "                ",
    helm ? "   OMMMMMMMMO   " : (crown ? "  OGgGgGgGgGgGO " : "    OHHHHHHO    "),
    helm ? "  OMmHHHHHHmMO  " : (crown ? "  OHhHHHHHHhHO  " : "   OHhhhhhhhHO  "),
    helm ? "  OMHhHHHHhHMO  " : "  OHhHHHHHHhHO  ",
    "  OHHKKKKKKHHO  ",
    "  OHKjKKKKjKHO  ",
    warpaint ? "  OKRKEKKEKRKO  " : "  OKKKEKKEKKKO  ",
    "  OKKKKjjKKKKO  ",
    scar ? "  OKkKRKKKKkKO  " : "  OKkKKKKKKkKO  ",
    "  OKjKWWWWjKKO  ",
    "  OkKKKKKKKKkO  ",
    "  OKKkKKKKkKKO  ",
    " OAaAAAAAAAAaAO ",
    "OAaGAaaaaaaAGaAO",
    "OAAAdAAAAAAdAAAO",
  ].map(r => (r + "                ").slice(0, 16));
  const u = size / 16; const els = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = rows[y][x]; if (ch === " ") continue; const c = P[ch]; if (!c) continue;
    els.push(<rect key={`${x}-${y}`} x={x * u} y={y * u} width={u + 0.5} height={u + 0.5} fill={c} />);
  }
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} shapeRendering="crispEdges">{els}</svg>;
}

// ════ 主角（DQ 勇者風，16×16，含動作幀與裝備）════
// frame: 0=待機 1=行走A 2=行走B 3=揮劍；facing:1右 -1左
// 取 armor 物件裡的 body（armor 可能是解析後物件）
function body0(armor){ return armor?.body || null; }
function Hero({ stage, color, weapon, armor, big, small, frame = 0, facing = 1, silhouette = false }) {
  const sz = small ? 38 : (big ? 112 : 58);
  const s = stage;
  const N = 32;

  // ── 配色 ──
  const skin = "#f0c49a", skinSh = "#cf9a68", skinHi = "#ffe2bc";
  const hair = s>=9 ? "#f2d24e" : s>=6 ? "#5e3f24" : s>=2 ? "#5a3a22" : "#7a5230";
  const hairHi = lighten(hair, 50), hairSh = darken(hair, 30);
  const ARMOR_COL = ["#a89878","#5aa050","#458a40","#3a72c8","#cdd2da","#c63c3c","#8f4c2c","#e6c84e","#9560c4","#ecc850","#f2e4a8","#d8ac30"];
  const bodyR = (armor?.body) ? rarity(armor.body.tier) : null;
  const baseArm = bodyR ? bodyR.base : ARMOR_COL[s];
  const A = baseArm, Ah = lighten(baseArm, 40), As = darken(baseArm, 42), Ad = darken(baseArm, 70);

  // 階段特徵
  const hasShield = [2,3,4,5,9].includes(s);
  const hasCape   = s>=4;
  const hasWings  = s>=10;
  const isMage    = s===8;
  const helmType  = s>=11?"crown":s>=10?"halo":s===8?"hood":s>=7?"horn":s>=3?"full":s>=1?"band":"none";
  const capeC = s>=11?"#e6c84e":s>=9?"#7a4ac2":s>=5?"#c0405a":"#3a6ec2";
  const capeHi=lighten(capeC,38), capeSh=darken(capeC,38);
  const gold="#f2d24e", goldHi="#fff2b8", goldSh="#b8902a";
  const wpnR = weapon ? rarity(weapon.tier) : null;
  const wpnKind = isMage ? "staff" : (weapon?.spr || "sword");
  const wTier = weapon ? weapon.tier : Math.min(6, Math.max(1, Math.ceil((s+1)/2)));
  const steel="#d4d8e0", steelHi="#ffffff", steelSh="#8a90a0";

  const P = {
    O:"#1f160f", K:skin, k:skinSh, j:skinHi, H:hair, h:hairHi, q:hairSh,
    A:A, a:Ah, s:As, x:Ad,
    C:capeC, c:capeHi, d:capeSh,
    G:gold, g:goldHi, y:goldSh, Y:goldSh,
    M:steel, m:steelHi, n:steelSh,
    W:"#ffffff", Z:"#eef0f6", z:"#c4c8d4",
    E:"#1c1c30", B:"#4a3a28", b:"#6a5238",
    w: wpnR?wpnR.hi:"#e0e4ee", v: wpnR?wpnR.base:"#aab0c0", u: wpnR?wpnR.sh:"#70768a",
    P:"#8a5ec2", p:"#b48ad8", R:"#cc3a3a", r:"#ee8474", L:"#5aa0e0", Q:"#5a9e4f",
  };

  // ── 32×32 空白網格 ──
  const grid = Array.from({length:N}, ()=> Array(N).fill(" "));
  const set=(y,x,c)=>{ if(y>=0&&y<N&&x>=0&&x<N) grid[y][x]=c; };
  const fillRect=(y0,y1,x0,x1,c)=>{ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)set(y,x,c); };
  // 對稱填色（中軸 x=16）
  const sym=(y,x,c)=>{ set(y,x,c); set(y,31-x,c); };
  const symRect=(y0,y1,x0,x1,c)=>{ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)sym(y,x,c); };

  // ── 披風（先畫，在身體後方）──
  if(hasCape){
    symRect(11,25,7,9,"d");
    symRect(11,24,9,11,"C");
    for(let y=12;y<=23;y+=2) sym(y,10,"c");
    // 披風下襬鋸齒
    sym(26,8,"d"); sym(25,10,"C"); sym(27,9,"d");
  }

  // ── 羽翼（11、12 階，在最後方）──
  if(hasWings){
    // 左右大羽翼
    const wing=[[9,6],[10,4],[10,5],[10,6],[11,3],[11,4],[11,5],[11,6],[12,2],[12,3],[12,4],[12,5],[13,3],[13,4],[13,5],[14,4],[14,5],[15,5]];
    wing.forEach(([y,x])=>{ sym(y,x,"Z"); });
    const wingEdge=[[10,3],[11,2],[12,1],[13,2],[14,3]];
    wingEdge.forEach(([y,x])=>sym(y,x,"z"));
  }

  // ── 頭部 ──
  // 臉
  symRect(5,9,12,15,"K");
  fillRect(5,9,12,19,"K");
  set(6,13,"E"); set(6,18,"E"); // 眼
  set(8,15,"k"); set(8,16,"k"); // 嘴附近
  fillRect(9,9,13,18,"k");
  // 頭髮/頭盔
  if(helmType==="none"){
    fillRect(3,4,12,19,"H"); fillRect(4,5,11,12,"H"); fillRect(4,5,19,20,"H");
    for(let x=12;x<=19;x+=2) set(3,x,"h");
  } else if(helmType==="band"){
    fillRect(3,4,12,19,"H"); fillRect(5,5,11,20,"A"); set(5,11,"a"); set(5,20,"s");
  } else if(helmType==="full"||helmType==="horn"){
    fillRect(2,4,11,20,"A"); fillRect(3,3,11,20,"a"); fillRect(5,5,11,20,"A");
    fillRect(5,8,11,11,"A"); fillRect(5,8,20,20,"A"); // 護頰
    set(2,11,"s"); set(2,20,"s");
    if(helmType==="horn"){ // 角
      sym(1,10,"A"); sym(0,9,"a"); sym(2,11,"A");
    }
    // 盔甲羽飾
    if(s>=7){ sym(1,15,"G"); sym(0,15,"g"); }
  } else if(helmType==="hood"){ // 法師兜帽
    fillRect(2,5,10,21,"C"); fillRect(3,4,11,20,"c");
    fillRect(6,9,10,11,"C"); fillRect(6,9,20,21,"C");
    set(2,15,"g"); set(2,16,"g");
  } else if(helmType==="halo"||helmType==="crown"){
    fillRect(3,4,12,19,"H"); for(let x=12;x<=19;x+=2) set(3,x,"h");
    if(helmType==="halo"){ // 光環
      for(let x=11;x<=20;x++){ set(1,x,"G"); } set(1,11,"g"); set(1,20,"g");
      sym(0,13,"g");
    } else { // 王冠
      fillRect(2,3,11,20,"G"); set(1,12,"g"); set(1,15,"g"); set(1,18,"g"); set(1,20,"g");
      sym(2,13,"Y");
    }
  }

  // ── 身體（盔甲）──
  // 軀幹
  symRect(11,19,12,15,"A");
  fillRect(11,19,12,19,"A");
  // 胸甲明暗
  for(let y=12;y<=18;y++){ set(y,12,"a"); set(y,19,"s"); }
  // 肩甲
  symRect(10,12,9,11,"A"); sym(10,9,"a"); sym(12,9,"s");
  // 胸口裝飾（高階金）
  if(s>=7){ symRect(13,15,14,15,"G"); set(13,15,"g"); set(13,16,"g"); }
  else if(s>=3){ sym(13,14,"a"); }
  // 腰帶
  fillRect(19,19,12,19,"B"); set(19,15,"G"); set(19,16,"G");

  // ── 手臂 ──
  symRect(12,18,9,10,"A"); // 上臂(盔甲)
  symRect(18,21,9,10,"K"); // 前臂(膚色)露出
  if(s>=4){ symRect(18,21,9,10,"A"); } // 高階全甲手

  // ── 腿 ──
  const legSwap = frame===1?1:frame===2?-1:0;
  // 左腿
  fillRect(20,27,13,14,"B"); fillRect(20,27,17,18,"B");
  for(let y=20;y<=26;y++){ set(y,13,"b"); set(y,17,"b"); }
  // 靴
  fillRect(27,29,12,15,"O"); fillRect(27,29,16,19,"O");
  set(28,12,"b"); set(28,19,"b");
  if(frame===1){ /* 行走微調 */ fillRect(20,27,18,19,"B"); }
  if(frame===2){ fillRect(20,27,12,13,"B"); }

  // ── 盾牌（左手，玩家視角右側因鏡像）──
  if(hasShield){
    const shBase = s>=9?"P":s>=6?"R":s>=4?"L":"Q";
    const shHi = s>=9?"p":s>=6?"r":"m";
    fillRect(14,23,20,24,shBase);
    fillRect(14,22,21,23,shBase);
    set(14,21,"m"); set(15,21,"m"); // 高光邊
    fillRect(13,23,20,20,"M"); fillRect(13,23,24,24,"n"); // 金屬邊框
    // 盾徽十字
    set(17,22,"W"); set(18,22,"W"); set(19,22,"W"); set(18,21,"W"); set(18,23,"W");
    if(s>=6){ set(17,22,"G"); set(18,22,"G"); set(19,22,"G"); set(18,21,"G"); set(18,23,"G"); }
  }

  // ── 武器（右手，鏡像後在左）──
  {
    const col=8;
    if(wpnKind==="staff"){
      // 法杖：杖身 + 頂端寶珠
      for(let y=9;y<=23;y++){ set(y,col,"v"); set(y,col-1,"u"); }
      // 寶珠
      fillRect(5,8,col-2,col+1,"P"); set(5,col-1,"p"); set(6,col,"g");
      fillRect(4,4,col-1,col,"g");
    } else {
      // 劍：刀刃 + 護手 + 握把（長度依 tier）
      const top = wTier>=5?6: wTier>=3?8:10;
      for(let y=top;y<=18;y++){ set(y,col,"w"); set(y,col-1,"v"); set(y,col+1,"m"); }
      set(top,col,"W"); set(top-1,col,"m");
      if(wTier>=5){ set(top,col-1,"G"); set(top+1,col-1,"G"); }
      // 護手
      fillRect(19,19,col-2,col+2,wTier>=4?"G":"v");
      if(wTier>=4){ set(19,col-3,"g"); set(19,col+3,"g"); }
      // 握把
      fillRect(20,23,col,col,"B");
      set(23,col,wTier>=4?"G":"Y");
    }
  }

  // 鏡像（facing）由 svg transform 處理
  const rows = grid.map(a=>a.join(""));
  const silPal = new Proxy({}, { get: () => "#2a2535" });
  const els = pixGrid(rows, silhouette ? silPal : P, sz, N, N);
  return (
    <svg viewBox={`0 0 ${sz} ${sz}`} width={sz} height={sz} shapeRendering="crispEdges"
         style={{ transform: facing < 0 ? "scaleX(-1)" : "none", overflow: "visible" }}>
      {els}
    </svg>
  );
}

// ════ Boss（8 系列，16×16，含明暗描邊）════
// ════ 32×32 精英龍（側身展翼坐姿，對齊設計圖）════
function dragonRows32(dtype){
  const N=32;
  const g=Array.from({length:N},()=>Array(N).fill(" "));
  const set=(y,x,c)=>{ if(y>=0&&y<N&&x>=0&&x<N) g[y][x]=c; };
  const rect=(y0,y1,x0,x1,c)=>{ for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)set(y,x,c); };
  const wing=[
    [3,20],[3,21],[3,22],
    [4,18],[4,19],[4,20],[4,21],[4,22],[4,23],
    [5,16],[5,17],[5,18],[5,19],[5,20],[5,21],[5,22],[5,23],[5,24],
    [6,15],[6,16],[6,17],[6,18],[6,19],[6,20],[6,21],[6,22],[6,23],[6,24],[6,25],
    [7,16],[7,17],[7,18],[7,19],[7,20],[7,21],[7,22],[7,23],[7,24],[7,25],
    [8,17],[8,18],[8,19],[8,20],[8,21],[8,22],[8,23],[8,24],
    [9,18],[9,19],[9,20],[9,21],[9,22],[9,23],
    [10,19],[10,20],[10,21],[10,22],
  ];
  wing.forEach(([y,x])=>set(y,x,"m"));
  [[2,22],[3,23],[4,24],[5,25],[6,26],[3,19],[4,17],[5,15],[6,14]].forEach(([y,x])=>set(y,x,"O"));
  [[4,22],[5,20],[6,18],[7,21],[8,22]].forEach(([y,x])=>set(y,x,"n"));
  rect(13,20,12,22,"C"); rect(14,19,13,21,"H"); rect(13,20,21,22,"S");
  for(let y=14;y<=19;y++){ set(y,12,"H"); set(y,13,"D"); }
  set(15,14,"D"); set(17,14,"D"); set(19,14,"D");
  rect(9,13,8,12,"C"); set(9,8,"H"); set(10,8,"H");
  rect(6,10,3,9,"C"); rect(6,8,3,6,"H");
  rect(9,11,2,6,"C"); set(10,2,"S"); set(11,3,"S");
  set(7,6,"E"); set(7,7,"W");
  set(4,7,"O"); set(3,8,"O"); set(2,9,"D"); set(4,9,"O"); set(3,10,"D"); set(5,6,"D");
  set(11,4,"W"); set(11,5,"W"); set(12,5,"W"); rect(11,12,4,8,"S");
  rect(18,23,13,15,"C"); set(23,12,"W"); set(23,13,"W"); set(23,14,"W"); set(22,13,"S");
  rect(17,23,18,21,"C"); rect(18,22,19,21,"S"); set(23,19,"W"); set(23,20,"W"); set(23,21,"W");
  [[18,23],[19,24],[20,25],[21,25],[22,24],[22,23],[21,22],[20,23]].forEach(([y,x])=>set(y,x,"C"));
  set(22,24,"S"); set(20,25,"H"); set(23,24,"D"); set(23,23,"D");
  [[12,14],[11,16],[11,18],[12,20]].forEach(([y,x])=>set(y,x,"D"));
  if(dtype==="fire"){ set(11,1,"R"); set(12,0,"G"); set(12,1,"R"); set(10,0,"G"); set(11,2,"G"); set(13,15,"R"); set(15,17,"R"); }
  else if(dtype==="ice"){ set(2,8,"W"); set(3,7,"W"); set(13,16,"W"); set(16,18,"W"); set(11,1,"W"); set(12,1,"b"); }
  else if(dtype==="venom"){ set(11,1,"G"); set(12,1,"G"); set(10,16,"D"); set(10,18,"D"); set(10,20,"D"); set(14,16,"G"); set(16,18,"G"); }
  else if(dtype==="dark"){ set(7,6,"R"); set(13,15,"E"); set(15,17,"E"); set(17,19,"E"); }
  else { set(13,15,"G"); set(15,17,"G"); set(17,15,"G"); }
  set(5,2,"O"); set(13,11,"O"); set(20,12,"O"); set(20,22,"O");
  return g.map(a=>a.join(""));
}
const DRAGON_DTYPE = { dragon:"base", dragon_fire:"fire", dragon_ice:"ice", dragon_venom:"venom", dragon_dark:"dark" };

function BossSprite({ shape, color, mini, silhouette = false, variant = 0 }) {
  const sz = mini ? 24 : 68;
  const hi = lighten(color, 42), sh = darken(color, 40), out = darken(color, 80);
  const P = { O: out, C: color, H: hi, S: sh, W: "#ffffff", E: "#1a1320", G: "#f4d24a", g: "#fff2c0", D: "#cfc6b0", e: "#1a1320", R: "#d1413a", K: "#f0b88a", b: "#aedbf0", m: lighten(color,55), n: darken(color,20) };

  // ── 龍：用 32×32 精細繪製 ──
  if(DRAGON_DTYPE[shape] && shape!=="dead"){
    const rows = dragonRows32(DRAGON_DTYPE[shape]);
    const silPal = new Proxy({}, { get: () => "#2a2535" });
    const els = pixGrid(rows, silhouette ? silPal : P, sz, 32, 32);
    return <svg viewBox={`0 0 ${sz} ${sz}`} width={sz} height={sz} shapeRendering="crispEdges" style={{ overflow:"visible" }}>{els}</svg>;
  }


  // 調色盤：C本色 H亮 S暗 O描邊 W白(牙/角) E獠眼 G金 g淺金 D骨 R紅 K膚
  const fams = {
    rat: [ // 鼠王：大耳獠牙、爪、長尾
      "  OCCO      OCCO ", " OCHHCO    OCHHCO", " OCHHHCOOOOCHHHCO", "  OCHCCCCCCCCHCO ",
      "  OCHCSCCCCSCHCO ", "  OCWEHCCCCHEWCO ", "  OCCCCWWWWCCCCO ", "  OCHCWEEEEWCHCO ",
      "  OCCCWWWWWWCCCO ", " OSCCCCCCCCCCCCSO", " OCSCCCCCCCCCCSCO", " OCCSCHCCHCSCCO O",
      "  OWWSCCCCCCSWWO ", "  OCCWCCCCWCCCO  ", " OSCO OCCO  OCSO ", "OOO   OOOO   OOO ",
    ],
    ox: [ // 牛魔：巨角、怒目、壯軀
      "OWO          OWO", "OHWOOOOOOOOOOOHWO", "OCHHCCCCCCCCHHCO", " OCHCCCCCCCCCHCO ",
      " OCHESCCCCSEHCO ", " OCCEECCCCEECCO ", " OCCCCRRRRCCCCO ", " OCHCCCCCCCCHCO ",
      " OCCCWWWWWWCCCO ", "OSCCCCCCCCCCCCSO", "OCSCCCGGGGCCCSCO", "OCCSCCCCCCCCSCCO",
      " OCCSCCCCCCSCCO ", " OCWWCCCCCCWWCO ", " OOCO      OCOO ", "OOO         OOO ",
    ],
    tiger: [ // 虎王：尖耳條紋、血盆大口
      " OCCO      OCCO ", " OCHHCOOOOOOCHHCO", " OCHSHCCCCCCHSHCO", " OCWHSCCCCCCSHWCO",
      " OCWESCSCCSCSEWCO".slice(0,16), " OCCCSCCCCCCSCCCO".slice(0,16), " OCHSCWWWWWWCSHCO".slice(0,16), " OCCCWEEEEEEWCCCO".slice(0,16),
      "  OCSWWWWWWWWSCO ", " OSCCSCCCCCCSCCSO", " OCSCCCRRRRCCCSCO", " OCCSCCCCCCCCSCCO",
      " OCWWSCCCCCCSWWCO".slice(0,16), " OOCWCCCCCCCCWCOO".slice(0,16), " OSCO OOOO  OCSO ", "OOO   O  O   OOO ",
    ],
    rabbit: [ // 兔魔：超長耳、紅眼
      "  OCO      OCO  ", "  OHCO    OCHO  ", "  OHHCO  OCHHO  ", "  OCHCOOOOCHCO  ",
      "  OCHHCCCCHHCO  ", " OCHCCCCCCCCHCO ", " OCHCRCCCCRCHCO ", " OCCCCCCCCCCCCO ",
      " OCHCCWWWWCCCHO ", " OCCCWEEEEWCCCO ", "  OCSWWWWWWSCO  ", " OSCCCCCCCCCCSO ",
      " OCSCCCCCCCCSCO ", " OCCWCCCCCCWCCO ", "  OOCO    OCOO  ", "  OOO      OOO  ",
    ],
    dragon: [ // 龍王：犄角龍鬚、利齒、翼
      " OCCO      OCCO ", "OCHHCO OOOO OCHHCO".slice(0,16), "OCHHHCOCCCCOCHHHCO".slice(0,16), " OCHCCCCCCCCCCHCO".slice(0,16),
      "OCCWESCCCCCCSEWCO".slice(0,16), "OCCCCCGGGGGGCCCCO".slice(0,16), "OCHCSGgggggGSCHCO".slice(0,16), " OCCWWWWWWWWWWCCO".slice(0,16),
      " OCSCWEEEEEEWCSCO".slice(0,16), "OOCSCCCCCCCCCCSCOO".slice(0,16), "OCCSCCCRRRRCCCSCCO".slice(0,16), " OCCSCCCCCCCCSCCO".slice(0,16),
      " OCWWSCCCCCCSWWCO".slice(0,16), " OOCWCCCCCCCCWCOO".slice(0,16), " OSCOO OOOO OOCSO".slice(0,16), "OOO   O    O   OO".slice(0,16),
    ],
    dragon_fire: [ // 火龍：雙角、噴火口、烈翼
      "OWO  OCCO  OWO  ", " OWOCHHHHCOWO   ", "  OCHHHHHHCO    ", " OCHCCCCCCCHCO  ",
      "OCWESCCCCCCSEWCO".slice(0,16), "OCCCRRRRRRRRCCCO".slice(0,16), "OCHRRGGGGGGRRHCO".slice(0,16), " OCRWWWWWWWWRCO ",
      " OCSWEEEEEEWSCO ", "OOCRCCCCCCCCRCOO".slice(0,16), "OCCRRRGGGGRRRCCO".slice(0,16), " OCWRSCCCCSRWCO ",
      " OCWWRCCCCRWWCO ", " OOCWCRRRRCWCOO ", " OSCO OOOO OCSO ", "OOR  O    O  ROO".slice(0,16),
    ],
    dragon_ice: [ // 冰龍：尖冠、結晶鱗
      "  OWO    OWO   ", " OWHWO  OWHWO  ", "  OHHCOOCHHCO  ", " OCHCCCCCCCHCO ",
      "OCWESCCCCCCSEWCO".slice(0,16), "OCCWWHHHHHHWWCCO".slice(0,16), "OCHWHbbbbbbHWHCO".slice(0,16), " OCWWWWWWWWWWCO ",
      " OCSWEEEEEEWSCO ", "OOCWCbbbbbbCWCOO".slice(0,16), "OCCWHHbbbbHHWCCO".slice(0,16), " OCWWHCCCCHWWCO ",
      " OCWHWCCCCWHWCO ", " OOCWCbbbbCWCOO ", " OSWO OOOO OWSO ", "OOW  O    O  WOO".slice(0,16),
    ],
    dragon_venom: [ // 毒龍：多刺背、毒牙
      "OCO OCO  OCO OCO", " OCHCOCHCOCHCO  ", "  OCHHCCHHCO    ", " OCHCCCCCCCHCO  ",
      "OCWESCCCCCCSEWCO".slice(0,16), "OCCCGHGHGHGHCCCO".slice(0,16), "OCHGHGggggHGHHCO".slice(0,16), " OCGWWWWWWWWGCO ",
      " OCSWEEEEEEWSCO ", "OOCGCCCCCCCCGCOO".slice(0,16), "OCCGHGGRRGGHGCCO".slice(0,16), " OCWGSCCCCSGWCO ",
      " OCWWGCCCCGWWCO ", " OOCWCGGGGCWCOO ", " OSCO OOOO OCSO ", "OOG  O    O  GOO".slice(0,16),
    ],
    dragon_dark: [ // 暗龍：巨翼、赤瞳
      "OCCCO      OCCCO", "OCHHCOOOOOOCHHCO", "OCCHHCCCCCCHHCCO", " OCHCCCCCCCCHCO ",
      "OCWRSCCCCCCSRWCO".slice(0,16), "OCCCCRRRRRRCCCCO".slice(0,16), "OCHCRRGGGGRRCHCO".slice(0,16), " OCCWWWWWWWWCCO ",
      " OCSWRRRRRRWSCO ", "OOCSCCCCCCCCSCOO".slice(0,16), "OCCSCCRRRRCCSCCO".slice(0,16), "OCWWSCCCCCCSWWCO".slice(0,16),
      "OCWCWCCCCCCWCWCO", " OOCWCCCCCCWCOO ", " OSCOOOOOOOCSO  ", "OOO        OOO  ",
    ],
    snake: [ // 蛇魔：菱形頭、毒牙、蛇身盤繞
      "       OCO      ", "     OOCHCOO    ", "    OCHCCCHCO   ", "   OCHCCCCCHCO  ",
      "  OCHCSCCCSCHCO ", "  OCWEHCCCHEWCO ", "  OCCCCRRCCCCO  ", "  OCHCWWWWCHCO  ",
      "  OCCWEEEEWCCO  ", "   OCWWWWWWCO   ", "   OSCCCCCCSO   ", "  OCSCCCCCCSCO  ",
      " OCCSCCCCCCSCCO ", "OCCSCCCCCCCCSCCO", " OOSCCCCCCCCSOO ", "   OOOO  OOOO   ",
    ],
    horse: [ // 馬魔：火焰鬃毛、長臉
      "  OHO      OHO  ", " OHHCOOOOOOOHHCO", " OHCHCCCCCCHCHO ", "  OCHCCCCCCHCO  ",
      "  OCHESCCSEHCO  ", "  OCCEECCEECCO  ", "  OCHCCCCCCHCO  ", "  OCHCRRRRCHCO  ",
      "  OCCCWWWWCCCO  ", "  OCHWEEEEWHCO  ", "  OCSWWWWWWSCO  ", " OCSCCCCCCCCSCO ",
      " OCCSCCCCCCSCCO ", " OCWWCCCCCCWWCO ", "  OOCO    OCOO  ", "  OOO      OOO  ",
    ],
    goat: [ // 羊魔：螺旋彎角、山羊鬍
      "OCCO        OCCO", "OCHHCOOOOOOOCHHCO", " OCHCCCCCCCCCHCO", " OCCHCCCCCCHCCO ",
      "  OCHCSCCSCHCO  ", "  OCWEHCCHEWCO  ", "  OCCCCCCCCCCO  ", "  OCHCCWWCCCHO  ",
      "  OCCWEEEEWCCO  ", "  OCSWWWWWWSCO  ", " OCSCCCCCCCCSCO ", " OCCSCCCCCCSCCO ",
      " OCCSCWWWWCSCCO ", "  OOCSWWWWSCOO  ", "   OOCWWWWCOO   ", "    OO    OO    ",
    ],
    monkey: [ // 猴魔：大耳臉盤、獠牙
      " OCCO      OCCO ", "OCHHCOOOOOOOCHHCO", "OCHCCCCCCCCCCCHCO".slice(0,16), " OCCHHCCCCHHCCO ",
      " OCHCKKKKKKKCHCO".slice(0,16), " OCHKEKCCCKEKHCO".slice(0,16), " OCCKCCCCCCCKCCO".slice(0,16), " OCHKCWWWWCKCHCO".slice(0,16),
      "  OCKWEEEEWKCO  ", "  OCKKWWWWKKCO  ", " OSCKKKKKKKKCSO ", " OCSCCCCCCCCSCO ",
      " OCCSCCCCCCSCCO ", " OCWCCCCCCCCWCO ", " OOCO O  O OCOO ", "OOO          OOO",
    ],
    rooster: [ // 雞魔：火紅雞冠、利喙、翼
      "   ORORO O     ", "  ORORORORO    ", "  OCHCCCHCO    ", " OCHCCCCCHCO   ",
      " OCHESCCSEHCO  ", " OCCEECCEECCO G", " OCCCGGGGCCCOGG", " OCHCCGGCCCHOGGG".slice(0,16),
      " OCCCWWWWWCCO G", " OCHWEEEEEWHCO ", " OCSWWWWWWWSCO ", " OCSCCCCCCCSCO ",
      " OCCSCCCCCCSCO ", " OCWCCCCCCCWCO ", "  OOCO    OCOO ", "  OOO      OOO ",
    ],
    dog: [ // 狗魔：垂耳、利齒、護爪
      " OCCO      OCCO ", " OCHHCOOOOOOCHHCO", " OCHHCCCCCCCCHHCO", "  OCHCCCCCCCCHCO ",
      "  OCHESCCCCSEHCO", "  OCCEECCCCEECCO", "  OCCCCREERCCCCO", "  OCHCCCCCCCCHCO",
      "  OCCCWWWWWWCCCO", "  OCHWEEEEEEWHCO", "  OCSWWWWWWWWSCO", " OCSCCCCCCCCCCSO",
      " OCCSCCCCCCCCSCO", " OCWWCCCCCCCCWWCO".slice(0,16), "  OOCO      OCOO", " OOO        OOO ",
    ],
    pig: [ // 豬魔：招風耳、大鼻、獠牙
      " OCO        OCO ", " OCHCOOOOOOOOCHCO", "  OCHCCCCCCCCHCO ", "  OCHCCCCCCCCHCO ",
      "  OCHESCCCCSEHCO", "  OCCEECCCCEECCO", "  OCCCCKKKKCCCCO", "  OCHCKEEEEKCHCO",
      "  OCCCKEEEEKCCCO", " OCWWCKKKKKKCWWCO".slice(0,16), " OCCWCCCCCCCCWCCO".slice(0,16), " OSCCCCCCCCCCCCSO",
      " OCSCCCCCCCCCCSCO".slice(0,16), " OCCWCCCCCCCCWCCO".slice(0,16), "  OOCO      OCOO ", " OOO        OOO ",
    ],
    dead: [ // 擊敗骷髏
      "                ", "     OOOOOO     ", "    ODDDDDDO    ", "   ODDDDDDDDO   ",
      "   ODEEDDEEDO   ", "   ODDDDDDDDO   ", "   ODDDEEDDDDO  ", "   ODDEEEEDDO   ",
      "    ODDDDDDO    ", "    O O OO O    ", "                ", "                ",
      "                ", "                ", "                ", "                ",
    ],
  };
  let rows = (fams[shape] || fams.rat).map(r => (r + "                ").slice(0, 16));
  // variant 變體：在生肖基礎上加細節，讓同生肖不同隻有差異
  if(shape!=="dead" && variant>0){
    const v = variant % 7;
    rows = rows.map(r=>r.split(""));
    const put=(y,x,c)=>{ if(rows[y]&&x>=0&&x<16&&rows[y][x]===" ") rows[y][x]=c; };
    if(v>=1){ put(4,0,"S"); put(4,15,"S"); }          // 側影
    if(v>=2){ put(0,7,"C"); put(0,8,"C"); }           // 頂飾
    if(v>=3){ put(9,1,"H"); put(9,14,"H"); }          // 外亮點
    if(v>=4){ put(10,2,"S"); put(10,13,"S"); }        // 暗紋
    if(v>=5){ put(15,5,"C"); put(15,10,"C"); }        // 底足
    if(v>=6){ put(1,1,"W"); put(1,14,"W"); }          // 額外尖角
    rows = rows.map(a=>a.join(""));
  }
  const silPal = new Proxy({}, { get: () => "#2a2535" });
  const els = pixGrid(rows, silhouette ? silPal : P, sz, 16, 16);
  return <svg viewBox={`0 0 ${sz} ${sz}`} width={sz} height={sz} shapeRendering="crispEdges" style={{ overflow: "visible" }}>{els}</svg>;
}

// ════ 電子雞養成場景（DQ 草原 + 走動）════
// ── 養成場景背景（依等級解鎖）──
// ── 養成地城（依等級解鎖不同主題的地城）──
const SCENES = [
  { lv:1,  name:"石磚地城", floor:"#6b6258", floorAlt:"#5e564d", wall:"#403a33", wallTop:"#52493f", torch:"#ff8a3a", accent:"#8a7a5a" },
  { lv:5,  name:"苔蘚地窟", floor:"#5a6a52", floorAlt:"#4e5d48", wall:"#33402f", wallTop:"#42523c", torch:"#9ad86a", accent:"#6a8a4a" },
  { lv:11, name:"熔岩洞窟", floor:"#6e5448", floorAlt:"#5f4840", wall:"#43302a", wallTop:"#583c32", torch:"#ff5a2a", accent:"#c2603a" },
  { lv:19, name:"冰封地牢", floor:"#5a6a7e", floorAlt:"#4e5d70", wall:"#33404e", wallTop:"#42526a", torch:"#7ac8ff", accent:"#6a9ac2" },
  { lv:29, name:"魔王殿堂", floor:"#4a3a5e", floorAlt:"#40324e", wall:"#2e2440", wallTop:"#3c3056", torch:"#b46aff", accent:"#9560c4" },
  { lv:42, name:"黃金聖殿", floor:"#6e5e3a", floorAlt:"#5f5132", wall:"#433620", wallTop:"#5a4a2a", torch:"#ffd45a", accent:"#e0a92e" },
];
function sceneFor(lv){ let s=SCENES[0]; for(const x of SCENES) if(lv>=x.lv) s=x; return s; }

function PetScene({ stage, level=1, color, weapon, armor }) {
  const [x, setX] = useState(40);
  const [facing, setFacing] = useState(1);
  const [frame, setFrame] = useState(0);
  const [mood, setMood] = useState("walk");
  const targetRef = useRef(70);
  const tick = useRef(0);
  const sc = sceneFor(level);

  useEffect(() => {
    const iv = setInterval(() => {
      tick.current++;
      if (tick.current % 22 === 0) {
        const r = Math.random();
        if (r < 0.22) setMood("idle");
        else if (r < 0.34) setMood("swing");
        else { targetRef.current = 12 + Math.random() * 76; setMood("walk"); }
      }
      setMood(m => {
        if (m === "walk") {
          setX(px => { const t = targetRef.current, diff = t - px;
            if (Math.abs(diff) < 2) { targetRef.current = 12 + Math.random() * 76; return px; }
            const dir = diff > 0 ? 1 : -1; setFacing(dir); return px + dir * 1.5; });
          setFrame(f => (tick.current % 2 === 0 ? (f === 1 ? 2 : 1) : f));
        } else if (m === "swing") setFrame(3);
        else setFrame(0);
        return m;
      });
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // 石磚地板：用兩色棋盤格 + 縫隙
  const brick = `repeating-linear-gradient(90deg, ${sc.floor} 0 22px, ${sc.floorAlt} 22px 44px), repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 1px, transparent 1px 22px)`;

  return (
    <div className="pix" style={{ position: "relative", height: 172, overflow: "hidden", marginBottom: 16, padding: 0, background: sc.wall }}>
      {/* 後牆磚紋 */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"42%",
        background:`repeating-linear-gradient(90deg, ${sc.wall} 0 26px, ${sc.wallTop} 26px 28px), repeating-linear-gradient(0deg, ${sc.wall} 0 16px, ${sc.wallTop} 16px 18px)` }} />
      {/* 牆腳陰影 */}
      <div style={{ position:"absolute", top:"42%", left:0, right:0, height:8, background:"linear-gradient(rgba(0,0,0,.35), transparent)" }} />
      {/* 地板 */}
      <div style={{ position:"absolute", top:"42%", left:0, right:0, bottom:0, background:brick, boxShadow:"inset 0 8px 14px rgba(0,0,0,.25)" }} />
      {/* 火把（牆上兩支） */}
      <Torch left="14%" color={sc.torch} />
      <Torch left="82%" color={sc.torch} />
      {/* 拱門（後牆中央） */}
      <div style={{ position:"absolute", top:"8%", left:"50%", transform:"translateX(-50%)", width:46, height:54,
        background:"#1a1510", borderRadius:"23px 23px 0 0", border:`3px solid ${sc.wallTop}`, boxShadow:"inset 0 0 12px #000" }} />
      {/* 寶箱（右下角裝飾） */}
      <div style={{ position:"absolute", bottom:14, right:14, width:26, height:20 }}>
        <div style={{ width:26, height:11, background:"#b8862f", borderRadius:"11px 11px 0 0", border:"2px solid #7a5a1e" }} />
        <div style={{ width:26, height:11, background:"#9a7028", border:"2px solid #7a5a1e", borderTop:"none", position:"relative" }}>
          <div style={{ position:"absolute", top:1, left:"45%", width:4, height:5, background:"#ffd45a", border:"1px solid #7a5a1e" }} />
        </div>
      </div>
      {/* 骨頭裝飾（左下） */}
      <div style={{ position:"absolute", bottom:12, left:"22%", width:14, height:4, background:"#d8d0bc", borderRadius:3, transform:"rotate(20deg)", boxShadow:"-4px 3px 0 -1px #d8d0bc" }} />
      {/* 角色 */}
      <div style={{ position: "absolute", bottom: 18, left: `${x}%`, transform: "translateX(-50%)", transition: "left .2s linear", zIndex:3 }}>
        <div style={{ animation: mood === "idle" ? "float 2s infinite" : "none" }}>
          <Hero stage={stage} color={color} weapon={weapon} armor={armor} frame={frame} facing={facing} big />
        </div>
        <div style={{ width: 38, height: 7, background: "rgba(0,0,0,.3)", borderRadius: "50%", margin: "-3px auto 0" }} />
      </div>
      {/* 狀態列（地城風深色框） */}
      <div style={{ position: "absolute", top: 8, left: 8, fontSize: 11, color: "#fff",
        background: "rgba(20,16,12,.78)", padding: "3px 9px", border: `2px solid ${sc.accent}`, boxShadow:"0 1px 0 rgba(0,0,0,.4)" }}>
        {mood === "walk" ? "▸ 探索中" : mood === "swing" ? "▸ 修練中" : "▸ 休息中"}
      </div>
      {/* 場景名 */}
      <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 10, color: "#fff",
        background: "rgba(20,16,12,.78)", padding: "2px 8px", border: `1px solid ${sc.accent}` }}>
        {sc.name}
      </div>
    </div>
  );
}
// 火把：把手 + 跳動火焰
function Torch({ left, color }) {
  return (
    <div style={{ position:"absolute", top:"22%", left, width:10, zIndex:2 }}>
      <div style={{ width:14, height:14, marginLeft:-2, background:`radial-gradient(circle at 50% 60%, #fff0a0, ${color} 60%, transparent 72%)`, animation:"flicker .4s infinite alternate" }} />
      <div style={{ width:4, height:12, background:"#6a4f28", margin:"0 auto", border:"1px solid #4a3518" }} />
    </div>
  );
}

// ════ 精緻裝備/動作小圖示（12×12，含明暗）════
function Mini({ kind, size = 20, tier = 0 }) {
  const sk = "#f2c79a", skS = "#d49b6a", g = "#5a9e4f", gH = "#7ac46a", b = "#4a82c2", bH = "#6aa6e0",
    gd = "#e0a92e", gdH = "#ffd45a", r = "#d1574e", rH = "#e88578", pu = "#9560c4", puH = "#b48ad8",
    st = "#cfd4de", stH = "#ffffff", stS = "#9aa0ad", wd = "#8a6a3a", wdH = "#b08850", O = "#2a1e14", co = "#e0a92e", coH = "#ffe07a";
  // 裝備依稀有度上色：T=本色 u=亮 v=暗
  const rc = tier ? rarity(tier) : null;
  const T = rc ? rc.base : st, u = rc ? rc.hi : stH, v = rc ? rc.sh : stS;
  const P = { O, K: sk, k: skS, G: g, H: gH, B: b, b: bH, Y: gd, y: gdH, R: r, e: rH, P: pu, p: puH,
    S: st, s: stH, t: stS, W: wd, w: wdH, C: co, c: coH, E: "#1a1320", T, u, v, X:"#f4d24a", l:"#fff0a0" };

  // ── 道具/運動圖示（8×8，維持簡單）──
  const sets8 = {
    run: ["   OO   ", "  OKkO  ", " OGGHO  ", " OGGO   ", "OGGGHO  ", " O OGO  ", " OB  BO ", "OO    OO"],
    yoga: ["   OO   ", "  OKkO  ", "OOGGGGOO", "OHGGGGHO", " OGGGGO ", "OO OO OO", "        ", "        "],
    breath: ["  OOOO  ", " OBbbBO ", "OBbbbbBO", "OBbBBbBO", "OBbbbbBO", " OBbbBO ", "  OOOO  ", "        "],
    moon: ["  OOO   ", " OYyO   ", "OYyO    ", "OYy O   ", "OYy O   ", " OYyO   ", "  OOO   ", "        "],
    hand: ["O O O O ", "OKkKkKkO", "OKkkkkKO", "OKkkkkKO", " OKkkKO ", "  OKKO  ", "        ", "        "],
    weight: ["        ", " O    O ", "OEO  OEO", "OEOOOOEO", "OEO  OEO", " O    O ", "        ", "        "],
    bike: ["    YyO ", "   OYO  ", "OO OYO O", "ObO OBbO", "ObBOOBbO", "ObO  ObO", " O    O ", "        "],
    swim: ["  OKkO  ", " O    O ", "OBbBBbBO", " OBbbBO ", "OBbBBbBO", " O O O O", "        ", "        "],
    star: ["   OO   ", "  OYyO  ", "OOYyyYOO", " OYyyyO ", "OOYyyYOO", " OY  YO ", "OO    OO", "        "],
    pill: ["  OOOO  ", " ORReeO ", "ORRReeYO", "ORRReYYO", "OReeYYYO", " OeYYYO ", "  OOOO  ", "        "],
    potion_red: ["  OOO   ", "  OWO   ", " ORReO  ", "OReReWO ", "OReeReO ", "OReReeO ", " OReeO  ", "  OOO   "],
    potion_blue: ["  OOO   ", "  OWO   ", " OBbBO  ", "OBbBbWO ", "OBbbBbO ", "OBbBbbO ", " OBbbO  ", "  OOO   "],
    potion_green: ["  OOO   ", "  OWO   ", " OGHGO  ", "OGHGHWO ", "OGHHGHO ", "OGHGHHO ", " OGHHO  ", "  OOO   "],
    potion_gold: ["  OOO   ", "  OWO   ", " OYyYO  ", "OYyYyWO ", "OYyyYyO ", "OYyYyyO ", " OYyyO  ", "  OOO   "],
    bottle: [" OWWO   ", " OWWO   ", " ORReO  ", "ORReeRO ", "OReeReO ", "OReReeO ", "OReeReO ", " OOOO   "],
    herb: ["  OGO   ", " OGHGO  ", "OGHGHGO ", " OGHGO G", "  OGOOGO", "  OGHGO ", "   OWO  ", "   OO   "],
    leaf: ["    OGO ", "   OGHGO", "  OGHHGO", " OGHHGO ", "OGHHGO  ", "OGHGOWO ", " OGO OWO", "    OO  "],
    scroll: ["OYYYYYYO", "OWDDDDWO", "OWDEEDWO", "OWDDDDWO", "OWDEEDWO", "OWDDDDWO", "OYYYYYYO", "        "],
    flask: ["  OWWO  ", "  OBbO  ", "  OBbO  ", " OBbbBO ", "OBbBBbBO", "OBbBbBbO", "OBbbBbBO", " OOOOO  "],
    heart: [" OR  RO ", "ORReeRRO", "OReeeeRO", "OReeeeRO", " OReeRO ", "  OReO  ", "   OO   ", "        "],
    drop: ["   OO   ", "   OWO  ", "  OBbWO ", " OBbbBO ", "OBbbBbBO", "OBbBBbBO", " OBbbBO ", "  OOO   "],
    berry: ["  O O   ", " OGOGO  ", "  ORRO  ", " ORReRO ", "OReeeRO ", "OReeReO ", " OReeO  ", "  OOO   "],
    crit: ["   R    ", " O ROY  ", "OYOR OYO", "  YO RY ", " OYO RO ", "OY O ROY", "   YO   ", "    R   "],
    coin: ["  OOOO  ", " OYccYO ", "OYcCCcYO", "OYcCYcYO", "OYcCCcYO", " OYccYO ", "  OOOO  ", "        "],
    star8: ["   OO   ", "  OYyO  ", "OOYyyYOO", " OYyyyO ", "OOYyyYOO", " OY  YO ", "OO    OO", "        "],
  };

  // ── 裝備圖示（16×16 精細版，依 tier 三級造型）──
  const lv = tier>=5?3 : tier>=3?2 : 1;
  const EQ = {
    sword: {
      1: [
        "          OOO   ","         OTvO   ","        OTuvO   ","       OTuvO    ",
        "      OTuvO     ","     OTuvO      ","    OTuvO       ","   OTuvO        ",
        "  OWWTuO        "," OWWWTO         ","OWWWWO          "," OOWO  O        ",
        "   OWO OO       ","    OWWO        ","     OO         ","                ",
      ],
      2: [
        "          OuO   ","         OTuO   ","        OTuvO   ","       OTTuvO   ",
        "      OTuTuvO   ","     OTuuTuvO   ","    OTuuTuvO    ","   OTuuTuO      ",
        "  OGGTuTO       "," OGGGTTO        ","OGGGGTO         "," OOGGO O        ",
        "   OWWWO        ","   OWWWWO       ","    OOWWO       ","       OO       ",
      ],
      3: [
        "         OluO   ","        OXluO   ","       OXTluvO  ","      OXTuluvO  ",
        "     OXTuuluvO  ","    OXTuuuluvO  ","   OXTuuuuluO   ","  OXTuuuuTO     ",
        " OGGGGTuTO      ","OGGGGGGTTO      ","OGGGGGGTO       "," OOGGGGO O      ",
        "   OWWWWWO      ","   OWWWWWWO     ","    OOWWWWO     ","       OOO      ",
      ],
    },
    staff: {
      1: [
        "      OYO       ","     OYyYO      ","    OYyYyO      ","    OYyyYO      ",
        "     OYyO       ","      OWO       ","      OwO       ","      OWO       ",
        "      OwO       ","      OWO       ","      OwO       ","      OWO       ",
        "      OwO       ","     OWWO       ","     OOO        ","                ",
      ],
      2: [
        "     OuTuO      ","    OTuYuTO     ","   OuTYYTuO     ","   OuYYpYuO     ",
        "   OuTYYTuO     ","    OTuYuTO     ","     OuTO       ","      OWO       ",
        "      OwO       ","      OWO       ","      OwO       ","      OWO       ",
        "      OwO       ","     OWwWO      ","     OOOO       ","                ",
      ],
      3: [
        "    OuTYTuO     ","   OuTYYYTuO    ","  OuTYppYTuO    ","  OuYppppYuO    ",
        "  OuYpllpYuO    ","  OuTYppYTuO    ","   OuTYYTuO     ","    OuTYuO      ",
        "    OXOwOXO     ","     OwO        ","     OWO        ","     OwO        ",
        "     OWO        ","    OXwXO       ","    OWWWO       ","    OOOO        ",
      ],
    },
    bow: {
      1: [
        "    OWO         ","   OwWO         ","  OwO O         "," OwO  OT        ",
        " OwO  OTO       "," OwO   OTO      "," OwO    OTO     "," OwO     OTO    ",
        " OwO    OTO     "," OwO   OTO      "," OwO  OTO       "," OwO  OT        ",
        "  OwO O         ","   OwWO         ","    OWO         ","                ",
      ],
      2: [
        "    OuO         ","   OuWO         ","  OuO Ov        "," OuO  OTv       ",
        " OuO  OTuv      "," OuO   OTuv     "," OuO    OTuv    "," OuO  vvvOTuv   ",
        " OuO    OTuv    "," OuO   OTuv     "," OuO  OTuv      "," OuO  OTv       ",
        "  OuO Ov        ","   OuWO         ","    OuO         ","                ",
      ],
      3: [
        "   OXuO         ","  OXuWO         "," OXuO Ov        "," OuO  OTv       ",
        " OuO  OTuvX     "," OuO   OTuvX    "," OuO    OTuvX   "," OuO XvvvOTuvX  ",
        " OuO    OTuvX   "," OuO   OTuvX    "," OuO  OTuvX     "," OuO  OTvX      ",
        " OXuO Ov        ","  OXuWO         ","   OXuO         ","                ",
      ],
    },
    helm: {
      1: [
        "                ","    OOOOOO      ","   OTuTTuTO     ","  OTuTTTTuTO    ",
        "  OTuTTTTuTO    ","  OTuTTTTuTO    ","  OTKKKKKKTO    ","  OTKkkkkKTO    ",
        "  OTKkkkkKTO    ","   OKkkkkKO     ","   OO    OO     ","                ",
        "                ","                ","                ","                ",
      ],
      2: [
        "     OOOO       ","    OTuuTO      ","   OTuTTuTO     ","  OTuTTTTuTO    ",
        "  OTuTTTTuTO    ","  OTuTTTTuTO    ","  OTKKKKKKTO    ","  OTKkkkkKTO    ",
        "  OTKkkkkKTO    ","   OKkkkkKO     ","   OO    OO     ","                ",
        "                ","                ","                ","                ",
      ],
      3: [
        "   O      O     ","  OXO    OXO    ","  OuOOOOOOuO    ","  OuTTTTTTuO    ",
        " OTuTTTTTTuTO   "," OTuTTTTTTuTO   "," OTuKKKKKKuTO   "," OTuKkkkkKuTO   ",
        " OTuKkkkkKuTO   ","  OKkkkkkkKO    ","  OXO    OXO    ","   O      O     ",
        "                ","                ","                ","                ",
      ],
    },
    chest: {
      1: [
        "  OO      OO    "," OTuOOOOOOuTO   "," OTuTTTTTTuTO   ","OTuTTTTTTTTuTO  ",
        "OTuTTTTTTTTuTO  ","OTuTTTTTTTTuTO  ","OTuTTTTTTTTuTO  ","OTuTTTTTTTTuTO  ",
        " OTuTTTTTTuTO   "," OTuTTTTTTuTO   ","  OTuTTTTuTO    ","   OOOOOOOO     ",
        "                ","                ","                ","                ",
      ],
      2: [
        "  OO      OO    "," OTuOOOOOOuTO   "," OTuTTTTTTuTO   ","OTuTTYYTTTuTO  ",
        "OTuTTYccYTTuTO ","OTuTYccccYTuTO ","OTuTTYccYTTuTO ","OTuTTTYYTTTuTO ",
        " OTuTTTTTTuTO   "," OTuTTTTTTuTO   ","  OTuTTTTuTO    ","   OOOOOOOO     ",
        "                ","                ","                ","                ",
      ],
      3: [
        " OuO      OuO   ","OuTuOOOOOOuTuO ","OuTuTTTTTTuTuO ","OuTTYGGGGYTTuO ",
        "OuTTYGccGYTTuO ","OuTYGccccGYTuO ","OuTTYGccGYTTuO ","OuTTYGGGGYTTuO ",
        "OuTuTTTTTTuTuO "," OuTuTTTTuTuO  ","  OuTuTTuTuO   ","   OuOOOOuO    ",
        "    OO  OO     ","                ","                ","                ",
      ],
    },
    boots: {
      1: [
        "  OTO  OTO     ","  OTO  OTO     ","  OTO  OTO     ","  OTuO OTuO    ",
        "  OTuO OTuO    ","  OTuO OTuO    ","  OTuOOOTuO    ","  OTuuuuTuO    ",
        " OvvvOOvvvO    "," OOOO  OOOO    ","                ","                ",
        "                ","                ","                ","                ",
      ],
      2: [
        "  OuO  OuO     ","  OTuO OTuO    ","  OTuO OTuO    ","  OTuO OTuO    ",
        "  OTuO OTuO    ","  OTuOOOTuO    ","  OTuuuuTuO    ","  OTuTTTuTuO   ",
        " OvvvOOvvvO    "," OOOO  OOOO    ","                ","                ",
        "                ","                ","                ","                ",
      ],
      3: [
        " OXuO  OXuO    "," OTuO  OTuO    "," OTuO  OTuO    "," OTuO  OTuO    ",
        " OTuOOOOTuO    "," OTuuuuuTuO    "," OTuYYYuTuO    "," OTuTTTuTuO    ",
        "OvvvvOOvvvvO   ","OOOOO  OOOOO   ","                ","                ",
        "                ","                ","                ","                ",
      ],
    },
    amulet: {
      1: [
        "                ","     OOOO       ","    OTuuTO      ","   OTu  uTO     ",
        "   OTu  uTO     ","    OTuuTO      ","     OTTO       ","      OO        ",
        "     OYYO       ","    OYppYO      ","    OYppYO      ","     OYYO       ",
        "      OO        ","                ","                ","                ",
      ],
      2: [
        "                ","    OOOOOO      ","   OTuTTuTO     ","  OTu    uTO    ",
        "  OTu    uTO    ","   OTuTTuTO     ","    OTuuTO      ","      OO        ",
        "     OYYO       ","    OYppYO      ","   OYpllpYO     ","    OYppYO      ",
        "     OYYO       ","      OO        ","                ","                ",
      ],
      3: [
        "    OXuuXO      ","   OXuTTuXO     ","  OXuTYYTuXO    ","  OuTY  YTuO    ",
        "  OuTY  YTuO    ","  OXuTYYTuXO    ","   OXuTTuXO     ","    OXuuXO      ",
        "     OYYO       ","    OYppYO      ","   OYpllpYO     ","   OYpllpYO     ",
        "    OYppYO      ","     OYYO       ","      OO        ","                ",
      ],
    },
  };

  const isEquip = EQ[kind];
  if(isEquip){
    const rows = (EQ[kind][lv]).map(r => (r + "                ").slice(0, 16));
    const els = pixGrid(rows, P, size, 16, 16);
    return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} shapeRendering="crispEdges" style={{ overflow: "visible" }}>{els}</svg>;
  }
  const rows = (sets8[kind] || sets8.star8).map(r => (r + "        ").slice(0, 8));
  const els = pixGrid(rows, P, size, 8, 8);
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} shapeRendering="crispEdges" style={{ overflow: "visible" }}>{els}</svg>;
}

const dateBtn={ background:C.panel, border:`3px solid ${C.lineDark}`, color:C.ink, padding:"6px 14px", cursor:"pointer", fontFamily:F, fontSize:14 };
const checkBtn={ width:34, height:34, border:`3px solid ${C.lineDark}`, cursor:"pointer", fontFamily:F, fontSize:16, fontWeight:700 };
const pixBtn={ border:`3px solid ${C.lineDark}`, padding:12 };
const miniBtn={ background:C.bg, border:`2px solid ${C.lineDark}`, color:C.ink, padding:"6px 10px", cursor:"pointer", fontFamily:F, fontSize:12 };
const addBtn={ width:"100%", background:C.panelAlt, border:`3px dashed ${C.lineDark}`, color:C.green, padding:12, cursor:"pointer", fontFamily:F, fontSize:14, fontWeight:700, marginTop:4 };
const inp={ width:"100%", background:C.bg, border:`2px solid ${C.lineDark}`, color:C.ink, padding:10, fontFamily:F, fontSize:14 };
const shopBtn={ minWidth:60, padding:"8px 10px", border:`3px solid ${C.lineDark}`, cursor:"pointer", fontFamily:F, fontSize:12, fontWeight:700, textAlign:"center" };
