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
  const { currentStep, reset } = useStyleStore()

  // Reset store when leaving page
  useEffect(() => {
    return () => {
      // Don't reset on unmount during normal navigation within the flow
      // Only reset if needed (could be controlled by a flag)
    }
  }, [])

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