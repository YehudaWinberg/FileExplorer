// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaPreview } from './MediaPreview'

afterEach(cleanup)

function mockMedia(duration: number) {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: false, configurable: true })
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: true, configurable: true })
    this.dispatchEvent(new Event('pause'))
  })
  return { play, pause, duration }
}

describe('MediaPreview', () => {
  it('shows duration as m:ss, no native controls, and toggles play/pause', () => {
    const { play, pause } = mockMedia(185)
    const { container } = render(<MediaPreview name="a.mp3" kind="audio" state={{ status: 'ready', url: 'blob:x' }} />)
    const media = container.querySelector('audio') as HTMLAudioElement
    expect(media.hasAttribute('controls')).toBe(false)
    expect(screen.getByLabelText('משך').textContent).toContain('--:--')

    Object.defineProperty(media, 'duration', { value: 185, configurable: true })
    fireEvent.loadedMetadata(media)
    expect(screen.getByLabelText('משך').textContent).toContain('3:05')

    fireEvent.click(screen.getByRole('button', { name: 'הפעל' }))
    expect(play).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'השהה' }))
    expect(pause).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'הפעל' })).toBeTruthy()
  })

  it('renders a video element without controls', () => {
    const { container } = render(<MediaPreview name="a.mp4" kind="video" state={{ status: 'ready', url: 'blob:x' }} />)
    const video = container.querySelector('video') as HTMLVideoElement
    expect(video).toBeTruthy()
    expect(video.hasAttribute('controls')).toBe(false)
  })

  it('shows an error when playback fails', () => {
    const { container } = render(<MediaPreview name="a.mp3" kind="audio" state={{ status: 'ready', url: 'blob:x' }} />)
    fireEvent.error(container.querySelector('audio') as HTMLAudioElement)
    expect(screen.getByRole('alert').textContent).toContain('לא ניתן להפעיל')
  })
})
