const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

console.log("===== SERVER RS LUBRIFICANTE INICIADO =====");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("./"));

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: { rejectUnauthorized: false }
});

function verificarToken(req,res,next){
const auth = req.headers.authorization;

if(!auth){
return res.status(401).json({ erro:"Token não enviado" });
}

const token = auth.split(" ")[1];

try{
jwt.verify(token, process.env.JWT_SECRET);
next();
}catch{
return res.status(401).json({ erro:"Token inválido" });
}
}

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

app.post("/api/login",(req,res) => {

const { usuario, senha } = req.body;

if(
usuario !== process.env.ADMIN_USER ||
senha !== process.env.ADMIN_PASSWORD
){
return res.status(401).json({ erro:"Usuário ou senha inválidos" });
}

const token = jwt.sign(
{ usuario },
process.env.JWT_SECRET,
{ expiresIn:"7d" }
);

res.json({ token });

});

app.get("/api/vendas", verificarToken, async (req,res) => {

try{
const result = await pool.query("SELECT * FROM vendas ORDER BY id DESC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.post("/api/vendas", async (req,res) => {

try{

let {
nome,
litros,
valor,
formaPagamento,
forma_pagamento,
hora
} = req.body;

nome = String(nome || "").trim();

const pagamentoRecebido = formaPagamento || forma_pagamento || "pix";
const pagamento = normalizarTexto(pagamentoRecebido);

let formaFinal = "pix";

if(pagamento.includes("fiado") || pagamento.includes("prazo")){
formaFinal = "fiado";
}

if(pagamento.includes("dinheiro")){
formaFinal = "dinheiro";
}

if(pagamento.includes("cartao") || pagamento.includes("cartão")){
formaFinal = "cartao";
}

const data = new Date().toLocaleDateString("pt-BR");

if(!nome || nome.length < 2){
return res.status(400).json({ erro:"Nome inválido" });
}

if(formaFinal === "fiado"){

const clienteResult = await pool.query(
`
SELECT * FROM clientes
WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))
`,
[nome]
);

if(clienteResult.rows.length === 0){
return res.status(400).json({ erro:"Cliente não cadastrado no fiado" });
}

const cliente = clienteResult.rows[0];

const novoDevedor =
Number(cliente.devedor || 0) + Number(valor || 0);

if(novoDevedor > Number(cliente.limite_valor || 0)){
return res.status(400).json({ erro:"Limite do cliente excedido" });
}

await pool.query(
`
UPDATE clientes
SET devedor=$1
WHERE id=$2
`,
[novoDevedor, cliente.id]
);

}

await pool.query(
`
INSERT INTO vendas
(nome,litros,valor,forma_pagamento,data,hora)
VALUES
($1,$2,$3,$4,$5,$6)
`,
[nome, litros, valor, formaFinal, data, hora]
);

res.json({ sucesso:true });

}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.delete("/api/vendas/:id", verificarToken, async (req,res) => {

try{

const vendaResult = await pool.query(
"SELECT * FROM vendas WHERE id=$1",
[req.params.id]
);

if(vendaResult.rows.length === 0){
return res.status(404).json({ erro:"Venda não encontrada" });
}

const venda = vendaResult.rows[0];

if(venda.forma_pagamento === "fiado"){

const clienteResult = await pool.query(
`
SELECT * FROM clientes
WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))
`,
[venda.nome]
);

if(clienteResult.rows.length > 0){

const cliente = clienteResult.rows[0];

let novoDevedor =
Number(cliente.devedor || 0) - Number(venda.valor || 0);

if(novoDevedor < 0){
novoDevedor = 0;
}

await pool.query(
"UPDATE clientes SET devedor=$1 WHERE id=$2",
[novoDevedor, cliente.id]
);

}

}

await pool.query(
"DELETE FROM vendas WHERE id=$1",
[req.params.id]
);

res.json({ sucesso:true });

}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.get("/api/clientes", verificarToken, async (req,res) => {

try{
const result = await pool.query("SELECT * FROM clientes ORDER BY nome ASC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.post("/api/clientes", verificarToken, async (req,res) => {

try{

const { nome, telefone, limite, devedor } = req.body;

const nomeFormatado = String(nome || "").trim();

if(!nomeFormatado || nomeFormatado.length < 2){
return res.status(400).json({ erro:"Nome inválido" });
}

const clienteExistente = await pool.query(
`
SELECT * FROM clientes
WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))
`,
[nomeFormatado]
);

if(clienteExistente.rows.length > 0){
return res.status(400).json({ erro:"Cliente já cadastrado" });
}

await pool.query(
`
INSERT INTO clientes
(nome,telefone,limite_valor,devedor)
VALUES
($1,$2,$3,$4)
`,
[
nomeFormatado,
telefone || "",
Number(limite || 0),
Number(devedor || 0)
]
);

res.json({ sucesso:true });

}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.put("/api/clientes/:id/receber", verificarToken, async (req,res) => {

try{
await pool.query(
"UPDATE clientes SET devedor=0 WHERE id=$1",
[req.params.id]
);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.delete("/api/clientes/:id", verificarToken, async (req,res) => {

try{

const clienteResult = await pool.query(
"SELECT * FROM clientes WHERE id=$1",
[req.params.id]
);

if(clienteResult.rows.length === 0){
return res.status(404).json({ erro:"Cliente não encontrado" });
}

const cliente = clienteResult.rows[0];

if(Number(cliente.devedor || 0) > 0){
return res.status(400).json({
erro:"Cliente possui dívida. Receba primeiro antes de excluir."
});
}

await pool.query(
"DELETE FROM clientes WHERE id=$1",
[req.params.id]
);

res.json({ sucesso:true });

}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.get("/api/movimentacoes", verificarToken, async (req,res) => {

try{
const result = await pool.query("SELECT * FROM movimentacoes ORDER BY id DESC");
res.json(result.rows);
}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.post("/api/movimentacoes", verificarToken, async (req,res) => {

try{

const { tipo, descricao, litros, valor } = req.body;

const data = new Date().toLocaleDateString("pt-BR");

const hora = new Date().toLocaleTimeString("pt-BR",{
hour:"2-digit",
minute:"2-digit"
});

await pool.query(
`
INSERT INTO movimentacoes
(tipo,descricao,litros,valor,data,hora)
VALUES
($1,$2,$3,$4,$5,$6)
`,
[
tipo,
descricao,
Number(litros || 0),
Number(valor || 0),
data,
hora
]
);

res.json({ sucesso:true });

}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.delete("/api/movimentacoes/:id", verificarToken, async (req,res) => {

try{
await pool.query(
"DELETE FROM movimentacoes WHERE id=$1",
[req.params.id]
);

res.json({ sucesso:true });
}catch(error){
res.status(500).json({ erro:error.message });
}

});

app.post("/api/criar-pix", async (req,res) => {
try{

const { nome, litros, valor } = req.body;

if(!process.env.MERCADO_PAGO_ACCESS_TOKEN){
return res.status(500).json({ erro:"Token Mercado Pago não configurado" });
}

if(!nome || String(nome).trim().length < 2){
return res.status(400).json({ erro:"Nome inválido" });
}

if(!valor || Number(valor) <= 0){
return res.status(400).json({ erro:"Valor inválido" });
}

const pagamento = await fetch("https://api.mercadopago.com/v1/payments", {
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
"X-Idempotency-Key":`${Date.now()}-${Math.random()}`
},
body:JSON.stringify({
transaction_amount:Number(valor),
description:`Compra de ${litros} litros - RS Lubrificante`,
payment_method_id:"pix",
payer:{
email:"cliente@rslubrificante.com",
first_name:nome || "Cliente"
}
})
});

const dados = await pagamento.json();

if(!pagamento.ok){
return res.status(400).json({ erro:dados });
}

res.json({
id:dados.id,
status:dados.status,
qr_code:dados.point_of_interaction.transaction_data.qr_code,
qr_code_base64:dados.point_of_interaction.transaction_data.qr_code_base64,
ticket_url:dados.point_of_interaction.transaction_data.ticket_url
});

}catch(error){
res.status(500).json({ erro:error.message });
}
});

app.get("/api/point/terminais", async (req, res) => {
  try {

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({
        erro: "Token Mercado Pago não configurado"
      });
    }

    const resposta = await fetch(
      "https://api.mercadopago.com/point/integration-api/devices",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    res.json(dados);

  } catch (error) {

    res.status(500).json({
      erro: error.message
    });

  }
});
app.patch("/api/point/modo-pdv", async (req, res) => {
  try {

    const terminalId = "NEWLAND_N950__N950NCD200096404";

    const resposta = await fetch(
      "https://api.mercadopago.com/terminals/v1/setup",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${Date.now()}-${Math.random()}`
        },
        body: JSON.stringify({
          terminals: [
            {
              id: terminalId,
              operating_mode: "PDV"
            }
          ]
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    res.json(dados);

  } catch (error) {
    res.status(500).json({
      erro: error.message
    });
  }
});

app.post("/api/point/pagar", async (req, res) => {
  try {

    const { nome, litros, valor } = req.body;

    const terminalId = "NEWLAND_N950__N950NCD200096404";

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return res.status(500).json({
        erro: "Token Mercado Pago não configurado"
      });
    }

    if (!valor || Number(valor) <= 0) {
      return res.status(400).json({
        erro: "Valor inválido"
      });
    }

    const externalReference = `RS-${Date.now()}`;

    const resposta = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify({
        type: "point",
        external_reference: externalReference,
        expiration_time: "PT16M",
        transactions: {
          payments: [
            {
              amount: Number(valor).toFixed(2)
            }
          ]
        },
        config: {
          point: {
            terminal_id: terminalId,
            print_on_terminal: "no_ticket"
          },
          payment_method: {
            default_type: "credit_card",
            installments_cost: "seller"
          }
        },
        description: `${litros} litros - ${nome || "Cliente"}`
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    res.json(dados);

  } catch (error) {
    res.status(500).json({
      erro: error.message
    });
  }
});
app.post("/api/point/cancelar/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const resposta = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${Date.now()}-${Math.random()}`
        }
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    res.json(dados);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});
app.get("/api/point/orders", async (req, res) => {
  try {
    const resposta = await fetch(
      "https://api.mercadopago.com/v1/orders?limit=10",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(resposta.status).json(dados);
    }

    res.json(dados);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log("Servidor rodando!");
});
