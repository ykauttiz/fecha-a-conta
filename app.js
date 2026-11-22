"use strict";
const $=id=>document.getElementById(id);
const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const say=text=>{$("message").textContent=text;};
const labels={pedido:"Pedido",lote:"Lote",valor:"Valor (R$)",evento:"ID do evento",tipo:"Tipo",data:"Data do evento",loja:"Loja",plataforma:"Plataforma"};
let sources=[],groups=[],notes=[],draft=[],selected=null,page=1,version=0,worker=null,demo=false;
const demoSources=[
  {side:"expected",name:"pedidos-exemplo.csv",text:"pedido;lote;evento;tipo;valor;data\n0017;L01;v17;venda;85,00;2026-10-30\n0017;L01;c17;comissao;10,20;2026-10-30\n0017;L01;d17;desconto_loja;5,00;2026-10-30\n0018;L01;v18;venda;30,00;2026-10-31\n0019;;v19;venda;40,00;2026-11-01\n0020;;v20;venda;24,00;2026-11-01"},
  {side:"received",name:"repasses-exemplo.csv",text:"pedido;lote;evento;tipo;valor;data\n;L01;p1;repasse;60,00;2026-11-02\n;L01;p2;repasse;39,80;2026-11-03\n0019;;p3;repasse;38,50;2026-11-03\n0021;;p4;repasse;12,00;2026-11-03"}
].map(s=>({...s,store:"Loja exemplo",platform:"Delivery",rate:"0"}));
function stop() {
  version++;
  if(worker){worker.terminate();worker=null;}
  draft=[];$("preview").hidden=true;
  return version;
}
async function digest(text) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,"0")).join("");
}
async function read(file,limit) {
  if(file.size>limit)throw Error("Arquivo acima do limite de "+limit/1048576+" MiB.");
  try{return new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}
  catch{throw Error("Não foi possível ler "+file.name+". Use UTF-8.");}
}
function calculate(list,id,onDone) {
  if(list.length>50 || list.reduce((n,s)=>n+s.text.length,0)>16000000)throw Error("A sessão aceita 50 arquivos e 16 milhões de caracteres.");
  const finish=data=>{
    if(id!==version)return;
    if(worker){worker.terminate();worker=null;}
    if(data.error){say(data.error);return;}
    onDone(data.groups);
  };
  say("Conferindo os lançamentos…");
  if(location.protocol==="file:"){finish({groups:Book.reconcile(list)});return;}
  worker=new Worker("worker.js");
  worker.onmessage=e=>finish(e.data);
  worker.onerror=()=>finish({error:"Não foi possível concluir a leitura. Tente novamente."});
  worker.postMessage(list);
}
function options(select,values,all) {
  const previous=select.value;
  select.replaceChildren(new Option(all,""),...values.map(v=>new Option(v,v)));
  if(values.includes(previous))select.value=previous;
}
function commit(list,result,history,isDemo) {
  sources=list;groups=result;notes=history;demo=isDemo;selected=null;page=1;
  draft=[];$("preview").hidden=true;$("workspace").hidden=!sources.length;
  $("origin").textContent=isDemo?"Dados fictícios":sources.length+" arquivo(s) nesta sessão";
  options($("shop"),[...new Set(groups.map(g=>g.scope[0]).filter(Boolean))].sort(),"Todas");
  options($("channel"),[...new Set(groups.map(g=>g.scope[1]).filter(Boolean))].sort(),"Todas");
  $("files").replaceChildren(...sources.map((s,index)=>{
    const row=element("p");
    row.append(element("strong",s.name),element("span"," · "+(s.side==="expected"?"previsão":"recebimento")+(s.at?" · "+s.at:"")+(s.hash?" · SHA-256 "+s.hash.slice(0,12):"")));
    const button=element("button","Retirar arquivo");
    button.onclick=()=>{
      if(!confirm("Retirar "+s.name+" e recalcular o fechamento?"))return;
      const id=stop(),remaining=sources.filter((_,i)=>i!==index);
      try{calculate(remaining,id,result=>{commit(remaining,result,notes,demo);say("Arquivo retirado e fechamento recalculado.");});}
      catch(e){say(e.message);}
    };
    row.append(" ",button);return row;
  }));
  render();
}
function signature(g) {
  return JSON.stringify(g.entries.map(e=>[e.file,e.line,e.event,e.order,e.batch,e.type,e.date,String(e.value),String(e.fee)]));
}
function reviewed(g) {return notes.some(n=>n.key===g.key && n.signature===signature(g));}
function filter() {
  const q=$("query").value.trim().toLowerCase(),status=$("status").value;
  const direction=$("direction").value, type=$("entry-type").value;
  let minimum=0n;
  const raw=$("minimum").value.trim();
  if(raw){
    try {minimum=Book.cents(raw);if(minimum<0n)throw Error();}
    catch {return [];}
  }
  const shop=$("shop").value, channel=$("channel").value, start=$("from").value, end=$("to").value;
  const matches = groups.filter(g=>{
    if(type && !g.entries.some(e=>e.type===type))return false;
    if(direction==="short" && !(g.difference!==null && g.difference<0n))return false;
    if(direction==="extra" && !(g.difference!==null && g.difference>0n))return false;
    if(minimum>0n && (g.difference===null || (g.difference<0n?-g.difference:g.difference)<minimum))return false;
    if(status==="Revisado"?!reviewed(g):status && status!==g.status)return false;
    if(shop && g.scope[0]!==shop || channel && g.scope[1]!==channel)return false;
    if(q && !g.id.toLowerCase().includes(q) && !g.entries.some(e=>e.order.toLowerCase().includes(q)))return false;
    return !(start||end) || g.entries.some(e=>e.date && (!start||e.date>=start) && (!end||e.date<=end));
  });
  const order = $("order-results").value;
  if (order) {
    const amount = g => order === "received" ? g.received :
      g.difference === null ? null : (g.difference < 0n ? -g.difference : g.difference);
    matches.sort((a,b) => {
      const left = amount(a), right = amount(b);
      if (left === right) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return left > right ? -1 : 1;
    });
  }
  return matches;
}
function comparableAmount(value, count, totals) {
  return count > totals.unpaired ? Book.money(value) : "—";
}
function cells(row,values,tag="td"){for(const v of values)row.append(element(tag,v));}
let segmentPage = 0, segmentRows = [];
function renderSegments(list) {
  const byShop = $("segment-by").value === "shop";
  $("segment-name").textContent = byShop ? "Loja" : "Plataforma";
  const segments = new Map();
  for (const group of list) {
    const key = group.scope[byShop ? 0 : 1];
    if (!segments.has(key)) segments.set(key,[]);
    segments.get(key).push(group);
  }
  segmentRows = [];
  for (const key of [...segments.keys()].sort((a,b)=>a.localeCompare(b,"pt-BR"))) {
    const items = segments.get(key), totals = Book.totals(items);
    const amount = n => comparableAmount(n,items.length,totals);
    segmentRows.push([key || "Não informada",items.length,amount(totals.expected),amount(totals.received),amount(totals.extra-totals.short),totals.unpaired]);
  }
  segmentPage = 0; paintSegments();
}
function paintSegments() {
  const pages = Math.max(1,Math.ceil(segmentRows.length/25));
  const fragment = document.createDocumentFragment();
  for (const [label,...values] of segmentRows.slice(segmentPage*25,(segmentPage+1)*25)) {
    const row = element("tr"), heading = element("th",label);
    heading.scope = "row"; row.append(heading); cells(row,values); fragment.append(row);
  }
  $("segments").replaceChildren(fragment);
  $("segment-empty").hidden = segmentRows.length > 0;
  $("segment-csv").disabled = !segmentRows.length;
  $("segment-back").hidden = $("segment-next").hidden = pages <= 1;
  $("segment-back").disabled = segmentPage === 0;
  $("segment-next").disabled = segmentPage === pages-1;
  $("segment-page").textContent = pages > 1 ? (segmentPage+1)+" / "+pages : "";
}
$("segment-back").onclick = () => {segmentPage--;paintSegments();};
$("segment-next").onclick = () => {segmentPage++;paintSegments();};
$("segment-csv").onclick = () => {
  const heading = [$("segment-name").textContent,"Pedidos e lotes","Previsto comparável","Recebido comparável","Diferença líquida","Sem comparação"];
  const lines = [heading,...segmentRows].map(row => row.map(Book.cell).join(";"));
  download("resumo-de-repasses.csv","\uFEFF"+lines.join("\r\n"),"text/csv;charset=utf-8");
}
$("segment-by").onchange = () => renderSegments(filter());
function render() {
  const list=filter(),t=Book.totals(list);
  renderSegments(list);
  if(window.FechaInsights)window.FechaInsights.render(list);
  $("metrics").replaceChildren(...[["Líquido previsto",t.expected],["Repasse recebido",t.received],["Recebido a menos",t.short],["Recebido a mais",t.extra]].map(([label,n])=>{
    const box=element("div",label);box.className="metric";box.append(element("strong",comparableAmount(n,list.length,t)));return box;
  }));
  $("count").textContent=list.length+" grupo(s) na seleção · "+t.unpaired+" sem comparação conclusiva. Datas selecionam o grupo completo.";
  if (!list.length) $("count").textContent = "Nenhum pedido ou lote corresponde à seleção. Ajuste ou limpe os filtros.";
  if (!$("minimum").validity.valid) $("count").textContent="Informe um valor positivo em reais ou zero, com até duas casas decimais.";
  if ($("from").value && $("to").value && $("from").value > $("to").value) $("count").textContent="A data inicial precisa ser anterior ou igual à final.";
  const pages=Math.max(1,Math.ceil(list.length/50));page=Math.max(1,Math.min(page,pages));
  $("pages").hidden=pages<=1;$("page").textContent=page+" / "+pages;$("prev").disabled=page===1;$("next").disabled=page===pages;
  $("results").replaceChildren(...list.slice((page-1)*50,page*50).map(g=>{
    const row=element("tr"),btn=element("button",g.kind+" "+g.id);
    btn.onclick=()=>{selected=g.key;detail(g);$("detail").scrollIntoView({block:"start"});$("detail").querySelector("h2").focus();};
    row.insertCell().append(btn);
    const badge=element("span",g.status+(reviewed(g)?" · revisado":""));badge.className="badge "+(g.status==="Conferido"?"":"warn");
    row.insertCell().append(badge);cells(row,[g.expected,g.received,g.difference].map(Book.money));return row;
  }));
  const current=list.find(g=>g.key===selected);$("detail").hidden=!current;if(current)detail(current);
}
function detail(g) {
  const box=$("detail");box.hidden=false;box.replaceChildren();
  const title=element("h2",g.kind+" "+g.id);title.tabIndex=-1;box.append(title);
  box.append(element("p",[...g.scope,g.reason || "Diferença = recebido − líquido previsto."].filter(Boolean).join(" · ")));
  const table=element("table");cells(table.createTHead().insertRow(),["Origem · linha","Data","Pedido / evento","Tipo","Valor","Comissão calculada"],"th");
  const body=table.createTBody();
  for(const e of g.entries)cells(body.insertRow(),[e.file+" · "+e.line,e.date||"—",[e.order,e.event].filter(Boolean).join(" / ")||"—",e.type,Book.money(e.value),e.fee?Book.money(-e.fee):"—"]);
  const wrap=element("div");wrap.className="scroll";wrap.tabIndex=0;wrap.append(table);box.append(wrap);
  for(const n of notes.filter(n=>n.key===g.key))box.append(element("p",n.at+" · "+n.text+(n.signature===signature(g)?"":" (versão anterior)")));
  if(g.status!=="Conferido"){
    const label=element("label","Motivo da revisão"),input=element("input"),btn=element("button","Registrar revisão");
    input.maxLength=500;label.append(input);box.append(label,btn);
    btn.onclick=()=>{const text=input.value.trim();if(!text){input.focus();return say("Informe o motivo da revisão.");}
      notes.push({key:g.key,signature:signature(g),at:new Date().toISOString(),text});render();say("Revisão registrada. Os valores originais foram preservados.");};
  }
}
function mapping(s) {
  const {headers,records}=Book.csv(s.text);
  s.map=Book.suggest(headers,s.side);
  const article=element("article"),grid=element("div"),sample=element("p");grid.className="grid";
  article.append(element("h3",s.name),element("p",records.length+" registro(s) · "+(s.side==="expected"?"previsão":"recebimento")),grid,sample);
  const preview=()=>{sample.textContent="Primeira linha · "+Book.fields.filter(f=>s.map[f]>=0).map(f=>labels[f]+" = "+(records[0].values[s.map[f]]||"—")).join(" | ");};
  for(const f of Book.fields){
    const label=element("label",labels[f]),select=element("select");select.append(new Option("Ignorar","-1"),...headers.map((h,i)=>new Option(h,String(i))));
    select.value=String(s.map[f]);select.onchange=()=>{s.map[f]=Number(select.value);preview();};label.append(select);grid.append(label);
  }
  const key = "fecha-a-conta.mapa.v1:" + JSON.stringify([s.side,s.platform,headers]);
  const saveMap = element("button","Guardar mapeamento neste navegador");
  const useMap = element("button","Aplicar mapeamento guardado");
  saveMap.type = useMap.type = "button";
  try {useMap.disabled = !localStorage.getItem(key);} catch {useMap.disabled = true;}
  saveMap.onclick = () => {
    try {localStorage.setItem(key,JSON.stringify(s.map));useMap.disabled = false;say("Mapeamento guardado para este cabeçalho.");}
    catch {say("Não foi possível guardar o mapeamento neste navegador.");}
  };
  useMap.onclick = () => {
    try {
      const map = JSON.parse(localStorage.getItem(key));
      if (!Book.fields.every(f => Number.isInteger(map?.[f]) && map[f] >= -1 && map[f] < headers.length)) throw Error();
      for (const [index,select] of [...grid.querySelectorAll("select")].entries()) select.value = String(map[Book.fields[index]]);
      s.map = map;preview();say("Mapeamento aplicado. Confira a prévia antes de incluir.");
    } catch {say("O mapeamento guardado está indisponível.");}
  };
  article.append(saveMap,useMap);
  preview();return article;
}
$("import").onsubmit=async event=>{
  event.preventDefault();const id=stop();
  try {
    const files=[["orders","expected"],["payments","received"]].filter(([field])=>$(field).files.length);
    if(!files.length)throw Error("Escolha pelo menos um arquivo de pedidos ou de repasses.");
    const rate=$("rate").value.trim()||"0",store=$("store").value.trim(),platform=$("platform").value.trim();
    const prepared=await Promise.all(files.map(async ([field,side])=>{
      const file=$(field).files[0],text=await read(file,4*1048576);
      return {side,name:file.name,text,store,platform,rate,hash:await digest(text),at:new Date().toISOString()};
    }));
    if(id!==version)return;
    const nodes=prepared.map(mapping);draft=prepared;$("maps").replaceChildren(...nodes);$("preview").hidden=false;say("Confira os campos e a primeira linha antes de incluir.");
  }catch(e){if(id===version)say(e.message);}
};
function sourceId(s){return JSON.stringify([s.side,s.store,s.platform,s.hash]);}
$("confirm").onclick=()=>{
  if(!draft.length)return;
  const id=++version;if(worker){worker.terminate();worker=null;}
  try{
    const existing=demo?[]:sources,known=new Set(existing.map(sourceId)),add=draft.filter(s=>!known.has(sourceId(s)));
    if(!add.length)return say("Estes arquivos já estão no fechamento. Para alterar o mapeamento ou a comissão, retire o arquivo e importe novamente.");
    const list=[...existing,...add],skipped=draft.length-add.length;
    calculate(list,id,result=>{commit(list,result,demo?[]:notes,false);say("Importação concluída."+ (skipped?" Arquivo já incluído foi ignorado.":""));});
  }catch(e){say(e.message);}
};
$("cancel").onclick=()=>{stop();say("Prévia cancelada.");};
$("demo").onclick=()=>{if(sources.length&&!demo&&!confirm("Substituir o fechamento atual pelo exemplo fictício?"))return;
  stop();commit(demoSources,Book.reconcile(demoSources),[],true);say("Exemplo fictício carregado.");$("workspace").scrollIntoView();};
