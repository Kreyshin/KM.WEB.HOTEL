# Tablero de habitaciones

La pantalla que se cuelga de la pared. Muestra todas las habitaciones agrupadas por piso, con sus dos estados, y se actualiza sola.

Es el equivalente hotelero del monitor de cocina de un restaurante: la misma idea de pantalla que se mira de lejos y se toca de paso, con la habitación-noche en lugar del plato.

## Qué trae cada tarjeta

- El **número** en grande y el tipo debajo.
- Las dos insignias: **ocupación** y **limpieza**.
- Quién está dentro —adultos, menores y consumos cargados— o el motivo del bloqueo.
- **Cuánto lleva sin moverse**: «hace 40 min». Lo más antiguo es lo que hay que resolver.
- Uno o dos botones de acción directa.

## Los filtros

| Filtro             | Qué muestra                                          |
| ------------------ | ---------------------------------------------------- |
| Todas              | El inventario completo                               |
| Por limpiar        | Todo lo sucio, esté ocupado o no                     |
| Vendibles          | Libres **y** limpias: lo que se puede entregar ahora |
| Ocupadas           | Con gente dentro                                     |
| Requieren atención | Ver abajo                                            |

### «Requieren atención»

Es el filtro con criterio propio. Recoge:

- Habitaciones **fuera de servicio** o bloqueadas.
- Habitaciones **libres y sucias con más de dos horas** sin que nadie las toque.

Ese segundo caso es el que se escapa en un hotel con trabajo: nadie la reclama porque no hay nadie dentro, y a las tres de la tarde es el problema de otro.

## El modo «en vivo»

Con el interruptor activo, el tablero se refresca cada 15 segundos y **marca con un latido** las habitaciones que cambiaron desde la última vez. Se puede apagar si se está revisando algo con calma.

## Acciones de un toque

Quien pasa con el carro no abre formularios. Cada tarjeta ofrece el siguiente paso:

| Si está…         | El botón dice | Y pasa a…        |
| ---------------- | ------------- | ---------------- |
| Sucia            | Empezar       | En limpieza      |
| En limpieza      | A revisar     | Por inspeccionar |
| Por inspeccionar | Aprobar       | Limpia           |
| Limpia           | Marcar sucia  | Sucia            |

Las ocupadas añaden **Check-out**, que cierra la estancia y abre la tarea de salida en el mismo gesto.

Las que están fuera de servicio tienen el botón desactivado: se resuelven desde [Mantenimiento](/modulos/mantenimiento), no aquí.
