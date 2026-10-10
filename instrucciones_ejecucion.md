# Instrucciones de ejecución para la demostración

Esta guía explica cómo levantar el sistema y presentarlo paso a paso: qué ingresar en cada escenario y qué resultado debe aparecer. Los valores esperados se obtuvieron con el modelo entrenado actual (`ml/artifacts/model.txt`). Si se vuelve a entrenar, los números pueden variar levemente.

---

## 1. Antes de la presentación (preparación, ~10 minutos)

### 1.1 Requisitos
- Docker Desktop **abierto** (el ícono de la ballena en verde).
- Node.js 20 o superior y Python 3.11 o superior.
- Puertos libres: `5432` (PostgreSQL), `3000` (API) y `5173` (interfaz).

### 1.2 Primera vez (solo si el proyecto nunca se ejecutó en el equipo)
```powershell
cd C:\Desarrollador\Maestria\Modulo-19
docker compose up -d
docker logs -f cafeteria-db
```
Espere el mensaje `database system is ready to accept connections` y salga con `Ctrl + C`. La restauración del `backup.sql` tarda alrededor de un minuto.

```powershell
pip install -r ml/requirements.txt
python ml/src/extract.py
python ml/src/train.py
python ml/src/evaluate.py
cd backend;  copy .env.example .env;  npm install;  cd ..
cd frontend; npm install; cd ..
```
`train.py` debe terminar mostrando `lightgbm: mase_macro=0.7511 …` y `success (MASE < 1): True`.

### 1.3 Arranque el día de la demostración (3 terminales)

| Terminal | Comando | Se espera |
|---|---|---|
| 1 · Base de datos | `docker compose up -d` (en la raíz del proyecto) | `Container cafeteria-db Started` |
| 2 · Backend | `cd backend` y luego `npm run start:dev` | `Nest application successfully started` |
| 3 · Frontend | `cd frontend` y luego `npm run dev` | `Local: http://localhost:5173/` |

### 1.4 Verificación rápida (antes de que entre el público)
1. Abra http://localhost:3000/api/v1/health. Debe responder `{"status":"ok","database":true,"modelArtifacts":true}`.
2. Abra http://localhost:5173. La cabecera debe mostrar **MASE LightGBM 0,751** y **línea base 1,088**.
3. Opcional: corra las pruebas automáticas para mostrarlas en vivo (sección 4).

> Consejo: haga una vez el escenario A antes de presentar. La primera ejecución del modelo tarda unos 2 segundos porque se carga Python; las siguientes son igual de rápidas, pero así se evitan sorpresas.

---

## 2. Guion de la demostración (~12 minutos)

### Paso 0 · Contexto (1 minuto)
- **Problema:** pronosticar la demanda diaria de cada artículo de la cafetería para fabricar lo justo y reducir mermas.
- **Datos:** 94 554 ventas completadas entre el 2021-10-01 y el 2026-10-03, con 17 productos.
- **Modelo:** LightGBM con rezagos, medias móviles, calendario, feriados y descuentos.
- **Referencia:** repetir la venta del mismo día de la semana anterior (*seasonal naive*).
- **Meta:** MASE < 1.

Baje hasta la tarjeta **«Desempeño del modelo en la prueba»** y muestre la tabla:

| Método | MASE | MAE |
|---|---|---|
| LightGBM | 0,751 | 2,13 |
| Línea base (semana anterior) | 1,088 | 3,10 |
| Media de los 4 mismos días | 0,856 | 2,43 |

Explique que la prueba (2026-04-01 a 2026-10-03) **no se usó para ajustar el modelo** y que la insignia verde indica que se cumple el criterio de éxito.

---

### Escenario A · Caso válido: comparar con ventas reales (2 minutos)
En la pestaña **«Desde la base de datos»**, ingrese:
- **Producto:** Cafe Americano
- **Fecha de corte:** 2026-09-26
- **Horizonte:** 7 días

Pulse **Generar pronóstico**.

**Resultado esperado:**
- La insignia dice **«Comparación con ventas reales»**.
- **Demanda pronosticada:** ≈ 84,8 u., contra 102 u. de la línea base.
- **Ventas reales:** 83 u., con **MAE LightGBM 2,83** frente a **MAE línea base 5,86**.
- **Sugerencia de producción:** «Al momento», porque es una bebida que se prepara al pedido.
- En el gráfico, la línea naranja (LightGBM) sigue a la negra (ventas reales) mucho mejor que la azul punteada (línea base).

**Mensaje para el público:** el pronóstico total casi coincide con lo vendido (84,8 frente a 83), mientras que la línea base sobreestimó en 19 unidades.

---

