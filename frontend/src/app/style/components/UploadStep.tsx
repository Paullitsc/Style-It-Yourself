'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useStyleStore } from '@/store/styleStore'
import { Upload, X, ArrowRight, RotateCcw, Crop } from 'lucide-react'
import CropModal from './CropModal'

export default function UploadStep() {
  const { 
    croppedImage, 
    pendingUpload,
    setCroppedImage, 
    clearPendingUpload,
    setStep 
  } = useStyleStore()
  
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check for pending upload from home page on mount
  useEffect(() => {
    if (pendingUpload && !croppedImage) {
      setSelectedFile(pendingUpload.file)
      setShowCropModal(true)
    }
  }, [pendingUpload, croppedImage])

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }
    
    setSelectedFile(file)
    setShowCropModal(true)
  }, [])

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle crop complete (user chose to crop)
  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    if (!selectedFile) return
    
    const croppedUrl = URL.createObjectURL(croppedBlob)
    
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob,
      croppedUrl,
    })
    
    // Clear pending upload since we've processed it
    clearPendingUpload()
    setShowCropModal(false)
  }, [selectedFile, setCroppedImage, clearPendingUpload])

  // Handle skip crop (use original image)
  const handleSkipCrop = useCallback(async () => {
    if (!selectedFile) return
    
    // Use the original file as-is
    const croppedUrl = URL.createObjectURL(selectedFile)
    
    setCroppedImage({
      originalFile: selectedFile,
      croppedBlob: selectedFile, // Use original file as blob
      croppedUrl,
    })
    
    // Clear pending upload since we've processed it
    clearPendingUpload()
    setShowCropModal(false)
  }, [selectedFile, setCroppedImage, clearPendingUpload])

  // Handle close crop modal
  const handleCloseCropModal = useCallback(() => {
    setShowCropModal(false)
    setSelectedFile(null)
    clearPendingUpload()
  }, [clearPendingUpload])

  // Handle re-upload
  const handleReUpload = useCallback(() => {
    setCroppedImage(null)
    setSelectedFile(null)
    fileInputRef.current?.click()
  }, [setCroppedImage])

  // Handle crop existing image
  const handleCropExisting = useCallback(() => {
    if (croppedImage) {
      setSelectedFile(croppedImage.originalFile)
      setShowCropModal(true)
    }
  }, [croppedImage])

  // Handle next
  const handleNext = useCallback(() => {
    if (croppedImage) {
      setStep('metadata')
    }
  }, [croppedImage, setStep])

  return (
    <div className="flex flex-col items-center py-8">
      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">
        Upload Image
      </h2>
      <p className="text-neutral-500 text-sm uppercase tracking-wide mb-10">
        Add a photo of your clothing item
      </p>

      {/* Upload Zone or Preview */}
      {croppedImage ? (
        // Preview Mode
        <div className="flex flex-col items-center gap-8">
          {/* Image Preview */}
          <div className="relative">
            <div className="w-80 h-96 bg-primary-800 rounded-lg overflow-hidden border border-primary-700 shadow-2xl">
              <img
                src={croppedImage.croppedUrl}
                alt="Cropped clothing item"
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Success Badge */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-success-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
              ✓ Image Ready
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReUpload}
              className="flex items-center gap-2 px-5 py-3 bg-primary-800 text-neutral-300 hover:bg-primary-700 hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-primary-700"
            >
              <RotateCcw size={14} />
              Re-upload
            </button>
            
            <button
              onClick={handleCropExisting}
              className="flex items-center gap-2 px-5 py-3 bg-primary-800 text-neutral-300 hover:bg-primary-700 hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-primary-700"
            >
              <Crop size={14} />
              Crop
            </button>
            
            <button
              onClick={handleNext}
              className="group flex items-center gap-3 px-8 py-3 bg-white text-primary-900 hover:bg-neutral-200 transition-all text-xs font-bold uppercase tracking-widest"
            >
              Next Step
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      ) : (
        // Upload Zone
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative w-full max-w-xl h-96 
            rounded-xl border-2 border-dashed 
            cursor-pointer transition-all duration-300
            flex flex-col items-center justify-center gap-6
            ${isDragging 
              ? 'border-accent-500 bg-accent-500/10 scale-[1.02]' 
              : 'border-primary-600 bg-primary-800/30 hover:border-primary-500 hover:bg-primary-800/50'
            }
          `}
        >
          {/* Icon */}
          <div className={`
            p-6 rounded-full transition-all duration-300
            ${isDragging ? 'bg-accent-500/20' : 'bg-primary-800'}
          `}>
            <Upload 
              size={32} 
              strokeWidth={1.5}
              className={`transition-colors duration-300 ${isDragging ? 'text-accent-500' : 'text-neutral-500'}`} 
            />
          </div>

          {/* Text */}
          <div className="text-center">
            <h3 className={`
              text-lg font-bold uppercase tracking-widest mb-2 transition-colors
              ${isDragging ? 'text-accent-500' : 'text-white'}
            `}>
              {isDragging ? 'Drop it here!' : 'Drop your image'}
            </h3>
            <p className="text-neutral-500 text-sm">
              or <span className="text-white underline underline-offset-4">click to browse</span>
            </p>
          </div>

          {/* File Types */}
          <p className="text-neutral-600 text-xs uppercase tracking-wider">
            PNG, JPG, WEBP • Max 10MB
          </p>

          {/* Hidden Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && selectedFile && (
        <CropModal
          file={selectedFile}
          onComplete={handleCropComplete}
          onSkip={handleSkipCrop}
          onClose={handleCloseCropModal}
        />
      )}
    </div>
  )
}