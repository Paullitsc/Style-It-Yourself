import { useEffect, useRef, useState } from 'react'
import { colorFromRgb } from '../lib/color'
import type { Color } from '../lib/types'

interface Props {
  previewSrc: string
  currentHex: string
  onPick: (color: Color) => void
}

/**
 * Draws a backend-relayed (same-origin data:) image to a canvas and samples
 * the pixel under the cursor. MUST be fed the data: URL only — drawing a
 * remote cross-origin image would taint the canvas and break getImageData.
 */
export function ImageEyedropper({ previewSrc, currentHex, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null)

  // Draw at intrinsic size so the backing store is 1:1 with source pixels.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setReady(false)
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      setReady(true)
    }
    img.src = previewSrc
  }, [previewSrc])

  const sample = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    // Map by normalized fraction → DPR-independent (backing store == source px).
    const xNorm = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const yNorm = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    setMarker({ x: xNorm, y: yNorm })
    const px = Math.floor(xNorm * canvas.width)
    const py = Math.floor(yNorm * canvas.height)
    const sx = Math.max(0, Math.min(canvas.width - 5, px - 2))
    const sy = Math.max(0, Math.min(canvas.height - 5, py - 2))
    try {
      const { data } = ctx.getImageData(sx, sy, 5, 5)
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 16) continue // skip (near-)transparent pixels
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        n++
      }
      if (n === 0) return
      onPick(colorFromRgb(Math.round(r / n), Math.round(g / n), Math.round(b / n)))
    } catch {
      /* canvas unreadable — ignore */
    }
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent) => sample(e.clientX, e.clientY)
    const up = () => setDragging(false)
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, ready])

  return (
    <div className="eyedropper">
      <canvas
        ref={canvasRef}
        className="eyedropper__canvas"
        onMouseDown={(e) => {
          setDragging(true)
          sample(e.clientX, e.clientY)
        }}
      />
      {marker && (
        <span
          className="eyedropper__marker"
          style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%`, background: currentHex }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
