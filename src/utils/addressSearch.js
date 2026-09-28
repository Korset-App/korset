export async function searchKzAddresses(query, signal) {
  const trimmed = String(query || '').trim()
  if (trimmed.length < 2) return []

  try {
    const fullQuery = trimmed.toLowerCase().includes('казахстан')
      ? trimmed
      : `${trimmed}, Казахстан`

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        fullQuery
      )}&format=json&addressdetails=1&limit=6&countrycodes=kz&accept-language=ru`,
      { signal }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map((item) => {
      const road = item.address?.road || item.address?.street || item.name || ''
      const house = item.address?.house_number || ''
      const suburb = item.address?.suburb || ''
      const city =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.state ||
        'Казахстан'

      const shortAddress =
        [road, house].filter(Boolean).join(', ') || item.display_name.split(',')[0]
      const fullSubtitle = [suburb, city].filter(Boolean).join(', ')

      return {
        id: item.place_id,
        shortAddress,
        fullSubtitle,
        displayName: item.display_name,
        lat: Number(item.lat),
        lon: Number(item.lon),
      }
    })
  } catch (err) {
    if (err.name === 'AbortError') return []
    console.warn('Address search error:', err)
    return []
  }
}
