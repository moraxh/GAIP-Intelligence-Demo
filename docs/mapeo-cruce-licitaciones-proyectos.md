# Mapeo de cruce: Licitaciones (GAIP) ↔ Proyectos (post-adjudicación)

Contexto: en la última demo se identificó que, con los datos que teníamos hasta
ahora (`data/raw-data.json`, `data/raw-historico.json`), no había suficiente
material para cruzar información entre sistemas. El cliente compartió una
segunda demo (`~/Downloads/proyectos-semanal-demo`, build estática con
Supabase) para mostrar cómo llevan el seguimiento de los proyectos **una vez
adjudicados**: avance, contrato, facturación, pagos y fianzas. Este documento
mapea los dos modelos de datos campo por campo para decidir, antes de tocar
código, cómo se conectarían.

## 1. Los dos sistemas hoy

| | GAIP (`gaip-demo`) | Tablero de Proyectos (`proyectos-semanal-demo`) |
|---|---|---|
| Momento del ciclo de vida | **Pre-adjudicación**: detección → filtrado → trabajo → construcción → fallo | **Post-adjudicación**: ya es un proyecto activo con contrato firmado |
| Fuente de datos | ComprasMX + Excel de Gantt + Excel de Ofertas (`lib/mock-data.ts`, generado desde los JSON crudos) | Supabase (`projects`, `invoices`, `payments`, `project_bonds`, `project_addenda`, `weekly_goals`, `admin_tasks`) |
| Pregunta que responde | "¿Qué estamos persiguiendo y en qué estado va la propuesta?" | "¿Cómo va el proyecto que ya ganamos, física y financieramente?" |
| Unidad central | `Licitacion` (expediente) | `project` |

Hoy **no existe ningún campo compartido** entre ambos — es el primer gap a
resolver antes de poder cruzar nada.

## 2. Entidad central: Licitación vs. Proyecto

| Campo GAIP (`Licitacion`) | Tipo | Campo Tablero (`projects`) | Tipo | Notas de cruce |
|---|---|---|---|---|
| `id` (ej. `E-2026-00080053`) | string | *(no existe)* | — | **Gap principal.** No hay FK ni campo libre en `projects` que referencie el expediente de origen. Se necesitaría agregar algo como `source_tender_id` en `projects`. |
| `numero` (ej. `LO-09-JZO-...`) | string | *(no existe)* | — | Mismo gap — podría usarse como llave alterna si `id` cambia de formato entre fuentes. |
| `nombre` / `nombreFuente` | string | `name` | string | Cruce por texto (fuzzy) posible mientras no haya ID compartido, pero frágil (ver ejemplo Tramo II/III más abajo). |
| `dependencia` (ATTRAPI, SICT, SEDENA...) | string | `client` | string \| null | Candidato de cruce por nombre, mismo riesgo que arriba. |
| `estado` (`Detectada`\|`Filtrada`\|`En trabajo`\|`Construcción`\|`Fallo`) | enum | `status` (`activo`\|`en_pausa`\|`en_riesgo`\|`terminado`\|`cancelado`) | enum | **No son el mismo eje.** `estado` en GAIP es el avance del *proceso de licitación*; `status` en el Tablero es el estado del *proyecto ya adjudicado*. La transición lógica sería: `Licitacion.estado = "Fallo"` (ganado) → se crea un `project` con `status = "activo"`. |
| `fallo` (fecha) | string | *(no existe directamente; sí `contract.start_date` implícito)* | — | El fallo de GAIP debería marcar el nacimiento del proyecto; hoy no hay campo que registre esa fecha de "conversión". |
| `tareas` (Gantt: nombre, área, avance, responsable) | array | `progress` (0-100, un solo número) | number | GAIP tiene granularidad por tarea/área/responsable durante la licitación; el Tablero solo tiene un `progress` agregado del proyecto ya en obra. Son Gantts de dos etapas distintas del mismo expediente — no el mismo dato. |
| `esExterna` | boolean | — | — | Sin equivalente; es un concepto propio de cómo GAIP detecta fuentes. |
| *(no existe)* | — | `coordinator_id` → `profiles.full_name` | string | GAIP tiene `responsable` por tarea (ALICIA, LUIS, JEMO...) pero no un responsable único de "el proyecto"; el Tablero sí. Cruce natural: el `coordinator` del proyecto ganado podría prellenarse con quien más avance tuvo en la etapa técnica/económica. |

## 3. Lo nuevo que aporta el Tablero: dinero y cumplimiento

Esto es lo que GAIP **no tiene y no puede simular** (por eso RH/Finanzas/Obra
aparecen grises como "módulos no conectados" en el dashboard actual):

