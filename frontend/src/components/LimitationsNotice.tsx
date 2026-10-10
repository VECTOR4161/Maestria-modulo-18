export function LimitationsNotice({ lastDataDate }: { lastDataDate: string }) {
  return (
    <section className="card limits">
      <h2>Límites de la solución</h2>
      <ul>
        <li>Pronostica como máximo 7 días después de la fecha de corte y necesita al menos 28 días de historial.</li>
        <li>
          Usa solo ventas pasadas, calendario, feriados con cierre del local y descuentos registrados; no anticipa
          clima, eventos locales ni cambios de precio no registrados.
        </li>
        <li>
          Mide la demanda como ventas: si un producto se agotó, la demanda real pudo ser mayor a la registrada.
        </li>
        <li>Los productos nuevos o discontinuados tienen mayor error; el sistema muestra una advertencia.</li>
        <li>El modelo tiende a subestimar levemente (sesgo negativo); conviene sumar un margen en días de alta demanda.</li>
        <li>Los datos disponibles llegan hasta el {lastDataDate}.</li>
      </ul>
    </section>
  )
}
