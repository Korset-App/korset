import { Link } from 'react-router-dom'
import { CheckCircleIcon, ArrowForwardIcon, InventoryIcon } from '../icons/index.js'
import { buildProductPath, buildCatalogPath } from '../../utils/routes.js'

function formatPrice(val) {
  const num = Number(val)
  return Number.isFinite(num) && num > 0 ? `${new Intl.NumberFormat('ru-KZ').format(num)} ₸` : ''
}

export function AIRecipeRoleCarousel({
  role,
  selectedEan,
  onSelectProduct,
  storeSlug,
  lang = 'ru',
}) {
  const roleTitle = role.title?.[lang] || role.title?.ru || role.id
  const products = role.products || []

  return (
    <div className="ai-recipe-role">
      <div className="ai-recipe-role__head">
        <div className="ai-recipe-role__title-wrap">
          <span className="ai-recipe-role__title">{roleTitle}</span>
          {role.required && (
            <span className="ai-recipe-role__req-badge">
              {lang === 'kz' ? 'Негізгі' : 'Основа'}
            </span>
          )}
        </div>
        <span className="ai-recipe-role__count">
          {lang === 'kz'
            ? `${products.length} нұсқа`
            : `${products.length} вар.`}
        </span>
      </div>

      <div className="ai-recipe-role__carousel" role="list">
        {products.map((product) => {
          const isSelected = product.ean === selectedEan
          return (
            <div
              key={product.ean}
              role="listitem"
              className={`ai-recipe-card${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelectProduct(role.roleId, product.ean)}
            >
              <div className="ai-recipe-card__img-box">
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    className="product-img-blend ai-recipe-card__img"
                    loading="lazy"
                  />
                ) : (
                  <InventoryIcon size={24} color="var(--text-disabled)" />
                )}
                {isSelected && (
                  <span className="ai-recipe-card__selected-badge" title={lang === 'kz' ? 'Таңдалды' : 'Выбрано'}>
                    <CheckCircleIcon size={14} />
                  </span>
                )}
              </div>

              <div className="ai-recipe-card__body">
                <div className="ai-recipe-card__price">{formatPrice(product.priceKzt)}</div>
                <div className="ai-recipe-card__name" title={product.name}>
                  {product.name}
                </div>
                {product.brand && (
                  <div className="ai-recipe-card__brand">{product.brand}</div>
                )}
              </div>

              <div className="ai-recipe-card__footer">
                <button
                  type="button"
                  className={`ai-recipe-card__action-btn${isSelected ? ' is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectProduct(role.roleId, product.ean)
                  }}
                >
                  {isSelected
                    ? lang === 'kz' ? 'Таңдалды ✓' : 'Выбрано ✓'
                    : lang === 'kz' ? 'Таңдау' : 'Выбрать'}
                </button>
                <Link
                  to={buildProductPath(storeSlug, product.ean)}
                  onClick={(e) => e.stopPropagation()}
                  className="ai-recipe-card__details-link"
                  title={lang === 'kz' ? 'Карточканы ашу' : 'Открыть карточку'}
                >
                  <ArrowForwardIcon size={12} />
                </Link>
              </div>
            </div>
          )
        })}

        {role.hasMore && (
          <Link
            to={buildCatalogPath(storeSlug, { category: role.category })}
            className="ai-recipe-card ai-recipe-card--more"
          >
            <span className="ai-recipe-card__more-icon">
              <ArrowForwardIcon size={18} />
            </span>
            <span className="ai-recipe-card__more-text">
              {lang === 'kz' ? 'Барлық нұсқалар →' : 'Все варианты →'}
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