### Escenario B · Caso difícil: semana de Carnaval con cierres (2 minutos)
Ingrese:
- **Producto:** Galletas de mantequilla
- **Fecha de corte:** 2026-02-14
- **Horizonte:** 7 días

**Resultado esperado:**
- Una advertencia amarilla: «El local permanece cerrado por feriado el 2026-02-16, 2026-02-17: el pronóstico es 0.»
- En la tabla, el lunes 16 y el martes 17 aparecen como **«Cerrado (feriado)»** con pronóstico 0. Ahí la línea base habría pronosticado 6 y 8.
- **MAE LightGBM 2,10** frente a **2,80** de la línea base. Ventas reales: 35 u.; pronóstico: 35,8 u.
- **Sugerencia de producción:** **2 × tanda** (39 u. a preparar, en tandas de 24). Viene de la receta *«Galletas de mantequilla (tanda de 24)»*.

**Mensaje para el público:** los feriados se conocen de antemano gracias a un calendario (Pascua y Carnaval se calculan cada año), no se infieren de las ventas, así que no hay fuga de información. La línea base falla justo después de un cierre porque copia el 0 del feriado.

---

### Escenario C · Caso con promoción (1 minuto, opcional)
Ingrese:
- **Producto:** Chokolatte
- **Fecha de corte:** 2026-07-31
- **Horizonte:** 7 días

**Resultado esperado:**
- Cada día tiene la etiqueta **«Descuento 10%»** (promoción del 1 al 16 de agosto).
- Pronóstico 54,2 u., ventas reales 61 u. y línea base 42 u.
- **MAE LightGBM 2,16** frente a **3,29** de la línea base.

**Mensaje para el público:** el modelo usa los descuentos registrados, pero aun así **subestima** en promociones. Es una limitación documentada: el sesgo en días con descuento es de -1,70 u.

---

### Escenario D · Pronóstico a futuro con plan de producción (1 minuto)
Ingrese:
- **Producto:** Croissant
- **Fecha de corte:** dejar la que aparece por defecto (2026-10-03, el último dato disponible)
- **Horizonte:** 7 días

**Resultado esperado:**
- La insignia dice **«Pronóstico a futuro»** y no hay columna «Real».
- Se pronostican ≈ 43,2 u. del 2026-10-04 al 2026-10-10, con el sábado 10 como el día más alto (≈ 7,4).
- **Sugerencia de producción:** **4 × paquete x12** (48 u.). El croissant es de reventa y se compra en bandejas de 12.

---

### Escenario E · Producto discontinuado (1 minuto)
Ingrese:
- **Producto:** Agua con gas 500 ml (discontinuado)
- **Fecha de corte:** la que aparece por defecto
- **Horizonte:** 7 días

**Resultado esperado:**
- Una advertencia: «El producto no registra ventas desde 2026-03-27; podría estar discontinuado y el pronóstico no es confiable.»
- El modelo pronostica alrededor de 1 u./día, aunque no hay ventas desde hace 6 meses.

**Mensaje para el público:** es un error conocido del modelo; por eso el sistema advierte al usuario en lugar de ocultarlo.

---

### Escenario F · Carga de historial en CSV (2 minutos)
Cambie a la pestaña **«Cargar CSV»**. Los archivos de ejemplo están en la carpeta `demo/`.

| # | Producto | Archivo | Horizonte | Resultado esperado |
|---|---|---|---|---|
| F1 · válido | Croissant | `demo/historial_croissant_valido.csv` (57 días, del 2026-08-01 al 2026-09-26) | 7 | Pronóstico desde el 2026-09-27, ≈ 41,1 u. y **4 × paquete x12**. Aparece la advertencia de historial menor a un año. |
| F2 · inválido | Croissant | `demo/historial_invalido.csv` | 7 | Error rojo: **«Fila 17: la cantidad "-3" debe ser un número mayor o igual a 0.»** |
| F3 · insuficiente | Croissant | `demo/historial_corto.csv` (10 días) | 7 | Error rojo: **«Se requieren al menos 28 días de historial; hay 10.»** |

También puede mostrar el enlace **«Descargar plantilla»**, que entrega un CSV con el formato correcto (`fecha,cantidad`).

---

### Escenario G · Validaciones en el formulario (1 minuto)
| Acción | Mensaje esperado |
|---|---|
| Pulsar «Generar pronóstico» sin elegir producto | «Seleccione un producto.» |
| Galletas de mantequilla con fecha de corte 2021-10-05 | «Se requieren al menos 28 días de historial: la fecha de corte mínima es 2021-10-28.» |
| Escribir una fecha de corte posterior a 2026-10-03 | «La fecha de corte no puede superar el último dato disponible (2026-10-03).» |
| En «Cargar CSV», elegir un archivo `.xlsx` o `.txt` | «El archivo debe tener extensión .csv.» |

