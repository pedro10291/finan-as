const SUPABASE_URL = "https://pspuwoyhuazopixumyev.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzcHV3b3lodWF6b3BpeHVteWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTIyMDEsImV4cCI6MjA5NDc2ODIwMX0.jG0LRwanZmDh6Mt0pknOMVz2fOnA9Q4AhyhcS0rHTzE";

const meuSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let movimentacoes = [];
let grafico = null;
let elementos = {};

document.addEventListener("DOMContentLoaded", async () => {
  elementos = {
    rendaTotal: document.getElementById("renda-total"),
    contasInicio: document.getElementById("contas-inicio"),
    contasMeio: document.getElementById("contas-meio"),
    saidas: document.getElementById("saidas-total"),
    sobra: document.getElementById("sobra-total"),
    lista: document.getElementById("lista-gastos")
  };

  iniciarEventos();
  iniciarNavegacao();
  iniciarGrafico();

  try {
    const { data: { session } } = await meuSupabase.auth.getSession();

    if (session) {
      liberarSistema();
      carregarDados();
    } else {
      document.getElementById("tela-login").classList.add("active");
      document.querySelector(".bottom-nav").style.display = "none";
    }
  } catch (err) {
    console.error("Erro ao verificar sessão:", err);
    document.getElementById("tela-login").classList.add("active");
    document.querySelector(".bottom-nav").style.display = "none";
  }
});

function iniciarEventos() {
  document.getElementById("btn-login").addEventListener("click", fazerLogin);
  document.getElementById("btn-cadastro").addEventListener("click", fazerCadastro);
  document.getElementById("btn-logout")?.addEventListener("click", logout);
  document.getElementById("form-lancamento").addEventListener("submit", salvarLancamento);
  
  document.getElementById("btn-ler-comprovante").addEventListener("click", lerComprovante);

  const inputComprovante = document.getElementById("input-comprovante");
  if (inputComprovante) {
    inputComprovante.addEventListener("change", function() {
      const label = document.getElementById("label-comprovante");
      if (this.files && this.files.length > 0) {
        label.innerHTML = `📄 ${this.files[0].name}`;
        label.classList.add("arquivo-selecionado");
      } else {
        label.innerHTML = `📁 Escolher Imagem`;
        label.classList.remove("arquivo-selecionado");
      }
    });
  }
}

function iniciarNavegacao() {
  const links = document.querySelectorAll(".nav-item");

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tela").forEach(tela => tela.classList.remove("active"));

      link.classList.add("active");
      document.getElementById(link.dataset.tela).classList.add("active");
    });
  });
}

