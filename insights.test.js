const test = require("node:test");
const assert = require("node:assert/strict");
const {analyze,csvReport} = require("./insights");
const entry=(type,value,date,side="expected",fee=0n)=>({type,value,date,side,fee});
test("insights contam grupos, datas e encargos presentes sem estimar repasses",()=>{
  const data=analyze([
    {status:"Conferido",entries:[entry("venda",10000n,"2026-11-01","expected",1200n),entry("repasse",8800n,"2026-11-02","received")]},
    {status:"Divergente",entries:[entry("comissao",-250n,"2026-11-02"),entry("desconto_loja",-300n,"2026-11-02")]},
    {status:"Pendente",entries:[entry("estorno",-99n,"2026-11-03"),entry("tarifa",-50n,"2026-11-03")]}
  ]);
  assert.deepEqual(data.counts,{conferido:1,divergente:1,pendente:1});
  assert.equal(data.count,3);
  assert.equal(data.charges.comissao,1450n);
  assert.equal(data.charges.desconto_loja,300n);
  assert.equal(data.charges.estorno,99n);
  assert.equal(data.charges.tarifa,50n);
  assert.deepEqual(data.dates,[["2026-11-01",1],["2026-11-02",3],["2026-11-03",2]]);
});
test("insights vazios ou sem data não fabricam valores",()=>{
  const empty=analyze([]);
  assert.equal(empty.count,0);
  assert.equal(empty.dates.length,0);
  assert.equal(empty.charges.comissao,0n);
  const noDate=analyze([{status:"Pendente",entries:[entry("repasse",1n,"","received")]}]);
  assert.equal(noDate.counts.pendente,1);
  assert.equal(noDate.dates.length,0);
  assert.equal(noDate.charges.comissao,0n);
});

test("relatório de insights é CSV consistente, com datas e valores em centavos",()=>{
  const data=analyze([{status:"Divergente",entries:[entry("comissao",-120n,"2026-11-01")]}]);
  const csv=csvReport(data);
  assert.match(csv,/Encargos";"Comissões";"120"/);
  assert.match(csv,/Eventos";"2026-11-01";"1"/);
  assert.match(csv,/Situação";"Divergentes";"1"/);
  assert.equal(csv.charCodeAt(0),0xFEFF);
});
