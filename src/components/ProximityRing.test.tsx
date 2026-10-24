// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProximityRing } from './ProximityRing'

afterEach(cleanup)

const RADIUS = (38 - 2.5) / 2
const CIRC = 2 * Math.PI * RADIUS

function ring(score: number) {
  render(
    <ProximityRing score={score}>
      <i data-testid="icon" />
    </ProximityRing>,
  )
  const el = screen.getByRole('img')
  const fill = el.querySelector('.ring__fill')!
  const filled = Number(fill.getAttribute('stroke-dasharray')!.split(' ')[0])
  return { el, fill, fraction: filled / CIRC, badge: el.querySelector('.ring__badge')!.textContent }
}

describe('ProximityRing', () => {
  it.each([0, 67, 85, 95])('renders %i: badge, tooltip, aria label and a proportional arc', (score) => {
    const { el, fraction, badge } = ring(score)
    expect(badge).toBe(String(score))
    expect(el.getAttribute('title')).toBe(`קרבה ${score} אחוז`)
    expect(el.getAttribute('aria-label')).toBe(`קרבה ${score} אחוז`)
    expect(fraction).toBeCloseTo(score / 100, 5)
    cleanup()
  })

  it('shows an empty track and the badge 0 for score 0, without errors', () => {
    const { el, fraction } = ring(0)
    expect(el.querySelector('.ring__track')).not.toBeNull()
    expect(fraction).toBe(0)
  })

  it('starts the arc at the top and wraps the icon in a 38px ring', () => {
    const { el, fill } = ring(50)
    expect(fill.getAttribute('transform')).toBe('rotate(-90 19 19)')
    expect(el.querySelector('svg')!.getAttribute('width')).toBe('38')
    expect(el.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByTestId('icon')).toBeTruthy()
  })

  it('clamps out-of-range scores to 0..100', () => {
    expect(ring(140).badge).toBe('100')
    cleanup()
    expect(ring(-3).badge).toBe('0')
  })
})
