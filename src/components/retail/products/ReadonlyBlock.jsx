import { useI18n } from '../../../i18n/index.js'
import { getImageUrl } from '../../../utils/imageUrl.js'
import { getCategoryLabel } from '../../../domain/product/categoryMap.js'
import { buildProductPath } from '../../../utils/routes.js'
import { InventoryIcon, ArrowForwardIcon } from '../../icons/index.js'

export default function ReadonlyBlock({ product, p, storeSlug }) {
  const { lang } = useI18n()
  const gp = product.global_products
  if (!gp) return null

  return (
    <div
      style={{
        background: 'var(--glass-subtle)',
        borderRadius: 12,
        padding: 14,
        border: '1px solid var(--line-soft)',
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <div
          className="catalog-img-box"
          style={{
            width: 64,
            height: 64,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {gp.image_url ? (
            <img
              src={getImageUrl(gp.image_url)}
              alt=""
              className="product-img-blend"
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
            />
          ) : (
            <InventoryIcon size={28} color="var(--text-dim)" />
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            justifyContent: 'center',
          }}
        >
          {gp.brand && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.brandLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{gp.brand}</span>
            </div>
          )}
          {gp.category && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.categoryLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>
                {getCategoryLabel(gp.category, lang) || gp.category}
              </span>
            </div>
          )}
          {gp.quantity && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>
                {p.quantityLabel}:
              </span>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{gp.quantity}</span>
            </div>
          )}
        </div>
      </div>

      {storeSlug && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <a
            href={buildProductPath(storeSlug, product.ean)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: '#38BDF8',
              textDecoration: 'none',
              background: 'rgba(56,189,248,0.07)',
              border: '1px solid rgba(56,189,248,0.18)',
              borderRadius: 8,
              padding: '5px 11px',
            }}
          >
            <ArrowForwardIcon size={13} />
            {p.openCard}
          </a>
        </div>
      )}
    </div>
  )
}
