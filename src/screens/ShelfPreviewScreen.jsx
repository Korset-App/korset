import KorsetShelf3DPreview from '../components/KorsetShelf3DPreview.jsx'

export default function ShelfPreviewScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07080D',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <KorsetShelf3DPreview height="100vh" />
    </div>
  )
}
