import type { ElementHelp, ResultExtraHelp } from './types';

/*
 * Explicaciones de las partes de la pantalla que no son un parámetro ni un resultado: el dibujo, la
 * gráfica y los botones. Cada una dice qué es, por qué es así y qué pasaría si no fuera así.
 * Son BORRADOR para que los revise el profesor de física antes de darlos por definitivos.
 *
 * El tercer bloque ("qué pasaría si no fuera así") responde la pregunta que de verdad se haría alguien
 * curioso ("¿y si el ángulo pasara de 60°?", "¿para qué sirve la frecuencia si ya tengo el período?")
 * con un caso concreto y con números. No sirve decir "tendrías que calcularlo tú": eso no enseña nada.
 *
 * Toda cifra citada aquí se comprueba contra el motor en elementHelp.test.ts: si el motor cambia
 * (el paso de cálculo, los rangos de ángulo, el período), esa prueba falla y avisa que el texto
 * quedó viejo. No se escribe una cifra nueva sin registrarla en esa prueba.
 */

/** Ids de las partes explicables; la interfaz los usa para colgar cada marca de su entrada. */
export const ELEMENT_ID = {
  pendulo: 'elem-pendulo',
  vertical: 'elem-vertical',
  salida: 'elem-salida',
  grafica: 'elem-grafica',
  curvaSimulacion: 'elem-curva-simulacion',
  curvaLineal: 'elem-curva-lineal',
  play: 'elem-play',
  reiniciar: 'elem-reiniciar',
  velocidad: 'elem-velocidad',
  calculo: 'elem-calculo',
  comparar: 'elem-comparar',
  masOpciones: 'elem-mas-opciones',
  teoria: 'elem-teoria',
  queEsEsto: 'elem-que-es-esto',
} as const;