function iniciarGrafico() {
  const canvas = document.getElementById("graficoPizza");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  grafico = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Gastos", "Sobra"],
      datasets: [{
        data: [0, 0],
        backgroundColor: ["#64748B", "#163E3C"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

async function fazerLogin(e) {
  if (e) e.preventDefault(); 

  const email = document.getElementById("email-login").value;
  const password = document.getElementById("senha-login").value;

  if (!email || !password) {
    alert("Preencha email e senha");
    return;
  }

  try {
    const { error } = await meuSupabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    document.getElementById("email-login").value = "";
    document.getElementById("senha-login").value = "";
    
    liberarSistema();
    carregarDados();
  } catch (err) {
    alert("Erro ao entrar: " + err.message);
  }
}

async function fazerCadastro(e) {
  if (e) e.preventDefault(); 

  const email = document.getElementById("email-login").value;
  const password = document.getElementById("senha-login").value;

  if (!email || !password) {
    alert("Preencha email e senha");
    return;
  }

  try {
    const { error } = await meuSupabase.auth.signUp({ email, password });
    if (error) throw error;
    alert("Conta criada com sucesso! Agora você pode entrar.");
  } catch (err) {
    alert("Erro ao cadastrar: " + err.message);
  }
}

async function logout() {
  await meuSupabase.auth.signOut();
  movimentacoes = [];
  location.reload();
}

function liberarSistema() {
  document.getElementById("tela-login").classList.remove("active");
  document.querySelectorAll(".tela").forEach(tela => tela.classList.remove("active"));
  document.getElementById("tela-dashboard").classList.add("active");
  document.querySelector(".bottom-nav").style.display = "flex";
}

async function carregarDados() {
  try {
    const { data: { user } } = await meuSupabase.auth.getUser();
    if (!user) return;

    const { data, error } = await meuSupabase
      .from("movimentacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) throw error;
    movimentacoes = data || [];
    atualizarDashboard();
  } catch (err) {
    console.error(err);
  }
}

async function salvarLancamento(e) {
  e.preventDefault();

  try {
    const { data: { user } } = await meuSupabase.auth.getUser();

    if (!user) {
      alert("Usuário não autenticado");
      return;
    }

    const novaMovimentacao = {
      user_id: user.id,
      tipo: document.getElementById("tipo").value,
      desc: document.getElementById("descricao").value,
      valor: Number(document.getElementById("valor").value),
      categoria: document.getElementById("categoria").value,
      vencimento: document.getElementById("vencimento").value
    };

    const { data, error } = await meuSupabase
      .from("movimentacoes")
      .insert([novaMovimentacao])
      .select();

    if (error) throw error;

    movimentacoes.unshift(data[0]);
    atualizarDashboard();
    document.getElementById("form-lancamento").reset();
    
    const ocrStatus = document.getElementById("ocr-status");
    if(ocrStatus) ocrStatus.innerText = "";
    
    const labelComprovante = document.getElementById("label-comprovante");
    if(labelComprovante) {
      labelComprovante.innerHTML = `📁 Escolher Imagem`;
      labelComprovante.classList.remove("arquivo-selecionado");
    }
    
    alert("Lançamento salvo!");

  } catch (err) {
    alert(err.message);
  }
}

function atualizarDashboard() {
  let renda = 0;
  let gastos = 0;
  let inicio = 0;
  let meio = 0;

  movimentacoes.forEach(item => {
    if (item.tipo === "ganho") {
      renda += Number(item.valor);
    } else {
      gastos += Number(item.valor);
      if (item.vencimento === "inicio") inicio += Number(item.valor);
      if (item.vencimento === "meio") meio += Number(item.valor);
    }
  });

  elementos.rendaTotal.innerText = formatarMoeda(renda);
  elementos.contasInicio.innerText = formatarMoeda(inicio);
  elementos.contasMeio.innerText = formatarMoeda(meio);
  elementos.saidas.innerText = formatarMoeda(gastos);
  elementos.sobra.innerText = formatarMoeda(renda - gastos);

  atualizarGrafico(gastos, renda);
  atualizarProgressoMes();
  renderizarExtrato();
}

function atualizarGrafico(gastos, renda) {
  if (!grafico) return;
  grafico.data.datasets[0].data = [gastos, Math.max(0, renda - gastos)];
  grafico.update();
}

function atualizarProgressoMes() {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const totalDias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const porcentagem = (diaAtual / totalDias) * 100;
  
  const barra = document.getElementById("barra-progresso");
  const texto = document.getElementById("texto-progresso");

  if (barra) barra.style.width = `${porcentagem}%`;
  if (texto) texto.innerText = `Dia ${diaAtual} de ${totalDias}`;
}

function renderizarExtrato() {
  elementos.lista.innerHTML = "";

  if(movimentacoes.length === 0) {
    elementos.lista.innerHTML = "<p style='text-align:center; color:#94A3B8; margin-top:20px;'>Nenhum lançamento encontrado.</p>";
    return;
  }

  movimentacoes.forEach(item => {
    elementos.lista.innerHTML += `
      <div class="item-gasto">
        <div class="item-info">
          <h4>${item.desc}</h4>
          <span class="badge">${item.categoria || "Geral"}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <strong style="color: ${item.tipo === 'ganho' ? 'var(--green)' : 'var(--text)'}">${formatarMoeda(item.valor)}</strong>
          <button class="btn-excluir" onclick="excluirMovimentacao('${item.id}')">✕</button>
        </div>
      </div>
    `;
  });
}

window.excluirMovimentacao = async function(id) {
  const confirmar = confirm("Excluir lançamento?");
  if (!confirmar) return;

  try {
    const { error } = await meuSupabase.from("movimentacoes").delete().eq("id", id);
    if (error) throw error;
    movimentacoes = movimentacoes.filter(item => item.id !== id);
    atualizarDashboard();
  } catch (err) {
    alert(err.message);
  }
};

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ==========================================
// LEITOR DE COMPROVANTE — Claude Vision API
// ==========================================
async function lerComprovante() {
  const inputEl = document.getElementById("input-comprovante");
  const statusEl = document.getElementById("ocr-status");
  const btnEl = document.getElementById("btn-ler-comprovante");
  const previewEl = document.getElementById("ocr-preview");

  if (!inputEl.files || inputEl.files.length === 0) {
    mostrarStatus("⚠️ Selecione uma imagem primeiro!", "aviso");
    return;
  }

  const file = inputEl.files[0];

  // Mostra preview da imagem selecionada
  const urlPreview = URL.createObjectURL(file);
  if (previewEl) {
    previewEl.src = urlPreview;
    previewEl.style.display = "block";
  }

  mostrarStatus("⏳ Analisando comprovante...", "carregando");
  btnEl.disabled = true;

  try {
    // Converte imagem para base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const mediaType = file.type || "image/jpeg";

    // Chama a API Claude com visão
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 }
            },
            {
              type: "text",
              text: `Analise este comprovante ou nota fiscal e extraia as informações de pagamento.
Responda SOMENTE com um JSON válido, sem texto adicional, sem markdown, sem explicações:
{
  "valor": <número decimal, ex: 45.90>,
  "descricao": "<descrição curta do estabelecimento ou tipo de gasto, máx 40 chars>",
  "categoria": "<uma dessas exatamente: Essencial, Lazer, Cartão>"
}
Se não conseguir identificar o valor, retorne {"valor": null, "descricao": "", "categoria": "Essencial"}.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const textoResposta = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    // Parse seguro do JSON retornado
    const limpo = textoResposta.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(limpo);

    if (resultado.valor !== null && resultado.valor !== undefined) {
      document.getElementById("valor").value = resultado.valor;

      if (resultado.descricao) {
        document.getElementById("descricao").value = resultado.descricao;
      }

      if (resultado.categoria) {
        const selectCategoria = document.getElementById("categoria");
        const opcoes = Array.from(selectCategoria.options).map(o => o.value);
        if (opcoes.includes(resultado.categoria)) {
          selectCategoria.value = resultado.categoria;
        }
      }

      // Garante que o tipo está como "gasto"
      document.getElementById("tipo").value = "gasto";

      mostrarStatus(`✅ Extraído: R$ ${resultado.valor} — ${resultado.descricao || ""}`, "sucesso");
    } else {
      mostrarStatus("⚠️ Valor não identificado. Preencha manualmente.", "aviso");
    }

  } catch (err) {
    console.error("Erro ao analisar comprovante:", err);
    mostrarStatus("❌ Erro ao analisar. Tente novamente.", "erro");
  } finally {
    btnEl.disabled = false;
  }
}

// Exibe mensagem de status com estilo visual
function mostrarStatus(mensagem, tipo) {
  const el = document.getElementById("ocr-status");
  if (!el) return;
  el.innerText = mensagem;
  el.className = "status-ocr status-" + tipo;
}