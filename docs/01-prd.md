# Fase 1 — PRD (Requerimientos)

- **Fecha:** 2026-09-27
- **Fuente:** extraído de `docs/superpowers/specs/2026-09-21-simulador-fisica-design.md` (secciones 1-3, 7, 10), del Capítulo 1 del reporte técnico y de `docs/00-supuestos.md`. Este documento no repite decisiones ya tomadas; las traduce al formato de historias de usuario con criterios de aceptación que pide esta fase (y que la Guía Estructural pide para el Anexo A: SRS / backlog).
- **Nota sobre cuentas de usuario:** se planteó si el estudiante y el docente deberían tener cuenta propia. Se decidió no adoptarlo por ahora — ver `docs/00-supuestos.md` (roles) — así que las historias de abajo asumen sin login.

## Problema

Los laboratorios de física presenciales tienen limitaciones de espacio, equipos y tiempo en los colegios. No existe, dentro del alcance definido, una aplicación que represente un fenómeno físico mediante sus ecuaciones y una simulación interactiva, resolviendo a la vez el cálculo del fenómeno, el procesamiento de variables del usuario, la actualización de resultados y su representación visual (Capítulo 1, 1.2).

## Usuarios y roles

| Rol | Interés | Influencia sobre los requisitos |
|---|---|---|
| Estudiante (10°-11°) | Practicar el experimento sin depender de materiales; entender el fenómeno, no solo verlo | Alta — es el usuario final; define usabilidad y ayuda en contexto |
| Docente | Usar la app como apoyo de clase | Media — no tiene rol especial en la app, pero motiva la práctica guiada (B-026) |
| Director físico (Brayan Díaz) | Que la física sea correcta | Alta — valida modelos, tolerancias y contenido de los experimentos |
| Director de ingeniería (Camilo Velasco) | Que la arquitectura sea sólida | Alta — valida ADRs y calidad del código |

El equipo de desarrollo (los dos estudiantes) no se lista aquí como stakeholder del sistema, siguiendo la advertencia de la Guía Estructural (3.2.1): es la estructura interna que ejecuta el proyecto, no una parte interesada externa.

## Historias de usuario y criterios de aceptación

### Ya implementadas (laboratorio MAS, MVP)

**HU-01 — Ajustar parámetros del péndulo**
Como estudiante, quiero ajustar la longitud, el ángulo inicial, la gravedad y la masa, para observar cómo cambia el movimiento del péndulo.
- Dado un valor dentro del rango permitido, cuando lo escribo (con punto o con coma decimal), entonces se aplica y la simulación lo refleja.
- Dado un valor fuera de rango o no numérico, cuando lo escribo, entonces veo un mensaje de error en español y el último valor válido se conserva.

**HU-02 — Controlar la simulación**
Como estudiante, quiero reproducir, pausar, reiniciar y cambiar la velocidad de la simulación, para observar el fenómeno a mi ritmo.
- Dado que presiono Play, entonces el péndulo empieza a oscilar y el tiempo avanza.
- Dado que cambio un parámetro mientras está en pausa o corriendo, entonces la simulación no salta ni se vuelve inestable.
- Dado que la pestaña del navegador estuvo oculta varios segundos, cuando vuelvo a ella, entonces el tiempo simulado no da un salto (paso por cuadro limitado).

**HU-03 — Comparar con la teoría**
Como estudiante, quiero ver una gráfica del ángulo en el tiempo, comparando la curva simulada con la teórica, para confiar en que la simulación es fiel al fenómeno real.
- Dado que la simulación corre, entonces la curva simulada coincide visualmente con la curva teórica.
- Verificado en motor: error relativo < 1×10⁻⁶ en 10 períodos (prueba automatizada).

**HU-04 — Conocer los límites del modelo**
Como estudiante, quiero que se me avise cuando el ángulo inicial hace que la aproximación deje de ser válida, para no interpretar mal el resultado.
- Dado un ángulo inicial mayor a 15°, entonces veo un aviso que indica cuánto se desviaría un péndulo real (por ejemplo, "≈1,7 % a 30°").

### En curso (capa pedagógica, B-026/B-027)

