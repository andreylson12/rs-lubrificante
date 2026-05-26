const API = window.location.origin;

const TOKEN =
localStorage.getItem("admin_token");

if(!TOKEN){
window.location.href = "login.html";
}

function headersAuth(){

return {
"Content-Type":"application/json",
"Authorization":`Bearer ${TOKEN}`
};

}

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
await fetch(`${API}/api/vendas`,{
headers:headersAuth()
});

if(response.status === 401){

logoutSistema();
return [];

}

return await response.json();

}

async function obterClientes(){

const response =
await fetch(`${API}/api/clientes`,{
headers:headersAuth()
});

if(response.status === 401){

logoutSistema();
return [];

}

return await response.json();

}

async function obterMovimentacoes(){

const response =
await fetch(`${API}/api/movimentacoes`,{
headers:headersAuth()
});

if(response.status === 401){

logoutSistema();
return [];

}

return await response.json();

}

function logoutSistema(){

localStorage.removeItem("admin_token");
localStorage.removeItem("admin_logado");

window.location.href =
"login.html";

}

async function cadastrarCliente(){

const nome =
document.getElementById("nomeClienteCadastro")?.value.trim();

const telefone =
document.getElementById("telefoneCliente")?.value.trim();

const limite =
Number(
document.getElementById("limiteCliente")?.value
);

if(!nome){

alert("Digite o nome");
return;

}

const response =
await fetch(`${API}/api/clientes`,{

method:"POST",

headers:headersAuth(),

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

alert(resposta.erro || "Erro");
return;

}

alert("Cliente cadastrado!");

document.getElementById("nomeClienteCadastro").value = "";
document.getElementById("telefoneCliente").value = "";
document.getElementById("limiteCliente").value = "";

await carregarClientes();

}

async function excluirCliente(id){

if(!confirm("Excluir cliente?")){
return;
}

const response =
await fetch(`${API}/api/clientes/${id}`,{

method:"DELETE",

headers:headersAuth()

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro");
return;

}

await carregarClientes();
await carregarAdmin();

}

async function receberFiado(id){

if(!confirm("Receber fiado?")){
return;
}

const response =
await fetch(`${API}/api/clientes/${id}/receber`,{

method:"PUT",

headers:headersAuth()

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro");
return;

}

await carregarClientes();
await carregarAdmin();

}

async function excluirVenda(id){

if(!confirm("Excluir venda?")){
return;
}

const response =
await fetch(`${API}/api/vendas/${id}`,{

method:"DELETE",

headers:headersAuth()

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro");
return;

}

await carregarAdmin();

}

async function salvarMovimentacao(){

const tipo =
document.getElementById("tipoMovimentacao")?.value;

const descricao =
document.getElementById("descricaoMovimentacao")?.value.trim();

const litros =
Number(
document.getElementById("litrosMovimentacao")?.value || 0
);

const valor =
Number(
document.getElementById("valorMovimentacao")?.value || 0
);

const response =
await fetch(`${API}/api/movimentacoes`,{

method:"POST",

headers:headersAuth(),

body:JSON.stringify({
tipo,
descricao,
litros,
valor
})

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro");
return;

}

document.getElementById("descricaoMovimentacao").value = "";
document.getElementById("litrosMovimentacao").value = "";
document.getElementById("valorMovimentacao").value = "";

await carregarMovimentacoes();
await carregarAdmin();

}

async function excluirMovimentacao(id){

if(!confirm("Excluir movimentação?")){
return;
}

const response =
await fetch(`${API}/api/movimentacoes/${id}`,{

method:"DELETE",

headers:headersAuth()

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Erro");
return;

}

await carregarMovimentacoes();
await carregarAdmin();

}

function configurarValorLitro(){

const input =
document.getElementById("novoValorLitro");

const btn =
document.getElementById("btnSalvarLitro");

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

alert("Valor atualizado!");

}
);

}

function configurarAbas(){

const abasBtns =
document.querySelectorAll(".abaBtn");

const conteudos =
document.querySelectorAll(".conteudoAba");

abasBtns.forEach(botao => {

botao.addEventListener(
"click",
() => {

const alvo =
botao.dataset.aba;

abasBtns.forEach(btn =>
btn.classList.remove("ativa")
);

conteudos.forEach(conteudo =>
conteudo.classList.remove("ativo")
);

botao.classList.add("ativa");

document
.getElementById(alvo)
.classList.add("ativo");

}
);

});

}

async function carregarClientes(){

const lista =
document.getElementById("listaClientes");

const listaFiado =
document.getElementById("listaClientesFiado");

const clientes =
await obterClientes();

if(lista){

lista.innerHTML = "";

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

if(listaFiado){

listaFiado.innerHTML = "";

const clientesFiado =
clientes.filter(cliente =>
Number(cliente.devedor) > 0
);

clientesFiado.forEach(cliente => {

listaFiado.innerHTML += `

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

}

async function carregarMovimentacoes(){

const lista =
document.getElementById("listaMovimentacoes");

if(!lista){
return;
}

const movimentacoes =
await obterMovimentacoes();

lista.innerHTML = "";

movimentacoes.forEach(item => {

lista.innerHTML += `

<tr>

<td>${item.tipo}</td>

<td>${item.descricao}</td>

<td>${item.litros}L</td>

<td>${formatarMoeda(item.valor)}</td>

<td>${item.data}</td>

<td>

<div style="display:flex;gap:10px;justify-content:center;align-items:center;">

<span>${item.hora}</span>

<button
class="btnExcluir"
onclick="excluirMovimentacao('${item.id}')"
>

Excluir

</button>

</div>

</td>

</tr>

`;

});

}

document
.getElementById("btnSair")
?.addEventListener(
"click",
logoutSistema
);

configurarAbas();
configurarValorLitro();
carregarClientes();
carregarMovimentacoes();
