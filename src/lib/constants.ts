// Animation constants
export const transitions = {
  default: { duration: 0.15, ease: [0.32, 0.72, 0, 1] as const },
  overlay: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  section: { duration: 0.6, ease: [0.32, 0.72, 0, 1] as const },
} as const;

// Common animation variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: transitions.section,
} as const;

// 3D Carousel constants
export const carouselConfig = {
  cylinderWidth: { sm: 1100, default: 1800 },
  minFaceWidth: 220,
  dragSensitivity: 0.05,
  springConfig: {
    stiffness: 100,
    damping: 30,
    mass: 0.1,
  },
} as const;