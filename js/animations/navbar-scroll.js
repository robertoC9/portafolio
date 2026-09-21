// ============================================================
// BARRA DE NAVEGACIÓN
// ============================================================
// Dos cosas distintas:
//  1. El estado "compacta": al bajar por la página el navbar encoge y gana
//     fondo. Es información útil (cuánto se ha leído), así que funciona con o
//     sin animaciones.
//  2. La entrada: el navbar baja desde arriba al cargar. Es decoración, así
//     que solo se activa cuando el sistema no pide menos movimiento.
// ============================================================

import { gsap, ScrollTrigger } from "../lib/gsap.js";

const SELECTOR_NAVBAR = ".navbar";
const SELECTOR_MARCA = ".navbar-brand";
const SELECTOR_LOGO = ".logo-right";

// Clase que aplica el CSS para el estado compacto
const CLASE_COMPACTA = "navbar-compacta";

// A partir de cuántos píxeles de scroll se compacta
const UMBRAL_COMPACTA_PX = 70;

// Truco conocido de ScrollTrigger para un estado que dura hasta el final:
// un "end" muy grande equivale a "hasta que se acabe la página"
const FIN_PRACTICO = 99999;

// ===== Estado compacto (funcional) =====
export function prepararNavbarCompacta() {
  const navbar = document.querySelector(SELECTOR_NAVBAR);

  if (!navbar || !ScrollTrigger) return null;

  return ScrollTrigger.create({
    start: UMBRAL_COMPACTA_PX,
    end: FIN_PRACTICO,
    toggleClass: { targets: navbar, className: CLASE_COMPACTA },
  });
}

// ===== Entrada animada (decorativa) =====
export function animarEntradaNavbar() {
  const navbar = document.querySelector(SELECTOR_NAVBAR);
  if (!navbar) return null;

  const marca = navbar.querySelector(SELECTOR_MARCA);
  const logo = navbar.querySelector(SELECTOR_LOGO);

  const linea = gsap.timeline({ delay: 0.1 });

  linea.from(navbar, { y: -70, opacity: 0, duration: 0.9, ease: "power3.out" }, 0);

  if (marca) {
    linea.from(marca, { opacity: 0, x: -22, duration: 0.6 }, 0.35);
  }

  if (logo) {
    // La escala termina justo cuando arranca el giro continuo del logo, así
    // que la entrada y el bucle se encadenan sin salto
    linea.from(logo, { opacity: 0, scale: 0.5, duration: 0.6 }, 0.4);
  }

  return linea;
}
