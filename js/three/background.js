// ============================================================
// FONDO 3D DEL PORTAFOLIO
// ============================================================
// Monta una escena Three.js con un lienzo transparente por encima de la imagen
// de fondo de la página. La cámara reacciona al puntero y al scroll, y el
// campo de partículas gira muy despacio.
//
// Reglas que se respetan siempre:
//  - Si el navegador no ofrece WebGL, no se hace nada y queda la imagen de
//    fondo original. La página nunca depende del 3D para verse.
//  - Si el sistema pide menos movimiento, se dibuja UN fotograma fijo y no se
//    arranca ningún bucle de animación.
//  - Con la pestaña en segundo plano el bucle se detiene: no se gasta batería
//    dibujando algo que nadie está mirando.
// ============================================================

import { Clock, PerspectiveCamera, Scene, WebGLRenderer } from "three";

import {
  alCambiarMenosMovimiento,
  densidadDePantalla,
  pantallaPequena,
  prefiereMenosMovimiento,
  soportaWebGL,
} from "../lib/entorno.js";
import { crearCampoDeParticulas } from "./particle-field.js";
import { crearRastreadorDeEntrada } from "./pointer-tracker.js";

// Cantidad de partículas: en móvil se baja a menos de la mitad, porque la
// tarjeta gráfica es mucho más pequeña y el relleno de píxeles cuesta más
const PARTICULAS_ESCRITORIO = 700;
const PARTICULAS_MOVIL = 300;

// Cámara
const CAMPO_DE_VISION = 60;
const DISTANCIA_CAMARA = 12;
const PLANO_CERCANO = 0.1;
const PLANO_LEJANO = 200;

// Cuánto baja la cámara a lo largo de toda la página
const RECORRIDO_SCROLL_CAMARA = 3.5;

// Giro del campo, en radianes por segundo (una vuelta tarda unos 3 minutos)
const VELOCIDAD_GIRO = 0.035;

// Fundido de entrada del 3D, en segundos
const PLAZO_FUNDIDO = 2.2;

// Opacidad final del campo. No llega a 1: las partículas acompañan a la foto
// de fondo, no la tapan.
const OPACIDAD_MAXIMA = 0.85;

// Paleta dorada, la misma del resto del sitio
const COLOR_BASE = "#5f5940";
const COLOR_BRILLO = "#f2e9cd";

// Salto máximo de tiempo que se tiene en cuenta en un fotograma. Al volver de
// una pestaña en segundo plano llega un delta enorme; sin este tope, las
// partículas darían un salto visible.
const DELTA_MAXIMO = 0.1;

// ===== Suavizado de entrada y salida del fundido =====
// Con una rampa lineal el encendido se nota brusco; esta curva arranca y
// termina despacio.
function suavizar(valor) {
  return valor * valor * (3 - 2 * valor);
}

