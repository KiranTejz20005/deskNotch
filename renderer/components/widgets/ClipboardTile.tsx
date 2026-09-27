import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Clipboard as ClipboardIcon, Search, Check, Trash2 } from 'lucide-react'
import { FeatureCard, FEATURE_CARD_WIDTH } from '../ui/FeatureCard'
import { useClipboard } from '../../hooks/useClipboard'

export const CLIPBOARD_WIDTH = FEATURE_CARD_WIDTH

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

export const ClipboardTile: React.FC<{ accent: string }> = ({ accent }) => {
  const { history, copiedId, copy, clear } = useClipboard()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return history
    return history.filter((item) => item.text.toLowerCase().includes(q))
  }, [history, query])

  return (
    <FeatureCard
      title="Clipboard History"
      icon={<ClipboardIcon size={15} />}
      accent={accent}
      action={
        history.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11.5px] font-semibold transition-colors"
            title="Clear clipboard history"
          >
            <Trash2 size={12} />
            <span>Clear History</span>
          </button>
        )
      }
    >
      <div className="flex flex-1 flex-col justify-between min-h-0 select-none">
        {/* Search Bar */}
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 border border-white/[0.08] focus-within:border-white/30 transition-colors shrink-0">
          <Search size={14} className="text-white/40 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clipboard entries..."
            className="w-full bg-transparent text-[13px] font-medium text-white outline-none placeholder:text-white/35"
          />
        </div>

        {/* Scrollable List Items */}
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto pr-1 scrollbar-none space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-white/40 py-6">
              <ClipboardIcon size={24} className="mb-2 text-white/20" />
              <span className="text-[13px] font-medium">
                {history.length === 0 ? 'No clipboard items yet' : 'No matching clipboard items'}
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((item) => {
                const justCopied = copiedId === item.id
                return (
                  <motion.button
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={spring}
                    onClick={() => copy(item)}
                    className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-left hover:bg-white/[0.08] hover:border-white/15 transition-all"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/90 group-hover:text-white transition-colors">
                      {item.text.replace(/\s+/g, ' ')}
                    </span>
                    {justCopied ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md shrink-0">
                        <Check size={12} />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-white/40 group-hover:text-white/80 bg-white/[0.06] px-2.5 py-1 rounded-md transition-colors shrink-0">
                        Copy
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Item Count */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11.5px] font-semibold text-white/40 mt-2 shrink-0">
          <span>{history.length} {history.length === 1 ? 'item' : 'items'} saved</span>
          <span>Click entry to copy</span>
        </div>
      </div>
    </FeatureCard>
  )
}