**HU-05 — Entender qué es cada variable**
Como estudiante, quiero una ayuda en contexto por cada parámetro y resultado, para saber qué significa antes de experimentar.
- Dado que presiono el botón "?" de un parámetro o resultado, entonces veo una explicación breve con un ejemplo cotidiano.

**HU-06 — Aprender con experimentos guiados**
Como estudiante, quiero hacer experimentos guiados (predecir, probar, comprobar y concluir) por cada laboratorio, para descubrir el efecto de cada variable como en un método científico.
- Dado que elijo un experimento, entonces primero predigo una respuesta antes de ver el resultado.
- Dado que sigo los pasos y respondo la comprobación, entonces recibo retroalimentación inmediata y una conclusión ligada a la fórmula.

### Fuera del MVP actual (después de este semestre)

**HU-07 — Exportar datos**
Como estudiante, quiero ver una tabla de datos de la simulación y exportarla a CSV, para analizarla fuera de la aplicación.

**HU-08 — Péndulo compuesto**
Como estudiante, quiero simular un péndulo compuesto (cuerpo rígido con el teorema de Steiner), para comparar su comportamiento con el péndulo simple.

**HU-09 — Relación carga-masa**
Como estudiante, quiero simular partículas cargadas en campos eléctricos y magnéticos, para calcular la relación carga-masa.

**HU-10 — Compartir un experimento**
Como estudiante, quiero un enlace que guarde los parámetros actuales en la URL, para compartir una configuración con un compañero o el docente, sin crear cuenta ni guardar nada en un servidor.

## Requisitos no funcionales

Los escenarios medibles completos están en la sección 3 del diseño; aquí se resumen y se agregan los que pide explícitamente esta fase:

| Categoría | Requisito |
|---|---|
| Rendimiento | Actualización < 100 ms al mover un parámetro; ≥ 30 fps en un PC de gama baja de colegio |
| Disponibilidad | Sin backend que pueda caerse; disponibilidad = la del hosting estático (Vercel/GitHub Pages) |
| Seguridad | Sin superficie de ataque de backend (no hay uno). Único vector a vigilar: si HU-10 (parámetros en la URL) se implementa, los valores deben validarse igual que la entrada manual, para evitar inyectar contenido no numérico en el DOM |
| Privacidad | Cero datos personales recolectados o almacenados (Ley 1581); ni siquiera con HU-10, porque solo viajan números de física, no datos del estudiante |
| Accesibilidad | WCAG 2.2 nivel AA como objetivo (declarado en el diseño); pendiente correr una auditoría automática (brecha ya registrada en `docs/A-auditoria.md`) |
| Dispositivos | Escritorio, tablet y celular (verificado manualmente a 375 px sin scroll horizontal) |
| Idiomas | Español para toda la interfaz; sin internacionalización prevista (fuera de alcance) |
| Mantenibilidad | Cobertura de pruebas del motor ≥ 90 % (hoy 100 % de líneas) |

## Alcance del MVP frente a fuera de alcance

