const API = window.location.origin;

const TOKEN =
localStorage.getItem("admin_token");

const ehAdmin =
document.body.classList.contains("admin") ||
document.querySelector(".containerAdmin");

function headersAuth(){

return {
"Content-Type":"application/json",
"Authorization":`Bearer ${TOKEN}`
};

}

function headersPublic(){

return {
"Content-Type":"application/json"
};

}

if(ehAdmin && !TOKEN){
window.location.href = "login.html";
}

const STORAGE_LITRO = "valor_litro";

let VALOR_LITRO = 6.5;

let ultimaQuantidadeVendas = 0;

function formatarMoeda(valor){

return Number(valor).toLocaleString("pt-BR",{
style:"currency",
currency:"BRL"
});

}

function obterValorLitro(){

const valor = localStorage.getItem(STORAGE_LITRO);

if(!valor){
return 6.5;
}

return Number(valor);

}

function salvarValorLitro(valor){
localStorage.setItem(STORAGE_LITRO, valor);
}

function logoutSistema(){

localStorage.removeItem("admin_token");
localStorage.removeItem("admin_logado");

window.location.href = "login.html";

}

async function obterVendas(){

const response = await fetch(`${API}/api/vendas`,{
headers:headersAuth()
});

if(response.status === 401){
logoutSistema();
return [];
}

return await response.json();

}

async function obterClientes(){

const response = await fetch(`${API}/api/clientes`,{
headers:headersAuth()
});

if(response.status === 401){
logoutSistema();
return [];
}

return await response.json();

}

async function obterMovimentacoes(){

const response = await fetch(`${API}/api/movimentacoes`,{
headers:headersAuth()
});

if(response.status === 401){
logoutSistema();
return [];
}

return await response.json();

}

function atualizarValor(){

VALOR_LITRO = obterValorLitro();

const litros = document.getElementById("litros");
const valorTotal = document.getElementById("valorTotal");

if(!litros || !valorTotal){
return;
}

const total = Number(litros.value) * VALOR_LITRO;

valorTotal.innerText = formatarMoeda(total);

}

