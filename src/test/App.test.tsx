import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// @ts-ignore
import App from '../App'

describe('App', () => {
  it('renders the main application', () => {
    render(<App />)
    expect(screen.getByText('Nöbetçi Öğretmen Görevlendirme')).toBeInTheDocument()
  })

  it('shows teachers section by default', () => {
    render(<App />)
    expect(screen.getByText('Nöbetçi Öğretmenler')).toBeInTheDocument()
  })

  it('can switch between sections', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click on classes tab
    await user.click(screen.getByText('Sınıflar'))
    expect(screen.getByText('Sınıflar')).toBeInTheDocument()

    // Click on absents tab
    await user.click(screen.getByText('Okula Gelemeyenler'))
    expect(screen.getByText('Okula Gelemeyenler')).toBeInTheDocument()
  })
})
