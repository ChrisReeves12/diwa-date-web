// Countries that require postal codes based on UPS and common shipping standards
const COUNTRIES_REQUIRING_POSTAL_CODES = [
    'AD', 'AR', 'AU', 'AT', 'AZ', 'BD', 'BY', 'BE', 'BA', 'BR', 'BG', 'CA', 'CL', 'CN', 'CO', 'CR', 'HR', 'CY', 'CZ', 'DK', 'DO', 'EC', 'EE', 'FI', 'FR', 'GE', 'DE', 'GR', 'GL', 'GT', 'HU', 'IS', 'IN', 'ID', 'IR', 'IE', 'IL', 'IT', 'JP', 'KZ', 'KR', 'KG', 'LV', 'LI', 'LT', 'LU', 'MK', 'MY', 'MV', 'MT', 'MH', 'MX', 'MD', 'MC', 'MN', 'ME', 'MA', 'NL', 'NZ', 'NO', 'PK', 'PW', 'PE', 'PH', 'PL', 'PT', 'RO', 'RU', 'SM', 'SA', 'RS', 'SG', 'SK', 'SI', 'ZA', 'ES', 'LK', 'SE', 'CH', 'TH', 'TN', 'TR', 'TM', 'UA', 'GB', 'US', 'UY', 'UZ', 'VE', 'VN'
];

/**
 * Check if a country requires a postal code
 * @param countryCode - The ISO 2-letter country code
 * @returns true if postal code is required, false otherwise
 */
export function isPostalCodeRequired(countryCode: string): boolean {
    return COUNTRIES_REQUIRING_POSTAL_CODES.includes(countryCode.toUpperCase());
}