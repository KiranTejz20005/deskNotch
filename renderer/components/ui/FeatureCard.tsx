import React from 'react'
import { Tile } from './tile'
import { CHROME_X, CHROME_Y } from '../notch/NotchChassis'

export const FEATURE_CARD_WIDTH = 500 + CHROME_X
export const FEATURE_CARD_HEIGHT = 320 + CHROME_Y

interface FeatureCardProps {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  width?: number
  height?: number
  accent?: string
  children: React.ReactNode
  className?: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  icon,
  action,
  width = FEATURE_CARD_WIDTH,
  height = FEATURE_CARD_HEIGHT,
  accent,
  children,
  className = '',
}) => {
  return (
    <Tile width={width} height={height} className={`p-5 ${className}`}>
      <div className="flex h-full flex-col justify-between min-w-0 select-none">
        {/* Standardized Card Header */}
        <div className="flex items-center justify-between shrink-0 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            {icon && <span style={{ color: accent || 'rgba(255,255,255,0.7)' }}>{icon}</span>}
            <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-white/70">
              {title}
            </span>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col justify-between min-h-0 pt-3">
          {children}
        </div>
      </div>
    </Tile>
  )
}
