# Ejemplo ilustrativo: cómo se vería el cruce Licitaciones ↔ Proyectos

> ⚠️ **Esto no son datos reales.** Es un ejercicio de diseño, ya implementado
> como vista de concepto en el dashboard (módulos **Finanzas**, **Obra** y
> **Cruce**), para mostrar *qué pregunta responde* el cruce descrito en
> [`mapeo-cruce-licitaciones-proyectos.md`](./mapeo-cruce-licitaciones-proyectos.md).
> Los seis expedientes de licitación sí son reales (vienen de
> `lib/mock-data.ts`); todo lo relacionado a contrato, facturas, pagos y
> fianzas fue **inventado a mano** en
> [`lib/mock-data-finanzas-obra.ts`](../lib/mock-data-finanzas-obra.ts), de
> forma internamente consistente con esos datos reales, solo para que el
> ejercicio se sienta creíble. No implica que el cliente ya tenga estos datos
> cargados en ningún sistema.
>
> `lib/mock-data.ts` (el pipeline de datos reales de GAIP) nunca se tocó ni
> se tocará para este ejercicio — ver el banner de advertencia en
> `lib/mock-data-finanzas-obra.ts`.

## 0. El cruce ya no es un ID a mano — lo calcula un motor de matching

La primera versión de este ejercicio (documentada más abajo) ligaba cada
proyecto ilustrativo a su expediente real con un campo `licitacionId`
hardcodeado — un join perfecto, pero artificial, porque nosotros ya
conocíamos la respuesta. Eso no representa el problema real: **Velar
Intelligence existe para cruzar datos de fuentes que nunca traen un ID
compartido limpio** — no es un caso especial de GAIP, es la premisa del
producto.

Por eso se construyó [`lib/matching-engine.ts`](../lib/matching-engine.ts):
un motor que calcula, en tiempo real y sin ningún ID compartido, un score de
similitud (0-100%) entre cada licitación real y cada proyecto ilustrativo,
usando cuatro señales ponderadas — número de procedimiento (55%), nombre
normalizado (30%), dependencia/cliente (10%) y proximidad entre la fecha de
fallo y el inicio de contrato (5%). Solo se vincula automáticamente cuando
el score supera el **85% de confianza**; todo lo demás queda explícitamente
"sin vincular" en vez de adivinar.

El caso de prueba obligatorio del motor es real, no inventado: el expediente
"Tramo III" aparece **dos veces** en `lib/mock-data.ts` con IDs totalmente
distintos (`XLS-LO09JZO009JZO001N342026` y `E-2026-00080086`), porque
ComprasMX y un Excel externo lo reportan por separado. El motor los cruza
con 99.75% de confianza aunque la mitad de sus campos (entidad, estado,
estatus, tipo) difieran — porque el número de procedimiento coincide exacto.
Un segundo caso, "Tramo II" (inventado solo para la prueba, con nombre casi
idéntico a Tramo III pero sin número de procedimiento capturado), se rechaza
correctamente con 62.5% — por debajo del umbral. Ambos casos están en
[`scripts/verify-matching-engine.mjs`](../scripts/verify-matching-engine.mjs),
ejecutable con `node scripts/verify-matching-engine.mjs`.

El resumen ejecutivo ("Decisiones de la semana") muestra el motor corriendo
en vivo: el hallazgo de mayor riesgo del portafolio ilustrativo aparece como
una fila más entre las alertas del corte, con su evidencia y, cuando aplica,
el aviso "sin expediente vinculado automáticamente".

### 0.1 `numeroProcedimiento` se quitó de los proyectos ilustrativos a propósito

La primera versión de este ejercicio poblaba `numeroProcedimiento` en los 6
proyectos ilustrativos con el número real del expediente correspondiente —
eso hacía que la señal de mayor peso (55%) fuera, en la práctica, el mismo
ID compartido que el motor dice no necesitar. Se verificó contra el bundle
real de `proyectos-semanal-demo` (sin acceso a fuente, solo assets
compilados) que ese campo **no existe hoy** en el Tablero de Proyectos del
cliente. Por eso se quitó (queda comentado, no borrado, para no perder la
trazabilidad a qué expediente real corresponde cada proyecto) y el motor
ahora cruza solo con nombre + dependencia + fecha — las señales que el
cliente sí tiene hoy.