| Entidad Tablero | Campos clave | Qué resolvería si se cruza con GAIP |
|---|---|---|
| `projects` (contrato) | `contract_amount`, `contract_start`, `contract_end`, notas contractuales | Completa el ciclo: monto ofertado en `oferta.monto` / licitación ganada → monto contractual real firmado. Hoy GAIP solo tiene el monto de una oferta comercial suelta (KIVA), no de licitaciones ganadas. |
| `project_addenda` | `number`, `amount`, `date` | Modifica el monto contractual original — relevante para proyectar ingresos reales vs. lo que se ofertó en la licitación. |
| `invoices` | `folio`, `amount`, `status` (`pendiente`/`facturado`/`pagado`), `issue_date` | Cruza con `avance` físico del Gantt de GAIP: ¿se está facturando al ritmo del avance reportado, o hay desfase? |
| `payments` | `amount`, `payment_date` | Con `invoices` arma cobranza: facturado − pagado = pendiente por cobrar. |
| `project_bonds` (fianzas) | `type` (`cumplimiento`/`anticipo`/`vicios_ocultos`/`otro`), `insurer`, `policy_number`, `expiry_date`, `status` (`vigente`/`por_vencer`/`vencida`/`liberada`) | **Cruce de alto valor**: fianzas por vencer cruzadas contra hitos/fechas de fallo de GAIP — hoy GAIP solo avisa de fechas de decisión pre-adjudicación, no de obligaciones de cumplimiento post-adjudicación. |
| `weekly_goals` | `week_start`, objetivo, completado | Podría alimentar la misma lógica de "Capacidad vs. Demanda" que ya existe en GAIP (`app/page.tsx`, sección Pieza 3) pero para proyectos en ejecución, no solo para tareas de licitación. |
| `admin_tasks` | checklist simple (task, notes, completed) | Bajo valor de cruce — es administrativo interno, no ligado a expedientes. |

## 4. El gap real: no hay llave compartida — resuelto por un motor de cruce fuzzy

Ejemplo concreto que ya vive en los datos actuales de GAIP
(`lib/mock-data.ts`): el expediente **"Tramo III" (93 km)** aparece **dos
veces** con IDs distintos:
- `XLS-LO09JZO009JZO001N342026` (estado `En trabajo`, fuente externa)
- `E-2026-00080086` (estado `Construcción`, fuente ComprasMX)

Ambos comparten el mismo `numero` (`LO-09-JZO-009JZO001-N-34-2026`) pero GAIP
ya los trata como registros separados por venir de fuentes distintas
(`totalDuplicados: 17` en `fuentes`, ver `app/page.tsx` — GAIP ya tiene una
noción de "duplicados entre fuentes").

Este gap ya no es solo una advertencia: es lo que resuelve
[`lib/matching-engine.ts`](../lib/matching-engine.ts). En vez de esperar a
que el cliente confirme un `source_tender_id` limpio, el motor calcula un
score de similitud (número de procedimiento, nombre, dependencia, fechas) en
tiempo real y vincula automáticamente solo cuando la confianza supera el
85% — el par Tramo III cruza con 99.75%. Esto es deliberado: **Velar
Intelligence existe para cruzar fuentes que nunca traen ID compartido**, así
que el motor está diseñado para funcionar sin él desde el día uno, no como
un parche temporal mientras se consigue la llave "correcta". Ver
[`ejemplo-ilustrativo-cruce.md`](./ejemplo-ilustrativo-cruce.md) §0 para el
detalle del algoritmo y los casos de prueba.

Esto no elimina el valor de preguntarle al cliente por un identificador
compartido — si existe, sería una señal más (la más fuerte posible, un
match exacto de ID en vez de un score) que el motor podría incorporar sin
cambiar su diseño. Pero el producto ya no depende de esa respuesta para
funcionar.

## 5. Próximos pasos sugeridos

1. Confirmar con el cliente si `projects` en su sistema real tiene o puede
   tener un campo que referencie el expediente/número de licitación de
   origen — si existe, se incorpora al motor como señal adicional de peso
   máximo, no como reemplazo del cruce por score.
2. Decidir la regla de conversión: ¿todo expediente en `estado: "Fallo"`
   ganado se vuelve automáticamente un `project`, o es un paso manual?
3. Cuando existan datos reales de `projects`/`invoices`/`payments`/
   `project_bonds`, extender `scripts/build-mock-data.mjs` siguiendo el
   mismo patrón de normalización ya usado (`fmtFecha`, `titleCase`,
   `normalizeProcedureName`, ahora en `lib/text-normalization.ts`) y apuntar
   `lib/matching-engine.ts` a los datos reales en vez de a
   `lib/mock-data-finanzas-obra.ts`.
4. Definir con el cliente qué persona del equipo de licitaciones
   (`responsable` en el Gantt) suele quedar como `coordinator` del proyecto
   adjudicado — es el segundo campo sin llave compartida, no cubierto aún
   por el motor de cruce (que hoy solo vincula expediente↔proyecto, no
   responsable↔coordinador).
