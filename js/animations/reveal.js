// ============================================================
// APARICIÓN DE CONTENIDO AL HACER SCROLL
// ============================================================
// Cada bloque entra cuando asoma por la parte baja de la ventana, una sola vez
// (no se vuelve a ocultar al subir: eso marea).
//
// Se animan los elementos DE DENTRO de cada sección, nunca la sección entera.
// Las secciones llevan un fondo negro translúcido: si se les animara la
// opacidad, el panel entero parpadearía y dejaría ver el fondo por debajo.
//
// Todas las animaciones empiezan con gsap.from, es decir, el estado de reposo
// es el natural del HTML. Si este archivo no llegara a cargar, el contenido se
// ve completo en lugar de quedarse invisible.
// ============================================================

import { gsap, ScrollTrigger } from "../lib/gsap.js";

// Cuánto suben los elementos al aparecer, en píxeles
const DESPLAZAMIENTO_PX = 32;

// Duración de cada aparición y separación entre elementos de un mismo grupo
const DURACION = 0.75;
const RETARDO_ENTRE_ELEMENTOS = 0.09;

// Lista de conjuntos: qué elementos aparecen juntos y desde dónde se dispara
const GRUPOS = [
  { disparador: "#projects", objetivo: "#projects .card", retardo: 0.1 },
  {
    disparador: "#certifications",
    objetivo: "#certifications .certificate-card",
    retardo: 0.08,
    limpiar: true, // Estas tarjetas luego las mueve Flip: no conviene dejar restos
  },
  { disparador: "#resume", objetivo: "#resume .resume-tab" },
  { disparador: "#skills", objetivo: "#skills .skill-item", retardo: 0.045 },
  { disparador: "#contact", objetivo: "#contact .wa-chat" },
  { disparador: "#contact", objetivo: "#contact .social-icons a", retardo: 0.08 },
  { disparador: "footer", objetivo: "footer p" },
  { disparador: "footer", objetivo: "footer .social-icons a", retardo: 0.08 },
];

// Párrafos de introducción que hay bajo algunos títulos de sección
const SELECTOR_INTRODUCCIONES = [
  "#about .container > p",
  "#contact .container > p",
  ".certifications-intro",
  ".resume-intro",
  ".skills-intro",
].join(", ");

// ===== Revelar un conjunto =====
// objetivo  selector CSS de los elementos que aparecen
// opciones  disparador (selector del que marca el momento), retardo entre
//           elementos y limpiar (borrar los estilos en línea al terminar)
function revelarAlEntrar(objetivo, opciones = {}) {
  const elementos = gsap.utils.toArray(objetivo);

  if (elementos.length === 0) return null;

  const disparador = opciones.disparador
    ? document.querySelector(opciones.disparador)
    : elementos[0];

  if (!disparador) return null;

  const configuracion = {
    y: DESPLAZAMIENTO_PX,
    opacity: 0,
    duration: DURACION,
    stagger: opciones.retardo ?? RETARDO_ENTRE_ELEMENTOS,
    scrollTrigger: {
      trigger: disparador,
      start: "top 85%",
      once: true, // Aparece una vez y se queda
    },
  };

  if (opciones.limpiar) {
    // Al terminar se quitan los estilos en línea, para que el elemento quede
    // exactamente como lo describe el CSS
    configuracion.clearProps = "all";
  }

  return gsap.from(elementos, configuracion);
}

// ===== Títulos de sección =====
// Cada h2 se dispara con su propia sección, no todos a la vez
function revelarTitulosDeSeccion() {
  gsap.utils.toArray("section h2").forEach((titulo) => {
    gsap.from(titulo, {
      y: 26,
      opacity: 0,
      duration: 0.7,
      scrollTrigger: {
        trigger: titulo,
        start: "top 88%",
        once: true,
      },
    });
  });
}

// ===== Arranque =====
export function prepararRevelados() {
  if (!ScrollTrigger) return;

  revelarTitulosDeSeccion();
  revelarAlEntrar(SELECTOR_INTRODUCCIONES, { retardo: 0.07 });

  GRUPOS.forEach((grupo) => {
    revelarAlEntrar(grupo.objetivo, {
      disparador: grupo.disparador,
      retardo: grupo.retardo,
      limpiar: grupo.limpiar,
    });
  });
}