Resultado con el motor real, sin ese campo: **4 de 6 proyectos vinculan
automáticamente** (88-100% de confianza), y **2 quedan por debajo del
umbral** (79.4% y 83.4%) — incluido "Control de Calidad de la Obra —
Mejoramiento Etapa 2" (ASIPONAGUAYMAS), que es justo el caso con la fianza
más urgente del portafolio. Ese caso límite ahora se muestra explícitamente
en la UI como "sin vincular, revisar a mano" en vez de forzarse — es la
prueba en vivo de que el motor no adivina, no solo una afirmación en este
documento.

## 1. Los seis expedientes usados

Se ligaron seis expedientes de `lib/mock-data.ts` a un proyecto ilustrativo
cada uno, con una regla de selección estricta: **solo expedientes cuyo
`estado` real ya es `'Fallo'` o `'Construcción'`** — es decir, licitaciones
que GAIP ya reporta como ganadas o en obra al corte (10 sep 2026). No se usó
ningún expediente en `'En trabajo'`, porque su fallo real todavía no ha
ocurrido a esa fecha: no puede existir un "proyecto adjudicado" (con
contrato, facturas y pagos) de algo que GAIP todavía no reporta como ganado.
Esa fue precisamente una inconsistencia detectada y corregida durante la
implementación de la vista de concepto — y el mismo tipo de inconsistencia
volvió a aparecer más tarde: el primer expediente elegido para este set
("Lagos de Moreno", fallo 11 sep 2026) tenía un `contractStart` ilustrativo
de 15 jun 2026, *anterior* a su propio fallo real — imposible en la
práctica. El motor de cruce lo expuso solo mostrando 0% de proximidad en esa
señal (aunque el score total seguía cruzando gracias al número de
procedimiento). Se corrigió reemplazándolo por otro expediente real ya en
estado `'Construcción'` (sin depender de una fecha de fallo específica):
Reconstrucción del Puente "Xuchipantla".

| Proyecto ilustrativo | ID GAIP | Estado real en GAIP | Fallo / adjudicación |
|---|---|---|---|
| Puente "Xuchipantla" (Hidalgo) | `E-2026-00099528` | Construcción | — |
| Control de Calidad — ASIPONAGUAYMAS | `E-2026-00093484` | Fallo | 11 sep 2026 |
| Puente "Las Pilas" (Hidalgo) | `E-2026-00099527` | Construcción | — |
| Tramo 8 — Corredor Golfo México (BANOBRAS) | `E-2026-00091321` | Construcción | — |
| Tramo I Ferroviario (ATTRAPI) | `E-2026-00076620` | Construcción | — |
| Agua Potable — Xicotepec (CONAGUA) | `E-2026-00098796` | Construcción | — |

Todas las fechas de contrato, facturas y pagos ilustrativos caen entre el
inicio de contrato y el corte de datos (10 sep 2026), nunca después — para
no mostrar eventos "del futuro" en una demo que se presenta como estado
actual.

## 2. Datos inventados de "proyecto" (post-adjudicación)

| | Xuchipantla | ASIPONAGUAYMAS | Las Pilas | Tramo 8 Golfo | Tramo I Ferroviario | Xicotepec |
|---|---|---|---|---|---|---|
| Cliente | SICT | ASIPONAGUAYMAS | SICT | BANOBRAS | ATTRAPI | CONAGUA |
| Monto contractual | $9,150,000 | $15,800,000 | $24,100,000 | $31,200,000 | $88,400,000 | $5,900,000 |
| Adenda | +$1,200,000 (No. 1) | — | — | — | — | — |
| Monto total | $10,350,000 | $15,800,000 | $24,100,000 | $31,200,000 | $88,400,000 | $5,900,000 |
| Avance físico de obra | 78 % | 22 % | 62 % | 34 % | 9 % | 55 % |
| Facturado a la fecha | $8,073,000 | $1,200,000 | $14,900,000 | $7,400,000 | $0 | $4,300,000 |
| Pagado a la fecha | $7,245,000 | $480,000 | $8,800,000 | $4,100,000 | $0 | $3,200,000 |
| Fianza de cumplimiento | **Por vencer — 24 sep 2026** | **Por vencer — 20 sep 2026** | Vigente, vence 10 jun 2027 | Vigente, vence 01 dic 2027 | Vigente (anticipo), vence 20 ago 2027 | Vigente, vence 01 ene 2027 |

