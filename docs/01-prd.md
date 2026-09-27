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
