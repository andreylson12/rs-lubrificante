const API = window.location.origin;

const STORAGE_LITRO = "valor_litro";

let VALOR_LITRO = 6.5;

let ultimaQuantidadeVendas = 0;

function formatarMoeda(valor){

return Number(valor).toLocaleString(
"pt-BR",
{
style:"currency",
currency:"BRL"
}
);

}

function obterValorLitro(){

const valor =
localStorage.getItem(STORAGE_LITRO);

if(!valor){
return 6.5;
}

return Number(valor);

}

function salvarValorLitro(valor){

localStorage.setItem(
STORAGE_LITRO,
valor
);

}

async function obterVendas(){

const response =
await fetch(`${API}/api/vendas`);

return await response.json();

}

async function obterClientes(){

const response =
await fetch(`${API}/api/clientes`);

return await response.json();

}

async function cadastrarCliente(){

const nome =
document.getElementById(
"nomeClienteCadastro"
)?.value.trim();

const telefone =
document.getElementById(
"telefoneCliente"
)?.value.trim();

const limite =
Number(
document.getElementById(
"limiteCliente"
)?.value
);

if(!nome){

alert("Digite o nome");
return;

}

const response =
await fetch(`${API}/api/clientes`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

nome,
telefone,
limite,
devedor:0

})

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro ao cadastrar cliente");
return;

}

alert("Cliente cadastrado!");

document.getElementById(
"nomeClienteCadastro"
).value = "";

document.getElementById(
"telefoneCliente"
).value = "";

document.getElementById(
"limiteCliente"
).value = "";

await carregarClientes();

}

function atualizarValor(){

VALOR_LITRO =
obterValorLitro();

const litros =
document.getElementById("litros");

const valorTotal =
document.getElementById("valorTotal");

if(!litros || !valorTotal){
return;
}

const total =
Number(litros.value) * VALOR_LITRO;

valorTotal.innerText =
formatarMoeda(total);

}

async function registrarVenda(){

VALOR_LITRO =
obterValorLitro();

const nome =
document.getElementById(
"nome"
).value.trim();

const litros =
Number(
document.getElementById(
"litros"
).value
);

const formaPagamento =
document.getElementById(
"formaPagamento"
).value;

if(nome.length < 2){

alert("Digite um nome válido");
return;

}

const valor =
litros * VALOR_LITRO;

const hora =
new Date().toLocaleTimeString(
"pt-BR",
{
hour:"2-digit",
minute:"2-digit"
}
);

const response =
await fetch(`${API}/api/vendas`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

nome,
litros,
valor,
formaPagamento,
hora

})

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro ao registrar venda");
return;

}

document.getElementById(
"nome"
).value = "";

document.getElementById(
"litros"
).value = "1";

atualizarValor();

alert("Venda registrada!");

}

async function excluirVenda(id){

if(!confirm("Deseja excluir esta venda?")){
return;
}

const response =
await fetch(`${API}/api/vendas/${id}`,{
method:"DELETE"
});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro ao excluir venda");
return;

}

await carregarAdmin();

await carregarClientes();

}

async function receberFiado(id){

if(!confirm("Confirmar recebimento deste fiado?")){
return;
}

const response =
await fetch(`${API}/api/clientes/${id}/receber`,{
method:"PUT"
});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro ao receber fiado");
return;

}

await carregarClientes();

await carregarAdmin();

alert("Pagamento recebido!");

}

async function excluirCliente(id){

if(!confirm("Deseja excluir este cliente?")){
return;
}

const response =
await fetch(`${API}/api/clientes/${id}`,{
method:"DELETE"
});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro ao excluir cliente");
return;

}

await carregarClientes();

await carregarAdmin();

alert("Cliente excluído!");

}

function tocarAlerta(){

const mensagem =
new SpeechSynthesisUtterance(
"Venda concluída"
);

mensagem.lang = "pt-BR";

speechSynthesis.speak(
mensagem
);

}

