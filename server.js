const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static("./"));

if(!process.env.DATABASE_URL){

console.error(
"DATABASE_URL não encontrada"
);

process.exit(1);

}

const pool = new Pool({

connectionString:
process.env.DATABASE_URL,

ssl:{
rejectUnauthorized:false
}

});

async function iniciarBanco(){

await pool.query(`

CREATE TABLE IF NOT EXISTS vendas (

id SERIAL PRIMARY KEY,
nome TEXT,
litros NUMERIC,
valor NUMERIC,
forma_pagamento TEXT,
hora TEXT

);

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

console.log(
"Banco conectado!"
);

}

iniciarBanco();

app.get("/api/vendas", async (req,res) => {

try{

const result =
await pool.query(
"SELECT * FROM vendas ORDER BY id DESC"
);

res.json(result.rows);

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

app.post("/api/vendas", async (req,res) => {

try{

const {
nome,
litros,
valor,
formaPagamento,
hora
} = req.body;

if(
formaPagamento === "fiado"
){

const clienteResult =
await pool.query(

`
SELECT * FROM clientes
WHERE LOWER(nome)=LOWER($1)
`,

[nome]

);

if(
clienteResult.rows.length === 0
){

return res.status(400).json({
erro:"Cliente não cadastrado"
});

}

const cliente =
clienteResult.rows[0];

const novoDevedor =
Number(cliente.devedor)
+ Number(valor);

if(
novoDevedor >
Number(cliente.limite_valor)
){

return res.status(400).json({
erro:"Limite excedido"
});

}

await pool.query(

`
UPDATE clientes
SET devedor=$1
WHERE id=$2
`,

[
novoDevedor,
cliente.id
]

);

}

await pool.query(

`
INSERT INTO vendas
(nome,litros,valor,forma_pagamento,hora)

VALUES
($1,$2,$3,$4,$5)
`,

[
nome,
litros,
valor,
formaPagamento,
hora
]

);

res.json({
sucesso:true
});

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

app.get("/api/clientes", async (req,res) => {

try{

const result =
await pool.query(
"SELECT * FROM clientes ORDER BY id DESC"
);

res.json(result.rows);

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

app.post("/api/clientes", async (req,res) => {

try{

const {
nome,
telefone,
limite,
devedor
} = req.body;

await pool.query(

`
INSERT INTO clientes
(nome,telefone,limite_valor,devedor)

VALUES
($1,$2,$3,$4)
`,

[
nome,
telefone,
limite,
devedor
]

);

res.json({
sucesso:true
});

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

app.put(
"/api/clientes/:id/receber",
async (req,res) => {

try{

const id =
req.params.id;

await pool.query(

`
UPDATE clientes
SET devedor=0
WHERE id=$1
`,

[id]

);

res.json({
sucesso:true
});

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

app.delete(
"/api/vendas/:id",
async (req,res) => {

try{

const id =
req.params.id;

const vendaResult =
await pool.query(

`
SELECT * FROM vendas
WHERE id=$1
`,

[id]

);

if(
vendaResult.rows.length === 0
){

return res.status(404).json({
erro:"Venda não encontrada"
});

}

const venda =
vendaResult.rows[0];

if(
venda.forma_pagamento === "fiado"
){

const clienteResult =
await pool.query(

`
SELECT * FROM clientes
WHERE LOWER(nome)=LOWER($1)
`,

[venda.nome]

);

if(
clienteResult.rows.length > 0
){

const cliente =
clienteResult.rows[0];

let novoDevedor =
Number(cliente.devedor)
- Number(venda.valor);

if(novoDevedor < 0){
novoDevedor = 0;
}

await pool.query(

`
UPDATE clientes
SET devedor=$1
WHERE id=$2
`,

[
novoDevedor,
cliente.id
]

);

}

}

await pool.query(

`
DELETE FROM vendas
WHERE id=$1
`,

[id]

);

res.json({
sucesso:true
});

}catch(error){

res.status(500).json({
erro:error.message
});

}

});

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

console.log(
"Servidor rodando!"
);

});
