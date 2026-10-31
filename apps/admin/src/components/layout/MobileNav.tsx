import { useLocation } from 'react-router-dom'
import { Home, BedDouble, Search, Info, UtensilsCrossed, Phone } from 'lucide-react'
import { MenuBar } from '@/components/ui/bottom-menu'
import { useLanguage } from '@/i18n/LanguageContext'

export function MobileNav() {
  const location = useLocation()
  const { t } = useLanguage()

  const items = [
    { icon: <Home className='w-5 h-5' />,             label: t('nav.home'),    href: '/' },
    { icon: <BedDouble className='w-5 h-5' />,        label: t('nav.rooms'),   href: '/rooms' },
    { icon: <Search className='w-5 h-5' />,           label: t('nav.search'),  href: '/#search' },
    { icon: <Info className='w-5 h-5' />,             label: t('nav.about'),   href: '/about' },
    { icon: <UtensilsCrossed className='w-5 h-5' />,  label: t('nav.banquet'), href: '/banquet' },
    { icon: <Phone className='w-5 h-5' />,            label: t('nav.contact'), href: '/contact' },
  ]

  const activeHref = location.pathname + location.hash

  return <MenuBar items={items} activeHref={activeHref} />
}