## 3. La estadística que el cruce permite calcular

Con esos datos, este es el tipo de tablero que ya se puede navegar en la
demo (módulos Finanzas y Obra) — y que GAIP **no podía armar antes** porque
Finanzas y Obra eran módulos grises ("no conectados"):

### 3.1 Cobranza consolidada de los 6 proyectos

| Concepto | Monto |
|---|---|
| Monto total contratado | $175,750,000 |
| Facturado | $35,873,000 (20.4 % del total) |
| Pagado | $23,825,000 (66.4 % de lo facturado) |
| **Pendiente por cobrar** (facturado − pagado) | $12,048,000 |
| **Por ejercer** (total − facturado) | $139,877,000 |

*Lectura: el 79.6 % del contrato firmado todavía no se ha facturado — normal
en un portafolio con proyectos en distintas etapas de ejecución, pero es
justo el tipo de número que hoy nadie ve consolidado en un solo lugar.*

### 3.2 Avance físico vs. avance financiero — el cruce que expone desfases

| Proyecto | Avance físico de obra | % facturado del contrato | Señal |
|---|---|---|---|
| Xuchipantla | 78 % | 78.0 % | ✅ Alineado (0.0 pts) |
| ASIPONAGUAYMAS | 22 % | 7.6 % | 🟡 Desfase moderado (14.4 pts) |
| Las Pilas | 62 % | 61.8 % | ✅ Alineado (0.2 pts) |
| Tramo 8 Golfo | 34 % | 23.7 % | ✅ Alineado (10.3 pts, límite del rango verde) |
| Tramo I Ferroviario | 9 % | 0.0 % | ✅ Alineado (9.0 pts, obra recién arrancando) |
| Xicotepec | 55 % | 72.9 % | 🟡 Desfase moderado (17.9 pts) |

*El valor real de este cruce es detectar cuando avance físico y facturación
**no** están alineados. Dos casos aparecen en este ejemplo: ASIPONAGUAYMAS
(22 % de avance físico pero solo 7.6 % facturado — dinero ya generado en
campo que todavía no se está cobrando) y Xicotepec (55 % de avance físico
pero 72.9 % facturado — facturación adelantada al ritmo real de obra). El
semáforo — verde si la diferencia es menor a 10 puntos, amarillo 10-25, rojo
mayor a 25 — es la vista que ya está implementada en el módulo Obra del
dashboard.*

### 3.3 Fianzas por vencer cruzadas con hitos de GAIP — el hallazgo de mayor valor

Este es el cruce que identificamos como prioritario en el documento de
mapeo, y aquí se ve por qué:

| Proyecto | Fianza | Vence | Fallo real en GAIP | Días de margen desde el fallo |
|---|---|---|---|---|
| Xuchipantla | Cumplimiento | 24 sep 2026 | — (ya en Construcción) | — |
| ASIPONAGUAYMAS | Cumplimiento | 20 sep 2026 | 11 sep 2026 | **9 días** ⚠️ |
| Las Pilas | Cumplimiento | 10 jun 2027 | — (ya en Construcción) | — |
| Tramo 8 Golfo | Cumplimiento | 01 dic 2027 | — (ya en Construcción) | — |
| Tramo I Ferroviario | Anticipo | 20 ago 2027 | — (ya en Construcción) | — |
| Xicotepec | Cumplimiento | 01 ene 2027 | — (ya en Construcción) | — |

