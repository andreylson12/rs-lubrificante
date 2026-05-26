const usuarioPadrao = "admin";
const senhaPadrao = "123456";

const btnLogin =
document.getElementById("btnLogin");

btnLogin.addEventListener(
"click",
() => {

const usuario =
document.getElementById(
"usuario"
).value.trim();

const senha =
document.getElementById(
"senha"
).value.trim();

if(
usuario === usuarioPadrao &&
senha === senhaPadrao
){

localStorage.setItem(
"admin_logado",
"true"
);

window.location.href =
"admin.html";

}else{

alert(
"Usuário ou senha inválidos"
);

}

}
);
