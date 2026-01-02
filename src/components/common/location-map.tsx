'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import '@/styles/mapbox.css'

import maplibregl from 'maplibre-gl'
import { useCallback, useMemo } from 'react'
import { FullscreenControl, Map as MapGL, Marker } from 'react-map-gl/maplibre'

// Free OpenStreetMap raster tiles - no API key required, very reliable
// Using inline style definition for maximum compatibility
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

interface locationMapProps {
  latitude: number
  longitude: number
  width: string
  height: string
  editable?: boolean
  onChange?: (coords: { latitude: number; longitude: number }) => void
  zoom?: number
}

export function LocationMap({
  latitude,
  longitude,
  width,
  height,
  editable = false,
  onChange,
  zoom,
}: locationMapProps) {
  // Always use free MapLibre demo tiles - no API key exposure
  const mapStyle = useMemo(() => MAP_STYLE, [])

  const handleError = useCallback((e: { error?: { message?: string } }) => {
    // Suppress map errors in console (e.g., font loading, style loading)
    const errorMessage = e.error?.message || ''
    console.warn('Map warning (non-critical):', errorMessage || e)
  }, [])

  // Validate coordinates - check if they are valid numbers
  const isValidLatitude =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  const isValidLongitude =
    typeof longitude === 'number' &&
    !Number.isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  const hasValidCoordinates = isValidLatitude && isValidLongitude

  // Default coordinates (center of the world map) if invalid
  const safeLatitude = isValidLatitude ? latitude : 0
  const safeLongitude = isValidLongitude ? longitude : 0
  const defaultZoom = hasValidCoordinates ? (zoom ?? 14) : 2

  return (
    <div
      style={{ width, height }}
      className='relative'
      // Prevent focus issues when inside aria-hidden elements (e.g., dialogs)
      tabIndex={-1}
      onFocus={(e) => {
        // Allow focus on map controls but prevent focus on container
        if (e.target === e.currentTarget) {
          e.currentTarget.blur()
        }
      }}
    >
      <MapGL
        mapLib={maplibregl}
        initialViewState={{
          longitude: safeLongitude,
          latitude: safeLatitude,
          zoom: defaultZoom,
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onError={handleError}
        // biome-ignore lint/suspicious/noExplicitAny: need to be any
        onClick={(e: any) => {
          if (!editable) return
          const { lng, lat } = e.lngLat || {}
          if (
            typeof lng === 'number' &&
            typeof lat === 'number' &&
            !Number.isNaN(lng) &&
            !Number.isNaN(lat)
          ) {
            onChange?.({ latitude: lat, longitude: lng })
          }
        }}
      >
        <FullscreenControl position='bottom-right' />
        {hasValidCoordinates && (
          <Marker
            longitude={longitude}
            latitude={latitude}
            draggable={editable}
            // biome-ignore lint/suspicious/noExplicitAny:  need to be any
            onDragEnd={(e: any) => {
              const { lng, lat } = e.lngLat || {}
              if (
                typeof lng === 'number' &&
                typeof lat === 'number' &&
                !Number.isNaN(lng) &&
                !Number.isNaN(lat)
              ) {
                onChange?.({ latitude: lat, longitude: lng })
              }
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#FF9900',
                  opacity: 0.4,
                  filter: 'blur(4px)',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#FF6600',
                  border: '2px solid #FFFFFF',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          </Marker>
        )}
        {!hasValidCoordinates && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            {editable
              ? 'Click on the map to set location'
              : 'Location not available'}
          </div>
        )}
      </MapGL>
    </div>
  )
}

export function DynamicLocationMap({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}) {
  return (
    <LocationMap
      latitude={latitude}
      longitude={longitude}
      width='100%'
      height='200px'
    />
  )
}
