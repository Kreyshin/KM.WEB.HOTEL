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
3. **Ajuste del canal** — suma o resta un porcentaje. Las OTA llevan comisión; lo corporativo, descuento.
4. **Redondeo** — al múltiplo configurado, normalmente 5.

Hay [una página entera con un ejemplo numérico](/procesos/precio).

## Temporadas

Un nombre, un rango de fechas y un factor. Opcionalmente, **noches mínimas** — lo habitual en puentes y fin de año.

::: warning Dos temporadas activas no pueden solaparse
Si dos temporadas cubrieran el mismo día, el precio de ese día sería indeterminado: dependería de cuál se consultara primero. El sistema lo rechaza al guardar e indica con cuál choca.
:::

## Canales

El ajuste porcentual por canal y tipo. Es donde se refleja la comisión de cada OTA y la tarifa pactada con cada empresa.