async function carregarAdmin(){

const lista =
document.getElementById(
"listaVendas"
);

if(!lista){
return;
}

const vendas =
await obterVendas();

const clientes =
await obterClientes();

if(
ultimaQuantidadeVendas !== 0 &&
vendas.length > ultimaQuantidadeVendas
){

tocarAlerta();

}

ultimaQuantidadeVendas =
vendas.length;

lista.innerHTML = "";

let totalLitros = 0;
let totalPix = 0;
let totalFiado = 0;
let totalVendido = 0;
let clientesDevendo = 0;

clientes.forEach(cliente => {

if(Number(cliente.devedor) > 0){

clientesDevendo++;

}

});

if(vendas.length === 0){

lista.innerHTML = `
<tr>
<td colspan="6" class="semVendas">
Nenhuma venda registrada
</td>
</tr>
`;

}

vendas.forEach(item => {

totalLitros += Number(item.litros);

totalVendido += Number(item.valor);

if(item.forma_pagamento === "pix"){
totalPix += Number(item.valor);
}

if(item.forma_pagamento === "fiado"){
totalFiado += Number(item.valor);
}

lista.innerHTML += `

<tr>

<td>${item.nome}</td>

<td>${item.forma_pagamento}</td>

<td>${item.litros}L</td>

<td>${formatarMoeda(item.valor)}</td>

<td>${item.hora}</td>

<td>

<button
class="btnExcluir"
onclick="excluirVenda('${item.id}')"
>

Excluir

</button>

</td>

</tr>

`;

});

document.getElementById(
"totalLitros"
).innerText =
`${totalLitros}L`;

document.getElementById(
"totalPix"
).innerText =
formatarMoeda(totalPix);

document.getElementById(
"totalFiado"
).innerText =
formatarMoeda(totalFiado);

document.getElementById(
"totalVendido"
).innerText =
formatarMoeda(totalVendido);

document.getElementById(
"totalVendas"
).innerText =
vendas.length;

document.getElementById(
"clientesDevendo"
).innerText =
clientesDevendo;

}

async function carregarClientes(){

const lista =
document.getElementById(
"listaClientes"
);

if(!lista){
return;
}

const clientes =
await obterClientes();

lista.innerHTML = "";

if(clientes.length === 0){

lista.innerHTML = `
<tr>
<td colspan="5" class="semVendas">
Nenhum cliente cadastrado
</td>
</tr>
`;

}

clientes.forEach(cliente => {

lista.innerHTML += `

<tr>

<td>${cliente.nome}</td>

<td>${cliente.telefone}</td>

<td>${formatarMoeda(cliente.limite_valor)}</td>

<td>${formatarMoeda(cliente.devedor)}</td>

<td>

<div style="display:flex;gap:10px;justify-content:center;">

<button
class="btnReceber"
onclick="receberFiado('${cliente.id}')"
>

Receber

</button>

<button
class="btnExcluir"
onclick="excluirCliente('${cliente.id}')"
>

Excluir

</button>

</div>

</td>

</tr>

`;

});

}

function configurarValorLitro(){

const input =
document.getElementById(
"novoValorLitro"
);

const btn =
document.getElementById(
"btnSalvarLitro"
);

if(!input || !btn){
return;
}

VALOR_LITRO =
obterValorLitro();

input.value = VALOR_LITRO;

btn.addEventListener(
"click",
() => {

const novo =
Number(input.value);

if(novo <= 0){

alert("Valor inválido");
return;

}

VALOR_LITRO = novo;

salvarValorLitro(novo);

alert(
"Valor atualizado!"
);

atualizarValor();

}
);

}

document.addEventListener(
"DOMContentLoaded",
() => {

const litros =
document.getElementById(
"litros"
);

const btnVenda =
document.getElementById(
"btnRegistrar"
);

const btnCliente =
document.getElementById(
"btnCadastrarCliente"
);

if(litros){

litros.addEventListener(
"change",
atualizarValor
);

atualizarValor();

}

if(btnVenda){

btnVenda.addEventListener(
"click",
registrarVenda
);

}

if(btnCliente){

btnCliente.addEventListener(
"click",
cadastrarCliente
);

}

configurarValorLitro();

carregarAdmin();

carregarClientes();

setInterval(() => {

carregarAdmin();
carregarClientes();

}, 3000);

}
);
