export const AVATAR_PRESETS = [
  { id: 'av1', background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)', skin: '#F2C7A5', body: '#E9D5FF', accent: '#22D3EE', shadow: 'rgba(109,40,217,0.35)' },
  { id: 'av2', background: 'linear-gradient(135deg, #0F766E 0%, #134E4A 100%)', skin: '#EEC3A3', body: '#CCFBF1', accent: '#F472B6', shadow: 'rgba(15,118,110,0.35)' },
  { id: 'av3', background: 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)', skin: '#8B5A3C', body: '#BFDBFE', accent: '#F59E0B', shadow: 'rgba(29,78,216,0.35)' },
  { id: 'av4', background: 'linear-gradient(135deg, #9A3412 0%, #7C2D12 100%)', skin: '#D9A070', body: '#FED7AA', accent: '#FDE047', shadow: 'rgba(154,52,18,0.35)' },
  { id: 'av5', background: 'linear-gradient(135deg, #4338CA 0%, #312E81 100%)', skin: '#E9C9AF', body: '#C7D2FE', accent: '#34D399', shadow: 'rgba(67,56,202,0.35)' },
  { id: 'av6', background: 'linear-gradient(135deg, #0369A1 0%, #164E63 100%)', skin: '#B8744E', body: '#BAE6FD', accent: '#FB7185', shadow: 'rgba(3,105,161,0.35)' },
  { id: 'av7', background: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)', skin: '#7A4A2A', body: '#FECACA', accent: '#A78BFA', shadow: 'rgba(153,27,27,0.35)' },
  { id: 'av8', background: 'linear-gradient(135deg, #BE185D 0%, #831843 100%)', skin: '#E5B18A', body: '#FBCFE8', accent: '#22D3EE', shadow: 'rgba(190,24,93,0.35)' },
  { id: 'av9', background: 'linear-gradient(135deg, #334155 0%, #0F172A 100%)', skin: '#D8A97C', body: '#E2E8F0', accent: '#F59E0B', shadow: 'rgba(51,65,85,0.35)' },
]

export function getAvatarPresetById(id) {
  return AVATAR_PRESETS.find((item) => item.id === id) || null
}
