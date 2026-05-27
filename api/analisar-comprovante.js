export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { base64, mediaType } = req.body;

  if (!base64 || !mediaType) {
    return res.status(400).json({ error: "Imagem não enviada" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
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
      const erro = await response.text();
      return res.status(502).json({ error: "Erro na API Anthropic", detalhe: erro });
    }

    const data = await response.json();
    const texto = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    const limpo = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(limpo);

    return res.status(200).json(resultado);

  } catch (err) {
    console.error("Erro no proxy:", err);
    return res.status(500).json({ error: "Erro interno", detalhe: err.message });
  }
}
