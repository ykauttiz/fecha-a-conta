const test = require("node:test"), assert = require("node:assert/strict");
const {reconcile} = require("./core");
const run = (a,b) => reconcile("pedido;previsto\n"+a,"pedido;recebido\n"+b);
test("centavos, estorno e diferença negativa",()=>{
  assert.deepEqual(run("1;10,10\n2;-1,01","1;10,09\n2;-1,01").map(r=>r.difference),[-1,0]);
});
test("duplicatas e registros sem par ficam para revisão",()=>{
  assert.deepEqual(run("a;0\nb;1\nb;2","b;3\nc;0").map(r=>r.status),["Sem repasse","Revisar duplicidade","Sem pedido"]);
});
test("CSV com aspas e campos inválidos",()=>{
  assert.equal(run('"a;b";1','"a;b";1')[0].id,"a;b");
  for (const input of ["a;1,111",'a;"2',";1"]) assert.throws(()=>run(input,""));
});
test("resumo separa créditos e faltas sem somar duplicatas",()=>{
  const {summary} = require("./core");
  assert.equal(summary(run("a;5\nb;5\nc;2\nd;9","a;4\nb;6\nc;2\nd;2\nd;2")),
    "1 conferido(s) · 3 para revisar. Pares únicos: R$ 1,00 a menos e R$ 1,00 a mais.");
});
