import { URLSearchParams } from 'url';

// Atonics
const atonicWords=new Set(["a","al","algo","algún","alguna","algunas","algunos","ante","bajo","cabe","como","con","contra","de","del","desde","e","en","entre","hasta","la","las","le","les","lo","los","más","me","mi","mía","mías","mío","míos","ni","no","o","os","para","por","que","se","sin","su","sus","te","tu","tus","un","una","unas","unos","y","el","es","son","yo","tú","él","ella"]);

// Helpers
function preprocess(t){return t.replace(/([!"':;,\.\?¿])/g,' $1');}
function removeAccents(s){return s.normalize('NFD').replace(/\p{M}/gu,'');}
function isStrong(ch){return /[aeoáéíóú]/i.test(ch);}  
function syllabify(w){const vs='aeiouáéíóúü',pts=[];for(let i=0;i<w.length;i++)if(vs.includes(w[i]))pts.push({i,accented:/[áéíóú]/.test(w[i]),letter:w[i]});if(!pts.length)return[];const syl=[pts.slice(0,1)];for(let j=1;j<pts.length;j++){const p=pts[j-1],x=pts[j];if(x.i===p.i+1&&!p.accented&&!x.accented&&!(isStrong(p.letter)&&isStrong(x.letter)))syl[syl.length-1].push(x);else syl.push([x]);}return syl;}
function getStressInfo(w){const lw=w.toLowerCase(),sy=syllabify(lw);if(!sy.length)return null;let st=sy.findIndex(s=>s.some(v=>v.accented));if(st<0){const last=lw[lw.length-1];st=/[aeiouns]/.test(last)?Math.max(sy.length-2,0):sy.length-1;}return{stressed:st,syllables:sy,word:w};}
function computePattern(info,wrap){const sy=info.syllables;if(!wrap&&atonicWords.has(info.word.toLowerCase())&&sy.length===1)return null;const parts=[];for(let i=info.stressed;i<sy.length;i++){let letter;if(i===info.stressed){const arr=sy[i].map(v=>v.letter);letter=arr.find(ch=>/[áéíóú]/.test(ch))||arr.find(ch=>isStrong(ch))||arr[arr.length-1];}else letter=sy[i][sy[i].length-1].letter;parts.push(i===info.stressed?removeAccents(letter).toUpperCase():removeAccents(letter).toLowerCase());}return parts.join(parts.length>1?'-':'');}
function tokenize(ln){return ln.match(/\([^)]*\)|\[[^]]*\]|(\s+)|[^\s()\[\]]+/g)||[];}
function stripWrapper(tok){return tok.replace(/^[\(\[]|[\)\]]$/g,'');}
function overrideStress(info,wrap,count){if(wrap)info.stressed=0;}

// Colorization functions
function getColorA(i){return `hsl(${(i*50)%360},80%,65%)`;}
function colorizeSimple(text, isFullWord){text=preprocess(text);const lines=text.split(/\r?\n/),occ=[];lines.forEach((ln,r)=>tokenize(ln).forEach((tok,c)=>{const core=stripWrapper(tok).match(/[A-Za-záéíóúü]+/)?stripWrapper(tok):'',wrap=/^[\(\[]/.test(tok),count=core?syllabify(core).length:0,info=core?getStressInfo(core):null;if(info)overrideStress(info,wrap,count);const pat=info?computePattern(info,wrap):null;occ.push({r,c,core,pat,wrap,count});}));occ.forEach(o=>{if(o.core&&o.count===1&&!o.wrap){const L=occ.find(x=>x.r===o.r&&x.c===o.c-1),R=occ.find(x=>x.r===o.r&&x.c===o.c+1);if((L&&L.wrap)||(R&&R.wrap))o.pat=null;}});occ.forEach(o=>{if(!o.pat)return;const same=occ.filter(x=>x!==o&&x.pat===o.pat&&Math.abs(x.r-o.r)<3);if(same.length)o.el=true;});const pats=[...new Set(occ.filter(o=>o.el).map(o=>o.pat))],col={};pats.forEach((p,i)=>col[p]=getColorA(i));return lines.map((ln,r)=>'<p>'+tokenize(ln).map((tok,c)=>{const o=occ.find(x=>x.r===r&&x.c===c),out=o&&o.el?o.core:stripWrapper(tok);if(o&&o.el&&o.core){const bg=col[o.pat];if(isFullWord)return`<span style="background-color:${bg};font-weight:normal">${out}</span>`;const inf=getStressInfo(out);overrideStress(inf,o.wrap,syllabify(out).length);const pos=inf.syllables[inf.stressed][0].i;return out.slice(0,pos)+`<span style="background-color:${bg};font-weight:normal">${out.slice(pos)}</span>`;}return out;}).join('')+'</p>').join('');}

const tonic={a:'blue',e:'red',i:'yellow',o:'green',u:'purple'},atonicMap={};['a','e','i','o','u'].forEach((tv,ti)=>{atonicMap[tv]={};['a','e','i','o','u'].forEach((av,ai)=>atonicMap[tv][av]=`hsl(${(ti*50+ai*15)%360},80%,65%)`);});
function colorizeAdvanced(text){text=preprocess(text);const lines=text.split(/\r?\n/),occ=[];lines.forEach((ln,r)=>tokenize(ln).forEach((tok,c)=>{const core=stripWrapper(tok).match(/[A-Za-záéíóúü]+/)?stripWrapper(tok):'',wrap=/^[\(\[]/.test(tok),count=core?syllabify(core).length:0,info=core?getStressInfo(core):null;if(info)overrideStress(info,wrap,count);const pat=info?computePattern(info,wrap):null;occ.push({r,c,core,info,pat,wrap,count});}));occ.forEach(o=>{if(o.core&&o.count===1&&!o.wrap){const L=occ.find(x=>x.r===o.r&&x.c===o.c-1),R=occ.find(x=>x.r===o.r&&x.c===o.c+1);if((L&&L.wrap)||(R&&R.wrap))o.pat=null;}});occ.forEach(o=>{if(!o.pat)return;const same=occ.filter(x=>x!==o&&x.pat===o.pat&&Math.abs(x.r-o.r)<3);if(same.length)o.el=true;});return lines.map((ln,r)=>'<p>'+tokenize(ln).map((tok,c)=>{const o=occ.find(x=>x.r===r&&x.c===c);if(o&&o.el&&o.core){const raw=o.core,info=o.info,letters=info.syllables[info.stressed].map(v=>v.letter),accented=letters.find(ch=>/[áéíóú]/.test(ch)),strong=letters.find(ch=>isStrong(ch)),tv=removeAccents(accented||strong||letters[letters.length-1]).toLowerCase(),abs=[...info.syllables.slice(info.stressed).map(s=>s[0].i),raw.length];let html='';for(let i=0;i<abs.length-1;i++){const part=raw.slice(abs[i],abs[i+1]);if(i===0)html+=`<span style="background-color:${tonic[tv]};color:black;font-weight:normal">${part}</span>`;else{const av=removeAccents(info.syllables[info.stressed+i][info.syllables[info.stressed+i].length-1].letter).toLowerCase();html+=`<span style="background-color:${atonicMap[tv][av]};color:black;font-weight:normal">${part}</span>`;} } return raw.slice(0,abs[0])+html;} return stripWrapper(tok);}).join('')+'</p>').join('');}

// Main handler
export default async function handler(request, response) {
  try {
    const { text, type, isFullWord } = await request.body;
    let htmlContent;

    if (type === 'simple') {
      htmlContent = colorizeSimple(text, isFullWord);
    } else if (type === 'advanced') {
      htmlContent = colorizeAdvanced(text);
    } else {
      htmlContent = '';
    }

    response.status(200).json({ html: htmlContent });
  } catch (error) {
    response.status(500).json({ error: 'Failed to analyze text.' });
  }
  }
  
