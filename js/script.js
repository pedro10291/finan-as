const SUPABASE_URL =
  "https://pspuwoyhuazopixumyev.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcHV3b3lodWF6b3BpeHVteWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTIyMDEsImV4cCI6MjA5NDc2ODIwMX0.jG0LRwanZmDh6Mt0pknOMVz2fOnA9Q4AhyhcS0rHTzE";

const meuSupabase =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

let movimentacoes = [];

let grafico = null;

let elementos = {};

document.addEventListener(
  "DOMContentLoaded",
  () => {

    elementos = {

      rendaTotal:
        document.getElementById("renda-total"),

      contasInicio:
        document.getElementById("contas-inicio"),

      contasMeio:
        document.getElementById("contas-meio"),

      saidas:
        document.getElementById("saidas-total"),

      sobra:
        document.getElementById("sobra-total"),

      lista:
        document.getElementById("lista-gastos")

    };

    iniciarEventos();

    iniciarNavegacao();

    iniciarGrafico();

    document
      .getElementById("tela-login")
      .classList.add("active");

    document
      .querySelector(".bottom-nav")
      .style.display = "none";

  }
);

function iniciarEventos(){

  document
    .getElementById("btn-login")
    .addEventListener(
      "click",
      fazerLogin
    );

  document
    .getElementById("btn-cadastro")
    .addEventListener(
      "click",
      fazerCadastro
    );

  document
    .getElementById("btn-logout")
    ?.addEventListener(
      "click",
      logout
    );

  document
    .getElementById("form-lancamento")
    .addEventListener(
      "submit",
      salvarLancamento
    );

}

function iniciarNavegacao(){

  const links =
    document.querySelectorAll(".nav-item");

  links.forEach(link => {

    link.addEventListener("click", e => {

      e.preventDefault();

      document
        .querySelectorAll(".nav-item")
        .forEach(item =>
          item.classList.remove("active")
        );

      document
        .querySelectorAll(".tela")
        .forEach(tela =>
          tela.classList.remove("active")
        );

      link.classList.add("active");

      document
        .getElementById(
          link.dataset.tela
        )
        .classList.add("active");

    });

  });

}

function iniciarGrafico(){

  const canvas =
    document.getElementById("graficoPizza");

  if(!canvas) return;

  const ctx =
    canvas.getContext("2d");

  grafico = new Chart(ctx, {

    type:"doughnut",

    data:{

      labels:[
        "Gastos",
        "Sobra"
      ],

      datasets:[{

        data:[0,0],

        backgroundColor:[
          "#64748B",
          "#163E3C"
        ]

      }]

    },

    options:{
      responsive:true,
      plugins:{
        legend:{
          position:"bottom"
        }
      }
    }

  });

}

async function fazerLogin(){

  const email =
    document.getElementById(
      "email-login"
    ).value;

  const password =
    document.getElementById(
      "senha-login"
    ).value;

  if(!email || !password){

    alert("Preencha email e senha");

    return;

  }

  try{

    const {
      error
    } =
      await meuSupabase.auth
      .signInWithPassword({

        email,
        password

      });

    if(error) throw error;

    liberarSistema();

    carregarDados();

  }catch(err){

    alert(err.message);

  }

}

async function fazerCadastro(){

  const email =
    document.getElementById(
      "email-login"
    ).value;

  const password =
    document.getElementById(
      "senha-login"
    ).value;

  if(!email || !password){

    alert("Preencha email e senha");

    return;

  }

  try{

    const {
      error
    } =
      await meuSupabase.auth
      .signUp({

        email,
        password

      });

    if(error) throw error;

    alert("Conta criada com sucesso!");

  }catch(err){

    alert(err.message);

  }

}

async function logout(){

  await meuSupabase.auth.signOut();

  movimentacoes = [];

  location.reload();

}

function liberarSistema(){

  document
    .getElementById("tela-login")
    .classList.remove("active");

  document
    .querySelectorAll(".tela")
    .forEach(tela =>
      tela.classList.remove("active")
    );

  document
    .getElementById("tela-dashboard")
    .classList.add("active");

  document
    .querySelector(".bottom-nav")
    .style.display = "flex";

}

