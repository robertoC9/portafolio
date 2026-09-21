// ============================================================
// ENTRADA DEL HERO
// ============================================================
// El titular se parte en palabras y cada una sube desde abajo con un pequeño
// giro; después entra el subtítulo. Se anima por palabras y no por letras a
// propósito: el titular lleva letter-spacing, y al separar cada letra en su
// propio elemento la separación se duplicaría y el texto se vería desarmado.
// ============================================================

import { gsap, SplitText } from "../lib/gsap.js";

const SELECTOR_CONTENIDO = ".hero-content";
const SELECTOR_TITULO = ".modern-title";
const SELECTOR_SUBTITULO = ".hero-subtitle";

// Retardo inicial: da tiempo a que el navegador pinte antes de mover nada
const RETARDO_INICIAL = 0.2;

// ===== División del titular en palabras =====
// Si SplitText no cargó, devuelve null y quien llama anima el titular entero.
function dividirEnPalabras(elemento) {
  if (!SplitText) return null;

  try {
    // aria: "auto" deja el texto legible para lectores de pantalla pese a
    // estar troceado en decenas de elementos
    return new SplitText(elemento, { type: "words", aria: "auto" });
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
    const division = dividirEnPalabras(titulo);

    if (division?.words?.length) {
      linea.from(
        division.words,
        {
          yPercent: 115,
          opacity: 0,
          rotateX: -60,
          duration: 1,
          stagger: 0.06,
          ease: "power4.out",
        },
        0
      );
    } else {
      // Reserva: el titular completo entra deslizándose
      linea.from(titulo, { y: 44, opacity: 0, duration: 1 }, 0);
    }
  }

  if (subtitulo) {
    // Empieza antes de que terminen las palabras, para que se solapen
    linea.from(subtitulo, { y: 26, opacity: 0, duration: 0.7 }, "-=0.45");
  }

  return linea;
}
