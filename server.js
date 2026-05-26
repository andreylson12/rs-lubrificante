const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static("./"));

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
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

console.log("Banco conectado!");

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

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () => {

console.log(
"Servidor rodando!"
);

});