export const elementHelp: ElementHelp[] = [
  {
    id: ELEMENT_ID.pendulo,
    title: 'El péndulo: bolita, hilo y apoyo',
    what:
      'Es un péndulo ideal: una bolita pequeña colgada de un hilo que no se estira ni pesa, sujeto a un apoyo fijo. ' +
      'El dibujo no está a escala: el hilo y la bolita se ajustan para que quepan en la pantalla.',
    why: 'Con un hilo ideal y una bolita pequeña, toda la masa está en un solo punto y las cuentas son claras. Las fórmulas del simulador valen para ese péndulo.',
    ifNot:
      'Si el hilo fuera una cuerda gruesa que pesa, o la bolita fuera una piedra grande, el período dejaría de ser 2π√(L/g) y el simulador mostraría un número equivocado. ' +
      'Para esos casos existe otro tipo de péndulo, el compuesto, que tiene su propia fórmula.',
  },
  {
    id: ELEMENT_ID.vertical,
    title: 'Línea vertical punteada (θ = 0)',
    what: 'Es la línea por donde cuelga el péndulo cuando está quieto, justo debajo del apoyo. Ahí el ángulo vale 0°.',
    why: 'El ángulo se mide desde esa línea: a la derecha es positivo y a la izquierda, negativo.',
    ifNot:
      'Si midiéramos el ángulo desde la horizontal, el péndulo quieto marcaría 90° y en las fórmulas el seno se volvería coseno. ' +
      'Funcionaría, pero sería más confuso; por eso se mide desde el lugar donde el péndulo descansa.',
  },
  {
    id: ELEMENT_ID.salida,
    title: 'Círculo punteado: dónde lo soltaste',
    what: 'Marca el lugar donde empezó la bolita, a φ₀ grados de la vertical. Se queda quieto aunque la bolita ya se haya movido.',
    why:
      'Te deja ver cuánto separaste el péndulo al principio. Sin rozamiento, la bolita llega del otro lado hasta la misma altura; ' +
      'con rozamiento llega cada vez menos lejos.',
    ifNot:
      'Con rozamiento b = 0,2, el recorrido de la bolita se reduce a la mitad más o menos cada 6,9 s. ' +
      'Sin la marca de salida no verías cuánto ha perdido, porque ya no recordarías desde dónde empezó.',
  },
  {
    id: ELEMENT_ID.grafica,
    title: 'Gráfica del ángulo',
    what:
      'Hacia arriba va el ángulo en grados respecto de la vertical (positivo a la derecha, negativo a la izquierda) y hacia la derecha va el tiempo en segundos. ' +
      'El punto sobre la curva azul es el instante de ahora.',
    why: 'Poner el ángulo contra el tiempo deja ver todo el movimiento de una vez. La distancia entre dos crestas seguidas (dos puntos más altos) es el período T.',
    ifNot:
      'Con solo el dibujo tendrías que cronometrar a ojo cuánto dura una ida y vuelta. ' +
      'En la gráfica lo lees directo, y además ves que el movimiento es una onda que se repite y que, con rozamiento, se va apagando.',
  },
  {
    id: ELEMENT_ID.curvaSimulacion,
    title: 'Curva azul: Simulación',
    what:
      'Es el ángulo del péndulo en cada momento: el programa lo calcula paso a paso, 200 pasos por cada segundo de simulación, con un método llamado RK4. ' +
      'En "Real" resuelve la ecuación completa del péndulo, la que lleva el seno del ángulo, y si hay rozamiento también lo cuenta. ' +
      'En "Ángulo pequeño" resuelve la versión sencilla.',
    why: 'Calcular paso a paso permite usar la ecuación completa, que es la que más se parece a un péndulo de verdad.',
    ifNot:
      'Si solo tuviéramos una fórmula sencilla, con ángulos grandes veríamos un movimiento que no existe. ' +
      'Con L = 1 m y g = 9,8 m/s², a 60° la fórmula sencilla daría un período de 2,007 s y el real es 2,154 s, un 7,3 % más largo.',
  },
  {
    id: ELEMENT_ID.curvaLineal,
    title: 'Curva punteada: Ángulo pequeño',
    what:
      'Es la curva que daría una fórmula sencilla: θ(t) = θ₀·cos(ωt), con ω = √(g/L). ' +
      'Es el ángulo de salida multiplicado por un coseno que sube y baja con el tiempo; con rozamiento se usa su versión que se va apagando.',
    why:
      'Solo sirve para ángulos pequeños (aquí, hasta 15°), porque cambia el seno del ángulo por el ángulo mismo, y eso solo es casi igual cuando el ángulo es chico. ' +
      'Se dibuja para comparar: con ángulos chicos casi coincide con la azul y con los grandes se separa.',
    ifNot:
      'A 15° el período real solo se diferencia 0,4 % de la fórmula sencilla, así que la fórmula del libro funciona. ' +
      'A 60° ya son 7,3 %, y sin esta curva para comparar no verías en qué momento deja de servir.',
  },
  {
    id: ELEMENT_ID.play,
    title: 'Play y Pausa',
    what: 'Play pone a andar el reloj de la simulación y el péndulo empieza a moverse. Pausa lo detiene justo donde está.',
    why: 'Poder detenerlo te deja mirar con calma el ángulo y la gráfica en un momento exacto.',
    ifNot:
      'Soltada a 60°, la bolita pasa por el punto más bajo a unos 3,1 m/s, más de 11 km/h: demasiado rápido para leer el ángulo a ojo. ' +
      'Con Pausa la detienes en el instante que quieras.',
  },
  {
    id: ELEMENT_ID.reiniciar,
    title: 'Reiniciar',
    what: 'Pone el reloj en cero, detiene el movimiento y devuelve la bolita al ángulo de salida. No cambia ninguno de tus valores.',
    why: 'Sirve para repetir el experimento con exactamente las mismas condiciones. Cuando cambias un valor, la simulación también empieza de nuevo.',
    ifNot:
      'Si empiezas a mirar cuando la bolita ya va por la mitad, tu ángulo de salida ya no es el de verdad y no puedes comparar dos intentos.',
  },
  {
    id: ELEMENT_ID.velocidad,
    title: 'Velocidad de la simulación',
    what:
      'Cambia qué tan rápido pasa el reloj de la simulación: 0,25×, 0,5×, 1× o 2×. ' +
      'No cambia la física: el período del péndulo es el mismo.',
    why: 'A 0,25× ves el movimiento en cámara lenta y puedes fijarte en los detalles; a 2× llegas más rápido al final.',
    ifNot:
      'Con un hilo de 0,1 m, una ida y vuelta dura unos 0,6 s y casi no alcanzas a verlo. ' +
      'A 0,25× dura unos 2,5 s y puedes seguir la bolita con calma.',
  },
  {
    id: ELEMENT_ID.calculo,
    title: 'Cómo se calcula',
    what:
      '"Real" usa la ecuación completa y sirve hasta 60°. "Ángulo pequeño" usa la fórmula sencilla y sirve hasta 15°.',
    why:
      'Hay dos porque la sencilla es fácil de entender y de calcular a mano, pero solo acierta con ángulos chicos. ' +
      'Es como un mapa plano: sirve para ir de una cuadra a otra, pero te engaña de Cali a Madrid. ' +
      'La completa es el globo terráqueo: más fiel, pero más difícil de calcular.',
    ifNot:
      'Si "Ángulo pequeño" dejara pasar de 15°, la fórmula sencilla daría 2,007 s aunque el péndulo real tarde 2,154 s a 60°: un número equivocado y sin aviso. ' +
      'Si "Real" dejara pasar de 60°, la cuenta seguiría valiendo (18 % más largo a 90° y 37 % a 120°), pero con un hilo de verdad la bolita caería en vez de balancearse. ' +
      'Por eso el simulador se queda en 60°, donde el hilo siempre está tenso.',
  },
  {
    id: ELEMENT_ID.comparar,
    title: 'Comparar con el ángulo pequeño',
    what: 'Muestra u oculta en la gráfica la curva punteada naranja de la fórmula sencilla. No reinicia la simulación.',
    why: 'Ver las dos curvas juntas es la mejor forma de notar cuánto se parecen y cuándo se separan.',
    ifNot:
      'Con un ángulo de salida de 10°, la diferencia entre las dos curvas es de solo 0,2 %: casi se tapan. ' +
      'Si la punteada estuviera siempre encendida, no verías bien la azul; por eso la enciendes tú cuando quieres comparar.',
  },
  {
    id: ELEMENT_ID.masOpciones,
    title: 'Más opciones',
    what:
      'Abre un cajón con lo que no hace falta para mirar el péndulo: cómo se calcula, la comparación, la masa, el rozamiento, la velocidad, los datos para curiosos y la Teoría. ' +
      'Con las marcas encendidas, ábrelo para ver las de adentro.',
    why: 'Así en la pantalla principal quedan el péndulo, la gráfica y los tres controles que más se usan.',
    ifNot: 'Con todo a la vista, la pantalla se llenaría de controles y datos, y quien apenas empieza no sabría por dónde arrancar.',
  },
  {
    id: ELEMENT_ID.teoria,
    title: 'Teoría',
    what: 'Abre una hoja con las ecuaciones, de dónde sale cada curva y la explicación de cada parte de la pantalla (las mismas de las marcas).',
    why: 'Es para cuando quieres saber más y eso no cabe en la pantalla principal.',
    ifNot:
      'Con las ecuaciones siempre a la vista no se vería el péndulo. ' +
      'En la hoja las lees con calma y vuelves a la simulación cuando quieras.',
  },
  {
    id: ELEMENT_ID.queEsEsto,
    title: '¿Qué es esto?',
    what:
      'Es el botón de arriba que enciende y apaga las marcas de ayuda. Con las marcas encendidas, tocas una y se abre una tarjeta que explica esa parte.',
    why: 'Así la pantalla normal se queda limpia y la ayuda aparece solo cuando la pides.',
    ifNot: 'Con una explicación pegada a cada parte, la pantalla parecería un cuaderno lleno de notas y costaría ver el péndulo.',
  },
];

