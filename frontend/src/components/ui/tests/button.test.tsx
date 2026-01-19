import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@/tests/utils'
import { afterEach } from 'vitest'
import { Button } from '../button'

describe('Button', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toHaveClass('bg-destructive')
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled()
  })
})