// ===== Arranque del fondo =====
// Devuelve un objeto con destruir(), o null si no se pudo montar nada.
export function iniciarFondo3D() {
  const contenedor = document.getElementById("fondo3d");

  if (!contenedor) {
    console.warn("Fondo 3D: falta el contenedor #fondo3d en index.html");
    return null;
  }

  if (!soportaWebGL()) {
    console.warn("Fondo 3D: el navegador no ofrece WebGL, se mantiene la imagen de fondo");
    return null;
  }

  let renderer;

  try {
    renderer = new WebGLRenderer({
      // Sin fondo propio: se ve la imagen de la página a través del lienzo
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.warn("Fondo 3D: no se pudo crear el contexto WebGL", error);
    return null;
  }

  const escena = new Scene();
  const camara = new PerspectiveCamera(
    CAMPO_DE_VISION,
    1,
    PLANO_CERCANO,
    PLANO_LEJANO
  );
  camara.position.set(0, 0, DISTANCIA_CAMARA);

  const entrada = crearRastreadorDeEntrada();

  // El campo de partículas es lo único que hay en la escena
  let densidad = densidadDePantalla(2);
  const campo = crearCampoDeParticulas({
    cantidad: pantallaPequena() ? PARTICULAS_MOVIL : PARTICULAS_ESCRITORIO,
    densidadPixel: densidad,
    colores: { base: COLOR_BASE, brillo: COLOR_BRILLO },
  });
  escena.add(campo.objeto);

  // El lienzo lo coloca el CSS; aquí solo se le da el tamaño en píxeles
  renderer.domElement.className = "fondo-3d-lienzo";
  contenedor.appendChild(renderer.domElement);

  const reloj = new Clock();
  let tiempoEscena = 0;
  let opacidad = 0;
  let peticionDeAjuste = 0;

  // ===== Dibujar =====
  function pintar() {
    // La cámara se inclina con el puntero y baja a medida que se recorre la página
    camara.position.x = entrada.desplazamientoPunteroX();
    camara.position.y =
      entrada.desplazamientoPunteroY() -
      entrada.progresoDeScroll() * RECORRIDO_SCROLL_CAMARA;
    camara.lookAt(0, 0, 0);

    campo.objeto.rotation.y = tiempoEscena * VELOCIDAD_GIRO;

    renderer.render(escena, camara);
  }

  // ===== Fotograma único (menos movimiento) =====
  function pintarFotogramaFijo() {
    opacidad = 1;
    campo.fijarOpacidad(OPACIDAD_MAXIMA);
    campo.avanzar(0);
    camara.position.set(0, 0, DISTANCIA_CAMARA);
    camara.lookAt(0, 0, 0);
    campo.objeto.rotation.y = 0;
    renderer.render(escena, camara);
  }

  // ===== Bucle de animación =====
  function bucle() {
    const delta = Math.min(reloj.getDelta(), DELTA_MAXIMO);
    tiempoEscena += delta;

    entrada.actualizar();

    // Fundido de entrada, una sola vez
    if (opacidad < 1) {
      opacidad = Math.min(1, opacidad + delta / PLAZO_FUNDIDO);
      campo.fijarOpacidad(suavizar(opacidad) * OPACIDAD_MAXIMA);
    }

    campo.avanzar(tiempoEscena);
    pintar();
  }

  // ===== Tamaño del lienzo =====
  function ajustarTamano() {
    const ancho = contenedor.clientWidth || window.innerWidth;
    const alto = contenedor.clientHeight || window.innerHeight;

    // En móvil se baja la densidad a 1.5: la diferencia no se aprecia y se
    // ahorra más de la mitad del trabajo por fotograma
    densidad = densidadDePantalla(pantallaPequena() ? 1.5 : 2);

    renderer.setPixelRatio(densidad);
    // El tercer argumento en false deja el tamaño al CSS, para que el lienzo
    // siga al contenedor y no al revés
    renderer.setSize(ancho, alto, false);

    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();

    campo.fijarDensidadPixel(densidad);

    // Sin bucle activo hay que repintar a mano el fotograma fijo
    if (prefiereMenosMovimiento()) {
      pintarFotogramaFijo();
    }
  }

  // El evento resize se dispara decenas de veces por segundo: se agrupa en un
  // solo ajuste por fotograma
  function programarAjuste() {
    if (peticionDeAjuste) return;

    peticionDeAjuste = requestAnimationFrame(() => {
      peticionDeAjuste = 0;
      ajustarTamano();
    });
  }

  // ===== Encender o apagar el bucle según las preferencias =====
  function aplicarPreferenciaDeMovimiento() {
    if (prefiereMenosMovimiento()) {
      renderer.setAnimationLoop(null);
      pintarFotogramaFijo();
      return;
    }

    // Se descarta el tiempo acumulado para que el primer delta no sea enorme
    reloj.getDelta();
    renderer.setAnimationLoop(bucle);
  }

  // ===== Pestaña en segundo plano =====
  function alCambiarVisibilidad() {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
      return;
    }

    aplicarPreferenciaDeMovimiento();
  }

  // ===== Arranque =====
  ajustarTamano();
  aplicarPreferenciaDeMovimiento();

  const dejarDeEscucharMovimiento = alCambiarMenosMovimiento(
    aplicarPreferenciaDeMovimiento
  );

  window.addEventListener("resize", programarAjuste);
  window.addEventListener("orientationchange", programarAjuste);
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  return {
    destruir() {
      renderer.setAnimationLoop(null);

      if (peticionDeAjuste) {
        cancelAnimationFrame(peticionDeAjuste);
      }

      window.removeEventListener("resize", programarAjuste);
      window.removeEventListener("orientationchange", programarAjuste);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      dejarDeEscucharMovimiento();

      entrada.destruir();
      campo.destruir();
      renderer.dispose();

      // El lienzo se quita del DOM; el contexto WebGL se libera solo
      contenedor.replaceChildren();
    },
  };
}
