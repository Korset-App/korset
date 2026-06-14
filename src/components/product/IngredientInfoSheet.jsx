import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import './IngredientInfoSheet.css'

const IconAI = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.99996C12.8632 1.99996 13.701 2.10973 14.5 2.31539L14 4.25192C13.3608 4.0874 12.6906 3.99997 12 3.99997C7.58174 3.99997 4.00002 7.58172 4 12C4 13.3344 4.3255 14.6174 4.93945 15.7656L5.28906 16.4189L4.63379 19.3662L7.58105 18.7109L8.23438 19.0605C9.38255 19.6745 10.6656 20 12 20C16.4183 20 20 16.4183 20 12C20 11.6771 19.9805 11.3587 19.9434 11.0459L21.9297 10.8095C21.976 11.1999 22 11.5972 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.69425 21.5746 7.29102 20.8242L2 22L3.17578 16.709C2.42541 15.3057 2 13.7025 2 12C2.00002 6.47714 6.47717 1.99996 12 1.99996ZM19.5293 1.3193C19.7058 0.893513 20.2942 0.8935 20.4707 1.3193L20.7236 1.93063C21.1555 2.97343 21.9615 3.80614 22.9746 4.2568L23.6914 4.57614C24.1022 4.75882 24.1022 5.35635 23.6914 5.53903L22.9326 5.87692C21.945 6.3162 21.1534 7.11943 20.7139 8.1279L20.4668 8.69333C20.2863 9.10747 19.7136 9.10747 19.5332 8.69333L19.2861 8.1279C18.8466 7.11942 18.0551 6.3162 17.0674 5.87692L16.3076 5.53903C15.8974 5.35618 15.8974 4.75895 16.3076 4.57614L17.0254 4.2568C18.0384 3.80614 18.8445 2.97343 19.2764 1.93063L19.5293 1.3193Z" />
  </svg>
)

const IconGoogle = (
  <svg width="18" height="18" viewBox="0 0 72 72" fill="currentColor">
    <path d="M28.131 10.632c-6.262 0-12.141 3.348-15.342 8.738-.282.474-.126 1.089.349 1.37.16.096.336.141.51.141.342 0 .674-.174.861-.489 2.843-4.786 8.062-7.76 13.622-7.76.553 0 1-.447 1-1 0-.553-.447-1-1-1zM11.967 23.646a1 1 0 00-1.201.746c-.299 1.276-.468 2.067-.468 3.487 0 .553.448 1 1 1s1-.447 1-1c0-1.205.135-1.834.415-3.032a1 1 0 00-.746-1.201zM66.613 57.793L50.471 41.652a13.5 13.5 0 00-1.17-.877 24.46 24.46 0 003.33-12.311c0-13.51-10.99-24.5-24.5-24.5S3.631 14.954 3.631 28.464s10.991 24.5 24.5 24.5c4.81 0 9.296-1.399 13.084-3.801.205.339.462.666.77.974l16.142 16.143a5.99 5.99 0 004.244 1.756 5.99 5.99 0 004.243-1.756 5.99 5.99 0 001.756-4.242 5.99 5.99 0 00-1.756-4.244zM7.631 28.465c0-11.304 9.196-20.5 20.5-20.5s20.5 9.196 20.5 20.5-9.197 20.5-20.5 20.5-20.5-9.196-20.5-20.5zm56.153 34.986a2 2 0 01-2.83 0L44.813 47.309c-.14-.139-.192-.232-.199-.232.003-.043.058-.455 1.201-1.596 1.14-1.143 1.552-1.195 1.565-1.203.026.008.119.06.263.203l16.14 16.141a2 2 0 010 2.829z" />
  </svg>
)

export default function IngredientInfoSheet({ item, onClose, onAskAI, lang }) {
  useEffect(() => {
    if (!item) return undefined
    document.body.classList.add('ingredient-sheet-open')
    return () => document.body.classList.remove('ingredient-sheet-open')
  }, [item])

  const searchQuery =
    lang === 'kz'
      ? `${item?.label || ''} ингредиент деген не`
      : `${item?.label || ''} ингредиент что это`

  const handleGoogleSearch = () => {
    if (!item) return
    const query = encodeURIComponent(searchQuery)
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener')
  }

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          className="ingredient-sheet"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`ingredient-sheet__panel ingredient-sheet__panel--${item.tone}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredient-sheet-title"
            initial={{ y: '15%' }}
            animate={{ y: 0 }}
            exit={{ y: '15%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.y > 80 || velocity.y > 400) onClose()
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ingredient-sheet__handle" />
            <div className="ingredient-sheet__topline">
              <span className={`ingredient-sheet__badge ingredient-sheet__badge--${item.tone}`}>
                {item.kindLabel}
              </span>
              <button type="button" className="ingredient-sheet__close" onClick={onClose}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <h2 id="ingredient-sheet-title" className="ingredient-sheet__title">
              {item.label}
            </h2>

            <p className="ingredient-sheet__reason">{item.reason}</p>
            {item.description && item.description !== item.reason && (
              <p className="ingredient-sheet__description">{item.description}</p>
            )}

            <div className="ingredient-sheet__actions">
              <button type="button" className="ingredient-sheet__ai" onClick={() => onAskAI(item)}>
                {IconAI}
                {item.askAiLabel}
              </button>
              <button
                type="button"
                className="ingredient-sheet__google"
                onClick={handleGoogleSearch}
              >
                {IconGoogle}
                {item.searchGoogleLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
