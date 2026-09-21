// ============================================================
// BARRA DE PROGRESO DE LECTURA
// ============================================================
// Una línea dorada fina en el borde superior que se llena a medida que se
// recorre la página. Se crea desde JavaScript y no desde el HTML a propósito:
// sin JavaScript no aparece, en lugar de quedarse como una barra vacía parada.
// ============================================================

import { gsap, ScrollTrigger } from "../lib/gsap.js";

const CLASE_BARRA = "scroll-progreso";
const CLASE_RELLENO = "scroll-progreso-relleno";

// Suavizado del agarre al scroll: 0 sería rígido, valores altos van con retraso
const SUAVIZADO = 0.35;

export function crearBarraDeProgreso() {
  if (!ScrollTrigger) return null;

  const barra = document.createElement("div");
  barra.className = CLASE_BARRA;
  barra.setAttribute("aria-hidden", "true");

  const relleno = document.createElement("span");
  relleno.className = CLASE_RELLENO;
  barra.appendChild(relleno);

  document.body.appendChild(barra);

  // scaleX en lugar de width: se anima en la tarjeta gráfica y no obliga al
  // navegador a recalcular la maquetación en cada fotograma
  const animacion = gsap.fromTo(
    relleno,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: SUAVIZADO,
        invalidateOnRefresh: true,
      },
    }
  );

  return {
    barra,

    destruir() {
      animacion.scrollTrigger?.kill();
      animacion.kill();
      barra.remove();
    },
  };
}
