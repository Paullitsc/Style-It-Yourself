'use client'

import { useEffect, useState } from 'react'
import { useStyleStore } from '@/store/styleStore'
import StepIndicator from './components/StepIndicator'
import UploadStep from './components/UploadStep'
import MetadataStep from './components/MetadataStep'
import ColorStep from './components/ColorStep'
import BuildStep from './components/BuildStep'
import SummaryStep from './components/SummaryStep'

export default function StylePage() {
  const { currentStep, croppedImage, reset } = useStyleStore()
  const [isReady, setIsReady] = useState(false)

  // Reset if we're past upload but have no image (stale state)
  // Reset if we're past upload but have no image (stale state)
  useEffect(() => {
    const state = useStyleStore.getState()
    console.log('Checking state:', { currentStep: state.currentStep, hasCroppedImage: !!state.croppedImage })
    
    if (!state.croppedImage && state.currentStep !== 'upload') {
      console.log('Resetting stale state')
      state.reset()
    }
    setIsReady(true)
  }, [])

  // Don't render until we've checked for stale state
  if (!isReady) {
    return <div className="min-h-[calc(100vh-80px)] bg-primary-900" />
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-primary-900">
      {/* Step Indicator - Show on all steps except build (where it's more complex) */}
      {(currentStep === 'upload' || currentStep === 'metadata' || currentStep === 'colors') && (
        <div className="pt-8 pb-4">
          <StepIndicator />
        </div>
      )}

      {/* Step Content */}
      <div className={currentStep === 'build' || currentStep === 'summary' ? '' : 'max-w-7xl mx-auto px-6 md:px-12'}>
        {currentStep === 'upload' && <UploadStep />}
        {currentStep === 'metadata' && <MetadataStep />}
        {currentStep === 'colors' && <ColorStep />}
        {currentStep === 'build' && <BuildStep />}
        {currentStep === 'summary' && <SummaryStep />}
      </div>
    </div>
  )
}