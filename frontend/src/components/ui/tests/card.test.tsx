import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@/tests/utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders children correctly', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    )
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card body content</CardContent>
        <CardFooter>Card footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card Description')).toBeInTheDocument()
    expect(screen.getByText('Card body content')).toBeInTheDocument()
    expect(screen.getByText('Card footer')).toBeInTheDocument()
  })
})

describe('CardHeader', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders children correctly', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders title as h3 by default', () => {
    render(<CardTitle>My Title</CardTitle>)
    const title = screen.getByText('My Title')
    expect(title.tagName).toBe('H3')
  })

  it('applies correct classes', () => {
    render(<CardTitle>My Title</CardTitle>)
    const title = screen.getByText('My Title')
    expect(title).toHaveClass('text-2xl')
    expect(title).toHaveClass('font-semibold')
    expect(title).toHaveClass('leading-none')
    expect(title).toHaveClass('tracking-tight')
  })
})

describe('CardDescription', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders description as paragraph', () => {
    render(<CardDescription>My description</CardDescription>)
    const description = screen.getByText('My description')
    expect(description.tagName).toBe('P')
  })

  it('applies muted text class', () => {
    render(<CardDescription>My description</CardDescription>)
    const description = screen.getByText('My description')
    expect(description).toHaveClass('text-sm')
    expect(description).toHaveClass('text-muted-foreground')
  })
})

describe('CardContent', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders content with padding', () => {
    render(<CardContent>Content</CardContent>)
    const content = screen.getByText('Content')
    expect(content).toHaveClass('p-6')
    expect(content).toHaveClass('pt-0')
  })
})

describe('CardFooter', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders footer with flex layout', () => {
    render(<CardFooter>Footer</CardFooter>)
    const footer = screen.getByText('Footer')
    expect(footer).toHaveClass('flex')
    expect(footer).toHaveClass('items-center')
    expect(footer).toHaveClass('p-6')
    expect(footer).toHaveClass('pt-0')
  })
})
