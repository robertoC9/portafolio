// ============================================================
// DESINTEGRACIÓN DEL RETRATO EN PARTÍCULAS
// ============================================================
// Cuando el retrato ENTRA EN PANTALLA la primera vez (scroll o la propia
// carga de la página), la foto se disuelve en partículas doradas que salen
// disparadas hacia afuera (Three.js) y, sin esperar a nada, se vuelve a
// integrar SOLA: es un ciclo cerrado de ~3 segundos, con menos de 1 segundo
// de pausa en medio (ver el desglose en las constantes de abajo).
//
// Ese arranque automático ocurre UNA SOLA VEZ. Después, el único disparador
// es el CURSOR: cada pasada suya relanza el ciclo (o corta la vuelta si se
// retira a mitad de camino), tantas veces como quiera. Bajar y volver a
// subir con el scroll ya no lo relanza. Si se entra o sale a mitad de
// vuelo, el ciclo se corta y arranca desde donde esté, sin acumular tweens.
//
// Cómo funciona:
//  1. La foto se dibuja en un canvas de prueba con su tamaño real en pantalla
//     y se leen sus píxeles: cada partícula nace en una posición de la
//     cuadrícula y TOMA el color real de la foto ahí, así el conjunto sigue
//     siendo tu cara y no un manchón de colores.
//  2. Cada partícula tiene un destino (hacia dónde sale) y un retardo: las
//     del borde se desprenden primero y el centro es lo último en romperse.
//  3. Un único uniforme `progreso` (0 a 1) gobierna todo. GSAP solo tweenea
//     ese número y el shader hace el resto: posición = mezcla entre casa y
//     destino, más un giro sutil alrededor del centro.
//  4. El bucle de dibujo solo corre mientras hay animación; en reposo el
//     lienzo se apaga para no gastar batería.
//
// Reglas del sitio que se respetan:
//  - Sin WebGL: no se hace nada, la foto se queda tal cual.
//  - Con "menos movimiento": este módulo ni se registra (lo decide main.js,
//    dentro de gsap.matchMedia), así que el efecto es puramente opt-in.
// ============================================================