async function registrarVenda(){

VALOR_LITRO = obterValorLitro();

const nome = document.getElementById("nome")?.value.trim();
const litros = Number(document.getElementById("litros")?.value);
const formaPagamento = document.getElementById("formaPagamento")?.value;

if(!nome || nome.length < 2){
alert("Digite um nome válido");
return;
}

const valor = litros * VALOR_LITRO;

const hora = new Date().toLocaleTimeString("pt-BR",{
hour:"2-digit",
minute:"2-digit"
});

const response = await fetch(`${API}/api/vendas`,{
method:"POST",
headers:headersPublic(),
body:JSON.stringify({
nome,
litros,
valor,
formaPagamento,
hora
})
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao registrar venda");
return;
}

document.getElementById("nome").value = "";
document.getElementById("litros").value = "1";

atualizarValor();

alert("Venda registrada!");

}

async function cadastrarCliente(){

const nome = document.getElementById("nomeClienteCadastro")?.value.trim();
const telefone = document.getElementById("telefoneCliente")?.value.trim();
const limite = Number(document.getElementById("limiteCliente")?.value);

if(!nome){
alert("Digite o nome");
return;
}

const response = await fetch(`${API}/api/clientes`,{
method:"POST",
headers:headersAuth(),
body:JSON.stringify({
nome,
telefone,
limite,
devedor:0
})
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao cadastrar cliente");
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

const response = await fetch(`${API}/api/clientes/${id}`,{
method:"DELETE",
headers:headersAuth()
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao excluir cliente");
return;
}

await carregarClientes();
await carregarAdmin();

alert("Cliente excluído!");

}

async function receberFiado(id){

if(!confirm("Receber fiado?")){
return;
}

const response = await fetch(`${API}/api/clientes/${id}/receber`,{
method:"PUT",
headers:headersAuth()
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao receber fiado");
return;
}

await carregarClientes();
await carregarAdmin();

alert("Pagamento recebido!");

}

async function excluirVenda(id){

if(!confirm("Excluir venda?")){
return;
}

const response = await fetch(`${API}/api/vendas/${id}`,{
method:"DELETE",
headers:headersAuth()
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao excluir venda");
return;
}

await carregarAdmin();
await carregarClientes();

}

async function salvarMovimentacao(){

const tipo = document.getElementById("tipoMovimentacao")?.value;
const descricao = document.getElementById("descricaoMovimentacao")?.value.trim();
const litros = Number(document.getElementById("litrosMovimentacao")?.value || 0);
const valor = Number(document.getElementById("valorMovimentacao")?.value || 0);

if(!descricao){
alert("Digite a descrição");
return;
}

const response = await fetch(`${API}/api/movimentacoes`,{
method:"POST",
headers:headersAuth(),
body:JSON.stringify({
tipo,
descricao,
litros,
valor
})
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao salvar movimentação");
return;
}

document.getElementById("descricaoMovimentacao").value = "";
document.getElementById("litrosMovimentacao").value = "";
document.getElementById("valorMovimentacao").value = "";

await carregarMovimentacoes();
await carregarAdmin();

alert("Movimentação salva!");

}

async function excluirMovimentacao(id){

if(!confirm("Excluir movimentação?")){
return;
}

const response = await fetch(`${API}/api/movimentacoes/${id}`,{
method:"DELETE",
headers:headersAuth()
});

const resposta = await response.json();

if(!response.ok){
alert(resposta.erro || "Erro ao excluir movimentação");
return;
}

await carregarMovimentacoes();
await carregarAdmin();

}

function tocarAlerta(){

const mensagem = new SpeechSynthesisUtterance("Venda concluída");

mensagem.lang = "pt-BR";

speechSynthesis.speak(mensagem);

}

function atualizarGraficos(
totalPix,
totalFiado,
totalVendido,
totalDespesas,
lucroEstimado,
estoqueAtual,
totalEntradasLitros
){

const totalPagamentos = totalPix + totalFiado;

let porcentagemPix = 50;
let porcentagemFiado = 50;

if(totalPagamentos > 0){
porcentagemPix = (totalPix / totalPagamentos) * 100;
porcentagemFiado = (totalFiado / totalPagamentos) * 100;
}

const barraPix = document.getElementById("barraPix");

if(barraPix){
barraPix.style.width = `${porcentagemPix}%`;
barraPix.innerText = `PIX ${porcentagemPix.toFixed(0)}%`;
}

const barraFiado = document.getElementById("barraFiado");

if(barraFiado){
barraFiado.style.width = `${porcentagemFiado}%`;
barraFiado.innerText = `Fiado ${porcentagemFiado.toFixed(0)}%`;
}

const legendaPix = document.getElementById("legendaPix");

if(legendaPix){
legendaPix.innerText = formatarMoeda(totalPix);
}

const legendaFiado = document.getElementById("legendaFiado");

if(legendaFiado){
legendaFiado.innerText = formatarMoeda(totalFiado);
}

const maiorValor = Math.max(totalVendido,totalDespesas,lucroEstimado,1);

const barraVendas = document.getElementById("barraVendas");

if(barraVendas){
barraVendas.style.height = `${Math.max((totalVendido/maiorValor)*180,10)}px`;
}

const barraDespesas = document.getElementById("barraDespesas");

if(barraDespesas){
barraDespesas.style.height = `${Math.max((totalDespesas/maiorValor)*180,10)}px`;
}

const barraLucro = document.getElementById("barraLucro");

if(barraLucro){
barraLucro.style.height = `${Math.max((lucroEstimado/maiorValor)*180,10)}px`;
}

let porcentagemEstoque = 0;

if(totalEntradasLitros > 0){
porcentagemEstoque = (estoqueAtual / totalEntradasLitros) * 100;
}

if(porcentagemEstoque < 0){
porcentagemEstoque = 0;
}

if(porcentagemEstoque > 100){
porcentagemEstoque = 100;
}

const barraEstoque = document.getElementById("barraEstoque");

if(barraEstoque){
barraEstoque.style.width = `${porcentagemEstoque}%`;
barraEstoque.innerText = `${porcentagemEstoque.toFixed(0)}%`;
}

const textoEstoque = document.getElementById("textoEstoque");

if(textoEstoque){
textoEstoque.innerText =
`Estoque atual: ${estoqueAtual}L de ${totalEntradasLitros}L lançados.`;
}

}

async function carregarAdmin(){

const lista = document.getElementById("listaVendas");

if(!lista){
return;
}

const vendas = await obterVendas();
const clientes = await obterClientes();
const movimentacoes = await obterMovimentacoes();

if(ultimaQuantidadeVendas !== 0 && vendas.length > ultimaQuantidadeVendas){
tocarAlerta();
}

ultimaQuantidadeVendas = vendas.length;

lista.innerHTML = "";

let totalLitros = 0;
let totalPix = 0;
let totalFiado = 0;
let totalVendido = 0;
let clientesDevendo = 0;
let totalEntradasLitros = 0;
let totalDespesas = 0;

clientes.forEach(cliente => {
if(Number(cliente.devedor) > 0){
clientesDevendo++;
}
});

vendas.forEach(item => {

totalLitros += Number(item.litros || 0);
totalVendido += Number(item.valor || 0);

if(item.forma_pagamento === "pix"){
totalPix += Number(item.valor || 0);
}

if(item.forma_pagamento === "fiado"){
totalFiado += Number(item.valor || 0);
}

lista.innerHTML += `
<tr>
<td>${item.nome}</td>
<td>${item.forma_pagamento}</td>
<td>${item.litros}L</td>
<td>${formatarMoeda(item.valor)}</td>
<td>${item.hora}</td>
<td>
<button class="btnExcluir" onclick="excluirVenda('${item.id}')">
Excluir
</button>
</td>
</tr>
`;

});

movimentacoes.forEach(item => {

if(item.tipo === "entrada"){
totalEntradasLitros += Number(item.litros || 0);
totalDespesas += Number(item.valor || 0);
}

if(item.tipo === "despesa"){
totalDespesas += Number(item.valor || 0);
}

});

const estoqueAtual = totalEntradasLitros - totalLitros;
const lucroEstimado = totalVendido - totalDespesas;

const ids = {
totalLitros:`${totalLitros}L`,
totalPix:formatarMoeda(totalPix),
totalFiado:formatarMoeda(totalFiado),
totalVendido:formatarMoeda(totalVendido),
clientesDevendo:clientesDevendo,
estoqueAtual:`${estoqueAtual}L`,
totalDespesas:formatarMoeda(totalDespesas),
lucroEstimado:formatarMoeda(lucroEstimado)
};

Object.keys(ids).forEach(id => {
const el = document.getElementById(id);
if(el){
el.innerText = ids[id];
}
});

atualizarGraficos(
totalPix,
totalFiado,
totalVendido,
totalDespesas,
lucroEstimado,
estoqueAtual,
totalEntradasLitros
);

const hoje = new Date().toLocaleDateString("pt-BR");

let vendasHoje = 0;
let pixHoje = 0;
let fiadoHoje = 0;
let despesasHoje = 0;
let litrosHoje = 0;

vendas.forEach(item => {

if(item.data === hoje){

vendasHoje += Number(item.valor || 0);
litrosHoje += Number(item.litros || 0);

if(item.forma_pagamento === "pix"){
pixHoje += Number(item.valor || 0);
}

if(item.forma_pagamento === "fiado"){
fiadoHoje += Number(item.valor || 0);
}

}

});

movimentacoes.forEach(item => {

if(item.data === hoje){

if(item.tipo === "despesa" || item.tipo === "entrada"){
despesasHoje += Number(item.valor || 0);
}

}

});

const lucroHoje = vendasHoje - despesasHoje;

const fechamento = {
fechamentoVendas:formatarMoeda(vendasHoje),
fechamentoPix:formatarMoeda(pixHoje),
fechamentoFiado:formatarMoeda(fiadoHoje),
fechamentoDespesas:formatarMoeda(despesasHoje),
fechamentoLucro:formatarMoeda(lucroHoje),
fechamentoLitros:`${litrosHoje}L`
};

Object.keys(fechamento).forEach(id => {
const el = document.getElementById(id);
if(el){
el.innerText = fechamento[id];
}
});

}

async function carregarClientes(){

const lista = document.getElementById("listaClientes");
const listaFiado = document.getElementById("listaClientesFiado");

const clientes = await obterClientes();

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
<button class="btnReceber" onclick="receberFiado('${cliente.id}')">Receber</button>
<button class="btnExcluir" onclick="excluirCliente('${cliente.id}')">Excluir</button>
</div>
</td>
</tr>
`;

});

}

if(listaFiado){

listaFiado.innerHTML = "";

const clientesFiado = clientes.filter(cliente => Number(cliente.devedor) > 0);

clientesFiado.forEach(cliente => {

listaFiado.innerHTML += `
<tr>
<td>${cliente.nome}</td>
<td>${cliente.telefone}</td>
<td>${formatarMoeda(cliente.limite_valor)}</td>
<td>${formatarMoeda(cliente.devedor)}</td>
<td>
<div style="display:flex;gap:10px;justify-content:center;">
<button class="btnReceber" onclick="receberFiado('${cliente.id}')">Receber</button>
<button class="btnExcluir" onclick="excluirCliente('${cliente.id}')">Excluir</button>
</div>
</td>
</tr>
`;

});

}

}

async function carregarMovimentacoes(){

const lista = document.getElementById("listaMovimentacoes");

if(!lista){
return;
}

const movimentacoes = await obterMovimentacoes();

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
<button class="btnExcluir" onclick="excluirMovimentacao('${item.id}')">
Excluir
</button>
</div>
</td>
</tr>
`;

});

}

function configurarValorLitro(){

const input = document.getElementById("novoValorLitro");
const btn = document.getElementById("btnSalvarLitro");

if(!input || !btn){
return;
}

VALOR_LITRO = obterValorLitro();

input.value = VALOR_LITRO;

btn.addEventListener("click", () => {

const novo = Number(input.value);

if(novo <= 0){
alert("Valor inválido");
return;
}

VALOR_LITRO = novo;

salvarValorLitro(novo);

alert("Valor atualizado!");

});

}

function configurarAbas(){

const abasBtns = document.querySelectorAll(".abaBtn");
const conteudos = document.querySelectorAll(".conteudoAba");

abasBtns.forEach(botao => {

botao.addEventListener("click", () => {

const alvo = botao.dataset.aba;

abasBtns.forEach(btn => btn.classList.remove("ativa"));
conteudos.forEach(conteudo => conteudo.classList.remove("ativo"));

botao.classList.add("ativa");

const aba = document.getElementById(alvo);

if(aba){
aba.classList.add("ativo");
}

});

});

}

document.addEventListener("DOMContentLoaded", () => {

const litros = document.getElementById("litros");
const btnVenda = document.getElementById("btnRegistrar");
const btnCliente = document.getElementById("btnCadastrarCliente");
const btnMovimentacao = document.getElementById("btnMovimentacao");
const btnSair = document.getElementById("btnSair");

if(litros){
litros.addEventListener("change", atualizarValor);
atualizarValor();
}

if(btnVenda){
btnVenda.addEventListener("click", registrarVenda);
}

if(btnCliente){
btnCliente.addEventListener("click", cadastrarCliente);
}

if(btnMovimentacao){
btnMovimentacao.addEventListener("click", salvarMovimentacao);
}

if(btnSair){
btnSair.addEventListener("click", logoutSistema);
}

if(ehAdmin){
configurarAbas();
configurarValorLitro();
carregarAdmin();
carregarClientes();
carregarMovimentacoes();

setInterval(() => {
carregarAdmin();
carregarClientes();
carregarMovimentacoes();
}, 3000);
}

});
