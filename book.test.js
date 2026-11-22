const test=require("node:test"),a=require("node:assert/strict"),B=require("./book");
const src=(side,text,over={})=>({side,text,name:side+".csv",rate:"0",store:"loja",platform:"app",...over});
function pair(orders,payments,opts) {
  return B.reconcile([src("expected",orders,opts),src("received",payments)]);
}
test("um lote, duas vendas, estorno e dois depósitos no mês seguinte",()=>{
  const [g]=pair("pedido;lote;evento;data;tipo;valor\n001;A;v1;2026-10-31;venda;40\n002;A;v2;2026-10-31;venda;10\n002;A;e1;2026-10-31;estorno;2",
    "lote;evento;data;valor\nA;p1;2026-11-01;18\nA;p2;2026-11-02;30");
  a.equal(g.status,"Conferido");a.equal(g.expected,4800n);a.equal(g.entries.length,5);a.equal(g.entries[0].order,"001");
});
test("centavos exatos, moeda negativa e arredondamento por venda",()=>{
  a.equal(B.money(B.cents("-999999999999999999,99")),"R$ -999.999.999.999.999.999,99");
  const [g]=pair("pedido;tipo;valor\na;venda;0,05","pedido;recebido\na;0,04",{rate:"10"});
  a.equal(g.difference,0n);a.equal(g.entries[0].fee,1n);
});
test("BOM, vírgula, aspas duplas, linhas físicas e cabeçalhos sem ambiguidade",()=>{
  const {records}=B.csv('\uFEFFpedido,valor\r\n"a""b\nc","1,20"\r\ny,3');
  a.equal(records[0].values[0],'a"b\nc');a.equal(records[1].line,4);
  for(const csv of ["a;a\n1;2",'a;b\n"ab;2',"a;b\n1","a;b"])a.throws(()=>B.csv(csv));
});
test("legado preserva zeros, negativos, zero e ausência de par",()=>{
  const rows=pair("pedido;previsto\n001;-2,15\n002;0\n003;1\n003;2","pedido;recebido\n001;-2,16\n003;3\n004;0");
  a.equal(rows.find(g=>g.id==="001").difference,-1n);a.equal(B.totals(rows).unpaired,3);
  a.equal(B.totals(rows).short,1n);a.equal(rows.find(g=>g.id==="004").expected,null);
});
test("arquivo repetido, evento reexportado e conflito posterior",()=>{
  const a1=src("expected","pedido;evento;valor\n001;a;10",{hash:"one"});
  const b=src("received","pedido;evento;valor\n001;b;10");
  const repeated=src("expected","pedido;evento;valor\n001;a;10",{hash:"two"});
  a.equal(B.reconcile([a1,a1,b,repeated])[0].entries.length,2);
  const changed=src("expected","pedido;evento;valor\n002;a;20");
  a.ok(B.reconcile([a1,b,changed]).every(r=>r.difference===null));
});
test("loja, canal, lote e pedido de mesmo nome ficam separados",()=>{
  const same="pedido;valor\nA;3";
  a.equal(B.reconcile([src("expected",same),src("received",same,{store:"outra"}),src("expected","lote;valor\nA;3")]).length,3);
});
test("taxas, desconto, subsídio, ajuste e comissão em duplicidade",()=>{
  const t="pedido;evento;tipo;valor\na;1;venda;50\na;2;tarifa;2\na;3;desconto_loja;5\na;4;subsidio;3\na;5;ajuste;-0,25";
  a.equal(pair(t,"pedido;recebido\na;45,75")[0].difference,0n);
  a.equal(pair(t+"\na;6;comissao;5","pedido;recebido\na;0",{rate:"10"})[0].difference,null);
});
test("mapeamento, data inválida e precisão excessiva",()=>{
  const s=src("expected","codigo;montante\n00;1,20");
  s.map={...B.suggest(["codigo","montante"],"expected"),pedido:0,valor:1};
  a.equal(B.parseSource(s)[0].value,120n);s.map.valor=0;a.throws(()=>B.parseSource(s));
  for(const val of ["1.000,00","1,111","1e3",""])a.throws(()=>B.cents(val));
  a.throws(()=>B.parseSource(src("expected","pedido;valor;data\na;1;2026-02-29")),/linha 2/);
});
test("CSV de evidência preserva aspas e neutraliza fórmulas",()=>{
  a.equal(B.cell('=1+1'),'"\'=1+1"');a.equal(B.cell('-0,01'),'"-0,01"');
  a.equal(B.cell('\tSOMA(A1:A2)'),'"\'\tSOMA(A1:A2)"');
  a.equal(B.cell('＝1+1'),'"\'＝1+1"');
  a.equal(B.cell('a"b'),'"a""b"');
});
test("10 mil pedidos e pagamentos não perdem centavos",()=>{
  const lines=Array.from({length:10000},(_,i)=>String(i).padStart(6,"0")+";0,01").join("\n");
  a.equal(B.totals(pair("pedido;previsto\n"+lines,"pedido;recebido\n"+lines)).received,10000n);
});

test("ID repetido dentro do mesmo extrato exige revisão sem perder linhas",()=>{
  const [g]=pair("pedido;evento;valor\na;1;2\na;1;2","pedido;recebido\na;2");
  a.equal(g.difference,null);a.equal(g.entries.length,3);
});

