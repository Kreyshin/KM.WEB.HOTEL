# Planning · el rack

Habitaciones en filas, noches en columnas. Es la pantalla con la que piensa una
recepción, y la que distingue un PMS de una lista de reservas.

::: tip El tablero y el rack no compiten
El **[tablero](/modulos/tablero)** responde *«¿cómo está el hotel ahora?»*. El
**rack** responde *«¿cómo está el hotel la semana que viene?»*. De la segunda
pregunta salen el overbooking, los cambios de habitación y las ventas de última
hora, y no se puede contestar mirando el día de hoy.
:::

## Cómo se lee

El eje de tiempo **es la navegación**, no un filtro: se avanza y se retrocede
por semanas, y *Hoy* vuelve al presente.

| Elemento | Qué dice |
| --- | --- |
| Columna fija | Número de habitación y tipo, agrupadas por planta |
| Columnas tintadas | Sábado y domingo: la ocupación de un hotel se lee por semanas |
| Línea turquesa vertical | Hoy, cruzando el rack entero |
| Filas rayadas | Fuera de servicio: no se venden, y se ve que no se venden |
| Pie | Ocupación por noche, sobre las habitaciones vendibles |

## Las barras

Una reserva es una barra que **empieza a media casilla y termina a media
casilla**, porque una entrada es por la tarde y una salida por la mañana. Ese
medio hueco es lo que permite ver que una habitación se libera y se vuelve a
vender el mismo día.

| Barra | Estado |
| --- | --- |
| Turquesa, borde punteado | <span class="estado estado-reservada">◷ Pendiente</span> — contratada, sin confirmar |
| Azul llena | <span class="estado estado-libre">◆ Confirmada</span> — el huésped todavía no ha llegado |
| Verde llena | <span class="estado estado-limpia">● En casa</span> — hay alguien durmiendo ahí |

Si la estancia empieza antes del tramo visible o termina después, la barra se
**corta en recto** por ese lado: el borde dice «esto sigue» sin tener que leer
fechas.

## Sin habitación asignada

Arriba del todo, en su propia franja, lo que se vendió **por tipo** y aún no
tiene llave. Es lo normal en un hotel —se reserva «una doble», no la 203— y
deja de serlo cuando el huésped está en la puerta: por eso está a la vista y no
escondido en un filtro.

## Los dos gestos

### Arrastrar para cambiar de habitación

Se coge la barra y se suelta en otra fila. La fila de destino se ilumina
mientras se arrastra: **turquesa** si cabe, **roja** si no.

El sistema comprueba el solape antes de mover. Una doble venta descubierta en el
mostrador cuesta mucho más que un aviso aquí, así que:

- una habitación **fuera de servicio** no admite reservas;
- una habitación que ya tiene esas noches vendidas se rechaza, diciendo con qué
  localizador choca;
- si la reserva está **en casa**, el cambio se lleva consigo la estancia: la
  habitación anterior queda libre y **sucia**, y la nueva, ocupada.

### Barrer noches libres para vender

Arrastrando sobre las casillas vacías de una habitación se marca un tramo de
noches y se abre la venta con la habitación y las fechas ya puestas. El huésped
se pide en la agenda de reservas: una reserva sin huésped es media reserva.

::: info Nada depende de arrastrar
Los dos gestos tienen su equivalente en el panel lateral de la reserva, que se
abre con un clic. Un rack que solo se maneja arrastrando deja fuera a quien no
puede arrastrar.
:::
