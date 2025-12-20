import { ADDRESS_LANGUAGE } from '@/constants'
import type { ImageLocation } from '@/types'

// Nominatim API endpoint (OpenStreetMap's free geocoding service)
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/reverse'

// User-Agent is required by Nominatim usage policy
const USER_AGENT = 'CamLife/1.0 (https://github.com/your-repo/camlife)'

/**
 * Get location information using Nominatim (OpenStreetMap's free geocoding service)
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @param level Address level, defaults to 0 (not used with Nominatim, kept for compatibility)
 * @param language Language code for address, defaults to ADDRESS_LANGUAGE constant
 * @returns Promise<ImageLocation> Location information
 */
export async function getLocationFromCoordinates(
  latitude: number,
  longitude: number,
  _level = 0,
  language = ADDRESS_LANGUAGE,
): Promise<ImageLocation> {
  // Validate coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    console.warn('Invalid coordinates provided:', { latitude, longitude })
    return {}
  }

  try {
    // Build Nominatim API URL
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': language,
      zoom: '18', // Maximum detail level
    })

    const url = `${NOMINATIM_API_URL}?${params.toString()}`

    // Fetch with User-Agent header (required by Nominatim usage policy)
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      )
    }

    const data = await response.json()

    if (!data || !data.address) {
      return {}
    }

    const address = data.address
    const locationData: ImageLocation = {}

    // Extract country information
    if (address.country) {
      locationData.country = address.country
    }
    if (address.country_code) {
      locationData.countryCode = address.country_code.toUpperCase()
    }

    // Extract region/state information
    if (address.state) {
      locationData.region = address.state
    } else if (address.province) {
      locationData.region = address.province
    }

    // Extract city information
    if (address.city) {
      locationData.city = address.city
    } else if (address.town) {
      locationData.city = address.town
    } else if (address.village) {
      locationData.city = address.village
    } else if (address.municipality) {
      locationData.city = address.municipality
    }

    // Extract district/neighborhood information
    if (address.suburb) {
      locationData.district = address.suburb
    } else if (address.neighbourhood) {
      locationData.district = address.neighbourhood
    } else if (address.district) {
      locationData.district = address.district
    }

    // Build full address from display_name or address components
    if (data.display_name) {
      locationData.fullAddress = data.display_name
      locationData.placeFormatted = data.display_name
    } else {
      // Fallback: build address from components
      const addressParts: string[] = []
      if (address.house_number && address.road) {
        addressParts.push(`${address.house_number} ${address.road}`)
      } else if (address.road) {
        addressParts.push(address.road)
      }
      if (locationData.district) {
        addressParts.push(locationData.district)
      }
      if (locationData.city) {
        addressParts.push(locationData.city)
      }
      if (locationData.region) {
        addressParts.push(locationData.region)
      }
      if (locationData.country) {
        addressParts.push(locationData.country)
      }
      locationData.fullAddress = addressParts.join(', ')
      locationData.placeFormatted = locationData.fullAddress
    }

    return locationData
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    console.error('Error fetching location data from Nominatim:', errorMessage)

    return {}
  }
}
