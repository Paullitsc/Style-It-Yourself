'use client'

import { useState, useEffect } from 'react'
import { useStyleStore } from '@/store/styleStore'
import CropModal from './shared/CropModal'
import ImageUploadZone from './shared/ImageUploadZone'

export default function UploadStep() {
  const { 
    croppedImage, 
    pendingUpload,
    setCroppedImage, 
    clearPendingUpload,
    setStep 
  } = useStyleStore()
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

  // Check for pending upload from home page on mount
  useEffect(() => {
    if (pendingUpload && !croppedImage) {
      setSelectedFile(pendingUpload.file)
      setShowCropModal(true)
    }
  }, [pendingUpload, croppedImage])

  // Handle file selection from zone
  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setShowCropModal(true)
  }

  // Handle crop completion
  const handleCropComplete = (croppedBlob: Blob) => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(croppedBlob)
    
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob,
      croppedUrl,
    })
    
    // Clear pending upload if it exists
    if (pendingUpload) {
      clearPendingUpload()
    }
    
    setShowCropModal(false)
    setStep('metadata')
  }

  // Handle skip crop (use full image)
  const handleSkipCrop = () => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(selectedFile)
    
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob: selectedFile,
      croppedUrl,
    })
    
    if (pendingUpload) {
      clearPendingUpload()
    }
    
    setShowCropModal(false)
    setStep('metadata')
  }

  return (
    <div className="flex items-center justify-center min-h-[500px] py-12">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">
            Start Your Outfit
          </h2>
          <p className="text-neutral-500 text-sm uppercase tracking-wide">
            Upload a photo of your base item
          </p>
        </div>

        <ImageUploadZone 
          onFileSelect={handleFileSelect} 
          label="Drop your base item"
        />

        {/* Crop Modal */}
        {showCropModal && selectedFile && (
          <CropModal
            file={selectedFile}
            onComplete={handleCropComplete}
            onSkip={handleSkipCrop}
            onClose={() => {
              setShowCropModal(false)
              setSelectedFile(null)
              if (pendingUpload) clearPendingUpload()
            }}
          />
        )}
      </div>
    </div>
  )
}