$("clear").onclick=()=>{if(!confirm("Limpar os dados desta página? Baixe um backup se quiser retomá-los."))return;stop();commit([],[],[],false);$("import").reset();say("Fechamento limpo.");};
const filterFields = ["query","status","shop","channel","from","to","minimum","direction","entry-type","order-results"];
$("reset-filters").onclick = () => {
  for (const id of filterFields) $(id).value = "";
  page = 1;
  render();
  $("query").focus();
};
for (const id of filterFields) $(id).oninput=()=>{page=1;render();};
$("prev").onclick=()=>{page--;render();};$("next").onclick=()=>{page++;render();};
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=element("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("save").onclick=()=>download("fecha-a-conta.json",JSON.stringify({version:1,sources,notes,demo}),"application/json");
$("restore").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;const id=stop();
  try{
    const data=JSON.parse(await read(file,40*1048576));
    if(data.version!==1||!Array.isArray(data.sources)||!data.sources.length||data.sources.length>50||!Array.isArray(data.notes)||data.notes.length>10000)throw Error("Formato de backup incompatível.");
    for(const s of data.sources){
      if(!s||!["expected","received"].includes(s.side)||typeof s.text!=="string"||s.text.length>4*1048576||
        !["name","store","platform","rate"].every(k=>typeof s[k]==="string")||s.map && !Book.fields.every(f=>Number.isInteger(s.map[f])))throw Error("Origem inválida no backup.");
      const hash=await digest(s.text);if(s.hash && s.hash!==hash)throw Error("O conteúdo de um arquivo foi alterado.");s.hash=hash;
    }
    if(!data.notes.every(n=>n&&["at","text","signature","key"].every(k=>typeof n[k]==="string")))throw Error("Histórico de revisão inválido.");
    if(id!==version)return;
    if(sources.length && !confirm("Substituir a sessão atual pelo backup?"))return;
    calculate(data.sources,id,result=>{commit(data.sources,result,data.notes,data.demo===true);say("Backup restaurado.");});
  }catch(error){if(id===version)say(error.message);}finally{e.target.value="";}
};
function evidence(){
  const table=[["Grupo","Loja","Plataforma","Situação","Motivo","Previsto grupo","Recebido grupo","Diferença grupo","Arquivo","Linha","Data do evento","Pedido","ID evento","Tipo","Valor do lançamento","Comissão calculada","Revisões"]];
  for(const g of filter()){
    const reviewedNotes=notes.filter(n=>n.key===g.key).map(n=>n.at+" "+n.text).join(" | ");
    g.entries.forEach((e,i)=>table.push([g.kind+" "+g.id,...g.scope,g.status,g.reason,...[g.expected,g.received,g.difference].map(n=>i||n===null?"":Book.decimal(n)),e.file,e.line,e.date,e.order,e.event,e.type,Book.decimal(e.value),Book.decimal(-e.fee),i?"":reviewedNotes]));
  }
  return table;
}
$("export").onclick=()=>download("conferencia.csv","\uFEFF"+evidence().map(row=>row.map(Book.cell).join(";")).join("\r\n"),"text/csv;charset=utf-8");
$("print").onclick=()=>{
  const box=$("printout"),table=element("table");box.replaceChildren(element("h1","Fechamento de repasses"),element("p",(demo?"Dados fictícios · ":"")+new Date().toLocaleString("pt-BR")));
  const selection = filter(), totals = Book.totals(selection);
  const summary = element("dl");
  const amount = value => comparableAmount(value,selection.length,totals);
  for (const [label,value] of [["Grupos na seleção",selection.length],["Sem comparação conclusiva",totals.unpaired],
    ["Previsto comparável",amount(totals.expected)],["Recebido comparável",amount(totals.received)],
    ["Recebido a menos",amount(totals.short)],["Recebido a mais",amount(totals.extra)]]) {
    summary.append(element("dt",label),element("dd",String(value)));
  }
  box.append(summary);
  cells(table.createTHead().insertRow(),["Grupo","Loja","Plataforma","Situação","Previsto","Recebido","Diferença","Evidência"],"th");const body=table.createTBody();
  for(const g of selection)cells(body.insertRow(),[g.kind+" "+g.id,...g.scope.map(value => value || "—"),[g.status,g.reason].filter(Boolean).join(" · "),Book.money(g.expected),Book.money(g.received),Book.money(g.difference),g.entries.map(e=>e.file+" L"+e.line).join(", ")]);
  box.append(table);window.print();
};
