# Housekeeping

El tablero de pisos: una columna por fase del trabajo. Es el mismo patrón que la cola de una cocina, porque el oficio es el mismo — trabajo pendiente con el reloj encima.

## Quién limpia cada habitación se decide aquí, y solo aquí

El responsable es del **trabajo**, no del inmueble: vive en la tarea del turno,
no en la ficha de la habitación. Alojamiento lo enseña —lo deriva de la tarea
abierta— pero no lo cambia, para que no haya dos respuestas a la misma pregunta.

## Abrir el trabajo del día

Casi todas las tareas nacen solas: un check-out abre su tarea de salida. Las que faltan se abren desde aquí, de dos maneras.

**Abrir el turno** es el gesto de las nueve de la mañana. Mira qué habitaciones quedaron sucias sin tarea y abre una por cada una: **en estancia** si el huésped sigue dentro —sus cosas no se tocan— y **salida** si ya se fue. El botón dice cuántas abrirá antes de pulsarlo, y no repite: una habitación que ya tiene tarea abierta se salta.

**Nueva tarea** es para lo que no entra en ese barrido: un recado de toallas, un repaso antes de enseñar una habitación, una profunda que se decide en el momento. Solo ofrece habitaciones sin tarea abierta, porque dos tareas para la misma puerta son dos camareras subiendo a llamar a la vez. Si se intenta, el sistema lo dice con el número delante.

Pulsando los minutos de una tarjeta se abre esa misma ficha: prioridad, minutos, recado, camarera — y cancelarla, que la borra del tablero sin tocar la habitación.

## Mover el trabajo

Tres maneras, y ninguna es la única:

- **Arrastrar** la tarjeta a otra columna.
- Los botones **Avanzar** —o **Aprobar** en la última— y **←** para devolverla.
- Con la tarjeta enfocada, las flechas **←** y **→** del teclado.

La marcha atrás no es un adorno. La gobernanta que inspecciona y encuentra el baño a medias devuelve la tarea a **en curso**, y eso vuelve a poner la habitación en limpieza. Sin ella, el único camino sería cerrarla mintiendo y abrir otra.

## La carga del turno

Arriba, una barra por camarera con sus tareas y sus **minutos estimados**. Sirve para repartir antes de que se acumule, no para descubrir a las dos de la tarde que una persona tiene el triple que las demás.

Las barras se mueven en el mismo gesto que la tarjeta: se calculan con lo que hay en pantalla, sin volver a preguntar al servidor.

## Las cuatro columnas

| Columna     | Qué hay                           | Y la habitación queda…                                        |
| ----------- | --------------------------------- | ------------------------------------------------------------- |
| Pendiente   | Aún no ha empezado nadie          | <span class="estado estado-sucia">Sucia</span>                |
| En curso    | La camarera está dentro           | <span class="estado estado-reservada">En limpieza</span>      |
| Por revisar | Terminada, espera a la gobernanta | <span class="estado estado-reservada">Por inspeccionar</span> |
| Terminada   | Aprobada                          | <span class="estado estado-limpia">Limpia</span>              |

**Mover la tarjeta mueve la habitación.** No hay dos verdades: el tablero de pisos y el de habitaciones cuentan lo mismo.

## Tipos de tarea

La distinción importa porque el tiempo y el material no son los mismos:

| Tipo              | Minutos | Cuándo                                             |
| ----------------- | :-----: | -------------------------------------------------- |
| Salida            |   45    | Tras un check-out. La habitación se prepara entera |
| En estancia       |   20    | Repaso diario con el huésped alojado               |
| Cobertura         |   12    | Preparación nocturna, típica de suites             |
| Repaso            |   15    | Retoque rápido                                     |
| Limpieza profunda |   90    | Programada, fuera del ciclo normal                 |

## Prioridades

**Urgente** y **alta** llevan distintivo propio y suben al principio de la cola.

La prioridad alta la pone el sistema solo en un caso: cuando la habitación que acaba de quedar libre **tiene una llegada hoy**. Es la que no puede esperar.

## La inspección

En las sedes con gobernanta, la camarera no cierra: deja la tarea en **por revisar** y la gobernanta aprueba.

Es configurable por sede, porque un hotel pequeño no tiene a nadie para ese paso.

::: tip Una habitación limpia no es una habitación vendida
Aprobar la tarea la deja <span class="estado estado-limpia">limpia</span>, pero sigue <span class="estado estado-libre">libre</span>. Venderla es decisión de recepción, no de pisos.
:::