test("sugestões conservadoras reconhecem cabeçalhos genéricos sem presumir layouts oficiais",()=>{
  const headers=["Número do pedido","Valor líquido","Data do evento","Identificador de evento","Marketplace"];
  const map=B.suggest(headers,"expected");
  a.deepEqual([map.pedido,map.valor,map.data,map.evento,map.plataforma],[0,1,2,3,4]);
  const input=src("expected","Número do pedido;Valor líquido;Data do evento\n0007;12,34;2026-11-20");
  a.equal(B.parseSource(input)[0].value,1234n);
  a.equal(B.parseSource(input)[0].order,"0007");
  const ambiguous=B.suggest(["pedido_id","order_id","valor"],"expected");
  a.equal(ambiguous.pedido,-1);
  a.equal(ambiguous.valor,2);
  a.equal(B.suggest(["pedido","pedido_id","valor"],"expected").pedido,0);
});


test("conciliação em três níveis preserva diferença do marketplace e revela diferença bancária independente",()=>{
  const a1=src("expected","lote;evento;valor\nL01;v1;50");
  const b1=src("received","lote;evento;valor\nL01;r1;20\nL01;r2;30");
  const c1=src("bank","lote;evento;valor\nL01;b1;20\nL01;b2;29,50");
  const [g]=B.reconcile([a1,b1,c1]);
  a.equal(g.expected,5000n);
  a.equal(g.received,5000n);
  a.equal(g.difference,0n);
  a.equal(g.status,"Conferido");
  a.equal(g.bank,4950n);
  a.equal(g.bankDifference,-50n);
  a.equal(g.bankStatus,"Divergente");
  a.deepEqual(B.bankTotals([g]),{declared:5000n,bank:4950n,short:50n,extra:0n,unpaired:0,compared:1});
});

test("sem extrato bancário, não se deve afirmar que um depósito foi confirmado",()=>{
  const [g]=pair("pedido;valor\n001;10","pedido;valor\n001;10");
  a.equal(g.bank,null);
  a.equal(g.bankDifference,null);
  a.equal(g.bankStatus,"Não analisado");
});

test("depósitos sem vínculo e múltiplas linhas bancárias sem evento permanecem inconclusivos",()=>{
  const [withoutBank]=B.reconcile([
    src("expected","pedido;valor\na;10"),
    src("received","pedido;valor\na;10"),
    src("bank","pedido;valor\noutra;10")
  ]).filter(g=>g.id==="a");
  a.equal(withoutBank.bankStatus,"Pendente");
  a.equal(withoutBank.bankDifference,null);
  const [ambiguous]=B.reconcile([
    src("expected","pedido;valor\na;10"),
    src("received","pedido;valor\na;10"),
    src("bank","pedido;valor\na;6\na;4")
  ]);
  a.equal(ambiguous.status,"Conferido");
  a.equal(ambiguous.bankStatus,"Pendente");
  a.match(ambiguous.bankReason,/identificadores/);
  a.equal(B.bankTotals([ambiguous]).compared,0);
});

test("tipos de depósito não se misturam às taxas nem ao repasse declarado",()=>{
  const bank=src("bank","lote;depositado\nB;11,20");
  a.equal(B.parseSource(bank)[0].type,"deposito");
  a.equal(B.parseSource(bank)[0].value,1120n);
  a.throws(()=>B.parseSource(src("bank","pedido;tipo;valor\na;repasse;2")),/tipo incompatível/);
  a.throws(()=>B.parseSource(src("received","pedido;tipo;valor\na;deposito;2")),/tipo incompatível/);
  a.throws(()=>B.parseSource(src("other","pedido;valor\na;2")),/Origem financeira desconhecida/);
});


test("conflito somente bancário não invalida a comparação da plataforma",()=>{
  const [g]=B.reconcile([
    src("expected","pedido;evento;valor\n001;a;10"),
    src("received","pedido;evento;valor\n001;r;10"),
    src("bank","pedido;evento;valor\n001;b;9\n001;b;9")
  ]);
  a.equal(g.status,"Conferido");
  a.equal(g.difference,0n);
  a.equal(g.bankStatus,"Pendente");
  a.equal(g.bankDifference,null);
  a.equal(g.conflicts.bank,true);
  a.equal(g.conflicts.received,false);
});
test("conflito da previsão não apaga a conferência independente entre plataforma e banco",()=>{
  const [g]=B.reconcile([
    src("expected","pedido;evento;valor\n001;a;10\n001;a;10"),
    src("received","pedido;evento;valor\n001;r;10"),
    src("bank","pedido;evento;valor\n001;b;9,50")
  ]);
  a.equal(g.status,"Pendente");
  a.equal(g.difference,null);
  a.equal(g.bankStatus,"Divergente");
  a.equal(g.bankDifference,-50n);
});
test("conflito do repasse declarado bloqueia as duas comparações",()=>{
  const [g]=B.reconcile([
    src("expected","pedido;evento;valor\n001;a;10"),
    src("received","pedido;evento;valor\n001;r;10\n001;r;10"),
    src("bank","pedido;evento;valor\n001;b;10")
  ]);
  a.equal(g.status,"Pendente");a.equal(g.difference,null);
  a.equal(g.bankStatus,"Pendente");a.equal(g.bankDifference,null);
});
test("cabeçalhos normalizados duplicados obrigam o mapeamento manual",()=>{
  const map=B.suggest(["Pedido","pedido","Valor"],"expected");
  a.equal(map.pedido,-1);a.equal(map.valor,2);
  a.throws(()=>B.parseSource(src("expected","Pedido;pedido;Valor\n1;2;3")),/Mapeie valor e pedido ou lote/);
});
test("exportação CSV protege prefixos invisíveis e valores Unicode sem corromper números",()=>{
  for(const input of ["\u200b=1+1","\ufeff+1","\u2060@SUM(A1)","-cmd","\r=1+1","\u2212SUM(A1)"])
    a.ok(B.cell(input).startsWith('"\''),input);
  a.equal(B.cell("-10,25"),'"-10,25"');
  a.equal(B.cell("-10.25"),'"-10.25"');
});