async function carregarDados(){

  try{

    const {
      data:{ user }
    } =
      await meuSupabase.auth.getUser();

    if(!user) return;

const {
  data,
  error
} =
  await meuSupabase
  .from("movimentacoes")
  .select("*")
  .eq("user_id", user.id);

    if(error) throw error;

    movimentacoes = data || [];

    atualizarDashboard();

  }catch(err){

    console.error(err);

  }

}

async function salvarLancamento(e){

  e.preventDefault();

  try{

    const {
      data:{ user }
    } =
      await meuSupabase.auth.getUser();

    if(!user){

      alert("Usuário não autenticado");

      return;

    }

    const novaMovimentacao = {

      user_id:user.id,

      tipo:
        document.getElementById("tipo").value,

      desc:
        document.getElementById("descricao").value,

      valor:Number(
        document.getElementById("valor").value
      ),

      categoria:
        document.getElementById("categoria").value,

      vencimento:
        document.getElementById("vencimento").value

    };

    const {
      data,
      error
    } =
      await meuSupabase
      .from("movimentacoes")
      .insert([novaMovimentacao])
      .select();

    if(error) throw error;

    movimentacoes.unshift(data[0]);

    atualizarDashboard();

    document
      .getElementById("form-lancamento")
      .reset();

    alert("Lançamento salvo!");

  }catch(err){

    alert(err.message);

  }

}

function atualizarDashboard(){

  let renda = 0;

  let gastos = 0;

  let inicio = 0;

  let meio = 0;

  movimentacoes.forEach(item => {

    if(item.tipo === "ganho"){

      renda += Number(item.valor);

    }else{

      gastos += Number(item.valor);

      if(item.vencimento === "inicio"){

        inicio += Number(item.valor);

      }

      if(item.vencimento === "meio"){

        meio += Number(item.valor);

      }

    }

  });

  elementos.rendaTotal.innerText =
    formatarMoeda(renda);

  elementos.contasInicio.innerText =
    formatarMoeda(inicio);

  elementos.contasMeio.innerText =
    formatarMoeda(meio);

  elementos.saidas.innerText =
    formatarMoeda(gastos);

  elementos.sobra.innerText =
    formatarMoeda(renda - gastos);

  atualizarGrafico(
    gastos,
    renda
  );

  atualizarProgressoMes();

  renderizarExtrato();

}

function atualizarGrafico(
  gastos,
  renda
){

  if(!grafico) return;

  grafico.data.datasets[0].data = [

    gastos,

    Math.max(
      0,
      renda - gastos
    )

  ];

  grafico.update();

}

function atualizarProgressoMes(){

  const hoje =
    new Date();

  const diaAtual =
    hoje.getDate();

  const totalDias =
    new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    ).getDate();

  const porcentagem =
    (diaAtual / totalDias) * 100;

  const barra =
    document.getElementById(
      "barra-progresso"
    );

  const texto =
    document.getElementById(
      "texto-progresso"
    );

  if(barra){

    barra.style.width =
      `${porcentagem}%`;

  }

  if(texto){

    texto.innerText =
      `Dia ${diaAtual} de ${totalDias}`;

  }

}

function renderizarExtrato(){

  elementos.lista.innerHTML = "";

  movimentacoes.forEach(item => {

    elementos.lista.innerHTML += `

      <div class="item-gasto">

        <div class="item-info">

          <h4>${item.desc}</h4>

          <span class="badge">
            ${item.categoria || "Entrada"}
          </span>

        </div>

        <div style="display:flex;align-items:center;gap:10px;">

          <strong>
            ${formatarMoeda(item.valor)}
          </strong>

          <button
            class="btn-excluir"
            onclick="excluirMovimentacao('${item.id}')"
          >
            ✕
          </button>

        </div>

      </div>

    `;

  });

}

window.excluirMovimentacao =
  async function(id){

    const confirmar =
      confirm(
        "Excluir lançamento?"
      );

    if(!confirmar) return;

    try{

      const {
        error
      } =
        await meuSupabase
        .from("movimentacoes")
        .delete()
        .eq("id", id);

      if(error) throw error;

      movimentacoes =
        movimentacoes.filter(
          item => item.id !== id
        );

      atualizarDashboard();

    }catch(err){

      alert(err.message);

    }

};

function formatarMoeda(valor){

  return valor.toLocaleString(
    "pt-BR",
    {

      style:"currency",

      currency:"BRL"

    }
  );

}