export const resultExtras: ResultExtraHelp[] = [
  {
    resultKey: 'T',
    why: 'Se mide en segundos con un reloj y es lo que cambia cuando cambias L, g o el ángulo. Por eso es el resultado principal.',
    ifNot:
      'Sin un número que diga cuánto dura una ida y vuelta no podrías comparar dos péndulos. Por ejemplo, no notarías que con el hilo 4 veces más largo (4 m) cada ida y vuelta dura el doble: 4,014 s en vez de 2,007 s. ' +
      'Los relojes de péndulo funcionan justamente porque ese tiempo es casi el mismo en cada ida y vuelta.',
  },
  {
    resultKey: 'f',
    why: 'Es 1 dividido entre T. Si una ida y vuelta dura 2 s, hace 0,5 idas y vueltas por segundo, o sea 0,5 Hz.',
    ifNot:
      'Para un péndulo alcanza con T, pero para cosas muy rápidas es incómodo: el La con el que se afinan los instrumentos vibra 440 veces por segundo. ' +
      'Decir que cada ida y vuelta dura 0,0023 s es difícil de leer; decir 440 Hz es fácil.',
  },
  {
    resultKey: 'T0',
    why:
      'La fórmula T₀ = 2π√(L/g) solo usa el largo del hilo y la gravedad, y sirve de punto de comparación. ' +
      'Con L = 1 m y g = 9,8 m/s² da 2,007 s.',
    ifNot:
      'Sin T₀ creerías que el período no depende del ángulo, algo que durante mucho tiempo se pensó porque con ángulos chicos casi es cierto. ' +
      'Con T₀ al lado ves que a 60° el péndulo real es 7,3 % más lento.',
  },
  {
    resultKey: 'periodError',
    what: 'Dice cuánto más largo es el período real T que T₀, en porcentaje. Con φ₀ = 60° es 7,3 %.',
    why:
      'Un porcentaje no depende del tamaño del péndulo, solo del ángulo de salida. ' +
      'Por eso sirve para saber desde qué ángulo la fórmula sencilla ya no es buena.',
    ifNot:
      'Si solo vieras T y T₀, tendrías que decidir tú si la diferencia importa. ' +
      'El porcentaje te lo dice: a 15° es 0,4 % y no importa; a 60° es 7,3 %, y al medir 100 idas y vueltas la fórmula sencilla se equivocaría unos 15 s.',
  },
  {
    resultKey: 'omega0',
    why: 'Es el número que va dentro del coseno de la fórmula sencilla, y se calcula como √(g/L).',
    ifNot:
      'Sin ω₀ la curva punteada no se podría dibujar: su coseno necesita saber qué tan rápido gira, y con L = 1 m y g = 9,8 m/s² gira a 3,13 rad/s. ' +
      'Si el hilo fuera más corto o la gravedad mayor, ω₀ subiría y las idas y vueltas serían más rápidas.',
  },
];
