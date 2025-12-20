'use client'

import '@smastrom/react-rating/style.css'
import Compressor from 'compressorjs'
import ExifReader, { type Tags } from 'exifreader'
import { Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { nanoid } from 'nanoid'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { useConfetti } from '@/hooks/use-confetti'
import { useAppSettings } from '@/hooks/use-settings'
import { formatExifDateTime } from '@/lib/format'
import { generateBlurData, getLocationFromCoordinates } from '@/lib/image'
import { uploadFileViaProxy, uploadFileWithProgress } from '@/lib/storage'
import { cn, getCompressedFileName } from '@/lib/utils'
import { useCommonStore } from '@/stores/common'
import { usePhotoStore } from '@/stores/photo'
import { api } from '@/trpc/react'
import type { FileUploadStep, ImageLocation } from '@/types'

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useTranslations('gallery')

  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<FileUploadStep | null>(null)
  const [progress, setProgress] = useState<number>(0)

  const { setDialogOpen, setPhotoInfo, setTriggerType } = usePhotoStore()
  const { setFirstPhotoUploaded, firstPhotoUploaded } = useCommonStore()

  const { playConfetti } = useConfetti()

  // Get app settings
  const {
    imageSizeLimit,
    enableFileCompression,
    compressQuality,
    addressLanguage,
  } = useAppSettings()

  const randomId = nanoid()

  const { mutateAsync: getPresignedUrl } =
    api.photo.getPresignedUrl.useMutation()

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileChange(acceptedFiles[0]!)
      }
    },
    onDropRejected: () => {
      // File rejected by dropzone
    },
  })

  // todo: support batch upload
  const handleFileChange = async (file: File) => {
    if (!file) return

    setFile(file)
    setProgress(0) // Reset progress to 0 to prevent using cached progress
    const { name, type: fileType, size: fileSize } = file
    const fileNameWithoutExt = name.substring(0, name.lastIndexOf('.'))
    const fileExt = name.substring(name.lastIndexOf('.'))
    const fileName = `${fileNameWithoutExt}_${randomId}${fileExt}`

    setStep('upload')
    if (fileSize > imageSizeLimit) {
      toast.error(
        `${t('file-size-exceeds')} ${imageSizeLimit / 1024 / 1024}MB ${t('limit')}`,
      )
      setFile(null)
      setStep(null)
      setProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    try {
      // Use server-side proxy for local development (bypasses CORS)
      // In production, you can use direct upload with proper CORS configuration
      // Default: use proxy unless explicitly disabled
      // - Local dev: proxy by default (no CORS needed)
      // - Production: direct upload by default (needs CORS), or set NEXT_PUBLIC_USE_UPLOAD_PROXY=true to use proxy
      const useProxy = process.env.NEXT_PUBLIC_USE_UPLOAD_PROXY !== 'false'
      let publicUrl: string

      if (useProxy) {
        setStep('upload')
        const result = await uploadFileViaProxy(file, fileName, setProgress)
        publicUrl = result.url
      } else {
        const { signedUrl, publicUrl: presignedPublicUrl } =
          await getPresignedUrl({
            fileName,
            fileType,
          })

        await uploadFileWithProgress(file, signedUrl, setProgress)
        publicUrl = presignedPublicUrl
      }

      let compressedData = { compressedUrl: '', compressedSize: 0 }
      if (enableFileCompression) {
        setStep('compress')
        compressedData = await new Promise<{
          compressedUrl: string
          compressedSize: number
        }>((resolve) => {
          new Compressor(file, {
            quality: compressQuality,
            success: async (compressedFile) => {
              try {
                // Only upload compressed version if it's actually smaller
                if (compressedFile.size >= file.size) {
                  resolve({
                    compressedUrl: '',
                    compressedSize: 0,
                  })
                  return
                }

                const compressedFileName = getCompressedFileName(fileName)
                if (!compressedFileName) {
                  throw new Error(t('failed-to-generate-compressed-file-name'))
                }

                if (useProxy) {
                  // Use proxy for compressed file too
                  const result = await uploadFileViaProxy(
                    compressedFile as File,
                    compressedFileName,
                    setProgress,
                  )
                  resolve({
                    compressedUrl: result.url,
                    compressedSize: result.size,
                  })
                } else {
                  const {
                    signedUrl: compressedSignedUrl,
                    publicUrl: compressedPublicUrl,
                  } = await getPresignedUrl({
                    fileName: compressedFileName,
                    fileType: compressedFile.type,
                  })

                  await uploadFileWithProgress(
                    compressedFile as File,
                    compressedSignedUrl,
                    setProgress,
                  )

                  const result = {
                    compressedUrl: compressedPublicUrl,
                    compressedSize: compressedFile.size,
                  }
                  resolve(result)
                }
              } catch (error) {
                console.error('compress file upload failed: ', error)
                toast.error(t('compress-file-upload-failed'))
                // Don't reject, just resolve with empty data so upload can continue
                resolve({
                  compressedUrl: '',
                  compressedSize: 0,
                })
              }
            },
            error: (err) => {
              console.error('Compression error:', err.message)
              // Don't reject, just resolve with empty data so upload can continue
              resolve({
                compressedUrl: '',
                compressedSize: 0,
              })
            },
          })
        })
      }

      setStep('blur')
      let blurDataUrl = ''
      try {
        blurDataUrl = await generateBlurData(file, 20) // reduce quality for better performance
      } catch (error) {
        console.error('generate blur data url failed: ', error)
        toast.error(t('generate-blur-data-url-failed'))
      }

      setStep('exif')
      let exifData: Tags | null = null
      try {
        exifData = await ExifReader.load(file)
      } catch (error) {
        console.error('parse exif data failed: ', error)
        toast.error(t('parse-exif-data-failed'))
      }

      setStep('location')
      let imageLocation: ImageLocation | null = null
      if (exifData?.GPSLatitude && exifData?.GPSLongitude) {
        try {
          imageLocation = await getLocationFromCoordinates(
            Number(exifData.GPSLatitude?.description),
            Number(exifData.GPSLongitude?.description),
            3,
            addressLanguage,
          )
        } catch (error) {
          console.error('get location failed: ', error)
          toast.error(t('get-location-failed'))
        }
      }

      const newPhotoInfo = {
        // storage
        url: publicUrl,
        fileName,
        fileSize,
        // compressed
        compressedUrl: compressedData.compressedUrl,
        compressedSize: compressedData.compressedSize,
        // blur
        blurDataUrl,
        // exif
        ...(exifData && {
          width: exifData.ImageWidth?.value as number,
          height: exifData.ImageLength?.value as number,
          aspectRatio:
            (exifData.ImageWidth?.value as number) /
            (exifData.ImageLength?.value as number),
          make: exifData.Make?.value as string,
          model: exifData.Model?.value as string,
          lensModel: exifData.LensModel?.value as string,
          focalLength:
            (exifData.FocalLength?.value[0] as number) /
            (exifData.FocalLength?.value[1] as number),
          focalLength35mm: exifData.FocalLength35efl?.value as number,
          fNumber:
            (exifData.FNumber?.value[0] as number) /
            (exifData.FNumber?.value[1] as number),
          iso: exifData.ISOSpeedRatings?.value as number,
          exposureTime:
            (exifData.ExposureTime?.value[0] as number) /
            (exifData.ExposureTime?.value[1] as number),
          exposureCompensation:
            (exifData.ExposureBiasValue?.value[0] as number) /
            (exifData.ExposureBiasValue?.value[1] as number),
          latitude: Number(exifData.GPSLatitude?.description),
          longitude: Number(exifData.GPSLongitude?.description),
          gpsAltitude: Array.isArray(exifData.GPSAltitude?.value)
            ? (exifData.GPSAltitude.value[0] as number) /
              (exifData.GPSAltitude.value[1] as number)
            : undefined,
          dateTimeOriginal:
            formatExifDateTime(
              Array.isArray(exifData?.DateTimeOriginal?.value)
                ? (exifData.DateTimeOriginal.value[0] as string)
                : (exifData?.DateTimeOriginal?.value as string),
            ) || undefined,
        }),
        // location
        ...(imageLocation && {
          country: imageLocation.country,
          countryCode: imageLocation.countryCode,
          region: imageLocation.region,
          city: imageLocation.city,
          district: imageLocation.district,
          fullAddress: imageLocation.fullAddress,
          placeFormatted: imageLocation.placeFormatted,
        }),
      }

      // confirm first photo uploaded
      if (!firstPhotoUploaded) {
        playConfetti()
        setFirstPhotoUploaded(true)
      }

      setPhotoInfo(newPhotoInfo)

      setFile(null)
      setStep(null)
      setProgress(0) // Reset progress to 0 after photo processing is complete
      setTriggerType('file-upload')
      setDialogOpen(true)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setStep(null)
      setFile(null)
      setProgress(0)
      console.error('Upload error:', error)

      // Provide user-friendly error message
      let errorMessage = t('upload-failed') || 'Upload failed'

      if (error instanceof Error) {
        // Check for specific error types
        if (error.message.includes('CORS')) {
          errorMessage =
            t('upload-cors-error') ||
            'Upload failed due to CORS configuration. Please check your storage CORS settings.'
        } else if (
          error.message.includes('403') ||
          error.message.includes('Forbidden')
        ) {
          errorMessage =
            t('upload-forbidden-error') ||
            'Upload forbidden. Please check your storage credentials and permissions.'
        } else if (
          error.message.includes('404') ||
          error.message.includes('Not Found')
        ) {
          errorMessage =
            t('upload-not-found-error') ||
            'Storage bucket not found. Please check your storage configuration.'
        } else if (error.message.includes('Network error')) {
          errorMessage =
            t('upload-network-error') ||
            'Network error during upload. Please check your internet connection and storage configuration.'
        } else if (error.message.includes('Invalid upload URL')) {
          errorMessage =
            t('upload-invalid-url-error') ||
            'Invalid upload URL. Please check your storage configuration in .env.local'
        } else {
          // Use the error message if it's informative
          errorMessage = error.message
        }
      }

      toast.error(errorMessage, {
        duration: 5000,
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div
      className='h-80 w-full'
      {...getRootProps()}
    >
      <motion.div
        onClick={() => fileInputRef.current?.click()}
        whileHover='animate'
        className='group/file relative block h-full w-full cursor-pointer overflow-hidden rounded-lg p-10'
      >
        <div className='flex flex-col items-center justify-center'>
          {!file && (
            <>
              <p className='relative z-20 font-bold font-sans text-base text-neutral-700 dark:text-neutral-300'>
                {t('upload-your-image')}
              </p>
              <p className='relative z-20 mt-2 font-normal font-sans text-base text-neutral-400 dark:text-neutral-400'>
                {t('drag-or-drop-image')} {imageSizeLimit / 1024 / 1024}MB
              </p>
            </>
          )}

          <div className='relative mx-auto mt-10 w-full max-w-xl'>
            {file && (
              <div className='flex flex-col items-center justify-center gap-4'>
                <Progress
                  value={progress}
                  className='z-50 w-4/5'
                />
                <motion.div
                  layoutId='file-upload'
                  className={cn(
                    'relative z-40 mx-auto mt-4 p-4 md:h-24',
                    'flex w-full flex-col items-start justify-start',
                    'overflow-hidden rounded-md bg-white shadow-sm dark:bg-neutral-900',
                  )}
                >
                  <div className='flex w-full items-center justify-between gap-4'>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className='max-w-xs truncate text-base text-neutral-700 dark:text-neutral-300'
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      {`${progress}%`}
                    </motion.p>
                  </div>

                  <div
                    className={cn(
                      'flex w-full flex-col items-start justify-between md:flex-row md:items-center',
                      'mt-2 text-neutral-600 text-sm dark:text-neutral-400',
                    )}
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className='rounded-md bg-gray-100 px-1 py-0.5 dark:bg-neutral-800'
                    >
                      {file.type}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className={cn(
                        'w-fit flex-shrink-0 rounded-lg px-2 py-1 text-sm shadow-input',
                        'text-neutral-600 dark:bg-neutral-800 dark:text-white',
                      )}
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>
                </motion.div>
              </div>
            )}

            {!file && (
              <motion.div
                layoutId='file-upload'
                variants={{
                  initial: {
                    x: 0,
                    y: 0,
                  },
                  animate: {
                    x: 20,
                    y: -20,
                    opacity: 0.9,
                  },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  'relative z-40 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center',
                  'rounded-md bg-white shadow-[0px_10px_50px_rgba(0,0,0,0.1)] group-hover/file:shadow-2xl dark:bg-neutral-900',
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='flex flex-col items-center text-neutral-600'
                  >
                    {t('drop-it')}
                    <Upload className='h-4 w-4 text-neutral-600 dark:text-neutral-400' />
                  </motion.p>
                ) : (
                  <Upload className='h-4 w-4 text-neutral-600 dark:text-neutral-300' />
                )}
              </motion.div>
            )}

            {!file && (
              <motion.div
                variants={{
                  initial: {
                    opacity: 0,
                  },
                  animate: {
                    opacity: 1,
                  },
                }}
                className={cn(
                  'absolute inset-0 z-30 mx-auto mt-4 flex h-32 w-full max-w-[8rem] items-center justify-center',
                  'rounded-md border border-sky-400 border-dashed bg-transparent opacity-0',
                )}
              />
            )}
          </div>

          {file && step && step !== 'upload' && (
            <div className='absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
              <div className='flex flex-col items-center gap-2'>
                <Spinner className='h-6 w-6' />
                <p className='font-medium text-sm'>
                  {step === 'compress' && t('compressing-file')}
                  {step === 'blur' && t('generating-blur-data')}
                  {step === 'exif' && t('parsing-exif-data')}
                  {step === 'location' && t('getting-location')}
                </p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          id='file-upload-handle'
          type='file'
          accept='image/*'
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileChange(file)
          }}
          className='hidden'
        />

        <div className='absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]'>
          <GridPattern />
        </div>
      </motion.div>
    </div>
  )
}

export function GridPattern() {
  const columns = 41
  const rows = 11
  return (
    <div
      className={cn(
        'flex flex-shrink-0 flex-wrap items-center justify-center gap-x-px gap-y-px',
        'scale-105 bg-gray-100 dark:bg-neutral-900',
      )}
    >
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col
          return (
            <div
              key={`${col}-${String(row)}`}
              className={`flex h-10 w-10 flex-shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? 'bg-gray-50 dark:bg-neutral-950'
                  : 'bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:bg-neutral-950 dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]'
              }`}
            />
          )
        }),
      )}
    </div>
  )
}
