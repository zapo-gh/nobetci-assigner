import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { TeachersProvider } from '../contexts/TeachersContext.jsx'
import { ClassesProvider } from '../contexts/ClassesContext.jsx'
import { AssignmentsProvider } from '../contexts/AssignmentsContext.jsx'

const renderApp = () =>
  render(
    <TeachersProvider>
      <ClassesProvider>
        <AssignmentsProvider>
          <App />
        </AssignmentsProvider>
      </ClassesProvider>
    </TeachersProvider>
  )

describe('App', () => {
  it('renders the main application', () => {
    renderApp()
    expect(screen.getByText('Nöbetçi Öğretmen Görevlendirme')).toBeInTheDocument()
  })

  it('shows teachers section by default', () => {
    renderApp()
    expect(screen.getByText('Nöbetçi Öğretmenler')).toBeInTheDocument()
  })

  it('can switch between sections', async () => {
    const user = userEvent.setup()
    renderApp()

    // Click on classes tab
    await user.click(screen.getByText('Sınıflar'))
    expect(screen.getByText('Sınıflar')).toBeInTheDocument()

    // Click on absents tab
    await user.click(screen.getByText('Okula Gelemeyenler'))
    expect(screen.getByText('Okula Gelemeyenler')).toBeInTheDocument()
  })
})
