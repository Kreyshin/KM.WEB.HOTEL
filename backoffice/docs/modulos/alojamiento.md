# Alojamiento

Todo lo que existe físicamente y lo que se publica para vender.

## Habitaciones

El inventario en modo lista, para cuando se busca una concreta. Cada fila muestra los dos estados, la camarera del turno y cuánto lleva sin cambiar.

Desde aquí se hacen dos cosas con frecuencia:

- **Reasignar la camarera** del turno con el desplegable de la fila.
- **Avanzar la limpieza** con el enlace que aparece según el estado: «Empezar» si está sucia, «Aprobar» si espera inspección.

## Plano por piso

Las habitaciones colocadas donde están de verdad, en dos hileras a ambos lados del pasillo.

Sirve para lo que una lista no puede responder: _¿qué hay libre cerca del ascensor?_, _¿puedo dar dos contiguas a esta familia?_. Al tocar una habitación se abre su ficha con aforo, vista y último cambio.

## Tipos de habitación

**Lo que se vende.** Cada tipo define:

| Campo            | Para qué sirve                                                    |
| ---------------- | ----------------------------------------------------------------- |
| Código           | El atajo de recepción: `DBL`, `SUI`                               |
| Capacidad        | Huéspedes sin cama supletoria                                     |
| Capacidad máxima | Con supletoria o cuna. **El sistema no deja reservar por encima** |
| Camas            | Lo que el huésped quiere saber antes de reservar                  |
| Tarifa base      | El precio de referencia, antes de temporada y canal               |
| Régimen          | Qué comida incluye                                                |
| Servicios        | Amenities y equipamiento de la ficha comercial                    |

::: warning Antes de borrar un tipo
No se puede eliminar si existen habitaciones de ese tipo o reservas futuras. Desactívalo: deja de publicarse, pero conserva su histórico.
:::

## Pisos

Las plantas de la sede. Ordenan el plano y reparten el trabajo de housekeeping. Admiten niveles negativos para sótanos.
