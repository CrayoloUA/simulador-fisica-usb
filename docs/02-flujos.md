# Fase 2 — Mapa de pantallas y flujos

- **Fecha:** 2026-09-27
- **Nota:** no hay pantallas de registro ni de inicio de sesión — decisión ya tomada (sin cuentas, ver `docs/00-supuestos.md`). Tampoco hay una pantalla de "ajustes" separada: las únicas preferencias (modo y velocidad) viven en la pantalla principal, sin persistencia entre sesiones.

## Mapa de pantallas

```
┌─────────────────────────────────────────────────────────────┐
│  (futuro, no bloqueante) Elegir laboratorio                 │
│  — hoy no existe, porque solo hay un laboratorio (MAS)       │
└──────────────────────────┬────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Pantalla del laboratorio (única pantalla hoy)               │
│  ┌───────────────┐  ┌─────────────────────────────────────┐ │
│  │ Modo: Explorar │  │ Modo: Experimentos                  │ │
│  └───────────────┘  └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Flujo central — modo Explorar (ya construido y verificado)

```
Cargar app
   │
   ▼
Ver péndulo pausado con valores por defecto (L=1, φ₀=10°, g=9,8, m=0,5)
   │
   ├─▶ Ajustar un parámetro (deslizador, campo de texto o preset de gravedad)
   │        │
   │        ├─▶ válido  → se aplica, resultados se recalculan
   │        └─▶ inválido → mensaje de error en línea, no se aplica
   │
   ├─▶ Presionar "?" en un parámetro o resultado → ver ayuda en contexto (en curso)
   │
   ├─▶ Play → la simulación corre, la gráfica se llena, los resultados se actualizan
   │        │
   │        └─▶ φ₀ > 15° → aparece el aviso de límite del modelo
   │
   ├─▶ Pausa → se detiene en el punto actual
   └─▶ Reiniciar → vuelve a t = 0 y pausa
```

## Flujo central — modo Experimentos (diseñado, sección 12; implementación pendiente)

```
Elegir "Experimentos" en el encabezado
   │
   ▼
Lista de 5 experimentos del laboratorio MAS
   │
   ▼ (elegir uno)
Etapa 1 — Predecir
   │  pregunta + opciones; "Continuar" deshabilitado hasta elegir una
   ▼
Etapa 2 — Pasos (uno o más)
   │  instrucción del paso; si el paso lo requiere, botón "Preparar valores"
   │  (aplica los parámetros, pausa y reinicia la simulación)
   │  el control o resultado relevante queda resaltado
   ▼
Etapa 3 — Comprobar (una o más preguntas)
   │  pregunta de opción múltiple; al responder, retroalimentación inmediata
   │  (verde si es correcta, roja si no) antes de poder continuar
   ▼
Etapa 4 — Conclusión
   │  si la predicción inicial coincidió o no, y el texto de conclusión
   ▼
"Volver a la lista" → vuelve a elegir otro experimento
```

## Estados de error (todos dentro de la misma pantalla, sin navegación)

| Estado | Disparador | Qué ve el estudiante |
|---|---|---|
| Parámetro inválido | Texto no numérico o fuera de rango | Mensaje en línea en español; el control conserva el último valor válido |
| Límite del modelo | φ₀ > 15° en el MAS | Banner amarillo con el porcentaje de desviación estimado |
| Simulación con valor no finito | Un cálculo del motor produce NaN o infinito (guarda de seguridad, no debería ocurrir con rangos válidos) | Mensaje de error y la simulación se detiene; "Reiniciar" la recupera |
| Pestaña oculta y de vuelta | El estudiante cambia de pestaña varios segundos | Ningún salto visible: el tiempo por cuadro está limitado |
| Canvas o JavaScript no disponible | Navegador sin soporte | **Diseñado, no implementado** — brecha ya anotada en `docs/A-auditoria.md` |

## Vacío identificado en esta fase

No existe todavía un mensaje explícito para "Canvas o JavaScript no disponible" (aparece en el diseño original, sección 8, pero nunca se construyó). Es de baja prioridad porque Canvas y JS son universales en navegadores modernos, pero queda anotado para no perderlo de vista antes del reporte final.