import {
  BufferGeometry,
  Float32BufferAttribute,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

import { densidadDePantalla, soportaWebGL } from "../lib/entorno.js";
import { ScrollTrigger } from "../lib/gsap.js";

// Tamaño de referencia con el que se muestra la foto (px CSS). Es solo un
// valor de reserva: el muestreo real mide la foto en pantalla, porque el
// borde de 3 px resta al ancho visible y una cuadrícula de 120 saldría
// desalineada con lo que se ve.
const LADO_REFERENCIA = 120;

// Distancia entre muestras. 3 px dan ~1050 partículas: se lee la cara y el
// coste de dibujo es ridículo. Más denso se ve mejor pero aporta poco.
const PASO = 3;

// Reserva al borde del disco visible: la foto se muestra con border-radius
// 50%, así que solo interesa el inscrito. Un 1 px de margen basta para no
// muestrear el píxel que ya está recortado por el redondeo.
const RESERVA_BORDE = 1;

// Lado del lienzo en px CSS. Es el ÚNICO techo de las partículas: si vuelan
// más allá de él, se recortan a mano. Por eso no es una constante caprichosa,
// sino la diagonal de la ventana (ver medirLienzo, con sus mínimos y topes),
// de modo que la nube pueda extenderse por casi toda la pantalla. El lienzo
// se centra sobre el retrato, que es el origen de coordenadas del mundo.
const LADO_LIENZO_MIN = 700; // Móvil: nunca más estrecho que esto
const LADO_LIENZO_MAX = 1200; // Techo de memoria: un lienzo de 1200 con
                              // pixelRatio 2 ya son ~11 MB de búfer
const RAZON_DIAGONAL = 0.62; // 0.62 × diagonal ≈ hasta 1200 en 1920×1080

function medirLienzo() {
  const diagonal = Math.hypot(window.innerWidth, window.innerHeight);
  return Math.round(
    Math.min(LADO_LIENZO_MAX, Math.max(LADO_LIENZO_MIN, diagonal * RAZON_DIAGONAL))
  );
}

// ===== Presupuesto del ciclo =====
// La desintegración es un CICLO AUTOMÁTICO: se disuelve al entrar en pantalla
// y se vuelve a integrar SOLA, sin esperar a nada. Duración de las fases:
//
//   salida 1.1 s  +  pausa 0.9 s  +  vuelta 0.95 s  =  2.95 s
//
// La pausa es el tiempo que la nube espera en el aire ENTRE desintegrarse e
// integrarse: pedido por debajo de 1 s, queda en 0.9 s. Si se toca cualquiera
// de los tres valores, hay que volver a sumar (tope duro: 5 s).
const DURACION_SALIDA = 1.1;
const PAUSA_ABIERTO = 0.9; // < 1 s: el hueco pedido entre fases
const DURACION_VUELTA = 0.95;
// = 2.95 s ≤ 5 s

// Tinte dorado final: las partículas se acercan a este color a medida que
// vuelan, para que la nube leída se sienta parte de la paleta del sitio
// (#f2e9cd, la misma del fondo 3D)
const ORO = [0.949, 0.914, 0.804];

// ===== Vértice =====
// Mezcla casa↔destino con `progreso`, aplica el giro y atiza el color.
const VERTICE = `
  attribute vec2 destino;
  attribute float retardo;
  attribute float tamano;
  attribute float giro;
  attribute vec3 colorParticula;

  uniform float progreso;
  uniform float densidadPixel;
  uniform float opacidad;

  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    // Escalonado: cada partícula tiene su propio tramo dentro del mismo
    // progreso global, de forma que el borde se desprenda antes que el centro
    float t = clamp((progreso - retardo) / max(0.0001, 1.0 - retardo), 0.0, 1.0);

    // Misma curva suave que usan las transiciones CSS: arranca y frena despacio
    float e = t * t * (3.0 - 2.0 * t);

    vec2 pos = mix(position.xy, destino, e);

    // Giro en vuelo: evita que la nube parezca una explosión radial plana
    float angulo = giro * e;
    float c = cos(angulo);
    float s = sin(angulo);
    pos = mat2(c, -s, s, c) * pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);

    // Cámara ortográfica: sin atenuación por distancia, el tamaño solo
    // crece. Duplica de tamaño en pleno vuelo: repartidas por media pantalla,
    // las partículas de 3-5 px quedarían dispersas y el conjunto se leería
    // como ruido en lugar de como una nube
    gl_PointSize = tamano * densidadPixel * (1.0 + e * 1.0);

    // Color real de la foto, tiñéndose de oro cuanto más lejos vuela
    vColor = mix(colorParticula, vec3(${ORO.join(", ")}), e * 0.45);

    // Ligero desvanecido al final del vuelo: suficiente para que ninguna
    // partícula parezca congelada al llegar a su destino, pero sin apagarlas
    // (ahora vuelan lejos y a esa distancia un punto tenue ni se ve)
    vAlfa = 1.0 - smoothstep(0.75, 1.0, e) * 0.25;
  }
`;

// ===== Fragmento =====
// Punto redondo con caída suave, igual que el resto de partículas del sitio
const FRAGMENTO = `
  uniform float opacidad;

  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    float distancia = length(gl_PointCoord - vec2(0.5));
    if (distancia > 0.5) discard;

    float alfa = smoothstep(0.5, 0.08, distancia);
    gl_FragColor = vec4(vColor, alfa * vAlfa * opacidad);
  }
`;

// ===== Muestreo de la foto =====
// Devuelve un arreglo con { x, y, r, g, b, radio } por partícula. Las
// coordenadas salen ya en unidades de mundo (origen en el centro del lienzo,
// eje Y hacia arriba), que es como mira la cámara ortográfada, y en la escala
// 1 mundo = 1 px CSS, así que la nube casa exactamente sobre la foto.
function muestrearRetrato(imagen) {
  // Medida REAL del contenido visible: clientWidth no cuenta el borde de 3 px
  const lado = Math.round(imagen.clientWidth) || LADO_REFERENCIA;
  const radioUtil = lado / 2 - RESERVA_BORDE;

  const lienzo = document.createElement("canvas");
  lienzo.width = lado;
  lienzo.height = lado;

  const contexto = lienzo.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(imagen, 0, 0, lado, lado);

  // Si la foto no se pudo dibujar (archivo caído), no hay colores que leer
  let datos;
  try {
    datos = contexto.getImageData(0, 0, lado, lado).data;
  } catch {
    return null;
  }

  const centro = lado / 2;
  const muestra = [];

  for (let y = 0; y < lado; y += PASO) {
    for (let x = 0; x < lado; x += PASO) {
      const dx = x - centro;
      const dy = y - centro;
      const radio = Math.hypot(dx, dy);

      // Fuera del disco visible: descartada
      if (radio > radioUtil) continue;

      const indice = (y * lado + x) * 4;

      muestra.push({
        // Y invertida: en pantalla y crece hacia abajo, en mundo hacia arriba
        x: dx,
        y: -dy,
        radio,
        radioUtil,
        r: datos[indice] / 255,
        g: datos[indice + 1] / 255,
        b: datos[indice + 2] / 255,
      });
    }
  }

  return muestra.length > 0 ? muestra : null;
}

// ===== Construcción de la malla de partículas =====
function construirMalla(muestra, ladoLienzo) {
  const cantidad = muestra.length;

  // Techo de vuelo: casi hasta el borde del lienzo, dejando margen para el
  // giro propio de cada partícula y para que su píxel no asome cortado. Como
  // ladoLienzo sale de la diagonal de la ventana, en pantallas grandes el
  // rapapolvo llega de verdad a los bordes de la pantalla.
  const topeVuelo = ladoLienzo / 2 - 60;
  const vueloCorto = topeVuelo * 0.35;

  const posiciones = new Float32Array(cantidad * 3);
  const destinos = new Float32Array(cantidad * 2);
  const retardos = new Float32Array(cantidad);
  const tamanos = new Float32Array(cantidad);
  const giros = new Float32Array(cantidad);
  const colores = new Float32Array(cantidad * 3);

  muestra.forEach((punto, i) => {
    // Casa: la posición exacta de la que salió el píxel
    posiciones[i * 3] = punto.x;
    posiciones[i * 3 + 1] = punto.y;
    posiciones[i * 3 + 2] = 0;

    // Dirección de vuelo: radial (hacia afuera del rostro) mezclada con
    // ruido, para que no parezca una bomba perfectamente simétrica
    const razon = Math.max(0.001, punto.radio);
    const radialX = punto.x / razon;
    const radialY = punto.y / razon;
    let direccionX = radialX * 0.7 + (Math.random() * 2 - 1) * 0.6;
    const direccionY = radialY * 0.7 + (Math.random() * 2 - 1) * 0.6;
    const largo = Math.hypot(direccionX, direccionY) || 1;
    direccionX /= largo;
    const direccionNormalizadaY = direccionY / largo;

    // Distancia recorrida: entre un 35 % y el 100 % del techo, con la raíz
    // sesgada hacia lo lejos (más partículas abiertas que cortas) para que la
    // nube se note expandida y no como un anillo apretado contra la foto
    const vuelo =
      vueloCorto + Math.pow(Math.random(), 0.75) * (topeVuelo - vueloCorto);
    destinos[i * 2] = punto.x + direccionX * vuelo;
    destinos[i * 2 + 1] = punto.y + direccionNormalizadaY * vuelo;

    // Retardo: el borde (radio grande → fracción chica) se va primero
    const razonRadio = punto.radio / punto.radioUtil; // 0 centro … 1 borde
    retardos[i] = (1 - razonRadio) * 0.45 + Math.random() * 0.08;

    // Tamaño en px CSS: sesgado a lo pequeño, como el resto del sitio
    tamanos[i] = 3 + Math.pow(Math.random(), 1.6) * 2.2;

    // Giro propio durante el vuelo (rad, con y sin contra sentido)
    giros[i] = (Math.random() * 2 - 1) * 0.5;

    colores[i * 3] = punto.r;
    colores[i * 3 + 1] = punto.g;
    colores[i * 3 + 2] = punto.b;
  });

  const geometria = new BufferGeometry();
  geometria.setAttribute("position", new Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute("destino", new Float32BufferAttribute(destinos, 2));
  geometria.setAttribute("retardo", new Float32BufferAttribute(retardos, 1));
  geometria.setAttribute("tamano", new Float32BufferAttribute(tamanos, 1));
  geometria.setAttribute("giro", new Float32BufferAttribute(giros, 1));
  geometria.setAttribute("colorParticula", new Float32BufferAttribute(colores, 3));

  return geometria;
}

// ===== Punto de entrada =====
// Devuelve { destruir() } o null si no hay nada que animar.
export function iniciarDisolucionDeRetrato(gsap) {
  const imagen = document.getElementById("retrato");
  const escenaDom = imagen?.parentElement;

  if (!imagen || !escenaDom) return null;

  // Sin WebGL la foto se queda como está, sin avisos ni rompiendo nada
  if (!soportaWebGL()) return null;

  let renderer;
  try {
    renderer = new WebGLRenderer({
      alpha: true, // lienzo transparente: la página se ve por debajo
      antialias: false, // son puntos de 3 px: el AA solo cuesta
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }

  // Lienzo por encima de la foto, sin robarle los clics al resto de la página
  const ladoLienzo = medirLienzo();
  const lienzo = renderer.domElement;
  lienzo.className = "retrato-particulas";
  lienzo.setAttribute("aria-hidden", "true");
  lienzo.style.width = `${ladoLienzo}px`;
  lienzo.style.height = `${ladoLienzo}px`;
  escenaDom.appendChild(lienzo);

  const escena = new Scene();
  // Cámara ortográfada en px de mundo: el encuadre mide lo mismo que el
  // lienzo y va centrado en 0, así una posición de mundo = un píxel y el
  // muestreo de la foto no necesita escalar
  const camara = new OrthographicCamera(
    -ladoLienzo / 2,
    ladoLienzo / 2,
    ladoLienzo / 2,
    -ladoLienzo / 2,
    -1000,
    1000
  );

  // Estado compartido: GSAP tweenea `progreso` y el shader lo lee
  const estado = { progreso: 0 };

  // Timeline del ciclo actual (disolver → pausa → integrar). Guardarla entera
  // permite cancelar las tres fases de un solo golpe si el cursor entra o
  // sale a mitad de camino.
  let ciclo = null;

  const material = new ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: {
      progreso: { value: 0 },
      densidadPixel: { value: densidadDePantalla(2) },
      opacidad: { value: 1 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  let objeto = null;
  let geometria = null;

  // ===== Muestrear y (re)construir =====
  function montar() {
    const muestra = muestrearRetrato(imagen);
    if (!muestra) return false;

    if (objeto) {
      escena.remove(objeto);
      geometria?.dispose();
    }

    geometria = construirMalla(muestra, ladoLienzo);
    objeto = new Points(geometria, material);
    // Las partículas vuelan más allá del encuadre: sin esto Three las
    // descartaría al considerarlas fuera de cámara
    objeto.frustumCulled = false;
    escena.add(objeto);
    return true;
  }

  // ===== Bucle de dibujo (solo mientras hay movimiento) =====
  function pintar() {
    material.uniforms.progreso.value = estado.progreso;
    renderer.render(escena, camara);
  }

  function arrancarBucle() {
    renderer.setAnimationLoop(pintar);
  }

  function pararSiReposo() {
    if (estado.progreso === 0) {
      renderer.setAnimationLoop(null);
      lienzo.style.visibility = "hidden";
    }
  }

  // ===== Ciclo automático: disolver → pausa → integrar =====
  // Corta lo que haya en vuelo. Matar la timeline entera (y no solo cada
  // tween) es lo que garantiza que nunca queden fases huérfanas corriendo:
  // dos entradas seguidas no pueden acumular ciclos.
  function cortarCiclo() {
    if (ciclo) {
      ciclo.kill();
      ciclo = null;
    }

    gsap.killTweensOf(estado);
    // A la imagen se le mata SOLO el tween de opacidad (killTweensOf sin más
    // acabaría también con el latido infinito que le aplica logo.js)
    gsap.killTweensOf(imagen, "opacity");
  }

  // Entrada del cursor: monta el ciclo completo de una vez. La pausa no es
  // un tween sino un hueco entre fases: el tiempo en el timeline solo avanza
  // si algo lo mueve, así que ahí las partículas quedan quietas en el aire.
  function disintegrar() {
    if (!objeto) return;

    lienzo.style.visibility = "visible";
    arrancarBucle();
    cortarCiclo();

    ciclo = gsap.timeline({
      // Al terminar el ciclo, si nadie lo cortó, el bucle se apaga solo
      onComplete: () => {
        ciclo = null;
        pararSiReposo();
      },
    });

    // Fase 1 — DISOLVER (0 → 1.1 s)
    // La foto se apaga pronto: en cuanto las partículas ya la cubren, la
    // foto deja de hacer falta (si tardara, se verían las dos capas a la vez)
    ciclo.to(estado, { progreso: 1, duration: DURACION_SALIDA, ease: "power2.out" }, 0);
    ciclo.to(imagen, { opacity: 0, duration: 0.45, ease: "power1.out" }, 0);

    // Fase 2 — PAUSA (1.1 s → 2.0 s): hueco de menos de 1 s, la nube espera
    // en el aire el tiempo justo antes de volver

    // Fase 3 — INTEGRAR (2.0 s → 2.95 s): las partículas vuelven a casa y la
    // foto aparece cuando casi están casadas, para que el cruce no se note
    const inicioVuelta = DURACION_SALIDA + PAUSA_ABIERTO;
    ciclo.to(
      estado,
      { progreso: 0, duration: DURACION_VUELTA, ease: "power2.inOut" },
      inicioVuelta
    );
    ciclo.to(
      imagen,
      { opacity: 1, duration: 0.5, ease: "power1.in" },
      inicioVuelta + 0.3
    );
  }

  // Salida del cursor a mitad de ciclo: se corta lo que haya y la
  // reintegración arranza ya, desde el punto donde estaban las partículas.
  // Si el ciclo ya terminó, todo está en reposo y no hay nada que rehacer.
  function recomponer() {
    if (!objeto) return;
    if (!ciclo && estado.progreso === 0) return;

    const progresoActual = estado.progreso;
    cortarCiclo();
    estado.progreso = progresoActual; // se conserva: la vuelta parte de aquí

    gsap.to(estado, {
      progreso: 0,
      duration: DURACION_VUELTA,
      ease: "power2.inOut",
      onComplete: pararSiReposo,
    });

    gsap.to(imagen, {
      opacity: 1,
      duration: 0.5,
      delay: 0.15,
      ease: "power1.in",
    });
  }

  // ===== Tamaño =====
  // El muestreo de la foto no depende de la ventana, así que al cambiar de
  // pantalla solo hay que ajustar la densidad de píxeles y repintar.
  function ajustarTamano() {
    renderer.setPixelRatio(densidadDePantalla(2));
    // false: no toca el estilo, el tamaño visual lo gobierna el CSS
    renderer.setSize(ladoLienzo, ladoLienzo, false);

    if (estado.progreso > 0) {
      pintar();
    }
  }

  // ===== Disparo automático: UNA SOLA VEZ, al entrar en pantalla =====
  // Única ejecución que no pide el cursor. La guardas de abajo evitan que se
  // solape consigo misma; después de esta, el cursor es el único disparador.
  const alEntrarEnVista = () => {
    if (ciclo || estado.progreso > 0) return;
    disintegrar();
  };

  // ¿La foto ya se ve ahora mismo? Sirve para el arranque: ScrollTrigger no
  // dispara onEnter por lo que ya estaba a la vista al cargar, solo por lo
  // que cruza el punto de entrada después.
  function estaEnPantalla() {
    const rect = escenaDom.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  }

  // Se observa con ScrollTrigger (patrón del sitio); si el plugin no cargó,
  // IntersectionObserver hace el mismo trabajo sin depender de GSAP. Los dos
  // caminos comparten el MISMO contrato: primer cruce y se retiran solos.
  let trigger = null;
  let observador = null;

  function vigilarEntradaEnVista() {
    // CASO 1: la foto ya se ve al cargar → la única ejecución automática
    // llega tras un breve respiro (tiempo de ver la foto intacta primero) y
    // NO se monta vigilancia alguna: a partir de ahí, solo el cursor
    if (estaEnPantalla()) {
      gsap.delayedCall(1.2, alEntrarEnVista);
      return;
    }

    // CASO 2: aún no se ve → se dispara al entrar en pantalla, UNA SOLA vez.
    // `once` hace que ScrollTrigger se destruya solo tras el primer cruce:
    // bajar y volver a subir ya no lo relanza
    if (ScrollTrigger) {
      trigger = ScrollTrigger.create({
        trigger: escenaDom,
        start: "top 80%",
        once: true,
        onEnter: alEntrarEnVista,
      });
      return;
    }

    // Reserva sin GSAP: mismo contrato (se desconecta tras el primer cruce)
    observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          observador.disconnect();
          observador = null;
          alEntrarEnVista();
        }
      },
      { threshold: 0.5 }
    );
    observador.observe(escenaDom);
  }

  // ===== Arranque =====
  // La foto puede llegar tarde (red lenta): se monta cuando esté lista
  let listo = false;

  function alEstarLista() {
    if (listo) return;
    listo = montar();
    if (!listo) return;

    ajustarTamano();
    // De aquí sale el ÚNICO arranque automático (con su caso de "ya visible
    // al cargar" incluido); quien dispara después es el cursor
    vigilarEntradaEnVista();
  }

  if (imagen.complete && imagen.naturalWidth > 0) {
    alEstarLista();
  } else {
    imagen.addEventListener("load", alEstarLista, { once: true });
  }

  const alEntrar = () => disintegrar();
  const alSalir = () => recomponer();
  const alCambiarTamano = () => ajustarTamano();

  // El cursor es el ÚNICO disparador tras la única pasada automática:
  // relanza el ciclo las veces que haga falta si la foto está en reposo, y
  // corta la vuelta si se retira a mitad de camino
  escenaDom.addEventListener("pointerenter", alEntrar);
  escenaDom.addEventListener("pointerleave", alSalir);
  window.addEventListener("resize", alCambiarTamano);

  lienzo.style.visibility = "hidden"; // oculto hasta la primera animación

  return {
    destruir() {
      renderer.setAnimationLoop(null);
      escenaDom.removeEventListener("pointerenter", alEntrar);
      escenaDom.removeEventListener("pointerleave", alSalir);
      window.removeEventListener("resize", alCambiarTamano);

      // Se retira también la vigilancia de entrada en pantalla
      trigger?.kill();
      trigger = null;
      observador?.disconnect();
      observador = null;

      // Corta el ciclo a medias si lo hubiera y restaura la foto
      cortarCiclo();
      gsap.set(imagen, { opacity: 1 });

      geometria?.dispose();
      material.dispose();
      renderer.dispose();
      lienzo.remove();
    },
  };
}
