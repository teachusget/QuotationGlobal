import { getCountries, getCountryCallingCode } from 'libphonenumber-js'

const names = new Intl.DisplayNames(['en'], { type: 'region' })
const flagAssets = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', { eager: true, query: '?url', import: 'default' })

export const countryCatalog = getCountries().map((code) => ({
  code,
  name: names.of(code),
  dialCode: `+${getCountryCallingCode(code)}`,
  flagUrl: flagAssets[`../../node_modules/flag-icons/flags/4x3/${code.toLowerCase()}.svg`],
})).sort((a, b) => a.name.localeCompare(b.name))
