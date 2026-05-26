const STORAGE_VENDAS = "vendas_posto";
const STORAGE_CLIENTES = "clientes_posto";
const STORAGE_LITRO = "valor_litro";

let ultimaQuantidadeVendas = 0;

function obterValorLitro(){

const valor = localStorage.getItem(STORAGE_LITRO);

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

let VALOR_LITRO = obterValorLitro();

function formatarMoeda(valor){

return valor.toLocaleString(
"pt-BR",
{
style:"currency",
currency:"BRL"
}
);

}

function obterVendas(){

try{

const dados =
localStorage.getItem(STORAGE_VENDAS);

if(!dados){
return [];
}

return JSON.parse(dados);

}catch{
return [];
}

}

function salvarVendas(vendas){

localStorage.setItem(
STORAGE_VENDAS,
JSON.stringify(vendas)
);

}

function obterClientes(){

try{

const dados =
localStorage.getItem(STORAGE_CLIENTES);

if(!dados){
return [];
}

return JSON.parse(dados);

}catch{
return [];
}

}

function salvarClientes(clientes){

localStorage.setItem(
STORAGE_CLIENTES,
JSON.stringify(clientes)
);

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

function cadastrarCliente(){

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

const clientes =
obterClientes();

clientes.push({

id: crypto.randomUUID(),
nome,
telefone,
limite,
devedor:0

});

salvarClientes(clientes);

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

carregarClientes();

}

function registrarVenda(){

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

const vendas =
obterVendas();

const clientes =
obterClientes();

if(formaPagamento === "fiado"){

const cliente =
clientes.find(
c => c.nome.toLowerCase()
=== nome.toLowerCase()
);

if(!cliente){

alert(
"Cliente não cadastrado!"
);

return;

}

if(
cliente.devedor + valor
> cliente.limite
){

alert(
"Limite do cliente excedido!"
);

return;

}

cliente.devedor += valor;

salvarClientes(clientes);

}

vendas.unshift({

id: crypto.randomUUID(),
nome,
litros,
valor,
formaPagamento,
hora:new Date().toLocaleTimeString(
"pt-BR",
{
hour:"2-digit",
minute:"2-digit"
}
)

});

salvarVendas(vendas);

document.getElementById(
"nome"
).value = "";

document.getElementById(
"litros"
).value = "1";

atualizarValor();

alert("Venda registrada!");

}

function excluirVenda(id){

const vendas =
obterVendas();

const venda =
vendas.find(v => v.id === id);

if(venda && venda.formaPagamento === "fiado"){

const clientes =
obterClientes();

const cliente =
clientes.find(
c => c.nome.toLowerCase()
=== venda.nome.toLowerCase()
);

if(cliente){

cliente.devedor -= venda.valor;

if(cliente.devedor < 0){
cliente.devedor = 0;
}

salvarClientes(clientes);

}

}

const novas =
vendas.filter(
v => v.id !== id
);

salvarVendas(novas);

carregarAdmin();

carregarClientes();

}

function receberFiado(id){

const clientes =
obterClientes();

const cliente =
clientes.find(c => c.id === id);

if(!cliente){
return;
}

cliente.devedor = 0;

salvarClientes(clientes);

carregarClientes();

carregarAdmin();

alert("Pagamento recebido!");

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

function carregarAdmin(){

const lista =
document.getElementById(
"listaVendas"
);

if(!lista){
return;
}

const vendas =
obterVendas();

const clientes =
obterClientes();

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

if(cliente.devedor > 0){

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

totalLitros += item.litros;

totalVendido += item.valor;

if(item.formaPagamento === "pix"){

totalPix += item.valor;

}

if(item.formaPagamento === "fiado"){

totalFiado += item.valor;

}

lista.innerHTML += `

<tr>

<td>${item.nome}</td>

<td>${item.formaPagamento}</td>

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

function carregarClientes(){

const lista =
document.getElementById(
"listaClientes"
);

if(!lista){
return;
}

const clientes =
obterClientes();

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

<td>${formatarMoeda(cliente.limite)}</td>

<td>${formatarMoeda(cliente.devedor)}</td>

<td>

<button
class="btnReceber"
onclick="receberFiado('${cliente.id}')"
>

Receber

</button>

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