import { useContext } from 'react'
import { NavigationContext } from '@/contexts/NavigationContext'

export function useNavigation() {
  return useContext(NavigationContext)
}
