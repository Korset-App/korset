import assert from 'node:assert/strict'
import test from 'node:test'
import { GOLDEN_RECIPES } from '../../src/domain/ai/recipes/goldenRecipes.js'
import {
  matchGoldenRecipe,
  extractDishCoreTokens,
  isRecipeIntent,
  saveLearnedRecipe,
  getCuratedQuickSuggestions,
} from '../../src/domain/ai/recipes/recipeRegistry.js'

test('Golden recipes registry contains core Kazakhstani dishes with valid roles', () => {
  assert.ok(GOLDEN_RECIPES.length >= 20, 'At least 20 golden recipes must exist')
  for (const recipe of GOLDEN_RECIPES) {
    assert.ok(recipe.id, 'Recipe must have an id')
    assert.ok(recipe.title?.ru, 'Recipe must have title.ru')
    assert.ok(recipe.title?.kz, 'Recipe must have title.kz')
    assert.ok(Array.isArray(recipe.roles), 'Recipe roles must be an array')
    assert.ok(recipe.roles.length >= 2, `${recipe.id} must have at least 2 roles`)

    for (const role of recipe.roles) {
      assert.ok(role.id, 'Role must have id')
      assert.ok(role.title?.ru, 'Role must have title.ru')
      assert.ok(role.title?.kz, 'Role must have title.kz')
      assert.ok(role.category, 'Role must specify target category')
      assert.ok(Array.isArray(role.queryTerms), 'Role queryTerms must be an array')
      assert.ok(role.queryTerms.length > 0, `${role.id} must specify search query terms`)
    }
  }
})

test('matchGoldenRecipe matches dish queries flexibly by Russian and Kazakh aliases', () => {
  const burger = matchGoldenRecipe('хочу приготовить домашний бургер')
  assert.ok(burger, 'Should find burger')
  assert.equal(burger.id, 'burger')

  const plov = matchGoldenRecipe('плов на костре')
  assert.ok(plov, 'Should find plov')
  assert.equal(plov.id, 'plov')

  const besh = matchGoldenRecipe('бешбармак')
  assert.ok(besh, 'Should find beshbarmak')
  assert.equal(besh.id, 'beshbarmak')

  const manti = matchGoldenRecipe('манты с тыквой и мясом')
  assert.ok(manti, 'Should find manti')
  assert.equal(manti.id, 'manty')

  const nonExistent = matchGoldenRecipe('марсианский суп с космодрома')
  assert.equal(nonExistent, null, 'Should return null for unknown dish')
})

test('isRecipeIntent accurately detects recipe and shopping list intentions', () => {
  assert.equal(isRecipeIntent('собери продукты для плова'), true)
  assert.equal(isRecipeIntent('ингредиенты на пиццу'), true)
  assert.equal(isRecipeIntent('что нужно для борща'), true)
  assert.equal(isRecipeIntent('рецепт карбонары'), true)
  assert.equal(isRecipeIntent('где найти молоко?'), false)
  assert.equal(isRecipeIntent('какой сегодня курс тенге'), false)
})

test('extractDishCoreTokens removes noise words and extracts clean dish core', () => {
  assert.equal(extractDishCoreTokens('собери продукты для плова'), 'плова')
  assert.equal(extractDishCoreTokens('ингредиенты на пиццу пепперони'), 'пиццу пепперони')
  assert.equal(extractDishCoreTokens('что нужно для борща'), 'борща')
})

test('saveLearnedRecipe caches dynamically decomposed recipes in memory/storage', () => {
  const dynamicRecipe = {
    id: 'ramen',
    title: { ru: 'Рамен', kz: 'Рамен' },
    roles: [
      {
        id: 'noodles',
        title: { ru: 'Лапша рамен', kz: 'Рамен кеспесі' },
        category: 'grocery',
        queryTerms: ['лапша рамен'],
      },
      {
        id: 'broth',
        title: { ru: 'Бульон', kz: 'Сорпа' },
        category: 'grocery',
        queryTerms: ['бульон'],
      },
    ],
  }

  saveLearnedRecipe(dynamicRecipe)
  const matched = matchGoldenRecipe('рамен')
  assert.ok(matched, 'Should retrieve dynamically learned recipe')
  assert.equal(matched.id, 'ramen')
})

test('getCuratedQuickSuggestions returns top 3 suggestions', () => {
  const suggestionsRu = getCuratedQuickSuggestions('ru')
  assert.equal(suggestionsRu.length, 3)
  assert.ok(suggestionsRu.some((s) => s.id === 'burger'))
  assert.ok(suggestionsRu.some((s) => s.id === 'plov'))

  const suggestionsKz = getCuratedQuickSuggestions('kz')
  assert.equal(suggestionsKz.length, 3)
  assert.ok(suggestionsKz.some((s) => s.id === 'burger'))
})
