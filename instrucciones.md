# Proyecto Final de Machine Learning

**Sistema integrado y presentación individual**

Cada estudiante desarrollará un sistema funcional que aplique Machine Learning al tema registrado en el Excel de proyectos. El trabajo debe integrar dataset, preparación del modelo, métricas, validación, backend y frontend, siguiendo el formato de los ejemplos desarrollados en clase.

---

## 1. Objetivo y alcance

* Implementar un flujo completo que permita ingresar datos, ejecutar el modelo y mostrar un resultado útil para el usuario.
* No es necesario construir toda la plataforma o sistema de gestión descrito en el tema; se evaluará la funcionalidad principal y su componente inteligente.
* Revisar la coherencia entre el problema, la unidad de observación, la línea base, el modelo y la métrica propuestos en el Excel. Se pueden ajustar estas elecciones con una justificación técnica.

---

## 2. Requisitos del proyecto

* **Dataset:** Utilizar datos reales, públicos o sintéticos. Describir su origen, tamaño, variables o anotaciones y preparación. Si son sintéticos, entregar el código generador, la semilla y sus limitaciones.
* **Modelo:** Entregar el código de entrenamiento o adaptación, los parámetros y el artefacto necesario para inferencia. Si se utiliza un modelo preentrenado sin ajuste, documentar su origen, versión y configuración; distinguir lo entrenado de lo reutilizado.
* **Línea base y métricas:** Comparar la solución con un método sencillo sobre el mismo conjunto de prueba. Justificar una métrica principal y las complementarias necesarias según la tarea; presentar resultados y analizar errores.
* **Validación:** Separar entrenamiento, validación y prueba cuando corresponda. En recuperación sin entrenamiento, reservar consultas para evaluación. Evitar fugas entre registros relacionados y respetar el orden temporal en pronósticos. No ajustar el modelo con la prueba final.
* **Backend:** Implementar una API que reciba entradas, aplique el preprocesamiento y ejecute el modelo real. Validar los datos y manejar errores; no usar respuestas escritas de antemano.
* **Frontend:** Permitir ingresar o cargar datos, ejecutar el análisis y visualizar el resultado. Mostrar estados de carga, mensajes de error y límites de la solución.
* **Pruebas:** Demostrar un caso válido, un caso difícil y una entrada inválida. Incluir una prueba del flujo completo y comprobar que el sistema pueda ejecutarse siguiendo el `README`.

---

> **Pautas de desarrollo y evaluación:**  
> Mantener el código simple y comprensible, con identificadores y comentarios en inglés; la interfaz y la documentación, en español. No se exige superar la línea base: se evaluarán la comparación honesta, la justificación y el análisis de limitaciones.