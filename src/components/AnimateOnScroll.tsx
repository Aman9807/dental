'use client'

import React, { useEffect, useRef, useState } from 'react'

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale' | 'fade'
  delay?: number
  threshold?: number
  once?: boolean
}

export default function AnimateOnScroll({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
  threshold = 0.15,
  once = true,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.unobserve(element)
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [threshold, once])

  const hiddenClass = {
    'fade-up': 'scroll-hidden',
    'fade-left': 'scroll-hidden-left',
    'fade-right': 'scroll-hidden-right',
    'scale': 'scroll-hidden-scale',
    'fade': 'scroll-hidden',
  }[animation]

  const visibleClass = {
    'fade-up': 'scroll-visible',
    'fade-left': 'scroll-visible-left',
    'fade-right': 'scroll-visible-right',
    'scale': 'scroll-visible-scale',
    'fade': 'scroll-visible',
  }[animation]

  return (
    <div
      ref={ref}
      className={`${isVisible ? visibleClass : hiddenClass} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
