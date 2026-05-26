const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("./"));

if(!process.env.DATABASE_URL){
console.error("DATABASE_URL não encontrada");
process.exit(1);
}

const pool = new Pool({
connectionString:process.env.DATABASE_URL,
ssl:{ rejectUnauthorized:false }
});

function normalizarTexto(texto){
return String(texto || "")
.toLowerCase()
.trim()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"");
}

async function iniciarBanco(){

await pool.query(`
CREATE TABLE IF NOT EXISTS vendas (
id SERIAL PRIMARY KEY,
nome TEXT,
litros NUMERIC,
valor NUMERIC,
forma_pagamento TEXT,
data TEXT,
hora TEXT
);
`);

await pool.query(`
ALTER TABLE vendas
ADD COLUMN IF NOT EXISTS data TEXT;
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS clientes (
id SERIAL PRIMARY KEY,
nome TEXT,
telefone TEXT,
limite_valor NUMERIC,
devedor NUMERIC DEFAULT 0
);
`);

await pool.query(`
CREATE TABLE IF NOT EXISTS movimentacoes (
id SERIAL PRIMARY KEY,
tipo TEXT,
descricao TEXT,
litros NUMERIC DEFAULT 0,
valor NUMERIC DEFAULT 0,
data TEXT,
hora TEXT
);
`);

console.log("Banco conectado!");
}

iniciarBanco();

app.get("/api/vendas", async (req,res) => {
try{
const result = await pool.query("SELECT * FROM vendas ORDER BY id DESC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.post("/api/vendas", async (req,res) => {
try{
let { nome, litros, valor, formaPagamento, forma_pagamento, hora } = req.body;

nome = String(nome || "").trim();

const pagamentoRecebido = formaPagamento || forma_pagamento || "pix";
const pagamento = normalizarTexto(pagamentoRecebido);
const formaFinal = pagamento.includes("fiado") || pagamento.includes("prazo") ? "fiado" : "pix";

const data = new Date().toLocaleDateString("pt-BR");

if(!nome || nome.length < 2){
return res.status(400).json({ erro:"Nome inválido" });
}

if(formaFinal === "fiado"){
const clienteResult = await pool.query(
`SELECT * FROM clientes WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))`,
[nome]
);

if(clienteResult.rows.length === 0){
return res.status(400).json({ erro:"Cliente não cadastrado no fiado" });
}

const cliente = clienteResult.rows[0];
const novoDevedor = Number(cliente.devedor || 0) + Number(valor || 0);

if(novoDevedor > Number(cliente.limite_valor || 0)){
return res.status(400).json({ erro:"Limite do cliente excedido" });
}

await pool.query(
`UPDATE clientes SET devedor=$1 WHERE id=$2`,
[novoDevedor, cliente.id]
);
}

await pool.query(
`INSERT INTO vendas (nome,litros,valor,forma_pagamento,data,hora)
VALUES ($1,$2,$3,$4,$5,$6)`,
[nome, litros, valor, formaFinal, data, hora]
);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.delete("/api/vendas/:id", async (req,res) => {
try{
const vendaResult = await pool.query(`SELECT * FROM vendas WHERE id=$1`, [req.params.id]);

if(vendaResult.rows.length === 0){
return res.status(404).json({ erro:"Venda não encontrada" });
}

const venda = vendaResult.rows[0];

if(venda.forma_pagamento === "fiado"){
const clienteResult = await pool.query(
`SELECT * FROM clientes WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))`,
[venda.nome]
);

if(clienteResult.rows.length > 0){
const cliente = clienteResult.rows[0];
let novoDevedor = Number(cliente.devedor || 0) - Number(venda.valor || 0);

if(novoDevedor < 0){
novoDevedor = 0;
}

await pool.query(
`UPDATE clientes SET devedor=$1 WHERE id=$2`,
[novoDevedor, cliente.id]
);
}
}

await pool.query(`DELETE FROM vendas WHERE id=$1`, [req.params.id]);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.get("/api/clientes", async (req,res) => {
try{
const result = await pool.query("SELECT * FROM clientes ORDER BY nome ASC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.post("/api/clientes", async (req,res) => {
try{
const { nome, telefone, limite, devedor } = req.body;

const nomeFormatado = String(nome || "").trim();

if(!nomeFormatado || nomeFormatado.length < 2){
return res.status(400).json({ erro:"Nome inválido" });
}

const clienteExistente = await pool.query(
`SELECT * FROM clientes WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))`,
[nomeFormatado]
);

if(clienteExistente.rows.length > 0){
return res.status(400).json({ erro:"Cliente já cadastrado" });
}

await pool.query(
`INSERT INTO clientes (nome,telefone,limite_valor,devedor)
VALUES ($1,$2,$3,$4)`,
[nomeFormatado, telefone || "", Number(limite || 0), Number(devedor || 0)]
);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.put("/api/clientes/:id/receber", async (req,res) => {
try{
await pool.query(`UPDATE clientes SET devedor=0 WHERE id=$1`, [req.params.id]);
res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.delete("/api/clientes/:id", async (req,res) => {
try{
const clienteResult = await pool.query(`SELECT * FROM clientes WHERE id=$1`, [req.params.id]);

if(clienteResult.rows.length === 0){
return res.status(404).json({ erro:"Cliente não encontrado" });
}

const cliente = clienteResult.rows[0];

if(Number(cliente.devedor || 0) > 0){
return res.status(400).json({ erro:"Cliente possui dívida. Receba primeiro antes de excluir." });
}

await pool.query(`DELETE FROM clientes WHERE id=$1`, [req.params.id]);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.get("/api/movimentacoes", async (req,res) => {
try{
const result = await pool.query("SELECT * FROM movimentacoes ORDER BY id DESC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.post("/api/movimentacoes", async (req,res) => {
try{
const { tipo, descricao, litros, valor } = req.body;

const data = new Date().toLocaleDateString("pt-BR");
const hora = new Date().toLocaleTimeString("pt-BR",{
hour:"2-digit",
minute:"2-digit"
});

await pool.query(
`INSERT INTO movimentacoes (tipo,descricao,litros,valor,data,hora)
VALUES ($1,$2,$3,$4,$5,$6)`,
[tipo, descricao, Number(litros || 0), Number(valor || 0), data, hora]
);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.delete("/api/movimentacoes/:id", async (req,res) => {
try{
await pool.query(`DELETE FROM movimentacoes WHERE id=$1`, [req.params.id]);
res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Servidor rodando!");
});
