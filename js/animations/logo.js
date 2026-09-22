// ============================================================
// ANIMACIONES CONTINUAS: LOGO, MARCA Y RETRATO
// ============================================================
// Sustituyen a los setInterval de 30 ms que usaba script.js. La diferencia no
// es cosmética: un setInterval escribe estilos en cada tic aunque la pestaña
// esté en segundo plano o el elemento ni siquiera se vea, mientras que GSAP
// comparte un único bucle atado a los fotogramas reales del navegador, lo
// pausa cuando la pestaña no se ve y usa transformaciones ya compuestas.
//
// Logo y marca del navbar comparten el mismo gesto al CLIC: crecen hasta el
// DOBLE, aguantan un instante y vuelven solos a su tamaño, sin salirse jamás
// del marco de la página (ver calcularDesplazamiento). Es el mismo gesto
// aplicado dos veces, por eso el clic vive en una fábrica común:
// montarClicAgrandable(). Además:
//  - El logo gira y late en bucle; durante el crecimiento del clic se corta
//    el latido (las dos animaciones escribirían `scale` y se pelearían). El
//    giro no se interrumpe: es otra propiedad.
//  - La marca es texto: no gira ni late, solo responde al clic.
//
// El retrato primero entra con un pequeño rebote y solo después empieza su
// latido: si las dos animaciones tocaran la escala a la vez, se pelearían.
// ============================================================

import { gsap } from "../lib/gsap.js";

const SELECTOR_LOGO = "#logo";
const SELECTOR_MARCA = ".navbar-brand";
const SELECTOR_RETRATO = "#retrato";

// Giro continuo del logo
const DURACION_VUELTA = 18; // Segundos que tarda en dar una vuelta completa
const ESCALA_LOGO = 1.08;
const DURACION_LATIDO_LOGO = 1.15;
const RETARDO_LATIDO_LOGO = 0.25; // El latido entra un pelín después del giro

// Clic agrandador (logo y marca). SUMA: crecer 0.4 + sostener 0.3 +
// volver 0.45 ≈ 1.15 s.
const ESCALA_CLIC = 2; // El doble de su tamaño
const DURACION_CLIC_SUBIR = 0.4;
const DURACION_CLIC_SOSTENER = 0.3;
const DURACION_CLIC_BAJAR = 0.45;

// Distancia mínima que respeta el elemento agrandado respecto al borde de la
// ventana: la idea es que NUNCA se salga del marco de la página, ni siquiera
// un píxel de su esquina.
const MARGEN_CLIC = 8;

// Retrato
const ESCALA_RETRATO = 1.06;
const DURACION_LATIDO_RETRATO = 1.8;
const RETARDO_ENTRADA_RETRATO = 0.55;

// ===== Clic que agranda sin salirse del marco =====
// Devuelve un desplazamiento (x, y) en coordenadas de pantalla: adónde hay
// que mover el centro para que el elemento, ya al doble, quepa entero en la
// ventana. Dos detalles:
//
//  - `girando`: si el elemento rota, qué esquina sobresale más depende del
//    instante, así que se usa la circunferencia circunscrita (la diagonal)
//    como radio. Si no gira, bastan el semiancho y el semialto: el elemento
//    apenas se mueve.
//  - El rectángulo actual (getBoundingClientRect) puede incluir el latido a
//    medias (escala ~1.06), pero eso solo ensancha el rectángulo: el CENTRO
//    es el mismo, y es lo único que se mide aquí.
function calcularDesplazamiento(rect, baseW, baseH, girando) {
  const centroX = rect.left + rect.width / 2;
  const centroY = rect.top + rect.height / 2;

  const extension = girando ? Math.hypot(baseW, baseH) / 2 : null;
  const topeX = (girando ? extension : baseW / 2) * ESCALA_CLIC;
  const topeY = (girando ? extension : baseH / 2) * ESCALA_CLIC;

  // Intervalo de centros válidos: [margen + tope, borde - margen - tope]
  const minimoX = MARGEN_CLIC + topeX;
  const maximoX = window.innerWidth - MARGEN_CLIC - topeX;
  const minimoY = MARGEN_CLIC + topeY;
  const maximoY = window.innerHeight - MARGEN_CLIC - topeY;

  // Si la ventana es tan pequeña que ni cabe, el marco imposible se resuelve
  // centrando: dentro de lo posible, es lo más dentro
  const destinoX =
    minimoX > maximoX ? window.innerWidth / 2 : Math.min(Math.max(centroX, minimoX), maximoX);
  const destinoY =
    minimoY > maximoY ? window.innerHeight / 2 : Math.min(Math.max(centroY, minimoY), maximoY);

  return { x: destinoX - centroX, y: destinoY - centroY };
}

