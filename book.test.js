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
