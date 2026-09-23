# Housekeeping

El tablero de pisos: una columna por fase del trabajo. Es el mismo patrón que la cola de una cocina, porque el oficio es el mismo — trabajo pendiente con el reloj encima.

## La carga del turno

Arriba, una barra por camarera con sus tareas y sus **minutos estimados**. Sirve para repartir antes de que se acumule, no para descubrir a las dos de la tarde que una persona tiene el triple que las demás.

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
