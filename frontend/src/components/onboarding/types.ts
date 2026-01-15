export interface OnboardingModalProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export interface OnboardingSlide {
  title: string
  icon?: React.ReactNode
  content: React.ReactNode
}
