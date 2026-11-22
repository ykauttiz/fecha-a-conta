"use strict";
/* Insights de sessão: derivação somente-leitura. Não interfere na conciliação. */
(function(root){
  const financialTypes = [
    ["comissao","Comissões"],
    ["tarifa","Tarifas"],
    ["desconto_loja","Cupons da loja"],
    ["estorno","Estornos"]
  ];
  function analyze(groups){
    const counts={conferido:0,divergente:0,pendente:0};
    const charges=Object.fromEntries(financialTypes.map(([key])=>[key,0n]));
    const dates=new Map();
    const reasons=new Map();
    for(const group of groups){
      if(group.status==="Conferido") counts.conferido++;
      else if(group.status==="Divergente") counts.divergente++;
      else {
        counts.pendente++;
        const reason=group.reason||"Sem justificativa disponível";
        reasons.set(reason,(reasons.get(reason)||0)+1);
      }
      for(const entry of group.entries){
        if(entry.date) dates.set(entry.date,(dates.get(entry.date)||0)+1);
        if(entry.side!=="expected") continue;
        if(Object.prototype.hasOwnProperty.call(charges,entry.type)){
          const amount=entry.value<0n?-entry.value:entry.value;
          charges[entry.type]+=amount;
        }
        if(entry.type==="venda"&&entry.fee){
          charges.comissao+=entry.fee<0n?-entry.fee:entry.fee;
        }
      }
    }
    return {counts,charges,dates:[...dates].sort(([a],[b])=>a.localeCompare(b)),reasons:[...reasons].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR")),count:groups.length};
  }
  function csvReport(data){
    const rows=[
      ["Seção","Indicador","Valor","Observação"],
      ["Situação","Grupos na seleção",data.count,"Filtros ativos na geração"],
      ["Situação","Conferidos",data.counts.conferido,"Diferença igual a zero"],
      ["Situação","Divergentes",data.counts.divergente,"Diferença exige investigação"],
      ["Situação","Sem comparação",data.counts.pendente,"Pendências ou informações ambíguas"]
    ];
    for(const [key,label] of financialTypes)rows.push(["Encargos",label,String(data.charges[key]),"Valor em centavos dos lançamentos tipificados"]);
    for(const [date,count] of data.dates)rows.push(["Eventos",date,count,"Quantidade de lançamentos, não depósitos"]);
    const cell=value=>{
      let text=String(value ?? "");
      if(/^[\s]*[=+@]/.test(text))text="'"+text;
      return '"'+text.replaceAll('"','""')+'"';
    };
    return "\uFEFF"+rows.map(row=>row.map(cell).join(";")).join("\r\n");
  }
  function node(tag,text,cls){
    const el=document.createElement(tag);
    if(text!==undefined&&text!==null) el.textContent=String(text);
    if(cls) el.className=cls;
    return el;
  }
  function render(groups){
    if(typeof document==="undefined")return;
    const cards=document.getElementById("insights-cards");
    const status=document.getElementById("insights-status");
    const events=document.getElementById("insights-events");
    const fees=document.getElementById("insights-fees");
    const reasonsBox=document.getElementById("insights-reasons");
    if(!cards||!status||!events||!fees)return;
    const data=analyze(groups);
    const rows=[
      ["Grupos na seleção",data.count,"Pedidos e lotes"],
      ["Conferidos",data.counts.conferido,"Diferença calculada igual a zero"],
      ["Com diferença",data.counts.divergente,"Exigem investigação"],
      ["Sem comparação",data.counts.pendente,"Dados ausentes ou ambíguos"]
    ];
    cards.replaceChildren(...rows.map(([label,value,desc],index)=>{
      const box=node("article",null,"insight-stat tone-"+index);
      box.append(node("span",label,"insight-stat-label"),node("strong",value,"insight-stat-value"),node("small",desc,"insight-stat-help"));
      return box;
    }));
    const classes=[["Conferidos","conferido","ok"],["Divergentes","divergente","alert"],["Pendentes","pendente","pending"]];
    status.replaceChildren();
    if(!data.count){
      status.append(node("p","Sem grupos neste filtro. Ajuste a seleção para visualizar a distribuição.","insight-empty"));
    }else{
      for(const [label,key,kind] of classes){
        const count=data.counts[key],percentage=100*count/data.count;
        const row=node("div",null,"insight-bar-row");
        const top=node("div",null,"insight-bar-label");
        top.append(node("span",label),node("strong",count+" · "+percentage.toFixed(0)+"%"));
        const track=node("div",null,"insight-bar-track");
        const fill=node("div",null,"insight-bar-fill "+kind);
        fill.style.width=percentage+"%";
        track.append(fill);row.append(top,track);status.append(row);
      }
    }
    status.setAttribute("aria-label","Distribuição de "+data.count+" grupos: "+classes.map(x=>x[0]+" "+data.counts[x[1]]).join(", "));
    events.replaceChildren();
    const last=data.dates.slice(-8);
    if(!last.length){
      events.append(node("p","Nenhuma data de evento informada nos registros selecionados.","insight-empty"));
    }else{
      const max=Math.max(...last.map(x=>x[1]),1);
      const plot=node("div",null,"insight-spark");
      for(const [date,count] of last){
        const col=node("div",null,"insight-spark-col");
        const bar=node("div",null,"insight-spark-bar");
        bar.style.height=Math.max(6,Math.round(count/max*100))+"%";
        bar.title=count+" lançamento(s) em "+date;
        bar.setAttribute("aria-label",count+" lançamentos em "+date);
        col.append(node("small",count,"insight-spark-num"),bar,node("small",date.slice(5),"insight-spark-date"));
        plot.append(col);
      }
      events.append(plot);
    }
    fees.replaceChildren();
    const hasCharges=financialTypes.some(([key])=>data.charges[key]!==0n);
    if(!hasCharges) fees.append(node("p","Nenhum encargo tipificado nos arquivos de previsão desta seleção.","insight-empty"));
    else for(const [key,label] of financialTypes){
      if(data.charges[key]===0n)continue;
      const item=node("div",null,"insight-charge");
      item.append(node("span",label),node("strong",typeof Book!=="undefined"?Book.money(data.charges[key]):String(data.charges[key])));
      fees.append(item);
    }
    if(reasonsBox){
      reasonsBox.replaceChildren();
      if(!data.reasons.length)reasonsBox.append(node("p","Nenhuma pendência nos grupos selecionados.","insight-empty"));
      else for(const [reason,count] of data.reasons.slice(0,5)){
        const item=node("div",null,"insight-charge");
        item.append(node("span",reason),node("strong",count));
        reasonsBox.append(item);
      }
    }
    const pendingButton=document.getElementById("insights-filter-pending");
    if(pendingButton){
      pendingButton.disabled=!data.counts.pendente;
      pendingButton.onclick=()=>{
        const select=document.getElementById("status");
        if(!select)return;
        select.value="Pendente";
        select.dispatchEvent(new Event("input",{bubbles:true}));
        document.getElementById("results")?.scrollIntoView({block:"start",behavior:"auto"});
      };
    }
    const context=document.getElementById("insights-context");
    if(context)context.textContent=data.count+" grupo(s) nos filtros atuais";
    const exportButton=document.getElementById("insights-export");
    if(exportButton){
      exportButton.disabled=!data.count;
      exportButton.onclick=()=>{
        const blob=new Blob([csvReport(data)],{type:"text/csv;charset=utf-8"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");
        a.href=url;a.download="resumo-fecha-a-conta.csv";a.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
    }
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={analyze,csvReport};
  if(root)root.FechaInsights={analyze,csvReport,render};
})(typeof window!=="undefined"?window:null);
