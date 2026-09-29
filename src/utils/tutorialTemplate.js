/* ===================================================================
   tutorialTemplate.js — Documento HTML educativo embutido para o FOUX.
   Usado ao instanciar um projeto do tipo "TUTORIAL" via modal do Dashboard.
   O conteúdo é semântico, limpo e orientado a exercícios de estilização.
   =================================================================== */

export const TUTORIAL_PROJECT_NAME = 'TUTORIAL';

export const TUTORIAL_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Folha de estilos dedicada para regras :hover geradas pelo FOUX -->
  <style id="foux-user-hover-rules"></style>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f5f5f5;
      color: #333;
      padding: 32px 24px;
      line-height: 1.6;
    }
    .tutorial-banner {
      background: linear-gradient(135deg, #e59843, #9333ea);
      color: #fff;
      padding: 28px 32px;
      border-radius: 14px;
      margin-bottom: 28px;
      text-align: center;
      overflow: hidden;
    }
    .tutorial-banner h1 { font-size: 1.75rem; margin-bottom: 6px; }
    .tutorial-banner p { font-size: 0.95rem; opacity: 0.9; }

    section { margin-bottom: 28px; }

    h2 {
      font-size: 1.35rem;
      color: #222;
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 6px;
      margin-bottom: 14px;
    }
    h3 { font-size: 1.1rem; color: #555; margin-bottom: 8px; }

    p.exercise {
      background: #fff;
      border-left: 4px solid #e59843;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 0.92rem;
    }

    .box-demo {
      background-color: #fff;
      border: 2px solid #ddd;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 12px;
      text-align: center;
      font-size: 0.9rem;
      color: #666;
    }
    .box-row {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .box-row .box-demo { flex: 1; min-width: 140px; }

    .btn-demo {
      display: inline-block;
      background-color: #e59843;
      color: #fff;
      padding: 12px 28px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      cursor: pointer;
      margin: 6px 8px 6px 0;
      transition: all 0.25s ease;
    }
    .btn-demo:hover { opacity: 0.85; }
    .btn-secondary {
      background-color: #9333ea;
    }

    a.link-demo {
      color: #9333ea;
      text-decoration: underline;
      font-size: 0.95rem;
      margin-right: 16px;
    }

    .img-demo {
      display: block;
      width: 280px;
      height: 180px;
      object-fit: cover;
      border-radius: 10px;
      border: 2px solid #ddd;
      margin: 12px 0;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 12px;
    }
    .card-item {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .card-item h4 { font-size: 1rem; margin-bottom: 6px; color: #333; }
    .card-item p { font-size: 0.85rem; color: #777; }

    footer.tutorial-footer {
      text-align: center;
      padding: 20px;
      font-size: 0.8rem;
      color: #999;
      border-top: 1px solid #e5e5e5;
      margin-top: 32px;
    }
  </style>
</head>
<body>

  <!-- ── Banner Principal ── -->
  <div id="tutorial-banner" class="tutorial-banner">
    <h1> Bem-vindo ao Tutorial FOUX</h1>
    <p>Clique nos elementos abaixo e use o painel lateral para alterar cores, fontes, bordas e muito mais!</p>
  </div>

  <!-- ── Seção 1: Títulos e Parágrafos ── -->
  <section id="secao-titulos">
    <h2>1. Títulos e Parágrafos</h2>
    <h3 id="titulo-exercicio">Mude a cor e o tamanho deste título</h3>
    <p class="exercise" id="paragrafo-exercicio">
      Altere o alinhamento e a família da fonte deste parágrafo.
      Experimente centralizar, justificar ou trocar a fonte para ver a diferença.
    </p>
    <p class="exercise">
      Este é outro parágrafo de prática. Tente mudar a cor do texto e a opacidade usando os controles do FOUX.
    </p>
  </section>

  <!-- ── Seção 2: Caixas e Containers ── -->
  <section id="secao-caixas">
    <h2>2. Caixas e Containers</h2>
    <div class="box-demo" id="box-unica">
      Ajuste o padding, margin e o arredondamento (border-radius) desta box.
      Experimente também mudar a cor de fundo e a borda.
    </div>
    <div class="box-row">
      <div class="box-demo" id="box-a">Box A — Altere a borda</div>
      <div class="box-demo" id="box-b">Box B — Mude o fundo</div>
      <div class="box-demo" id="box-c">Box C — Teste gradiente</div>
    </div>
  </section>

  <!-- ── Seção 3: Botões e Links ── -->
  <section id="secao-botoes">
    <h2>3. Botões e Links</h2>
    <p class="exercise">
      Configure a cor de fundo e teste o efeito hover nos botões abaixo.
      Use a aba "Eventos" para definir sombra e escala no hover!
    </p>
    <button class="btn-demo" id="btn-primario">Botão Primário</button>
    <button class="btn-demo btn-secondary" id="btn-secundario">Botão Secundário</button>
    <br/><br/>
    <a href="#" class="link-demo" id="link-demo-1">Link de exemplo 1</a>
    <a href="#" class="link-demo" id="link-demo-2">Link de exemplo 2</a>
  </section>

  <!-- ── Seção 4: Imagens ── -->
  <section id="secao-imagens">
    <h2>4. Imagens</h2>
    <p class="exercise">
      Redimensione esta imagem, altere suas bordas e arredondamento. Teste também o alinhamento (float).
    </p>
    <img
      class="img-demo"
      id="img-demo"
      src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=560&h=360&fit=crop"
      alt="Paisagem demonstrativa para exercício de estilização"
    />
  </section>

  <!-- ── Seção 5: Cards / Grid ── -->
  <section id="secao-cards">
    <h2>5. Cards e Layout em Grid</h2>
    <p class="exercise">
      Clique em cada card e personalize suas cores, bordas e espaçamento individualmente.
    </p>
    <div class="card-grid">
      <div class="card-item" id="card-1">
        <h4>Card 1</h4>
        <p>Altere a cor de fundo</p>
      </div>
      <div class="card-item" id="card-2">
        <h4>Card 2</h4>
        <p>Adicione bordas coloridas</p>
      </div>
      <div class="card-item" id="card-3">
        <h4>Card 3</h4>
        <p>Teste o arredondamento</p>
      </div>
    </div>
  </section>

  <!-- ── Rodapé ── -->
  <footer class="tutorial-footer" id="tutorial-footer">
    Experimente também adicionar algum estilo para o rodapé!
  </footer>

</body>
</html>`;
