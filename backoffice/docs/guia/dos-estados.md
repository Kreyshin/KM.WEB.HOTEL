# Los dos estados de una habitación

Es la idea central del sistema y la que más malentendidos evita. Una habitación no tiene _un_ estado: tiene **dos, independientes**.

| Eje           | Quién lo mueve | Responde a                   |
| ------------- | -------------- | ---------------------------- |
| **Ocupación** | Recepción      | ¿Puedo venderla?             |
| **Limpieza**  | Housekeeping   | ¿Está lista para entregarla? |

## Por qué separarlos

Porque la realidad los separa. A las 11 de la mañana, media planta está <span class="estado estado-libre">libre</span> y <span class="estado estado-sucia">sucia</span> a la vez: el huésped ya se fue, pero nadie ha entrado a repasarla.

Si el sistema guardara un único estado, habría que elegir entre mentirle a recepción («está libre», y entrega una llave de una habitación sin hacer) o mentirle a pisos («está ocupada», y la camarera se la salta). Con dos ejes, cada oficio ve la verdad que le toca.

## Los valores

### Ocupación

<span class="estado estado-libre">Libre</span> · sin nadie dentro y sin reserva que la comprometa.

<span class="estado estado-ocupada">Ocupada</span> · hay una estancia en curso.

<span class="estado estado-reservada">Reservada</span> · nadie dentro todavía, pero está comprometida para una llegada.

<span class="estado estado-bloqueada">Bloqueada</span> · retirada del inventario vendible: avería, uso interno u obra.

### Limpieza

<span class="estado estado-limpia">Limpia</span> · entregable ahora mismo.

<span class="estado estado-sucia">Sucia</span> · necesita repaso.

<span class="estado estado-reservada">En limpieza</span> · la camarera está dentro.

<span class="estado estado-reservada">Por inspeccionar</span> · terminada, esperando el visto bueno de la gobernanta.

<span class="estado estado-bloqueada">Fuera de servicio</span> · no se limpia porque no se puede usar. Va de la mano de un parte de mantenimiento.

## Las tres reglas que el sistema impone

Son las únicas que cruzan los dos ejes, y están ahí porque cada una evita un fallo de servicio caro:

1. **No se entrega una habitación sucia.** El check-in sobre una habitación que no esté limpia se rechaza, con el aviso de pedir el repaso.
2. **No se vende una habitación fuera de servicio.** Mientras el parte de mantenimiento siga abierto, no aparece como disponible.
3. **Cerrar la limpieza no vende la habitación.** Una camarera que termina su tarea la deja limpia, pero sigue <span class="estado estado-libre">libre</span>. Venderla es decisión de recepción.

::: warning El error clásico del sector
Casi todos los sistemas que nacen pequeños guardan un solo estado con valores mezclados —«libre / ocupada / sucia / bloqueada»— y acaban con datos imposibles: una habitación «sucia» de la que nadie sabe si está vendida. Rehacerlo después obliga a reescribir todo el circuito de pisos.
:::

## Cómo se ve

Ninguna de las dos se comunica **solo por color**. Cada tarjeta del tablero lleva color, un glifo y el texto del estado, porque la pantalla se mira de lejos, con prisa y por turnos enteros.

| Glifo | Limpieza          |
| ----- | ----------------- |
| ✓     | Limpia            |
| •     | Sucia             |
| ◍     | En limpieza       |
| ◐     | Por inspeccionar  |
| ✕     | Fuera de servicio |
