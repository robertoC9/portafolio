// ============================================================
// ANIMACIONES CONTINUAS: LOGO Y RETRATO
// ============================================================
// Sustituyen a los setInterval de 30 ms que usaba script.js. La diferencia no
// es cosmética: un setInterval escribe estilos en cada tic aunque la pestaña
// esté en segundo plano o el elemento ni siquiera se vea, mientras que GSAP
// comparte un único bucle atado a los fotogramas reales del navegador, lo
// pausa cuando la pestaña no se ve y usa transformaciones ya compuestas.
//
// El retrato primero entra con un pequeño rebote y solo después empieza su
// latido: si las dos animaciones tocaran la escala a la vez, se pelearían.
// ============================================================

import { gsap } from "../lib/gsap.js";

const SELECTOR_LOGO = "#logo";
const SELECTOR_RETRATO = "#retrato";

// Logo
const DURACION_VUELTA = 18; // Segundos que tarda en dar una vuelta completa
const ESCALA_LOGO = 1.08;
const DURACION_LATIDO_LOGO = 1.15;

// Retrato
const ESCALA_RETRATO = 1.06;
const DURACION_LATIDO_RETRATO = 1.8;
const RETARDO_ENTRADA_RETRATO = 0.55;

// Las pulsaciones arrancan después de que termine la entrada del navbar, para
// que no se solapen dos movimientos en la misma zona de la pantalla
const RETARDO_PULSACIONES = 1;

// ===== Logo =====
function animarLogo() {
  const logo = document.querySelector(SELECTOR_LOGO);
  if (!logo) return null;

  const linea = gsap.timeline({ delay: RETARDO_PULSACIONES });

  // Giro continuo en un solo sentido, como el original. Es lineal a propósito:
  // cualquier aceleración se notaría como un tirón al repetir.
  linea.to(
    logo,
    {
      rotation: -360,
      duration: DURACION_VUELTA,
      ease: "none",
      repeat: -1,
    },
    0
  );

  // Rebote suave, en una animación aparte para que no altere el ritmo del giro
  linea.to(
    logo,
    {
      scale: ESCALA_LOGO,
      duration: DURACION_LATIDO_LOGO,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    },
    0
  );

  return linea;
}

// ===== Retrato =====
function animarRetrato() {
  const retrato = document.querySelector(SELECTOR_RETRATO);
  if (!retrato) return null;

  return gsap.from(retrato, {
    opacity: 0,
    scale: 0.82,
    duration: 0.9,
    delay: RETARDO_ENTRADA_RETRATO,
    ease: "back.out(1.6)",
    onComplete: () => {
      // El latido empieza cuando la entrada ya terminó
      gsap.to(retrato, {
        scale: ESCALA_RETRATO,
        duration: DURACION_LATIDO_RETRATO,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    },
  });
}

// ===== Arranque =====
export function iniciarAnimacionesContinuas() {
  return {
    logo: animarLogo(),
    retrato: animarRetrato(),
  };
}
