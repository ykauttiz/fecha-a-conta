"use strict";

// Decimal text stays exact from import through display and export.
const Book = (() => {
  const costs = ["comissao","tarifa","desconto_loja","estorno"];
  const types = ["venda","subsidio","ajuste","liquido",...costs,"repasse","deposito"];
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
    // Cabeçalhos equivalentes genéricos — não são layouts oficiais de plataformas.
    // Prefere o nome canônico; alternativas só são escolhidas quando há um único candidato.
    const names=headers.map(h=>h.trim().toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""));
    const aliases={
      pedido:["id_pedido","pedido_id","numero_pedido","numero_do_pedido","order_id","n_pedido"],
      lote:["id_lote","lote_id","numero_lote"],
      valor:["valor_liquido","valor_liquido_previsto","valor_repassado","montante","valor_depositado","valor_do_deposito","depositado"],
      evento:["id_evento","evento_id","identificador_de_evento","transaction_id"],
      tipo:["tipo_evento","tipo_lancamento","tipo_de_lancamento"],
      data:["data_evento","data_do_evento","date"],
      loja:["nome_loja","loja_nome","id_loja"],
      plataforma:["canal","marketplace","origem_plataforma"]
    };
    const chosen=new Set();
    return Object.fromEntries(fields.map(field=>{
      const canonical=names.flatMap((name,i)=>name===field?[i]:[]);
      let index=canonical.length===1?canonical[0]:-1;
      if(canonical.length>1)return [field,-1];
      if(index<0&&field==="valor"){
        const alias=side==="expected"?"previsto":side==="bank"?"depositado":"recebido";
        const possible=names.flatMap((name,i)=>name===alias?[i]:[]);
        index=possible.length===1?possible[0]:-1;
        if(possible.length>1)return [field,-1];
      }
      if(index<0){
        const candidates=names.flatMap((name,i)=>(aliases[field]||[]).includes(name)?[i]:[]);
        index=candidates.length===1?candidates[0]:-1;
      }
      if(chosen.has(index))index=-1;
      if(index>=0)chosen.add(index);
      return [field,index];
    }));
  }
  function validDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const d = new Date(date+"T00:00:00Z");
    return Number.isFinite(+d) && d.toISOString().slice(0,10) === date;
  }
  function parseSource(source) {
    if (!["expected","received","bank"].includes(source.side)) throw Error("Origem financeira desconhecida.");
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
        const type=get("tipo").toLowerCase() || (source.side === "expected" ? "liquido" : source.side === "bank" ? "deposito" : "repasse");
        if (!order && !batch) throw Error("pedido ou lote ausente.");
        if (date && !validDate(date)) throw Error("data inválida. Use AAAA-MM-DD.");
        const validType = source.side === "expected" ? type !== "repasse" && type !== "deposito" :
          source.side === "received" ? type === "repasse" : type === "deposito";
        if (!types.includes(type) || !validType)
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
    function markConflict(group,side){
      group.conflict=true; // flag agregado mantido para compatibilidade externa
      group.conflicts[side]=true;
    }
    const hasBankSource=sources.some(source=>source.side==="bank");
    for (const source of sources) {
      const identity=JSON.stringify([source.side,source.store,source.platform,source.hash]);
      if (source.hash && seenFiles.has(identity)) continue;
      seenFiles.add(identity);
      const fileEvents=new Set();
      for (const e of parseSource(source)) {
        const key=JSON.stringify([...e.scope,e.batch?"lote":"pedido",e.batch||e.order]);
        let group=groups.get(key);
        if (!group) {
          group={key,id:e.batch||e.order,kind:e.batch?"Lote":"Pedido",scope:e.scope,entries:[],conflict:false,conflicts:{expected:false,received:false,bank:false}};
          groups.set(key,group);
        }
        if (e.event) {
          const id=JSON.stringify([...e.scope,e.side,e.event]);
          const signature=JSON.stringify([key,e.order,e.date,e.type,String(e.value),String(e.fee)]);
          const first=byEvent.get(id);
          if (fileEvents.has(id)) markConflict(group,e.side);
          fileEvents.add(id);
          if (first && first.signature===signature && !group.conflict) continue;
          if (first) { markConflict(first.group,e.side); markConflict(group,e.side); }
          else byEvent.set(id,{group,signature});
        }
        group.entries.push(e);
      }
    }
    return [...groups.values()].filter(g=>g.entries.length).map(g=>{
      const a=g.entries.filter(e=>e.side==="expected"), b=g.entries.filter(e=>e.side==="received"), c=g.entries.filter(e=>e.side==="bank");
      const ambiguous = [a,b].some(part=>part.length>1 && part.some(e=>!e.event));
      const expected=a.reduce((n,e)=>n+e.value-e.fee,0n), received=b.reduce((n,e)=>n+e.value,0n);
      const bank=c.reduce((n,e)=>n+e.value,0n);
      const conflictingFees = a.some(e=>e.fee!==0n) && a.some(e=>e.type==="comissao");
      const mixed = a.some(e=>e.type==="liquido") && a.some(e=>e.type!=="liquido");
      const platformConflict=g.conflicts.expected||g.conflicts.received;
      const bankConflict=g.conflicts.received||g.conflicts.bank;
      const reason=platformConflict?"ID de evento repetido no arquivo ou com conteúdos diferentes":ambiguous?"Vários lançamentos sem ID individual":mixed?"Líquido e componentes no mesmo grupo":conflictingFees?"Comissão explícita e calculada no mesmo grupo":!a.length?"Sem previsão correspondente":!b.length?"Sem repasse correspondente":"";
      const difference=reason ? null : received-expected;
      const bankAmbiguous=c.length>1&&c.some(e=>!e.event);
      const declaredAmbiguous=b.length>1&&b.some(e=>!e.event);
      const bankReason=!hasBankSource?"":bankConflict?"Identificador de evento em conflito":
        bankAmbiguous?"Múltiplos depósitos sem identificadores individuais":
        declaredAmbiguous?"Múltiplos repasses sem identificadores individuais":
        !b.length?"Sem repasse declarado para comparar":
        !c.length?"Sem depósito associado no CSV bancário":"";
      const bankDifference=!hasBankSource||bankReason?null:bank-received;
      const bankStatus=!hasBankSource?"Não analisado":bankReason?"Pendente":bankDifference===0n?"Conferido":"Divergente";
      return {...g,expected:a.length?expected:null,received:b.length?received:null,difference,reason,
        bank:c.length?bank:null,bankDifference,bankReason,bankStatus,
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
  function bankTotals(groups) {
    let declared=0n,bank=0n,short=0n,extra=0n,unpaired=0,compared=0;
    for(const group of groups){
      if(group.bankDifference===null||group.bankDifference===undefined){unpaired++;continue;}
      compared++;
      declared+=group.received;
      bank+=group.bank;
      if(group.bankDifference<0n)short-=group.bankDifference;
      else extra+=group.bankDifference;
    }
    return {declared,bank,short,extra,unpaired,compared};
  }
  function cell(v) {
    let s=String(v ?? "");
    // Protege também caracteres de controle e prefixos invisíveis Unicode.
    const formula = /^[\x00-\x20\x7f\u00a0\u2000-\u200f\u2028\u2029\u2060\ufeff]*[=+@\-\uff1d\uff0b\uff0d\uff20\u2212]/u.test(s) ||
      /^[\t\r\n\0]/u.test(s);
    if (formula && !/^-?\d+(?:[,.]\d+)?$/.test(s)) s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }
  return {csv,suggest,fields,parseSource,reconcile,totals,bankTotals,cents,decimal,money,cell,validDate};
})();
if (typeof module !== "undefined") module.exports = Book;
