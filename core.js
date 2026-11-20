"use strict";
// CSV UTF-8 com ponto e vírgula. Aspas duplicadas representam uma aspa literal.
function rows(source) {
  const records = [];
  let row = [], field = "", quoted = false, closed = false;
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else { quoted = false; closed = true; }
    } else if (ch === ";" || ch === "\n") {
      row.push(field.trim()); field = ""; closed = false;
      if (ch === "\n") { records.push(row); row = []; }
    } else if (ch === '"' && !field && !closed) quoted = true;
    else if (closed || ch === '"') throw Error("Aspas inválidas no CSV.");
    else field += ch;
  }
  if (quoted) throw Error("Campo entre aspas incompleto.");
  row.push(field.trim()); records.push(row);
  return records.filter(record => record.length > 1 || record[0]);
}

function ledger(text, column) {
  const [header, ...data] = rows(text);
  if (header?.join(";") !== "pedido;" + column) throw Error("Use o cabeçalho pedido;" + column);
  const values = new Map();
  for (const [index, record] of data.entries()) {
    const [id, value] = record;
    if (record.length !== 2 || !id || !/^-?\d{1,10}([,.]\d{1,2})?$/.test(value))
      throw Error("Confira o registro " + (index + 2) + " em " + column);
    const [integer, frac = ""] = value.replace("-", "").split(/[,.]/);
    const cents = (Number(integer) * 100 + Number(frac.padEnd(2, "0"))) * (value.startsWith("-") ? -1 : 1);
    const group = values.get(id) || [];
    group.push(cents);
    values.set(id, group);
  }
  return values;
}

function reconcile(orders, payments) {
  const expected = ledger(orders, "previsto"), received = ledger(payments, "recebido");
  return [...new Set([...expected.keys(), ...received.keys()])].sort().map(id => {
    const a = expected.get(id) || [], b = received.get(id) || [];
    const difference = a.length === 1 && b.length === 1 ? b[0] - a[0] : null;
    const status = a.length > 1 || b.length > 1 ? "Revisar duplicidade" :
      !a.length ? "Sem pedido" : !b.length ? "Sem repasse" : difference ? "Divergente" : "Conferido";
    return {id, status, expected:a, received:b, difference};
  });
}
function summary(rows) {
  let matched = 0, short = 0n, extra = 0n;
  for (const {difference} of rows) {
    if (difference === null) continue;
    if (difference === 0) matched++;
    else if (difference < 0) short -= BigInt(difference);
    else extra += BigInt(difference);
  }
  const reais = cents => "R$ " + (cents / 100n).toLocaleString("pt-BR") + "," + String(cents % 100n).padStart(2,"0");
  return matched + " conferido(s) · " + (rows.length - matched) + " para revisar. Pares únicos: " +
    reais(short) + " a menos e " + reais(extra) + " a mais.";
}
if (typeof module !== "undefined") module.exports = {reconcile, summary};
