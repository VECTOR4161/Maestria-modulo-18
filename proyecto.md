# Ficha Técnica de Proyecto de Machine Learning

**N°:** 30  
**Estudiante:** Fernando Ichazo Cisneros  

---

### 1. Problema de Negocio / Objetivo
Pronosticar la demanda diaria de cada artículo para optimizar el volumen de fabricación y minimizar mermas.

### 2. Línea Base (Baseline)
Pronosticar la demanda diaria por artículo tomando como referencia el mismo día de la semana anterior (método de persistencia / *seasonal naive*), con el fin de calibrar la fabricación y minimizar mermas.

### 3. Unidad de Observación y Variable Objetivo
* **Unidad de observación:** Un producto en una fecha determinada.
* **Variable a predecir:** Cantidad vendida (demanda diaria).

### 4. Propuesta de Modelo y Enfoque
Entrenar un modelo **LightGBM** con división temporal (*time-series split*), incorporando variables de historial (rezagos/lags, medias móviles) y de calendario para superar la referencia semanal, estimar la demanda y reducir el desperdicio.

### 5. Criterio de Éxito y Métrica Principal
Ajustar la producción y reducir desperdicios entrenando un LightGBM por fechas que supere la referencia semanal, logrando un **$\text{MASE} < 1$** (*Mean Absolute Scaled Error*).