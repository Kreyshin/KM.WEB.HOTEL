# Tarifas

Cuánto cuesta una noche, y por qué.

## La rejilla

Un tipo de habitación por fila, los próximos catorce días por columna, y en cada celda **el precio final**: ya resuelto, no los ingredientes.

Quien abre esta pantalla quiere saber cuánto cobra el jueves. El desglose está en el tooltip de cada celda, para quien lo necesite.

Los fines de semana se marcan en la cabecera, porque es donde más se mueve el precio. El selector de canal recalcula la rejilla entera.

## Cómo se forma el precio

Cuatro pasos, siempre en este orden:

1. **Tarifa base del tipo** — el precio de referencia.
2. **Factor de temporada** — multiplica. Fiestas patrias a 1,4 sube un 40 %.
3. **Ajuste del canal** — suma o resta un porcentaje. Sale del canal, y solo se pisa si ese tipo tiene una fila propia para él.
4. **Redondeo** — al múltiplo configurado, normalmente 5.

Hay [una página entera con un ejemplo numérico](/procesos/precio).

## Temporadas

Un nombre, un rango de fechas y un **factor** que multiplica la tarifa base. Opcionalmente, **noches mínimas** —lo habitual en puentes y fin de año— y un **color**, que es con el que la temporada se pinta en el rack.

El formulario enseña la cuenta hecha mientras se escribe: «+40 % · una noche de S/ 200 se vende a S/ 280». Un factor de 1,4 no dice nada; 280 soles sí.

::: warning Dos temporadas activas no pueden solaparse
Si dos temporadas cubrieran el mismo día, el precio de ese día sería indeterminado: dependería de cuál se consultara primero. El sistema lo rechaza al guardar e indica con cuál choca.

Por eso desactivar una temporada no es cosmético: **libera sus fechas** para que otra pueda ocuparlas.
:::

## Canales y comisiones

Por dónde entra cada reserva y qué cuesta venderla. Eran seis valores escritos en el código —abrir una agencia nueva pedía tocar el programa—; ahora se dan de alta desde aquí.

### Código, no nombre

Lo que cada reserva guarda es el **código** del canal (`booking`, `agencia-sur`), no su id ni su nombre. Se escribe una vez al dar de alta y después el formulario no deja cambiarlo: cambiarlo dejaría huérfano todo lo vendido por ese canal. Por la misma razón, un canal con reservas no se borra — se desactiva.

### Los dos porcentajes no son lo mismo

| Campo        | Qué hace                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **Comisión** | Lo que se lleva el intermediario. **No** cambia lo que paga el huésped: cambia lo que le queda al hotel      |
| **Ajuste**   | Mueve el precio **publicado** en ese canal. Es como se compensa la comisión sin romper la paridad de tarifas |

Confundirlos es cómo un hotel cree que gana un 18 % más y en realidad gana igual. La pantalla hace la cuenta delante: una noche de S/ 200 con +15 % de ajuste y 15 % de comisión se publica a S/ 230 y deja S/ 196.

### El ajuste del canal es el suelo

Antes, un tipo sin fila propia para Booking se vendía al precio del mostrador: la comisión se la comía el hotel entero y no se veía en ninguna pantalla. Ahora el ajuste sale del canal, y la fila por tipo solo existe para la excepción — una suite que en Expedia va con otro margen.

### Las reservas que entran solas

Marca las OTA y el motor propio. Esos canales no se ofrecen al tomar una reserva a mano: llegan por integración, y teclearlas invita a crear dos reservas para la misma cama.
