# Configuración

Lo que se toca una vez y condiciona el resto.

## Sedes

Los establecimientos de la cadena. Además de dirección y teléfono, dos datos que pesan cada día:

- **Hora de check-in** — a partir de cuándo se entrega la habitación. Marca el plazo de housekeeping.
- **Hora de check-out** — hasta cuándo puede quedarse el huésped. De ahí cuelga el cobro por salida tardía.

El **código de establecimiento** de cuatro dígitos es el que se declara ante SUNAT, y no puede repetirse entre sedes.

### La dirección termina en un ubigeo

El distrito no se escribe: se elige en cascada —**departamento → provincia → distrito**—, y lo que se guarda es el **código de ubigeo** del INEI, seis dígitos donde los dos primeros son el departamento, los dos siguientes la provincia y los dos últimos el distrito. `150122` ya dice «Lima / Lima / Miraflores» sin consultar nada, y es el mismo código que piden SUNAT y los formularios de hospedaje.

Tres razones para la cascada y no un campo de texto:

- Hay distritos homónimos en departamentos distintos. «San Juan» sin más no identifica nada.
- Escrito a mano, la misma sede acaba en «Miraflores», «miraflores» y «MIRAFLORES», y ningún informe agrupa.
- El código es lo que viaja a la declaración. Un nombre no sirve.

Los tres nombres **no se guardan**: se derivan del código al leer. Por eso buscar «Barranco» o «Cusco» en el listado encuentra la sede aunque el distrito ya no sea un campo suyo.

El padrón vive en el núcleo, no en la vertical: la dirección de una sede, la de un proveedor y la de un huésped apuntan todas a las mismas tablas. Son **tres**, como en base de datos, y cada nivel lleva dentro la clave de su padre:

| Tabla         | Clave     | Ejemplo               |
| ------------- | --------- | --------------------- |
| Departamentos | 2 dígitos | `15` · Lima           |
| Provincias    | 4 dígitos | `1501` · Lima         |
| Distritos     | 6 dígitos | `150122` · Miraflores |

Cada nivel se pide por el **id** del de arriba, nunca por su nombre: «Lima» es departamento, provincia y distrito a la vez, así que filtrar por nombre traería cosas de tres sitios distintos. Por eso, al abrir una sede que ya tiene distrito, los tres combos se colocan partiendo el código: `150122` → `1501` → `15`.

El extracto cargado trae Callao, Cusco y Lima, con Huaral como provincia de un solo distrito. Es poco a propósito: basta para trabajar la pantalla y ya contiene los casos que rompen una cascada mal hecha.

### Los servicios de la sede

Lo que cubre al hotel entero: Wi-Fi, recepción 24 h, ascensor, estacionamiento. Van aquí y no en el tipo de habitación porque no distinguen una doble de una suite — las cubren a todas. Lo que sí distingue un tipo de otro (minibar, bañera, terraza) vive en su ficha.

::: tip El estado no se pregunta al dar de alta
Una sede nace activa, igual que un piso nace en servicio y una cuenta nace pudiendo entrar. Preguntar «¿activa?» en el alta solo invita a crear registros muertos. Darla de baja es una decisión posterior y tiene consecuencias, así que ese campo aparece **solo al editar**, con su aviso de qué arrastra.
:::

## Configuración de la vertical y por sede

Son dos pantallas y un solo mecanismo. La de **vertical** fija cómo se comporta la cadena; la de **sede** recoge lo que un establecimiento hace distinto.

La regla que las ordena es el **alcance** de cada parámetro:

- **De la cadena** — no se discute por sede. Tenerlo distinto en dos hoteles haría incomparables sus cifras, y comparar es para lo que existe el [cierre de día](/procesos/cierre-dia). La pantalla de sede ni los ofrece, y el servicio los rechaza si se intentan.
- **Ajustable por sede** — la vertical fija el valor común del que todas parten, y cada una puede apartarse.

| Parámetro                                   | Alcance | Dónde manda                                                              |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| Permitir sobreventa                         | Cadena  | El alta de reserva se rechaza cuando el tipo ya está vendido esas noches |
| Horas que aguanta una reserva sin confirmar | Cadena  | Pasadas, la pendiente sin anticipo suelta el cupo y vuelve a venderse    |
| Redondear la tarifa a múltiplos de          | Cadena  | El precio resuelto de cada noche, el que se ofrece y se factura          |
| La limpieza pasa por inspección             | Sede    | Si el tablero de pisos tiene la columna «por revisar»                    |
| Cobrar la salida tardía                     | Sede    | Si el check-out fuera de hora carga recargo                              |
| Cortesía antes de cobrar                    | Sede    | Minutos de gracia tras la hora de salida de la sede                      |
| Cuánto se cobra                             | Sede    | Porcentaje de la tarifa de la noche que se carga por salir tarde         |

Ningún parámetro está ahí de adorno: cada uno declara en qué parte del programa manda, y la pantalla lo escribe debajo del control. Un interruptor cuyo efecto no se sabe nombrar acaba siendo uno que nadie toca por miedo.

### Heredado o propio

Toda la pantalla de sede gira alrededor de esa distinción:

- **Heredado** — la sede sigue a la cadena, y se moverá con ella el día que la cadena cambie.
- **Valor propio** — se apartó a conciencia, y se queda donde está. La pantalla dice además de qué se apartó: «la cadena usa 30 min».

