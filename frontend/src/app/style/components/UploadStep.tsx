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
    setStep,
  } = useStyleStore()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)

  useEffect(() => {
    if (pendingUpload && !croppedImage) {
      setSelectedFile(pendingUpload.file)
      setShowCropModal(true)
    }
  }, [pendingUpload, croppedImage])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setShowCropModal(true)
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(croppedBlob)
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob,
      croppedUrl,
    })
    if (pendingUpload) clearPendingUpload()
    setShowCropModal(false)
    setStep('metadata')
  }

  const handleSkipCrop = () => {
    if (!selectedFile) return
    const croppedUrl = URL.createObjectURL(selectedFile)
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob: selectedFile,
      croppedUrl,
    })
    if (pendingUpload) clearPendingUpload()
    setShowCropModal(false)
    setStep('metadata')
  }

  return (
    <div className="py-16 max-md:py-10">
      <section className="text-center mb-12 max-md:mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-4">
          Step 01
        </p>
        <h2 className="m-0 font-display font-normal text-[clamp(48px,6vw,88px)] leading-[0.95] tracking-[-0.02em]">
          Begin with{' '}
          <em className="italic text-ink-3">one</em>
          <br />
          piece.
        </h2>
        <p className="mt-5 mx-auto max-w-[40ch] font-display italic text-[18px] leading-[1.4] text-ink-2">
          Snap or upload a photo of a single clothing item. We&apos;ll read
          its color and category, then style around it.
        </p>
      </section>

      <div className="mx-auto max-w-[640px]">
        <ImageUploadZone
          onFileSelect={handleFileSelect}
          label="Drop your base item"
        />
      </div>

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
  )
}