*Este es el caso que hoy **nadie puede ver junto**: GAIP sabe que
ASIPONAGUAYMAS tuvo fallo el 11 de septiembre (dato de ComprasMX), pero no
tiene forma de saber que su fianza de cumplimiento vence 9 días después si
no existe el cruce con el Tablero de Proyectos. Es exactamente el tipo de
alerta de "esto necesita tu atención hoy" que el chat de GAIP ya simula para
otras preguntas (`chatAnswers.vence` en `app/page.tsx`), pero aplicado a una
fuente que antes estaba desconectada — ahora implementado también como
pregunta de chat (`chatAnswers.fianzaVence`).*

### 3.4 Capacidad del equipo (RH) vs. carga de obra activa

GAIP ya calcula carga de trabajo por persona (`carga` en `lib/mock-data.ts`),
pero solo mide **tareas de licitación** (elaborar propuesta, validar precio,
etc.). No sabe si esa misma persona *también* está supervisando obra ya
adjudicada. Cruzando ambas cargas aparece una lectura distinta:

| Persona | Carga en licitaciones (GAIP, real) | Proyectos en ejecución asignados (ilustrativo) | Carga total estimada |
|---|---|---|---|
| ALICIA | 12 asignaciones, 31 % avance prom. | Tramo 8 Golfo (34 % avance, activo) | 🟡 Media-alta |
| LUIS | 9 asignaciones, 31 % avance prom. | ASIPONAGUAYMAS + Las Pilas (2 proyectos) | 🔴 Alta |
| BRENDA | 3 asignaciones, 60 % avance prom. | Xicotepec (55 % avance, activo) | 🟡 Media |
| JEMO | 14 asignaciones, 44 % avance prom. | — | 🟡 Media (ya es el de mayor volumen de licitaciones) |
| JAVIER/BRENDA | 18 asignaciones, 30 % avance prom. | Xuchipantla (78 % avance, activo) | 🔴 Alta |

*Lectura: LUIS y JAVIER/BRENDA son, en este ejemplo, quienes muestran más
señales de sobrecarga cruzada — es la misma tensión que GAIP ya detecta hoy
en su sección "Capacidad vs. Demanda" (`app/page.tsx`, Pieza 3) pero ahí solo
compara licitaciones entre sí. Sumar proyectos en ejecución la haría más
severa. Este cruce necesitaría que el Tablero de Proyectos también capture
qué integrante de GAIP quedó a cargo de cada proyecto adjudicado — hoy
`coordinator_id` en `projects` es una persona única y genérica, no
necesariamente alguien de las que ya vemos en el Gantt de licitaciones.*

### 3.5 Proyección de flujo de caja a 90 días

Con `contract_end`, ritmo de avance y fianzas, se puede proyectar cuándo
entraría dinero, no solo cuánto hay pendiente hoy:

| Proyecto | Por ejercer | Ritmo de avance físico (ilustrativo, %/mes) | Facturación proyectada próximos 90 días |
|---|---|---|---|
| Xuchipantla | $2,277,000 | ~13 %/mes | $2,277,000 (lo que falta) |
| ASIPONAGUAYMAS | $14,600,000 | ~4 %/mes (recién arrancado) | ~$1,900,000 |
| Las Pilas | $9,200,000 | ~6 %/mes | ~$3,500,000 |
| Tramo 8 Golfo | $23,800,000 | ~11 %/mes | ~$5,900,000 |
| Tramo I Ferroviario | $88,400,000 | ~4 %/mes (recién arrancado) | ~$3,300,000 |
| Xicotepec | $1,600,000 | ~24 %/mes | $1,600,000 (lo que falta) |

**Total proyectado a facturar en 90 días (portafolio): ~$18,500,000**

*Lectura: esto es lo más cercano a un pronóstico de ingresos que GAIP podría
ofrecer, y hoy no existe en ningún lado — ComprasMX no proyecta flujo de
caja, y el Excel de Ofertas tampoco. Es información que normalmente vive
solo en la cabeza del equipo financiero. El riesgo real de este cruce:
depende de un ritmo de avance que hay que calcular con datos reales de
varias semanas (de ahí que `weekly_goals` en el Tablero sea valioso — es
justo la granularidad semana a semana que permitiría calcular el ritmo real
en vez de estimarlo como aquí). Esta proyección no quedó implementada como
vista en el dashboard — es la extensión natural más obvia si se quiere
seguir ampliando la Fase 1.*

