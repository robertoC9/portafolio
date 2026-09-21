// ============================================================
// ENTRADA DE LA ESCENA 3D: PUNTERO Y SCROLL
// ============================================================
// La cámara del fondo reacciona al puntero y al desplazamiento de la página.
// Los valores llegan a saltos (cada movimiento del ratón, cada píxel de
// scroll), así que aquí se suavizan con una amortiguación exponencial: sin
// eso la cámara tiembla y la escena se siente nerviosa.
// ============================================================

// Fracción del recorrido que se recorre por fotograma hacia el valor real.
// Cuanto más bajo, más lento y más suave el seguimiento.
const AMORTIGUACION = 0.045;

// Cuánto puede inclinarse la cámara con el puntero, en unidades de mundo
const RECORRIDO_PUNTERO_X = 2.6;
const RECORRIDO_PUNTERO_Y = 1.6;

export function crearRastreadorDeEntrada() {
  // Valores objetivos (crudos) y valores suavizados (los que se usan)
  let objetivoX = 0;
  let objetivoY = 0;
  let suaveX = 0;
  let suaveY = 0;
  let scrollObjetivo = 0;
  let scrollSuave = 0;

  // El puntero se normaliza a -1..1 tomando el centro de la pantalla como cero
  function alMoverPuntero(evento) {
    objetivoX = (evento.clientX / window.innerWidth) * 2 - 1;
    objetivoY = (evento.clientY / window.innerHeight) * 2 - 1;
  }

  // El scroll se normaliza a 0..1 sobre el recorrido total de la página
  function alDesplazar() {
    const recorrido = document.documentElement.scrollHeight - window.innerHeight;
    scrollObjetivo = recorrido > 0 ? window.scrollY / recorrido : 0;
  }

  // touchmove y el lápiz también emiten pointermove, así que un solo
  // escuchador cubre ratón, dedo y stylus.
  window.addEventListener("pointermove", alMoverPuntero, { passive: true });
  window.addEventListener("scroll", alDesplazar, { passive: true });
  alDesplazar();

  return {
    // Avanza la amortiguación. Se llama una vez por fotograma.
    actualizar() {
      suaveX += (objetivoX - suaveX) * AMORTIGUACION;
      suaveY += (objetivoY - suaveY) * AMORTIGUACION;
      scrollSuave += (scrollObjetivo - scrollSuave) * AMORTIGUACION;
    },

    // Desplazamiento de cámara ya suavizado, en unidades de mundo
    desplazamientoPunteroX() {
      return suaveX * RECORRIDO_PUNTERO_X;
    },
    desplazamientoPunteroY() {
      // El eje Y de la pantalla crece hacia abajo y el del mundo hacia arriba
      return -suaveY * RECORRIDO_PUNTERO_Y;
    },

    // Progreso de lectura de la página, de 0 (arriba) a 1 (final)
    progresoDeScroll() {
      return scrollSuave;
    },

    destruir() {
      window.removeEventListener("pointermove", alMoverPuntero);
      window.removeEventListener("scroll", alDesplazar);
    },
  };
}
