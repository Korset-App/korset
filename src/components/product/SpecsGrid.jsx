import { useI18n } from '../../i18n/index.js'
import { formatPrice } from '../../utils/fitCheck.js'
import { buildProductCharacteristicSpecs } from '../../domain/product/productSpecs.js'
import { buildProductUnitPrice } from '../../domain/product/unitPrice.js'

export default function SpecsGrid({ product }) {
  const { lang, t } = useI18n()
  const specs = buildProductCharacteristicSpecs(product, { lang }).map((spec) => ({
    ...spec,
    label: t(spec.labelKey),
  }))

  const perUnit = buildProductUnitPrice(product)
  const priceSpecs = []
  if (perUnit) {
    if (perUnit.kind === 'per100') {
      priceSpecs.push({
        label: `${t('product.pricePer')} ${perUnit.suffix}`,
        value: formatPrice(perUnit.value),
      })
    }
    if (perUnit.kind === 'perUnit') {
      priceSpecs.push({
        label: `${t('product.pricePer')} ${perUnit.suffix}`,
        value: formatPrice(perUnit.value),
      })
    }
  }
  const priceInsertAt =
    specs.findLastIndex((spec) => spec.key === 'storage' || spec.key === 'bestBefore') + 1
  specs.splice(priceInsertAt, 0, ...priceSpecs)

  if (specs.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {specs.map((spec, i) => (
        <div
          key={i}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--glass-subtle)',
            border: '1px solid var(--line-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {spec.label}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text)',
              textAlign: 'right',
              lineHeight: 1.3,
            }}
          >
            {spec.value}
          </div>
        </div>
      ))}
    </div>
  )
}
