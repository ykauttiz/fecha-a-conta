"use strict";
const find = selector => document.querySelector(selector);
function show(rows) {
  const body = find("tbody");
  body.replaceChildren();
  for (const values of rows) {
    const row = body.insertRow();
    for (const value of values) row.insertCell().textContent = value;
  }
}
const currency = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function report(a,b) {
  const result = reconcile(a,b);
  const values = group => group.map(x=>currency.format(x/100)).join(" + ") || "—";
  show(result.map(r=>[r.id,r.status,values(r.expected),values(r.received),r.difference === null ? "—" : currency.format(r.difference/100)]));
  find("#message").textContent = result.length + " pedido(s) na conferência.";
}
find("#demo").onclick = () => report("pedido;previsto\n101;18,90\n102;24,00\n103;0", "pedido;recebido\n101;18,90\n102;23,80\n104;8,00\n104;8,00");
find("form").onsubmit = async event => {
  event.preventDefault();
  try {
    const [a,b] = await Promise.all(["#orders","#payments"].map(id=>find(id).files[0].text()));
    report(a,b);
  } catch (error) { show([]);find("#message").textContent = error.message; }
};
