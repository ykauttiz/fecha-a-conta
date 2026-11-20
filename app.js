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
let result = [], page = 1, request = 0;
function render() {
  const view = pageOf(result, find("#query").value, find("#pending").checked, page);
  page = view.current;
  find("#pager").hidden = view.pages <= 1;
  find("#page").textContent = page + " / " + view.pages;
  find("#prev").disabled = page === 1;
  find("#next").disabled = page === view.pages;
  const values = group => group.map(x=>currency.format(x/100)).join(" + ") || "—";
  show(view.rows.map(r=>[r.id,r.status,values(r.expected),values(r.received),r.difference === null ? "—" : currency.format(r.difference/100)]));
  find("#message").textContent = view.count + " na seleção. " + summary(result);
}
function report(a,b) {
  result = reconcile(a,b);
  page = 1;
  render();
}
function resetPage() { page = 1; render(); }
find("#pending").onchange = resetPage;
find("#query").oninput = resetPage;
find("#prev").onclick = () => { page--; render(); };
find("#next").onclick = () => { page++; render(); };
find("#demo").onclick = () => { request++; report("pedido;previsto\n101;18,90\n102;24,00\n103;0", "pedido;recebido\n101;18,90\n102;23,80\n104;8,00\n104;8,00"); };
find("form").onsubmit = async event => {
  event.preventDefault();
  const id = ++request;
  try {
    const [a,b] = await Promise.all(["#orders","#payments"].map(id=>find(id).files[0].text()));
    if (id === request) report(a,b);
  } catch (error) { if (id !== request) return; result = []; render();find("#message").textContent = error.message; }
};
