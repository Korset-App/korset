export function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template
  return template.replace(/\{\{?(\w+)\}?\}/g, (_, k) => {
    const v = vars[k]
    return v != null ? String(v) : `{${k}}`
  })
}
