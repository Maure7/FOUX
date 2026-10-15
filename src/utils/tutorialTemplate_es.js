/* Tutorial educativo en español. Conserva la estructura y las clases del modelo portugués. */
export const TUTORIAL_HTML_ES = `<!DOCTYPE html>
<html lang="es-419">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- Hoja de estilos dedicada a las reglas :hover generadas por FOUX -->
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
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 12px;
      text-align: center;
      font-size: 0.9rem;
      color: #666;
      overflow: hidden;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }

    /* Caja única: aislamiento, alta especificidad y esquinas redondeadas. */
    #caja-unica,
    .box-demo#caja-unica,
    #seccion-cajas #caja-unica,
    #seccion-cajas .box-demo#caja-unica {
      border-radius: 16px !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      position: relative;
    }

    .box-row {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .box-row .box-demo {
      flex: 1;
      min-width: 140px;
      border-radius: 16px;
      overflow: hidden;
      box-sizing: border-box;
    }

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

  <!-- Banner principal -->
  <div id="tutorial-banner" class="tutorial-banner">
    <h1> Bienvenido al Tutorial FOUX</h1>
    <p>¡Haz clic en los elementos de abajo y usa el panel lateral para cambiar colores, fuentes, bordes y mucho más!</p>
  </div>

  <!-- Sección 1: títulos y párrafos -->
  <section id="seccion-titulos">
    <h2>1. Títulos y Párrafos</h2>
    <h3 id="titulo-ejercicio">Cambia el color y el tamaño de este título</h3>
    <p class="exercise" id="parrafo-ejercicio">
      Cambia la alineación y la familia de fuente de este párrafo.
      Prueba centrar, justificar o cambiar la fuente para ver la diferencia.
    </p>
    <p class="exercise">
      Este es otro párrafo de práctica. Intenta cambiar el color del texto y la opacidad con los controles de FOUX.
    </p>
  </section>

  <!-- Sección 2: cajas y contenedores -->
  <section id="seccion-cajas">
    <h2>2. Cajas y Contenedores</h2>
    <div class="box-demo" id="caja-unica">
      Ajusta el padding, el margin y las esquinas redondeadas (border-radius) de esta caja.
      Prueba también cambiar el color de fondo y el borde.
    </div>
    <div class="box-row">
      <div class="box-demo" id="caja-a">Caja A — Cambia el borde</div>
      <div class="box-demo" id="caja-b">Caja B — Cambia el fondo</div>
      <div class="box-demo" id="caja-c">Caja C — Prueba un degradado</div>
    </div>
  </section>

  <!-- Sección 3: botones y enlaces -->
  <section id="seccion-botones">
    <h2>3. Botones y Enlaces</h2>
    <p class="exercise">
      Configura el color de fondo y prueba el efecto hover en los botones de abajo.
      ¡Usa la pestaña "Eventos" para definir la sombra y la escala al pasar el cursor!
    </p>
    <button class="btn-demo" id="boton-primario">Botón Primario</button>
    <button class="btn-demo btn-secondary" id="boton-secundario">Botón Secundario</button>
    <br/><br/>
    <a href="#" class="link-demo" id="enlace-demo-1">Enlace de ejemplo 1</a>
    <a href="#" class="link-demo" id="enlace-demo-2">Enlace de ejemplo 2</a>
  </section>

  <!-- Sección 4: imágenes -->
  <section id="seccion-imagenes">
    <h2>4. Imágenes</h2>
    <p class="exercise">
      Redimensiona esta imagen y cambia sus bordes y esquinas redondeadas. Prueba también la alineación (float).
    </p>
    <img
      class="img-demo"
      id="imagen-demo"
      src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=560&h=360&fit=crop"
      alt="Paisaje de muestra para un ejercicio de estilos"
    />
  </section>

  <!-- Sección 5: tarjetas y cuadrícula -->
  <section id="seccion-tarjetas">
    <h2>5. Tarjetas y Diseño en Cuadrícula</h2>
    <p class="exercise">
      Haz clic en cada tarjeta y personaliza sus colores, bordes y espaciado de forma individual.
    </p>
    <div class="card-grid">
      <div class="card-item" id="tarjeta-1">
        <h4>Tarjeta 1</h4>
        <p>Cambia el color de fondo</p>
      </div>
      <div class="card-item" id="tarjeta-2">
        <h4>Tarjeta 2</h4>
        <p>Agrega bordes de colores</p>
      </div>
      <div class="card-item" id="tarjeta-3">
        <h4>Tarjeta 3</h4>
        <p>Prueba las esquinas redondeadas</p>
      </div>
    </div>
  </section>

  <!-- Pie de página -->
  <footer class="tutorial-footer" id="tutorial-footer">
    ¡Prueba también agregar algún estilo al pie de página!
  </footer>

</body>
</html>`;
