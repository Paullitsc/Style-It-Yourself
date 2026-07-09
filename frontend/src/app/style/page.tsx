'use client'

import { useState } from 'react'
import { useStyleStore } from '@/store/styleStore'
import StepIndicator from './components/StepIndicator'
import UploadStep from './components/UploadStep'
import MetadataStep from './components/MetadataStep'
import ColorStep from './components/ColorStep'
import BuildStep from './components/BuildStep'
import SummaryStep from './components/SummaryStep'

export default function StylePage() {
  // Reset stale state before the first render (post-upload step with no
  // image). Runs inside the lazy useState initializer so it happens
  // synchronously during render, before the store subscription below —
  // one render, no flash of stale content.
  useState(() => {
    const state = useStyleStore.getState()
    if (!state.croppedImage && state.currentStep !== 'upload') {
      state.reset()
    }
  })

  const { currentStep } = useStyleStore()

  const showIndicator =
    currentStep === 'upload' ||
    currentStep === 'metadata' ||
    currentStep === 'colors'

  const isFullBleed = currentStep === 'build' || currentStep === 'summary'

  return (
    <div className="flex-1 bg-paper text-ink">
      {showIndicator && (
        <div className="border-b border-ink">
          <div className="max-w-[1320px] mx-auto px-14 max-md:px-6 py-6">
            <StepIndicator />
          </div>
        </div>
      )}

      <div
        className={
          isFullBleed ? '' : 'max-w-[1320px] mx-auto px-14 max-md:px-6'
        }
      >
        {currentStep === 'upload' && <UploadStep />}
        {currentStep === 'metadata' && <MetadataStep />}
        {currentStep === 'colors' && <ColorStep />}
        {currentStep === 'build' && <BuildStep />}
        {currentStep === 'summary' && <SummaryStep />}
      </div>
    </div>
  )
}
