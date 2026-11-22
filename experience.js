"use strict";
/* Interface: atalhos, filtros rápidos e orientação contextual.
   Não modifica lançamentos nem o motor de conciliação. */
(() => {
  const byId=id=>document.getElementById(id);
  const dialog=byId("command-dialog"),search=byId("command-search"),
    results=byId("command-results"),launch=byId("command-open");
  const app=()=>window.FechaApp;
  const isReady=()=>!byId("workspace").hidden;
  const reduced=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go=(id)=>{
    const target=byId(id);
    if(!target)return;
    target.scrollIntoView({block:"start",behavior:reduced()?"auto":"smooth"});
  };
  const setTheme=theme=>{
    const selector=byId("appearance");
    selector.value=theme;
    selector.dispatchEvent(new Event("change",{bubbles:true}));
  };
  const changeStatus=status=>{
    if(!isReady())return;
    const select=byId("status");
    select.value=status;
    select.dispatchEvent(new Event("input",{bubbles:true}));
    go("results-section");
  };
  const actions=[
    {name:"Abrir exemplo fictício",description:"Experimentar o fechamento sem dados reais",
      keywords:"demo exemplo simular",run:()=>byId("demo").click()},
    {name:"Importar extratos",description:"Adicionar previsão, repasses ou depósitos CSV",
      keywords:"csv arquivo upload importar",run:()=>go("importar")},
    {name:"Visão geral",description:"Revisar métricas e situação da seleção",
      keywords:"dashboard números resumo métricas",requiresData:true,run:()=>go("summary-section")},
    {name:"Análise de lançamentos",description:"Visualizar gráficos e motivos das pendências",
      keywords:"insights gráficos eventos",requiresData:true,run:()=>go("insights")},
    {name:"Conciliação bancária",description:"Comparar repasse declarado e depósito no CSV",
      keywords:"banco depósito financeira",requiresBank:true,run:()=>go("bank-panel")},
    {name:"Filtrar divergentes",description:"Exibir somente pedidos e lotes com diferença",
      keywords:"diferença investigar pendência",requiresData:true,run:()=>changeStatus("Divergente")},
    {name:"Filtrar pendentes",description:"Exibir grupos que ainda não podem ser comparados",
      keywords:"inconclusivo",requiresData:true,run:()=>changeStatus("Pendente")},
    {name:"Ver todos os grupos",description:"Limpar apenas o filtro de situação",
      keywords:"todos resultados",requiresData:true,run:()=>changeStatus("")},
    {name:"Baixar evidências CSV",description:"Exportar os registros da seleção atual",
      keywords:"relatório exportação",requiresData:true,run:()=>byId("export").click()},
    {name:"Baixar backup JSON",description:"Guardar a sessão no dispositivo",
      keywords:"salvar cópia segurança",requiresData:true,run:()=>byId("save").click()},
    {name:"Ativar tema escuro",description:"Selecionar a aparência noturna",
      keywords:"dark noite",run:()=>setTheme("dark")},
    {name:"Ativar tema claro",description:"Selecionar a aparência clara",
      keywords:"light dia",run:()=>setTheme("light")},
    {name:"Aparência do sistema",description:"Usar a preferência do dispositivo",
      keywords:"auto automático",run:()=>setTheme("system")}
  ];
  const normalized=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function find(query){
    const needle=normalized(query).trim();
    const available=action=>!action.requiresData||isReady();
    const bankAvailable=action=>!action.requiresBank||isReady()&&!!document.querySelector('#files strong')&&
      Array.from(document.querySelectorAll("#files p")).some(p=>p.textContent.includes("depósito informado"));
    const list=actions.filter(action=>{
      const haystack=normalized([action.name,action.description,action.keywords].join(" "));
      return !needle||haystack.includes(needle);
    }).map(action=>({...action,disabled:!available(action)||!bankAvailable(action),kind:"action"}));
    if(isReady()&&needle){
      const matches=app()?.searchGroups(needle)||[];
      for(const group of matches.slice(0,6)){
        list.push({kind:"group",name:"Abrir "+group.kind+" "+group.id,
          description:[...group.scope,group.status].filter(Boolean).join(" · "),
          disabled:false,run:()=>app()?.openGroup(group.key)});
      }
    }
    return list.slice(0,18);
  }
  function makeResult(item){
    const button=document.createElement("button");
    button.type="button";
    button.className="command-result";
    button.dataset.kind=item.kind;
    button.disabled=item.disabled;
    const label=document.createElement("span");label.className="command-result-copy";
    const title=document.createElement("strong");title.textContent=item.name;
    const caption=document.createElement("small");caption.textContent=item.disabled ?
      "Disponível após importar ou abrir o exemplo" : item.description;
    label.append(title,caption);
    const symbol=document.createElement("span");
    symbol.className="command-result-arrow";
    symbol.setAttribute("aria-hidden","true");
    symbol.textContent=item.disabled?"—":"↗";
    button.append(label,symbol);
    button.addEventListener("click",()=>{dialog.close();item.run();});
    return button;
  }
  function paint(){
    const items=find(search.value);
    results.replaceChildren();
    for(const item of items)results.append(makeResult(item));
    if(!items.length){
      const empty=document.createElement("p");
      empty.className="command-no-results";
      empty.textContent="Nenhum resultado. Tente um pedido, lote ou outra ação.";
      results.append(empty);
    }
    byId("command-counter").textContent=items.filter(x=>!x.disabled).length+" opção(ões) disponíveis";
  }
  function open(){
    if(dialog.open)return;
    search.value="";
    paint();
    dialog.showModal();
    search.focus();
  }
  launch.addEventListener("click",open);
  byId("command-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  search.addEventListener("input",paint);
  search.addEventListener("keydown",event=>{
    if(event.key==="ArrowDown"){
      const first=results.querySelector("button:not(:disabled)");
      if(first){event.preventDefault();first.focus();}
    }else if(event.key==="Enter"){
      const first=results.querySelector("button:not(:disabled)");
      if(first){event.preventDefault();first.click();}
    }
  });
  results.addEventListener("keydown",event=>{
    if(event.key!=="ArrowDown"&&event.key!=="ArrowUp")return;
    const buttons=[...results.querySelectorAll("button:not(:disabled)")];
    const current=buttons.indexOf(document.activeElement);
    if(current===-1)return;
    event.preventDefault();
    const next=(current+(event.key==="ArrowDown"?1:buttons.length-1))%buttons.length;
    buttons[next].focus();
  });
  const editing=el=>!!el&&(el.matches?.("input,textarea,select,[contenteditable=true]")||
    !!el.closest?.("[contenteditable=true]"));
  document.addEventListener("keydown",event=>{
    const key=event.key.toLowerCase();
    if((event.ctrlKey||event.metaKey)&&key==="k"){
      event.preventDefault();open();return;
    }
    if(key==="/"&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!editing(document.activeElement)&&!dialog.open){
      event.preventDefault();open();
    }
  });
  const quick=[...document.querySelectorAll("[data-quick-status]")];
  const syncQuick=()=>{
    const status=byId("status").value;
    for(const button of quick){
      const selected=button.dataset.quickStatus===status;
      button.setAttribute("aria-pressed",String(selected));
    }
  };
  for(const button of quick){
    button.addEventListener("click",()=>changeStatus(button.dataset.quickStatus));
  }
  byId("status").addEventListener("input",syncQuick);
  function paintAttention(){
    if(!isReady())return;
    const list=app()?.getFilteredGroups()||[];
    const different=list.filter(g=>g.status==="Divergente");
    const pending=list.filter(g=>g.status==="Pendente");
    const heading=byId("attention-title"),copy=byId("attention-desc"),
      button=byId("attention-action"),panel=byId("attention-panel");
    const priority=different.sort((a,b)=>{
      const abs=g=>g.difference===null?0n:(g.difference<0n?-g.difference:g.difference);
      const left=abs(a),right=abs(b);
      return left===right?0:left>right?-1:1;
    })[0];
    const total=list.length;
    panel.dataset.state=priority?"divergent":pending.length?"pending":"clear";
    if(priority){
      heading.textContent=different.length+" divergência(s) na seleção";
      copy.textContent="Prioridade: "+priority.kind.toLowerCase()+" "+priority.id+" com diferença de "+
        Book.money(priority.difference<0n?-priority.difference:priority.difference)+
        ". Revise as evidências antes de tirar conclusões.";
      button.hidden=false;
      button.textContent="Investigar "+priority.kind.toLowerCase()+" "+priority.id;
      button.onclick=()=>app()?.openGroup(priority.key);
    }else if(pending.length){
      heading.textContent=pending.length+" grupo(s) aguardando dados";
      copy.textContent="Não há diferenças calculadas nesta seleção, mas existem registros sem comparação conclusiva.";
      button.hidden=false;button.textContent="Examinar pendências";
      button.onclick=()=>changeStatus("Pendente");
    }else{
      heading.textContent=total?"Seleção conferida":"Nenhum grupo selecionado";
      copy.textContent=total?"Nenhuma divergência ou pendência nos grupos filtrados.":"Altere os filtros para consultar outros registros.";
      button.hidden=true;
    }
    syncQuick();
  }
  function syncNavigation(){
    const ready=isReady(),bank=ready&&!byId("bank-panel").hidden;
    for(const link of document.querySelectorAll(".project-nav a[href^='#']")){
      const target=link.getAttribute("href");
      const requiresData=!["#main","#importar"].includes(target);
      link.hidden=requiresData&&(!ready||(target==="#bank-panel"&&!bank));
    }
  }
  window.addEventListener("fecha:render",()=>{
    paintAttention();
    syncNavigation();
  });
  syncQuick();
  syncNavigation();
})();