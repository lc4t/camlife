'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@/styles/mapbox.css'

import maplibregl from 'maplibre-gl'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GeolocateControl,
  Map as MapLibreMap,
  type MapRef,
  NavigationControl,
  Popup,
} from 'react-map-gl/maplibre'
import { MapPoints } from '@/components/mapbox/map-points'
import { MapTools } from '@/components/mapbox/toolbar'
import { env } from '@/env'
import { useIsMobile } from '@/hooks/use-mobile'
import { api } from '@/trpc/react'
import type { PopupInfo } from '@/types'

interface MapBoxProps {
  hideControls: boolean
}

export default function MapBox({ hideControls }: MapBoxProps) {
  const { resolvedTheme } = useTheme()

  const isMobile = useIsMobile()

  const { data: coordinates } = api.photo.getAllCoordinates.useQuery()

  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [isGlobe, setIsGlobe] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const mapInstanceRef = useRef<maplibregl.Map | null>(null)

  // map style - using MapTiler if API key is configured, otherwise use demo tiles
  const mapStyle = useMemo(() => {
    const maptilerKey = env.NEXT_PUBLIC_MAPTILER_API_KEY

    if (maptilerKey) {
      // Use MapTiler styles (better quality, supports dark mode)
      // Available styles: openstreetmap, basic, streets, outdoors, satellite
      // See: https://docs.maptiler.com/cloud/api/maps/
      const styleName = resolvedTheme === 'dark' ? 'dark-v2' : 'streets-v2'
      return `https://api.maptiler.com/maps/${styleName}/style.json?key=${maptilerKey}`
    }

    // Fallback to demo tiles (no API key required)
    return 'https://demotiles.maplibre.org/style.json'
  }, [resolvedTheme])

  // Create initial view state with mobile-specific zoom
  const initialViewState = useMemo(
    () => ({
      longitude: 116.38,
      latitude: 39.9,
      zoom: isMobile ? -1.5 : 2,
      pitch: 0,
      bearing: 0,
    }),
    [isMobile],
  )

  // geojson data
  const { geojsonData, validCoordinatesCount } = useMemo(() => {
    if (!coordinates) return { geojsonData: null, validCoordinatesCount: 0 }

    const validCoordinates = coordinates.filter(
      (coord): coord is PopupInfo =>
        coord.longitude !== null && coord.latitude !== null,
    )

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: validCoordinates.map((coord, index) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [coord.longitude, coord.latitude] as [number, number],
        },
        properties: {
          id: index,
          url: coord.url,
          compressedUrl: coord.compressedUrl,
          blurData: coord.blurData,
          width: coord.width,
          height: coord.height,
        },
      })),
    }

    return {
      geojsonData,
      validCoordinatesCount: validCoordinates.length,
    }
  }, [coordinates])

  // map ref
  const mapRef = useCallback((ref: MapRef) => {
    if (ref) {
      mapInstanceRef.current = ref.getMap()
      mapInstanceRef.current.on('load', () => {
        setMapLoaded(true)
      })
    }
  }, [])

  /**
   * Rotate map
   * @returns void
   * @description Rotate map when zoom is less than threshold
   */
  const rotate = useCallback(() => {
    if (!isRotating || !mapInstanceRef.current) return

    const zoom = mapInstanceRef.current.getZoom()
    if (zoom < 5) {
      const center = mapInstanceRef.current.getCenter()
      center.lng -= 6
      mapInstanceRef.current.easeTo({
        center,
        duration: 1000,
        easing: (n) => n,
      })
    }
  }, [isRotating])

  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current) {
      mapInstanceRef.current.on('moveend', rotate)
      if (isRotating) rotate()
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend', rotate)
      }
    }
  }, [mapLoaded, isRotating, rotate])

  /**
   * Toggle projection
   * @returns void
   * @description Toggle projection between globe and mercator
   */
  const toggleProjection = useCallback(() => {
    if (!mapInstanceRef.current || isTransitioning) return

    setIsTransitioning(true)
    const map = mapInstanceRef.current

    const currentView = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: 0,
    }

    const easing = (t: number) => t * (2 - t)

    // Note: Projection is controlled via react-map-gl's projection prop
    // We just toggle the state and let the component re-render
    if (isGlobe) {
      map.easeTo({
        ...currentView,
        duration: 600,
        easing,
      })

      setTimeout(() => {
        setIsGlobe(false)
        setTimeout(() => setIsTransitioning(false), 400)
      }, 300)
    } else {
      map.easeTo({
        ...currentView,
        duration: 600,
        easing,
      })

      setIsGlobe(true)
      setTimeout(() => setIsTransitioning(false), 600)
    }
  }, [isGlobe, isTransitioning])

  /**
   * Handle point click
   * @param event - Map mouse event
   * @returns void
   * @description Set popup info when point is clicked
   */
  const handlePointClick = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: react-map-gl event type
    (event: any) => {
      setIsRotating(false)

      // Get features from the event
      const features = event.features || []
      const feature = features[0]
      if (!feature || feature.geometry.type !== 'Point') {
        setPopupInfo(null)
        return
      }

      const [longitude, latitude] = feature.geometry.coordinates as [
        number,
        number,
      ]
      const { url, compressedUrl, blurData, width, height } =
        feature.properties as {
          url: string
          compressedUrl: string | null
          blurData: string
          width: number
          height: number
        }

      setPopupInfo({
        longitude,
        latitude,
        url,
        compressedUrl,
        blurData,
        width,
        height,
      })
    },
    [],
  )

  return (
    <>
      {!hideControls && (
        <MapTools
          isRotating={isRotating}
          setIsRotating={setIsRotating}
          isGlobe={isGlobe}
          setIsGlobe={toggleProjection}
          isTransitioning={isTransitioning}
        />
      )}
      <MapLibreMap
        mapLib={maplibregl}
        initialViewState={initialViewState}
        style={{ width: '100vw', height: '100vh' }}
        mapStyle={mapStyle}
        ref={mapRef}
        interactiveLayerIds={['point-hitbox', 'point']}
        onClick={handlePointClick}
        projection={isGlobe ? 'globe' : 'mercator'}
        minZoom={isMobile ? -2 : undefined}
        maxZoom={isMobile ? 3 : undefined}
      >
        <MapPoints
          geojsonData={geojsonData}
          validCoordinatesCount={validCoordinatesCount}
        />
        {!hideControls && popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor='bottom'
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            offset={[0, -15]}
          >
            <div className='rounded-md p-2 dark:bg-[#333333]'>
              <Image
                src={popupInfo.compressedUrl || popupInfo.url}
                placeholder='blur'
                blurDataURL={popupInfo.blurData ?? ''}
                alt='map photo'
                width={popupInfo.width}
                height={popupInfo.height}
              />
            </div>
          </Popup>
        )}
        {!hideControls && (
          <>
            <NavigationControl
              position='bottom-right'
              style={{
                marginBottom: '80px',
                marginRight: hideControls ? '20px' : '50px',
              }}
            />
            <GeolocateControl
              position='bottom-right'
              style={{
                marginRight: hideControls ? '20px' : '50px',
              }}
            />
          </>
        )}
      </MapLibreMap>
    </>
  )
}
