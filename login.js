const API = window.location.origin;

const btnLogin =
document.getElementById("btnLogin");

btnLogin.addEventListener(
"click",
async () => {

const usuario =
document.getElementById("usuario").value.trim();

const senha =
document.getElementById("senha").value.trim();

if(!usuario || !senha){

alert("Informe usuário e senha");
return;

}

const response =
await fetch(`${API}/api/login`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
usuario,
senha
})

});

const resposta =
await response.json();

if(!response.ok){

alert(resposta.erro || "Usuário ou senha inválidos");
return;

}

localStorage.setItem(
"admin_token",
resposta.token
);

localStorage.setItem(
"admin_logado",
"true"
);

window.location.href =
"admin.html";

}
);
