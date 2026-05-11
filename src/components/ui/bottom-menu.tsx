import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MenuBarItem {
  icon: React.ReactNode
  label: string
  href: string
}

interface MenuBarProps {
  items: MenuBarItem[]
  activeHref: string
}

export function MenuBar({ items, activeHref }: MenuBarProps) {
  return (
    <nav className='fixed bottom-0 left-0 right-0 z-50 md:hidden'>
      <div className='bg-background/95 backdrop-blur-md border-t border-border'>
        <div className='flex items-center justify-around px-2 py-2 pb-safe'>
          {items.map((item, index) => {
            const isActive = activeHref === item.href ||
              (item.href !== '/' && activeHref.startsWith(item.href))
            return (
              <a
                key={index}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors duration-200 min-w-[48px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId='activeTab'
                    className='absolute inset-0 rounded-xl bg-primary/10'
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className='relative w-6 h-6 flex items-center justify-center'
                >
                  {item.icon}
                </motion.div>
                <span className={cn(
                  'relative text-[10px] font-medium leading-none transition-all duration-200',
                  isActive ? 'opacity-100' : 'opacity-60'
                )}>
                  {item.label}
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
