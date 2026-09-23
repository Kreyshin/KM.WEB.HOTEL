# Quién hace qué

Cada persona entra con su cuenta y ve solo su parte del hotel. No es una restricción de seguridad decorativa: reduce la pantalla a lo que esa persona decide en su turno.

## Los cuatro roles

### Administrador

Lo ve todo. Es quien configura sedes, tipos de habitación, tarifas, temporadas y usuarios.

### Recepción

El mostrador. Reservas, llegadas, salidas, huéspedes y facturación.

Ve el tablero completo —necesita saber qué hay limpio— pero **no cambia estados de limpieza**: ese es el oficio de pisos.

### Gobernanta

Pisos y housekeeping. Reparte tareas, valida la inspección y gestiona amenities y lencería.

No ve tarifas ni facturación: no las necesita para su turno.

### Mantenimiento

Partes de avería y el tablero. Puede dejar una habitación fuera de servicio y devolverla al circuito al resolver.

## Quién toca qué

| Acción                          | Admin | Recepción | Gobernanta | Mantenimiento |
| ------------------------------- | :---: | :-------: | :--------: | :-----------: |
| Ver el tablero                  |   ✓   |     ✓     |     ✓      |       ✓       |
| Crear y editar reservas         |   ✓   |     ✓     |            |               |
| Check-in y check-out            |   ✓   |     ✓     |            |               |
| Fichas de huésped               |   ✓   |     ✓     |            |               |
| Avanzar tareas de limpieza      |   ✓   |           |     ✓      |               |
| Asignar camareras               |   ✓   |           |     ✓      |               |
| Abrir y cerrar partes de avería |   ✓   |           |            |       ✓       |
| Amenities y lencería            |   ✓   |           |     ✓      |               |
| Tarifas y temporadas            |   ✓   |           |            |               |
| Facturación                     |   ✓   |     ✓     |            |               |
| Sedes, tipos, pisos y usuarios  |   ✓   |           |            |               |

::: tip Probarlo sin riesgo
En la demo, la pantalla de acceso lista una cuenta por rol. Entrando con cada una se ve exactamente qué desaparece de la barra lateral.
:::
