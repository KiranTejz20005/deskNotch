import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, Trash2, X, ShieldAlert } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useNotifications } from '../../hooks/useNotifications'

export const NOTIFICATION_WIDTH = FEATURE_CARD_WIDTH

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const NotificationTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { available, statusText, notifications, dismiss, clearAll } = useNotifications()

  return (
    <FeatureCard
      title="Notifications"
      icon={<Bell size={15} />}
      accent={accent}
      action={
        notifications.length > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11.5px] font-semibold transition-colors"
            title="Clear all notifications"
          >
            <Trash2 size={12} />
            <span>Clear All</span>
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-white/40">
            Peek Enabled
          </span>
        )
      }
    >
      <div className="flex flex-1 flex-col justify-between min-h-0 select-none">
        {!available ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-4 my-auto">
            <ShieldAlert size={28} className="text-amber-400 mb-2 opacity-80" />
            <h4 className="text-[15px] font-bold text-white">Notification Peek</h4>
            <p className="text-[12.5px] text-white/50 max-w-xs mt-1">
              {statusText || 'Access not enabled in Windows Settings'}
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center my-auto text-center p-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] border border-white/10 mb-2">
              <Bell size={24} className="text-white/40" />
            </div>
            <h4 className="text-[15px] font-bold text-white">No New Notifications</h4>
            <p className="text-[12.5px] font-medium text-white/50 mt-0.5">You are all caught up!</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-none my-1 space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group relative rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/15 p-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                      {n.appName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-medium text-white/40 tabular-nums">
                        {timeAgo(n.timestamp)}
                      </span>
                      <button
                        type="button"
                        onClick={() => dismiss(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity p-0.5"
                        title="Dismiss"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[13px] font-bold text-white leading-tight mt-1">
                    {n.title}
                  </div>
                  {n.body && (
                    <div className="text-[12px] font-medium text-white/60 line-clamp-2 leading-relaxed mt-1">
                      {n.body}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </FeatureCard>
  )
}