Mientras el modelo se ejecuta, el botón cambia a **«Ejecutando modelo…»** y queda deshabilitado (estado de carga).

---

### Escenario H · Error de servidor (opcional, 30 segundos)
Detenga el backend (`Ctrl + C` en la terminal 2) y genere un pronóstico.
- **Se espera:** «No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.»
- Vuelva a iniciar con `npm run start:dev`.

---

### Cierre · Límites de la solución (1 minuto)
Muestre la tarjeta **«Límites de la solución»** al final de la página:
- El horizonte máximo es de 7 días y se necesitan al menos 28 días de historial.
- El modelo no conoce el clima ni eventos locales; los descuentos solo cuentan si están registrados.
- Las ventas no son la demanda real cuando hubo faltantes (demanda censurada).
- El modelo subestima levemente (sesgo de -0,23 u./día), así que conviene un margen de seguridad.

Cifra de impacto: en la prueba, preparando lo pronosticado en los productos con stock, **sobrarían 1 073 u. con LightGBM frente a 1 292 u. con la línea base, y faltarían 802 u. frente a 1 338 u.** El detalle está en `ml/reports/error_analysis.md`.

---

## 3. Demostración directa de la API (opcional)

PowerShell:
```powershell
$p = (Invoke-RestMethod http://localhost:3000/api/v1/products).products
$id = ($p | Where-Object name -eq 'Cafe Americano').id

Invoke-RestMethod -Method Post http://localhost:3000/api/v1/forecast -ContentType 'application/json' `
  -Body (@{ productId = $id; cutoffDate = '2026-09-26'; horizon = 7 } | ConvertTo-Json)

Invoke-RestMethod -Method Post http://localhost:3000/api/v1/forecast -ContentType 'application/json' `
  -Body (@{ productId = $id; horizon = 30 } | ConvertTo-Json)
```
La segunda llamada debe responder **400** con «horizon no puede superar 7 días.».

Otros errores que puede mostrar:
| Entrada | Código | Mensaje |
|---|---|---|
| `productId: "abc"` | 400 | productId debe ser un UUID válido. |
| `cutoffDate: "2026-02-30"` | 400 | cutoffDate debe ser una fecha válida con formato AAAA-MM-DD. |
| `cutoffDate: "2030-01-01"` | 400 | La fecha de corte (2030-01-01) supera los datos disponibles (2026-10-03). |
| UUID válido inexistente | 404 | El producto no existe, no es vendible o no tiene ventas registradas. |

---

## 4. Pruebas automáticas en vivo

| Comando | Duración | Resultado esperado |
|---|---|---|
| `cd ml; python -m pytest` | ~2 s | `11 passed` |
| `cd frontend; npm test` | ~3 s | `7 passed` |

El backend no tiene pruebas automáticas. Para demostrar el flujo completo de la API, use los escenarios A a H de la interfaz o las llamadas de la sección 3.

---

## 5. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| «No se pudo conectar con el servidor…» | El backend está apagado. | `cd backend; npm run start:dev` |
| `/api/v1/health` muestra `"database": false` | Docker o el contenedor están detenidos. | Abrir Docker Desktop y ejecutar `docker compose up -d` |
| «El modelo no ha sido entrenado…» (503) | Faltan `ml/artifacts/` o `ml/reports/metrics.json`. | `python ml/src/train.py` y luego `python ml/src/evaluate.py` |
| «No se pudo ejecutar Python (python)…» (503) | El backend no encuentra Python. | En `backend/.env`, poner la ruta completa en `PYTHON_BIN` (p. ej. `C:\Lenguajes\Python313\python.exe` o `../.venv/Scripts/python.exe`) y reiniciar el backend. |
| Error de Python `No module named lightgbm` | Las dependencias se instalaron en otro intérprete. | `pip install -r ml/requirements.txt` con el mismo Python de `PYTHON_BIN`. |
| `port is already allocated` al iniciar Docker | Ya hay otro PostgreSQL en el puerto 5432. | Detener el otro servicio o cambiar el puerto en `docker-compose.yml` y en `DATABASE_URL`. |
| `EADDRINUSE :3000` o `:5173` | Quedó una instancia anterior en ejecución. | Cerrar la terminal anterior o terminar el proceso `node`. |
| La lista de productos está vacía | La base no terminó de restaurarse. | Esperar el mensaje de `docker logs cafeteria-db` y recargar. |

---

## 6. Apagado
```powershell
# Ctrl + C en las terminales del backend y del frontend
docker compose stop          # conserva la base restaurada para la próxima vez
```
`docker compose down -v` **borra** la base, y la próxima vez se volverá a restaurar desde `backup.sql`.