Reutilizado de la sección 2 del diseño (tabla Debe/Debería/Podría/Fuera de alcance) sin cambios; no se repite aquí para no duplicar la fuente de verdad. Ver [docs/superpowers/specs/2026-09-21-simulador-fisica-design.md#2-funcionalidades](docs/superpowers/specs/2026-09-21-simulador-fisica-design.md).

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El modelo físico del MAS (péndulo simple vs. masa-resorte) sigue sin confirmar con el director físico | Alto — afecta la validez de todo lo ya construido | Pregunta redactada y pendiente de enviar (bitácora B-013) |
| Fecha del PMV sin confirmar | Medio — no se puede planear con precisión | Confirmar con el coordinador del curso |
| Capa pedagógica diseñada pero no implementada | Medio | Plan de implementación pendiente de retomar |
| Sin CI ni pruebas E2E | Bajo por ahora (proyecto pequeño, 2 personas) | Ver brechas 2 y 6 de `docs/A-auditoria.md` |

---

# Iteración 2 (2026-10-05): correcciones del profesor Brian al péndulo simple

- **Fuente:** revisión del profesor (transcripción), registrada en B-055. Decisiones del usuario en Fase 0 y Fase 1: dos modos con selector en pantalla; modo lineal hasta 15° y no lineal hasta 60°; masa se mantiene como control y se explica; fricción viscosa −b·ω con b = 0 por defecto; fecha objetivo: esta semana.
- **Alcance:** solo el laboratorio MAS (péndulo simple). El péndulo compuesto (spec del 2026-09-29) queda fuera de esta iteración y no se toca.

## Terminología fijada (para la sustentación)

| Término | Significado en el proyecto |
|---|---|
| Curva azul (Simulada) | Integración numérica (RK4) de la ecuación diferencial del modo activo. NO es la solución analítica ni una captura "píxel por píxel" del dibujo: se calcula con la ecuación y luego se dibuja |
| Curva punteada (Aprox. lineal) | Solución analítica de la ecuación linealizada (sen θ ≈ θ): θ(t) = A·cos(ω₀t + φ) y, con fricción, su versión amortiguada |
| Signo del ángulo | Eje vertical de referencia (θ = 0, colgando en reposo). θ > 0 hacia la derecha, θ < 0 hacia la izquierda. Un mismo valor absoluto aparece con ambos signos en las dos mitades de la oscilación |

## Historias de usuario nuevas

**HU-11 — Elegir el modo de simulación**
Como estudiante, quiero elegir entre "Lineal" y "No lineal" en la misma pantalla, para comparar el péndulo de ángulo pequeño con el real.
- Dado el modo Lineal, entonces la simulación integra θ'' = −(g/L)·θ y el ángulo inicial máximo es 15°.
- Dado el modo No lineal, entonces integra θ'' = −(g/L)·sen θ y el ángulo inicial máximo es 60°.
- Dado que cambio de modo, entonces la simulación se reinicia y, si el ángulo supera el máximo del nuevo modo, se ajusta al máximo y se me avisa.
- Cada modo muestra sus propias ecuaciones y la explicación de cuándo es válido.

**HU-12 — Ver la masa sin efecto**
Como estudiante, quiero comprobar que cambiar la masa no cambia el movimiento, para entender que la masa se cancela.
- Dado dos masas distintas con los mismos L, g y φ₀, entonces θ(t), el período T y la frecuencia son idénticos (prueba automática, tolerancia 1×10⁻¹²).
- La energía sí escala con m y se indica así en su ayuda.
- Una ayuda junto al control de masa muestra la cancelación: m·g·sen θ = m·L·θ'' ⇒ θ'' = −(g/L)·sen θ.

**HU-13 — Mostrar u ocultar la linealización**
Como estudiante, quiero un botón que muestre u oculte la curva punteada, para comparar visualmente.
- Dado el botón, cuando lo uso, entonces la curva punteada aparece o desaparece sin reiniciar la simulación ni perder datos.
- El estado se anuncia a lectores de pantalla (aria-pressed) y se opera con teclado.
- Por defecto, la curva punteada está visible.

**HU-14 — Entender por qué divergen las curvas**
Como estudiante, quiero una explicación y una medida de la separación entre curvas, para entender el error de la aproximación lineal.
- Dado el modo No lineal, entonces veo el error relativo del período (T − T₀)/T₀ y un texto que explica que sen θ ≈ θ solo vale para ángulos pequeños (< 10°, idealmente tendiendo a 0) y que la diferencia crece con φ₀.
- Dado que φ₀ ≤ 10°, el aviso indica que la separación es despreciable; dado φ₀ > 10°, indica cuánto se separa.
- Los valores mostrados coinciden con el cálculo del motor (prueba automática).

**HU-15 — Agregar fricción**
Como estudiante, quiero activar fricción del aire, para ver un péndulo más realista.
- Dado un parámetro b (1/s) con valor 0 por defecto, entonces con b = 0 el comportamiento es idéntico al actual (las 83 pruebas existentes siguen pasando).
- Dado b > 0, entonces la amplitud decae en el tiempo y se muestra el decaimiento.
- Dado un valor de b fuera del rango permitido, entonces se muestra un mensaje en español y se conserva el último valor válido.
- Con fricción, la curva punteada es la solución lineal amortiguada del mismo b, para que la comparación siga siendo justa.

**HU-16 — Entender el origen de la gráfica y el signo**
Como estudiante, quiero saber de dónde sale cada curva y por qué θ toma valores positivos y negativos.
- Dado un panel "De dónde sale esta gráfica", entonces explica la curva azul (integración numérica de la ecuación) y la punteada (solución analítica lineal).
- La gráfica dibuja y rotula el eje de referencia θ = 0, y el dibujo del péndulo indica el sentido positivo.

**HU-17 — Ver las ecuaciones de cada modelo**
Como estudiante, quiero ver las ecuaciones del modelo activo, para relacionar la simulación con la teoría.
- Lineal: θ'' + (g/L)θ = 0; θ(t) = A·cos(ω₀t + φ); ω₀ = √(g/L); T₀ = 2π√(L/g).
- No lineal: θ'' + (g/L)·sen θ = 0; T = T₀ · 2K(k)/π con k = sen(φ₀/2) (o el equivalente con la media aritmético-geométrica, que es lo que calcula el motor); desarrollo T ≈ T₀(1 + φ₀²/16 + …).
- Con fricción: se muestra el término −b·θ'.
- Las fórmulas que entregue el profesor se incorporan tal cual; hasta recibirlas, se usan las anteriores (riesgo R-2).

**HU-18 — Conocer cada parámetro**
Como estudiante, quiero una explicación de cada parámetro: de dónde sale el valor, para qué sirve y qué pasa si lo omito o lo altero.
- Para L, φ₀, g, m y b (y para cada resultado) existen tres textos: origen/valor típico, función en el modelo y efecto de cambiarlo u omitirlo.
- Todos accesibles por teclado y lector de pantalla, dentro del mismo patrón de ayuda actual.

**HU-19 — Dos experimentos guiados (lineal y no lineal)**
Como estudiante, quiero un experimento guiado por modo, para predecir el período en cada caso.
- Experimento lineal: predecir T con φ₀ ≤ 10° y verificar con T₀ = 2π√(L/g).
- Experimento no lineal: predecir T con φ₀ hasta 60° usando la fórmula no lineal y comparar con T₀.
- Los textos de los experimentos existentes se actualizan para decir que el período no depende de la masa y sí del ángulo (ya parcialmente hecho en el código sin commitear).

## Requisitos no funcionales añadidos

| Categoría | Requisito |
|---|---|
| Exactitud | Con b = 0 en modo No lineal, el período simulado coincide con el calculado por AGM con error relativo < 1×10⁻³ en 10 períodos; en modo Lineal, con T₀ con error < 1×10⁻⁶ (ya verificado en el MVP) |
| Compatibilidad | Con b = 0 y modo No lineal, el comportamiento actual no cambia; la suite existente sigue en verde |
| Accesibilidad | Selector de modo y botón de linealización con teclado, roles y estados ARIA; contraste AA en los textos nuevos |
| Rendimiento | Sin pérdida frente a lo medido en `docs/07-rendimiento-a11y-seo.md` |
| Privacidad | Sin cambios: cero datos personales |

## Riesgos nuevos

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R-1 | El rango de 15° del profesor puede referirse solo al modo lineal | Bajo | Se fijó 15° lineal / 60° no lineal; confirmar con él |
| R-2 | Las ecuaciones del modelo no lineal "que proporciona el profesor" aún no se han recibido | Medio | **Resuelto 2026-10-06:** llegó la foto (Wikipedia, "Péndulo simple", oscilaciones de mayor amplitud): la serie `T = T₀·Σ[(2n)!/(2²ⁿ(n!)²)]²·sen²ⁿ(θ/2)` y `T ≈ T₀(1 + θ²/16)`. Ya están en la plataforma; la serie coincide con el cálculo por media aritmético-geométrica (error relativo < 1e-12, con prueba) |
| R-3 | Rango de b: el movimiento sobreamortiguado no es oscilatorio (b ≥ 2ω₀) | Medio | Limitar b a un máximo por debajo de 2ω₀ mínimo; definirlo en Fase 3 |
| R-4 | Plazo de una semana para varias historias | Alto | Priorizar HU-11, HU-13, HU-12 y HU-16 primero; HU-15, HU-17, HU-18 y HU-19 después |

## Priorización

1. **Debe (sustentación):** HU-11, HU-12, HU-13, HU-16.
2. **Debería:** HU-14, HU-17, HU-18.
3. **Podría dentro de la semana:** HU-15 (fricción), HU-19 (dos experimentos).
