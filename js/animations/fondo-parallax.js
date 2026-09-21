// ============================================================
// PARALLAX DEL FONDO
// ============================================================
// La imagen de fondo está fija y cubre toda la ventana. Al desplazarla un poco
// más despacio que el contenido, las secciones parecen flotar por delante.
//
// La imagen se agranda algo más de lo que se desplaza: si el desplazamiento
// superara el margen que da el agrandado, se asomarían los bordes de la
// ventana y se vería el hueco por arriba o por abajo.
// ============================================================

import { gsap, ScrollTrigger } from "../lib/gsap.js";

const SELECTOR_FONDO = ".image-container";

// Agrandado de la imagen. El margen que gana por lado es (ESCALA - 1) / 2, es
// decir un 9%: más que suficiente para el desplazamiento de abajo.
const ESCALA = 1.18;

// Desplazamiento en porcentaje de la altura de la imagen, hacia cada lado
const DESPLAZAMIENTO_PORCENTAJE = 6;

// Suavizado del agarre al scroll
const SUAVIZADO = 0.6;

export function animarFondoDePagina() {
  const fondo = document.querySelector(SELECTOR_FONDO);

  if (!fondo || !ScrollTrigger) return null;

  // El agrandado se deja fijo; solo se anima el desplazamiento vertical
  gsap.set(fondo, { scale: ESCALA });

  const animacion = gsap.fromTo(
    fondo,
    { yPercent: -DESPLAZAMIENTO_PORCENTAJE },
    {
      yPercent: DESPLAZAMIENTO_PORCENTAJE,
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
    destruir() {
      animacion.scrollTrigger?.kill();
      animacion.kill();
      // Se devuelve el fondo a su estado original, sin transformaciones
      gsap.set(fondo, { clearProps: "transform" });
    },
  };
}
