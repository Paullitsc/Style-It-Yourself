'use client'

import { useEffect } from 'react'
import { useStyleStore } from '@/store/styleStore'
import StepIndicator from './components/StepIndicator'
import UploadStep from './components/UploadStep'
import MetadataStep from './components/MetadataStep'
import ColorStep from './components/ColorStep'
import BuildStep from './components/BuildStep'
import SummaryStep from './components/SummaryStep'

export default function StylePage() {
  const { currentStep: storeStep, croppedImage } = useStyleStore()

  // A non-upload step with no image is stale state: render as the upload
  // step immediately and reset the store as a follow-up (external store
  // mutation, so it does not belong in render).
  const stale = !croppedImage && storeStep !== 'upload'
  const currentStep = stale ? 'upload' : storeStep

  useEffect(() => {
    if (stale) useStyleStore.getState().reset()
  }, [stale])

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
