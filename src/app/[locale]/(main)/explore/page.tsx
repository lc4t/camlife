'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

const DynamicMap = dynamic(() => import('@/components/mapbox'), {
  ssr: false,
})

export default function MapPage() {
  const params = useSearchParams()
  const hideControls = params.get('hide_controls') === 'true'

  return <DynamicMap hideControls={hideControls} />
}
