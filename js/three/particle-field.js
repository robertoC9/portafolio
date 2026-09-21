// ============================================================
// CAMPO DE PARTÍCULAS DORADAS
// ============================================================
// Es el único objeto de la escena 3D. En lugar de usar un PointsMaterial (que
// dibuja cuadrados y no permite desvanecer por distancia o por brillo), aquí
// se usan shaders propios: cada partícula se dibuja como un punto redondo con
// caída suave, y el conjunto se difumina hacia los bordes para que el campo no
// termine en un corte rectangular visible sobre el fondo de la página.
// ============================================================

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from "three";

// Volumen donde se reparten las partículas, en unidades de mundo. El ancho es
// generoso a propósito: la cámara mira desde z=12, así que un volumen ampilo
// cubre la pantalla completa incluso en monitores muy panorámicos.
const ANCHO = 22;
const ALTO = 16;
const FONDO_CERCA = 6;
const FONDO_LEJOS = -16;

// Radio aproximado del volumen, usado por el shader para el desvanecido
const RADIO_DESVANECIDO = 22;

// Rango de tamaños en unidades de mundo (el shader los atenúa por distancia)
const TAMANO_MINIMO = 35;
const TAMANO_MAXIMO = 130;

// Vértice: desplaza cada partícula con dos ondas desfasadas por su posición,
// de modo que ninguna se mueva igual que otra y el conjunto no lata en bloque.
const VERTICE = `
  attribute float tamano;
  attribute float brillo;

  uniform float tiempo;
  uniform float densidadPixel;

  varying float vBrillo;
  varying float vDesvanecido;

  void main() {
    vec3 posicion = position;
    posicion.x += cos(tiempo * 0.16 + position.y * 0.35 + position.z * 0.12) * 0.45;
    posicion.y += sin(tiempo * 0.21 + position.x * 0.28 + position.z * 0.19) * 0.40;
    posicion.z += sin(tiempo * 0.13 + position.x * 0.22 - position.y * 0.17) * 0.30;

    vec4 posicionVista = modelViewMatrix * vec4(posicion, 1.0);
    gl_Position = projectionMatrix * posicionVista;

    // Atenuación por distancia: lo lejano se ve más pequeño, lo que da la
    // sensación de profundidad sin necesidad de niebla.
    gl_PointSize = tamano * densidadPixel / max(0.001, -posicionVista.z);

    // Centro del volumen = 1, borde y más allá = 0
    float distanciaCentro = length(position.xy) / ${RADIO_DESVANECIDO.toFixed(1)};
    vDesvanecido = 1.0 - smoothstep(0.30, 1.0, distanciaCentro);

    vBrillo = brillo;
  }
`;

// Fragmento: dibuja un punto redondo con caída suave. El cuadrado del alfa
// concentra el brillo en el centro, que es lo que hace que se lean como polvo
// iluminado y no como manchas planas.
const FRAGMENTO = `
  uniform float opacidad;
  uniform vec3 colorBase;
  uniform vec3 colorBrillo;

  varying float vBrillo;
  varying float vDesvanecido;

  void main() {
    float distancia = length(gl_PointCoord - vec2(0.5));
    if (distancia > 0.5) discard;

    float alfa = smoothstep(0.5, 0.0, distancia);
    alfa *= alfa;

    // Las partículas más brillantes tienden al color claro; el resto, al oscuro
    vec3 color = mix(colorBase, colorBrillo, vBrillo);

    gl_FragColor = vec4(color, alfa * vBrillo * vDesvanecido * opacidad);
  }
`;

// ===== Reparto de las partículas en el volumen =====
function crearAtributos(cantidad) {
  const posiciones = new Float32Array(cantidad * 3);
  const tamanos = new Float32Array(cantidad);
  const brillos = new Float32Array(cantidad);

  for (let i = 0; i < cantidad; i += 1) {
    posiciones[i * 3] = (Math.random() * 2 - 1) * ANCHO;
    posiciones[i * 3 + 1] = (Math.random() * 2 - 1) * ALTO;
    posiciones[i * 3 + 2] =
      FONDO_LEJOS + Math.random() * (FONDO_CERCA - FONDO_LEJOS);

    // Sesgo hacia lo pequeño: muchas partículas de polvo y unas pocas
    // brillantes. Repartidas por igual, el campo parecería una nube uniforme.
    const tamanoAleatorio = Math.pow(Math.random(), 1.7);
    tamanos[i] = TAMANO_MINIMO + tamanoAleatorio * (TAMANO_MAXIMO - TAMANO_MINIMO);

    brillos[i] = 0.18 + Math.pow(Math.random(), 2.1) * 0.82;
  }

  return { posiciones, tamanos, brillos };
}

// ===== Construcción del campo =====
// cantidad       número de partículas (lo decide quien llama según la pantalla)
// densidadPixel  píxeles de dispositivo por punto CSS, para que el tamaño de
//                las partículas no cambie entre pantallas normales y retina
// colores        { base, brillo } como cadenas hex
export function crearCampoDeParticulas({ cantidad, densidadPixel, colores }) {
  const { posiciones, tamanos, brillos } = crearAtributos(cantidad);

  const geometria = new BufferGeometry();
  geometria.setAttribute("position", new Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute("tamano", new Float32BufferAttribute(tamanos, 1));
  geometria.setAttribute("brillo", new Float32BufferAttribute(brillos, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: FRAGMENTO,
    uniforms: {
      tiempo: { value: 0 },
      opacidad: { value: 0 }, // Arranca transparente; el fundido lo hace quien llama
      densidadPixel: { value: densidadPixel },
      colorBase: { value: new Color(colores.base) },
      colorBrillo: { value: new Color(colores.brillo) },
    },
    transparent: true,
    // Aditivo: las partículas que se cruzan suman luz en vez de taparse, que
    // es lo que da el aspecto de polvo iluminado sobre el fondo oscuro.
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const objeto = new Points(geometria, material);
  // Las partículas son un fondo: no deben recibir ni proyectar nada
  objeto.frustumCulled = false;

  return {
    objeto,

    // Avanza el tiempo del shader, en segundos
    avanzar(tiempo) {
      material.uniforms.tiempo.value = tiempo;
    },

    // Fundido de entrada o salida de todo el campo (0 a 1)
    fijarOpacidad(valor) {
      material.uniforms.opacidad.value = valor;
    },

    // Se recalcula al cambiar de pantalla o al mover la ventana entre monitores
    fijarDensidadPixel(valor) {
      material.uniforms.densidadPixel.value = valor;
    },

    destruir() {
      geometria.dispose();
      material.dispose();
    },
  };
}
