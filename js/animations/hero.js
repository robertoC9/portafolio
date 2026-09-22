// ============================================================
// ENTRADA DEL HERO
// ============================================================
// El titular se parte en LETRAS y cada una se ensambla al cargar: nace
// diminuta, girada y abajo, y aterriza con un ligero sobrepaso (back.out),
// en una onda que arranca del centro y se extiende hacia los extremos.
// Después entra el subtítulo.
//
// Trocear por letras NO es trivial aquí: el titular lleva letter-spacing
// (2px, style.css), y cada letra en su propia caja hereda esa separación Y
// además recibe la que el padre pone entre cajas… se duplicaría y el texto
// se vería desarmado (el motivo por el que antes solo se partía por palabras).
// La solución está en style.css: a las letras (.char) se les quita su
// letter-spacing propio y los 2px los pone el padre entre caja y caja, que
// es exactamente lo mismo que pasaba entre letra y letra sin trocear.
//
// Cada letra necesita display: inline-block (las transformaciones no se
// aplican al texto en línea) y white-space: pre (un espacio troceado en su
// propia caja se colapsaría a cero y las palabras se pegarían). Las palabras
// quedan como cajas atómicas (.word) para que el texto SOLO pueda romperse
// entre palabras y nunca dentro de una.
//
// Si SplitText no carga, no se trocea nada: el titular entra entero
// deslizándose, y sin elementos .char/.word el CSS anterior no aplica.
// ============================================================

import { gsap, SplitText } from "../lib/gsap.js";

const SELECTOR_CONTENIDO = ".hero-content";
const SELECTOR_TITULO = ".modern-title";
const SELECTOR_SUBTITULO = ".hero-subtitle";

// Retardo inicial: da tiempo a que el navegador pinte antes de mover nada
const RETARDO_INICIAL = 0.2;

// Ensamblado de las letras
const DURACION_LETRA = 0.7;
const RETARDO_ENTRE_LETRAS = 0.02; // 26 letras ≈ 0.5 s de onda + 0.7 de vuelo
const GIRO_LETRA = 150; // Grados máximos de giro inicial (azar ±)

// ===== División del titular en letras =====
// Si SplitText no cargó, devuelve null y quien llama anima el titular entero.
function dividirEnLetras(elemento) {
  if (!SplitText) return null;

  try {
    // chars,words: las letras son las que se animan, pero siguen agrupadas
    // en palabras, que es lo que garantiza que el texto no se rompa a mitad
    // de una palabra al hacerse la ventana estrecha.
    // aria: "auto" deja el texto legible para lectores de pantalla pese a
    // estar troceado en decenas de elementos
    return new SplitText(elemento, { type: "chars,words", aria: "auto" });
  } catch (error) {
    console.warn("No se pudo dividir el titular del hero:", error);
    return null;
  }
}

export function animarEntradaHeroe() {
  const contenido = document.querySelector(SELECTOR_CONTENIDO);
  if (!contenido) return null;

  const titulo = contenido.querySelector(SELECTOR_TITULO);
  const subtitulo = contenido.querySelector(SELECTOR_SUBTITULO);

  const linea = gsap.timeline({ delay: RETARDO_INICIAL });

  if (titulo) {
    const division = dividirEnLetras(titulo);

    if (division?.chars?.length) {
      // Ensamblado: de diminutas y giradas a su sitio. La escala 0 y la
      // opacidad 0 se pintan ya en el primer fotograma (immediateRender en
      // los from), así que no parpadea el texto terminado antes de empezar.
      linea.from(
        division.chars,
        {
          scale: 0,
          rotation: () => gsap.utils.random(-GIRO_LETRA, GIRO_LETRA),
          yPercent: 70,
          opacity: 0,
          duration: DURACION_LETRA,
          ease: "back.out(2)",
          // Onda desde el centro del titular hacia ambos extremos. Cambiar
          // "center" por "random" la desordena; por "start", la alinea
          stagger: { each: RETARDO_ENTRE_LETRAS, from: "center" },
        },
        0
      );
    } else {
      // Reserva: el titular completo entra deslizándose
      linea.from(titulo, { y: 44, opacity: 0, duration: 1 }, 0);
    }
  }

  if (subtitulo) {
    // Empieza antes de que terminen las letras, para que se solapen
    linea.from(subtitulo, { y: 26, opacity: 0, duration: 0.7 }, "-=0.45");
  }

  return linea;
}