// Fábrica del gesto: crece al doble → se sostiene → vuelve solo, siempre
// dentro del marco. `alEmpezar` libera las animaciones que pelearían por
// `scale` (el latido del logo) y `alTerminar` las relanza al aterrizar.
function montarClicAgrandable(elemento, alEmpezar, alTerminar) {
  let creciendo = false;
  let crecer = null;

  function alHacerClic() {
    // Un clic a mitad de crecimiento no apila un ciclo encima del otro
    if (creciendo) return;
    creciendo = true;

    alEmpezar?.();

    // Ajuste al marco: calculado EN EL CLIC, con la posición real del
    // elemento en ese instante (así funciona aunque la ventana haya cambiado
    // o el elemento esté en otro sitio)
    const rect = elemento.getBoundingClientRect();
    const ajuste = calcularDesplazamiento(
      rect,
      elemento.offsetWidth,
      elemento.offsetHeight,
      elemento === document.querySelector(SELECTOR_LOGO)
    );

    crecer = gsap.timeline({
      onComplete: () => {
        creciendo = false;
        crecer = null;
        alTerminar?.();
      },
    });

    // Sube con tirón rápido. NADA de back.out aquí: su sobrepaso (el rebote
    // que pasa de la meta y vuelve) mandaría la escala un instante por encima
    // de ESCALA_CLIC y sacaría una esquina del marco, que es justo lo que
    // este ajuste garantiza que no pase.
    crecer.to(
      elemento,
      {
        scale: ESCALA_CLIC,
        x: ajuste.x,
        y: ajuste.y,
        duration: DURACION_CLIC_SUBIR,
        ease: "power3.out",
      },
      0
    );

    // Hueco: DURACION_CLIC_SUBIR → + SOSTENER. Aguanta al doble y solo
    // entonces empieza a bajar (y a deshacer el desplazamiento)
    crecer.to(
      elemento,
      {
        scale: 1,
        x: 0,
        y: 0,
        duration: DURACION_CLIC_BAJAR,
        ease: "power2.inOut",
      },
      DURACION_CLIC_SUBIR + DURACION_CLIC_SOSTENER
    );
  }

  elemento.addEventListener("click", alHacerClic);

  return {
    destruir() {
      elemento.removeEventListener("click", alHacerClic);
      crecer?.kill();
      creciendo = false;
      gsap.killTweensOf(elemento);
      gsap.set(elemento, { clearProps: "transform" });
    },
  };
}

// ===== Logo =====
function animarLogo() {
  const logo = document.querySelector(SELECTOR_LOGO);
  if (!logo) return null;

  let giro = null;
  let latido = null;

  // El latido es un yoyo infinito de escala: nace aquí y quien lo guarda es
  // quien puede cortarlo (el clic necesita el campo `scale` libre)
  function latir(delay = RETARDO_LATIDO_LOGO) {
    return gsap.to(logo, {
      scale: ESCALA_LOGO,
      duration: DURACION_LATIDO_LOGO,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay,
    });
  }

  // Giro continuo en un solo sentido, como el original. Es lineal a propósito:
  // cualquier aceleración se notaría como un tirón al repetir. Vive en su
  // propio tween para que nunca se cruce con la escala del clic o del latido.
  giro = gsap.to(logo, {
    rotation: -360,
    duration: DURACION_VUELTA,
    ease: "none",
    repeat: -1,
  });

  latido = latir();

  const clic = montarClicAgrandable(
    logo,
    // Al crecer: el latido escribe `scale` en cada fotograma; si siguiera
    // vivo, ganaría él y el logo no crecería. Se corta y renace al terminar.
    () => {
      latido?.kill();
      latido = null;
    },
    () => {
      latido = latir();
    }
  );

  return {
    destruir() {
      giro?.kill();
      latido?.kill();
      clic.destruir();
    },
  };
}

// ===== Marca ("A . Carbone") =====
function animarMarca() {
  const marca = document.querySelector(SELECTOR_MARCA);
  if (!marca) return null;

  // Sin `alEmpezar`/`alTerminar`: la marca no late ni gira, no hay nada que
  // pausar. Su entrada del navbar (opacity + x) sí podría cruzarse si se
  // clicara en los primeros segundos: matar su x aquí evita el tirón.
  return montarClicAgrandable(
    marca,
    () => gsap.killTweensOf(marca, "x"),
    null
  );
}

// ===== Retrato =====
function animarRetrato() {
  const retrato = document.querySelector(SELECTOR_RETRATO);
  if (!retrato) return null;

  let latido = null;

  const entrada = gsap.from(retrato, {
    opacity: 0,
    scale: 0.82,
    duration: 0.9,
    delay: RETARDO_ENTRADA_RETRATO,
    ease: "back.out(1.6)",
    onComplete: () => {
      // El latido empieza cuando la entrada ya terminó
      latido = gsap.to(retrato, {
        scale: ESCALA_RETRATO,
        duration: DURACION_LATIDO_RETRATO,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    },
  });

  // El latido es una animación HIJA del onComplete: matar solo la entrada
  // lo dejaría corriendo sin dueño, así que el handle mata a los dos
  return {
    kill() {
      entrada.kill();
      latido?.kill();
    },
  };
}

// ===== Arranque =====
export function iniciarAnimacionesContinuas() {
  return {
    logo: animarLogo(),
    marca: animarMarca(),
    retrato: animarRetrato(),
  };
}
