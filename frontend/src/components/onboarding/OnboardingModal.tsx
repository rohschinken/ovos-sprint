import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { OnboardingModalProps } from './types'
import { onboardingSlides } from './slides'

export function OnboardingModal({ open, onClose, onComplete }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)

  // Reset to first slide when modal opens
  useEffect(() => {
    if (open) {
      setCurrentSlide(0)
      setDirection(0)
    }
  }, [open])

  const handleNext = useCallback(() => {
    if (currentSlide < onboardingSlides.length - 1) {
      setDirection(1)
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }, [currentSlide, onComplete])

  const handlePrevious = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide(currentSlide - 1)
    }
  }, [currentSlide])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentSlide < onboardingSlides.length - 1) {
        handleNext()
      } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
        handlePrevious()
      }
      // Note: Escape key is handled by Dialog component's onOpenChange
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, currentSlide, handleNext, handlePrevious])

  const handleSkip = () => {
    onComplete()
  }

  const handleDotClick = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  const currentSlideData = onboardingSlides[currentSlide]
  const isLastSlide = currentSlide === onboardingSlides.length - 1

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{currentSlideData.title}</DialogTitle>

        <div className="space-y-8 py-4">
          {/* Slide Content */}
          <div className="min-h-[400px] flex flex-col items-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="w-full space-y-6"
              >
                {/* Icon */}
                {currentSlideData.icon && (
                  <div className="flex justify-center">
                    {currentSlideData.icon}
                  </div>
                )}

                {/* Title */}
                <h2 className="text-2xl font-bold text-center">
                  {currentSlideData.title}
                </h2>

                {/* Content */}
                <div className="text-left">
                  {currentSlideData.content}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2">
            {onboardingSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-all duration-200',
                  index === currentSlide
                    ? 'bg-primary w-8'
                    : 'bg-muted hover:bg-muted-foreground/50'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            {/* Skip Button */}
            <div>
              {!isLastSlide && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
              )}
            </div>

            {/* Previous/Next Buttons */}
            <div className="flex gap-2">
              {currentSlide > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              <Button onClick={handleNext}>
                {isLastSlide ? 'Get Started' : 'Next'}
                {!isLastSlide && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
