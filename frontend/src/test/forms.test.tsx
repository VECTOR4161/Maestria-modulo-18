import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CsvUpload } from '../components/CsvUpload'
import { ForecastForm } from '../components/ForecastForm'
import { ErrorAlert, WarningList } from '../components/StatusMessages'
import { PRODUCTS } from './fixtures'

describe('ForecastForm', () => {
  it('requires a product before submitting', async () => {
    const onSubmit = vi.fn()
    render(<ForecastForm products={PRODUCTS} lastDataDate="2026-10-03" loading={false} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Generar pronóstico' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Seleccione un producto.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a cutoff date without enough history', async () => {
    const onSubmit = vi.fn()
    render(<ForecastForm products={PRODUCTS} lastDataDate="2026-10-03" loading={false} onSubmit={onSubmit} />)
    await userEvent.selectOptions(screen.getByLabelText('Producto'), PRODUCTS[0].id)
    const date = screen.getByLabelText(/Fecha de corte/)
    await userEvent.clear(date)
    await userEvent.type(date, '2021-10-05')
    await userEvent.click(screen.getByRole('button', { name: 'Generar pronóstico' }))
    expect(screen.getByRole('alert')).toHaveTextContent('al menos 28 días')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid request', async () => {
    const onSubmit = vi.fn()
    render(<ForecastForm products={PRODUCTS} lastDataDate="2026-10-03" loading={false} onSubmit={onSubmit} />)
    await userEvent.selectOptions(screen.getByLabelText('Producto'), PRODUCTS[0].id)
    await userEvent.selectOptions(screen.getByLabelText('Horizonte'), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Generar pronóstico' }))
    expect(onSubmit).toHaveBeenCalledWith({ productId: PRODUCTS[0].id, cutoffDate: '2026-10-03', horizon: 3 })
  })

  it('shows the loading state and disables the button', () => {
    render(<ForecastForm products={PRODUCTS} lastDataDate="2026-10-03" loading onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Ejecutando modelo…' })).toBeDisabled()
  })
})

describe('CsvUpload', () => {
  it('rejects files that are not CSV', async () => {
    const onSubmit = vi.fn()
    render(<CsvUpload products={PRODUCTS} loading={false} onSubmit={onSubmit} />)
    await userEvent.selectOptions(screen.getByLabelText('Producto'), PRODUCTS[0].id)
    const file = new File(['hola'], 'historial.xlsx')
    await userEvent.upload(screen.getByLabelText('Archivo de historial'), file, { applyAccept: false })
    await userEvent.click(screen.getByRole('button', { name: 'Pronosticar con el archivo' }))
    expect(screen.getByRole('alert')).toHaveTextContent('extensión .csv')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a valid CSV file', async () => {
    const onSubmit = vi.fn()
    render(<CsvUpload products={PRODUCTS} loading={false} onSubmit={onSubmit} />)
    await userEvent.selectOptions(screen.getByLabelText('Producto'), PRODUCTS[0].id)
    const file = new File(['fecha,cantidad\n2026-09-01,4'], 'historial.csv', { type: 'text/csv' })
    await userEvent.upload(screen.getByLabelText('Archivo de historial'), file)
    await userEvent.click(screen.getByRole('button', { name: 'Pronosticar con el archivo' }))
    expect(onSubmit).toHaveBeenCalledWith({ productId: PRODUCTS[0].id, horizon: 7, file })
  })
})

describe('status messages', () => {
  it('shows API errors and warnings', () => {
    render(
      <>
        <ErrorAlert message="La fecha de corte supera los datos disponibles." />
        <WarningList warnings={['El producto podría estar discontinuado.']} />
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('supera los datos disponibles')
    expect(screen.getByLabelText('Advertencias')).toHaveTextContent('discontinuado')
  })
})