Volver a heredar no es «restablecer por defecto»: es dejar de ser la excepción, y tiene su propio botón en cada parámetro apartado.

::: tip Un valor igual al de la cadena no se guarda como propio
Si se escribe en la sede exactamente lo que ya dice la cadena, no se registra ninguna excepción: el campo vuelve a decir «heredado». Y al mover el valor común, las sedes que tenían ese mismo número propio lo sueltan.

Un registro así sería invisible y mentiroso: hoy coincide, y el día que la cadena se mueva dejaría a esa sede anclada al valor anterior sin que nadie lo haya decidido. Es la diferencia entre «esto está así porque alguien lo decidió» y «porque nadie lo tocó».
:::

Por eso la pantalla de vertical avisa a quién **no** va a afectar un cambio: «No afecta a Alba Barranco: usa un valor propio».

### Lo que no se edita aquí

El nombre, la dirección y las horas de entrada y salida de la sede son su ficha, y viven en **Sedes**. Dos sitios para cambiar la hora de salida son dos sitios donde dejarla distinta.

La configuración por sede los enseña de solo lectura, porque la hora de salida es justo la que usa el recargo por salida tardía y conviene tenerla delante al decidir la cortesía.

## Motivos

Las razones que el personal elige para dejar rastro, agrupadas por **ámbito**: cancelación, bloqueo, fuera de servicio, descuento y cortesía.

Existen para que «por qué» deje de ser texto libre. Un hotel que escribe el motivo a mano no puede contar cuántas cancelaciones fueron sobreventa, y esa cuenta es la que dice si el problema está en el canal o en el mostrador. «Cambio de planes» y «cambió de planes» son el mismo hecho y dos filas distintas en cualquier informe.

El ámbito no es una etiqueta de color: es lo que impide que un motivo de cancelación se ofrezca al bloquear una habitación. Se trabaja en pestañas, y cada una lleva la cuenta de los motivos vivos que tiene.

**Pedir una explicación** se reserva a lo que alguien tendrá que justificar después —una cortesía sin nota es un descuadre sin autor—. Exigirla en todo convierte la nota en un «.» y la vacía de sentido, así que solo la cortesía nace pidiéndola.

::: warning El ámbito no se cambia
Un motivo ya usado se quedó escrito en cancelaciones y en partes cerrados. Moverlo de ámbito reescribiría el pasado, que es lo único que un catálogo de motivos no puede permitirse. Se desactiva y se crea el que corresponda.
:::

Un ámbito sin motivos activos no es un catálogo pequeño: es el «por qué» otra vez en texto libre, porque quien tenga que explicar algo no tendrá nada que elegir. La pantalla lo avisa en rojo.

El mismo nombre sí vale en dos ámbitos distintos: «Mantenimiento programado» es un motivo razonable para bloquear una habitación y también para dejarla fuera de servicio.

## Usuarios y roles

Quién entra y qué parte del hotel gestiona. Detalle en [Quién hace qué](/guia/roles).

Una cuenta desactivada no puede iniciar sesión, y el sistema no deja quedarse sin ningún administrador activo.

## Comprobantes e impuestos

El último eslabón antes de la primera venta. Un hotel puede tener habitaciones, tarifas y canales y seguir sin poder cobrar: sin una serie activa no hay con qué emitir, y eso se descubre con el huésped delante y la maleta hecha. Por eso la pantalla avisa **antes** de que pase — si a la sede le falta una serie de boleta o de factura, lo dice arriba en rojo.

### Series

Una serie es una numeración: `B001`, y el correlativo del último comprobante que emitió. La letra no es una convención de la casa, la fija SUNAT:

| Emite           | Serie                                          |
| --------------- | ---------------------------------------------- |
| Boleta          | `B001`                                         |
| Factura         | `F001`                                         |
| Nota de crédito | `BC01` o `FC01` — la del documento que corrige |
| Nota de venta   | `NV01` — interno, sin valor tributario         |

El formulario enseña el número que saldría: `B001-00004822`. La serie se repite entre sedes (cada establecimiento lleva la suya) pero no dentro de una.

::: warning El correlativo no retrocede
Bajarlo significa volver a entregar números ya emitidos: dos comprobantes distintos con el mismo número. Eso es una contingencia tributaria, no un error de pantalla, así que el sistema lo rechaza diciendo cuál fue el último.

Por la misma razón, una serie que ya emitió **no se borra**: se desactiva.
:::

Al dar de alta sí se puede poner un correlativo inicial: es el caso de quien viene de otro sistema y arranca donde lo dejó.

### Impuestos

Valen para toda la cadena — el IGV no se da de alta, se cambia el día que lo cambia el Estado.

- **IGV** — el vigente en Perú es 18 %.
- **Los precios ya incluyen IGV** — lo normal en hotelería: el huésped ve el precio final. Si se apaga, el IGV se suma al facturar y la tarifa de la rejilla deja de ser lo que se cobra.
- **Exonerar a no domiciliados** — D. Leg. 919: el hospedaje a un extranjero no domiciliado es exportación de servicios y no lleva IGV. Exige TAM y pasaporte, y no vale más allá de 60 días por entrada. Es la particularidad fiscal de la vertical, y por eso el check-in pregunta por el documento.
