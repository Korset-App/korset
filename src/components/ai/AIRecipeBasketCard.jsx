import { useState } from 'react'
import { AIRecipeRoleCarousel } from './AIRecipeRoleCarousel.jsx'
import { AIRecipeSummaryBar } from './AIRecipeSummaryBar.jsx'
import { SparklesIcon } from '../icons/index.js'

export function AIRecipeBasketCard({
  recipeBasket,
  storeSlug,
  lang = 'ru',
}) {
  const { recipe, matchedRoles = [], budget = null } = recipeBasket || {}

  // Initialize selected EANs map from matchedRoles preselection
  const [selectedMap, setSelectedMap] = useState(() => {
    const initial = {}
    for (const r of matchedRoles) {
      if (r.selectedEan) {
        initial[r.roleId] = r.selectedEan
      }
    }
    return initial
  })

  if (!recipe || !matchedRoles.length) return null

  const recipeTitle = recipe.title?.[lang] || recipe.title?.ru || recipe.id
  const recipeEmoji = recipe.emoji || '🍲'

  const handleSelectProduct = (roleId, ean) => {
    setSelectedMap((prev) => ({
      ...prev,
      [roleId]: ean,
    }))
  }

  // Derive selected products list for summary calculation
  const selectedProducts = matchedRoles.map((role) => {
    const selectedEan = selectedMap[role.roleId]
    return (
      role.products.find((p) => p.ean === selectedEan) ||
      role.products[0] ||
      null
    )
  })

  return (
    <div className="ai-recipe-basket" role="region" aria-label={recipeTitle}>
      <div className="ai-recipe-basket__header">
        <div className="ai-recipe-basket__title-wrap">
          <span className="ai-recipe-basket__emoji">{recipeEmoji}</span>
          <div>
            <h3 className="ai-recipe-basket__title">{recipeTitle}</h3>
            <span className="ai-recipe-basket__subtitle">
              {lang === 'kz'
                ? `${matchedRoles.length} негізгі ингредиент табылды`
                : `${matchedRoles.length} ингредиентов в наличии`}
            </span>
          </div>
        </div>
        <div className="ai-recipe-basket__badge">
          <SparklesIcon size={12} />
          <span>Körset</span>
        </div>
      </div>

      <div className="ai-recipe-basket__roles">
        {matchedRoles.map((role) => (
          <AIRecipeRoleCarousel
            key={role.roleId}
            role={role}
            selectedEan={selectedMap[role.roleId]}
            onSelectProduct={handleSelectProduct}
            storeSlug={storeSlug}
            lang={lang}
          />
        ))}
      </div>

      <AIRecipeSummaryBar
        selectedProducts={selectedProducts}
        totalRolesCount={matchedRoles.length}
        budget={budget}
        recipeTitle={recipeTitle}
        lang={lang}
      />
    </div>
  )
}
