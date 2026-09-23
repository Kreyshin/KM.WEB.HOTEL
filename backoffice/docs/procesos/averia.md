# Una habitación averiada

Qué pasa cuando una habitación deja de ser vendible.

## El punto de partida

La camarera reporta una fuga en la ducha de la 108. No es un retoque: hay que cambiar el cartucho del mezclador.

## 1 · Se abre el parte

En **Mantenimiento**, con la habitación, el detalle, prioridad **urgente** y la casilla **deja la habitación fuera de servicio** marcada.

## 2 · Sale del inventario

Inmediatamente:

- La 108 pasa a <span class="estado estado-bloqueada">bloqueada</span> y <span class="estado estado-bloqueada">fuera de servicio</span>.
- **Deja de aparecer** entre las habitaciones disponibles al hacer un check-in.
- **Deja de contar** para el porcentaje de ocupación: no se podía vender, así que no castiga el dato.
- El motivo se lee en su tarjeta del tablero.

## 3 · Mientras dura

El tablero la muestra con el botón de limpieza **desactivado**. No tiene sentido repasarla: no se puede usar.

Aparece en el filtro **Requieren atención**, junto al resto de lo que no está en circulación normal.

## 4 · Se resuelve

Al cerrar el parte, la 108 vuelve como <span class="estado estado-sucia">sucia</span>, nunca como lista.

Es deliberado: después de una reparación queda polvo y herramientas. Pisos tiene que pasar antes de que entre nadie.

## Si hay varios partes

Cerrar uno **no** la libera si queda otro parte bloqueante abierto. Sigue fuera de servicio hasta el último.

## Lo que no bloquea

Un control remoto sin pilas o un aire acondicionado ruidoso se anotan como parte **sin** bloquear: la habitación se sigue vendiendo mientras se resuelve.

Distinguir bien estos dos casos es lo que evita perder noches por cosas que no lo merecían.