### 3.6 Ranking de riesgo de portafolio — combinando las señales anteriores

Aquí es donde el cruce deja de ser "una tabla más" y se vuelve una
priorización accionable: combinar desfase avance/facturación, margen de
fianza y sobrecarga de equipo en un solo score por proyecto.

| Proyecto | Desfase avance/facturación | Margen de fianza desde el fallo | Sobrecarga del equipo asignado | **Riesgo combinado** |
|---|---|---|---|---|
| ASIPONAGUAYMAS | 🟡 14.4 pts | 9 días ⚠️ | LUIS con 2 proyectos | 🔴 **Alto** — fianza por vencer + desfase + equipo cargado |
| Xicotepec | 🟡 17.9 pts | Sin fallo próximo | BRENDA con carga media | 🟡 **Medio** — facturación adelantada al ritmo de obra |
| Tramo 8 Golfo | Alineado (límite) | Sin fallo próximo | ALICIA con carga media | 🟡 **Medio** |
| Las Pilas | Alineado | Sin fallo próximo | LUIS con 2 proyectos | 🟡 **Medio** — solo por el factor de equipo |
| Xuchipantla | Alineado | Sin fallo próximo | JAVIER/BRENDA cargado | 🟡 **Medio** — solo por el factor de equipo |
| Tramo I Ferroviario | Alineado (obra recién arrancando) | Sin fallo próximo | Sin persona asignada | 🟢 **Bajo** — revisar cuando arranque a mayor ritmo |

*Este ranking es el tipo de vista "para la junta semanal" que un dashboard
ejecutivo necesita: no seis tablas sueltas, sino una sola pregunta —
**¿cuál proyecto necesita atención esta semana y por qué?** — respondida con
las tres fuentes de datos combinadas. Es la versión de portafolio de lo que
GAIP ya hace por expediente individual en su chat (`chatAnswers.cruce`). No
quedó implementado como vista propia en la Fase 1 — las señales individuales
(3.2, 3.3) sí están en el dashboard; combinarlas en un ranking único sería
el siguiente paso natural.*

## 4. Qué prueba este ejercicio, ya implementado

1. **La forma del cruce es correcta.** Las vistas implementadas (cobranza,
   fianzas vs. hitos en el módulo Finanzas; avance físico vs. Gantt en el
   módulo Obra) son estadística real y útil — no un adorno — *si* los
   números detrás son reales. El ranking de 3.6 y la proyección de 3.5
   quedan documentados aquí como la extensión natural, aún no construida.
2. **El bloqueo sigue siendo el mismo del documento de mapeo:** sin un ID
   compartido entre el expediente de licitación y el proyecto adjudicado,
   ninguna de estas vistas se puede generar automáticamente. Aquí se armaron
   a mano porque se conoce de antemano qué expediente le corresponde a qué
   proyecto — en producción eso lo tendría que resolver un campo de datos,
   no criterio humano.
3. **Un segundo bloqueo que aparece al ampliar el cruce (3.4):** tampoco hay
   hoy una forma de saber qué persona del equipo de licitaciones (ALICIA,
   LUIS, BRENDA, JEMO, JAVIER/BRENDA...) queda a cargo de un proyecto una vez
   adjudicado — `coordinator_id` en el Tablero es un campo libre, no está
   ligado al `responsable` que ya usa el Gantt de GAIP. Es un segundo campo a
   resolver, no solo el ID del expediente.
4. **La pregunta concreta para el cliente:** ¿su sistema de proyectos ya
   guarda el número de procedimiento o el `cod_expediente` de ComprasMX en
   algún lado (aunque sea un campo de notas), o hay que pedirles que lo
   empiecen a capturar desde ahora para poder construir esto? Y en la misma
   línea: ¿el coordinador de cada proyecto adjudicado suele ser alguien que
   ya vimos trabajando la licitación, o es una asignación aparte que hace
   otra área?
