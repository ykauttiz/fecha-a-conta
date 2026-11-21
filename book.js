"use strict";

// Decimal text stays exact from import through display and export.
const Book = (() => {
  const costs = ["comissao","tarifa","desconto_loja","estorno"];
  const types = ["venda","subsidio","ajuste","liquido",...costs,"repasse"];
  const fields = ["pedido","lote","valor","evento","tipo","data","loja","plataforma"];
  function cents(raw) {
    const match = /^(-?)(\d{1,18})(?:[,.](\d{1,2}))?$/.exec(raw);
    if (!match) throw Error("valor inválido. Use 1234,56, sem separador de milhar.");
    return BigInt(match[2] + (match[3] || "").padEnd(2,"0")) * (match[1] ? -1n : 1n);
  }
  function decimal(n) {
    const a = n < 0n ? -n : n;
    return (n < 0n ? "-" : "") + a / 100n + "," + String(a % 100n).padStart(2,"0");
  }
  function money(n) {
    if (n === null) return "—";
    const [whole, frac] = decimal(n).split(",");
    return "R$ " + whole.replace(/\B(?=(\d{3})+(?!\d))/g,".") + "," + frac;
  }
  function csv(text) {
    text = text.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
    const first = text.split("\n").find(line => line.trim()) || "";
    const delim = first.replace(/"(?:[^"]|"")*"/g,"").includes(";") ? ";" : ",";
    const records = [];
    let values = [], value = "", quoted = false, closed = false, line = 1, start = 1;
    function end() {
      values.push(value.trim()); value = ""; closed = false;
    }
    function row() {
      end();
      if (values.length > 1 || values[0]) records.push({values,line:start});
      values = []; start = line + 1;
    }
    for (let i=0; i<text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch !== '"') value += ch;
        else if (text[i+1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else if (ch === delim) end();
      else if (ch === "\n") row();
      else if (ch === '"' && !closed && !value) quoted = true;
      else if (closed || ch === '"') throw Error("Aspas inválidas na linha " + line);
      else value += ch;
      if (ch === "\n") line++;
    }
    if (quoted) throw Error("Aspas abertas na linha " + start);
    row();
    const headers = records.shift()?.values || [];
    if (!headers.length || headers.some(x=>!x) || new Set(headers).size !== headers.length)
      throw Error("Informe cabeçalhos preenchidos e únicos.");
    for (const record of records) if (record.values.length !== headers.length)
      throw Error("Quantidade de colunas incorreta na linha " + record.line);
    if (!records.length) throw Error("O arquivo contém apenas cabeçalho.");
    if (records.length > 50000) throw Error("Limite de 50 mil registros por arquivo.");
    return {headers, records};
  }
  function suggest(headers,side) {
    const names = headers.map(h=>h.trim().toLowerCase());
    return Object.fromEntries(fields.map(f=>{
      let i = names.indexOf(f);
      if (f === "valor" && i < 0) i = names.indexOf(side === "expected" ? "previsto" : "recebido");
      return [f,i];
    }));
  }
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date+"T00:00:00Z");
    return Number.isFinite(+d) && d.toISOString().slice(0,10) === date;
  }
  function parseSource(source) {
    const {headers,records} = csv(source.text);
    const map = source.map || suggest(headers,source.side);
    const indices = fields.map(f=>map[f] ?? -1);
    if (indices.some(i=>!Number.isInteger(i)||i < -1||i>=headers.length) ||
        new Set(indices.filter(i=>i>=0)).size !== indices.filter(i=>i>=0).length)
      throw Error("Escolha uma coluna diferente para cada campo.");
    if (map.valor < 0 || (map.pedido < 0 && map.lote < 0)) throw Error("Mapeie valor e pedido ou lote.");
    return records.map(({values,line})=>{
      const get = field => values[map[field]] || "";
      try {
        const order=get("pedido"), batch=get("lote"), event=get("evento"), date=get("data");
        const type=get("tipo").toLowerCase() || (source.side === "expected" ? "liquido" : "repasse");
        if (!order && !batch) throw Error("pedido ou lote ausente.");
        if (date && !validDate(date)) throw Error("data inválida. Use AAAA-MM-DD.");
        if (!types.includes(type) || (source.side === "received") !== (type === "repasse"))
          throw Error("tipo incompatível com a origem: " + type);
        let value=cents(get("valor"));
        if (costs.includes(type)) value = value > 0n ? -value : value;
        if (["venda","subsidio"].includes(type) && value < 0n) throw Error("crédito negativo. Use ajuste ou estorno.");
        const rate=source.rate || "0";
        const bp=cents(rate);
        if (bp<0n || bp>10000n) throw Error("comissão fora do intervalo de 0 a 100%.");
        const fee=type==="venda" ? (value*bp+5000n)/10000n : 0n;
        return {order,batch,event,date,type,value,fee,scope:[get("loja")||source.store||"",get("plataforma")||source.platform||""],side:source.side,file:source.name,line};
      } catch (error) { throw Error(source.name+" · linha "+line+" · "+error.message); }
    });
  }
  function reconcile(sources) {
    const groups = new Map(), seenFiles=new Set(), byEvent=new Map();
    for (const source of sources) {
      const identity=JSON.stringify([source.side,source.store,source.platform,source.hash]);
      if (source.hash && seenFiles.has(identity)) continue;
      seenFiles.add(identity);
      for (const e of parseSource(source)) {
        const key=JSON.stringify([...e.scope,e.batch?"lote":"pedido",e.batch||e.order]);
        let group=groups.get(key);
        if (!group) {
          group={key,id:e.batch||e.order,kind:e.batch?"Lote":"Pedido",scope:e.scope,entries:[],conflict:false};
          groups.set(key,group);
        }
        if (e.event) {
          const id=JSON.stringify([...e.scope,e.side,e.event]);
          const signature=JSON.stringify([key,e.order,e.date,e.type,String(e.value),String(e.fee)]);
          const first=byEvent.get(id);
          if (first && first.signature===signature) continue;
          if (first) { first.group.conflict=true; group.conflict=true; }
          else byEvent.set(id,{group,signature});
        }
        group.entries.push(e);
      }
    }
    return [...groups.values()].filter(g=>g.entries.length).map(g=>{
      const a=g.entries.filter(e=>e.side==="expected"), b=g.entries.filter(e=>e.side==="received");
      const ambiguous = [a,b].some(part=>part.length>1 && part.some(e=>!e.event));
      const expected=a.reduce((n,e)=>n+e.value-e.fee,0n), received=b.reduce((n,e)=>n+e.value,0n);
      const conflictingFees = a.some(e=>e.fee!==0n) && a.some(e=>e.type==="comissao");
      const mixed = a.some(e=>e.type==="liquido") && a.some(e=>e.type!=="liquido");
      const reason=g.conflict?"ID de evento com conteúdos diferentes":ambiguous?"Vários lançamentos sem ID individual":mixed?"Líquido e componentes no mesmo grupo":conflictingFees?"Comissão explícita e calculada no mesmo grupo":!a.length?"Sem previsão correspondente":!b.length?"Sem repasse correspondente":"";
      const difference=reason ? null : received-expected;
      return {...g,expected:a.length?expected:null,received:b.length?received:null,difference,reason,
        status:reason?"Pendente":difference===0n?"Conferido":"Divergente"};
    }).sort((a,b)=>a.key.localeCompare(b.key,"pt-BR"));
  }
  function totals(groups) {
    let expected=0n,received=0n,short=0n,extra=0n,unpaired=0;
    for (const g of groups) {
      if(g.difference===null){unpaired++;continue;}
      expected+=g.expected;received+=g.received;
      if(g.difference<0n) short-=g.difference;else extra+=g.difference;
    }
    return {expected,received,short,extra,unpaired};
  }
  function cell(v) {
    let s=String(v ?? "");
    if (/^\s*[=+@-]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }
  return {csv,suggest,fields,parseSource,reconcile,totals,cents,decimal,money,cell,validDate};
})();
if (typeof module !== "undefined") module.exports = Book;
