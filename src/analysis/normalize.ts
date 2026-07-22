/**
 * Merchant description normalization: raw statement text -> stable
 * merchant_key. Pure module, no DB/UI imports.
 *
 * Built against real İş Bankası descriptions, e.g.:
 *   "SPOTİFY P3EB0DDF0D STOCKHOLM SE"  -> "SPOTIFY STOCKHOLM"
 *   "TRENDYOL YEMEK ?STANBUL TR"       -> "TRENDYOL YEMEK"
 *   "6905 ANKARA CANKAYA ODT ANKARA TR"-> "CANKAYA ODT"  (leading terminal id,
 *                                          trailing city+country stripped)
 * The per-charge reference hashes (Spotify, Airbnb…) MUST be stripped or one
 * subscription fragments into many merchant keys and recurrence detection
 * misses it.
 */
import { foldTurkish } from '@/parsers/turkish';

/** 81 province names (folded) + common district/city tokens seen on POS rows. */
const CITY_TOKENS = new Set(
  (
    'ADANA ADIYAMAN AFYONKARAHISAR AGRI AMASYA ANKARA ANTALYA ARTVIN AYDIN BALIKESIR ' +
    'BILECIK BINGOL BITLIS BOLU BURDUR BURSA CANAKKALE CANKIRI CORUM DENIZLI ' +
    'DIYARBAKIR EDIRNE ELAZIG ERZINCAN ERZURUM ESKISEHIR GAZIANTEP GIRESUN GUMUSHANE ' +
    'HAKKARI HATAY ISPARTA MERSIN ISTANBUL IZMIR KARS KASTAMONU KAYSERI KIRKLARELI ' +
    'KIRSEHIR KOCAELI KONYA KUTAHYA MALATYA MANISA KAHRAMANMARAS MARDIN MUGLA MUS ' +
    'NEVSEHIR NIGDE ORDU RIZE SAKARYA SAMSUN SIIRT SINOP SIVAS TEKIRDAG TOKAT ' +
    'TRABZON TUNCELI SANLIURFA USAK VAN YOZGAT ZONGULDAK AKSARAY BAYBURT KARAMAN ' +
    'KIRIKKALE BATMAN SIRNAK BARTIN ARDAHAN IGDIR YALOVA KARABUK KILIS OSMANIYE DUZCE ' +
    // frequent districts on POS descriptors
    'KADIKOY BESIKTAS SISLI USKUDAR ATASEHIR MALTEPE KARTAL PENDIK BAKIRKOY BEYOGLU ' +
    'SARIYER UMRANIYE BEYLIKDUZU ESENYURT FATIH KAGITHANE TUZLA CANKAYA KECIOREN ' +
    'YENIMAHALLE ETIMESGUT MAMAK KONAK BORNOVA KARSIYAKA BUCA NILUFER OSMANGAZI ' +
    'YILDIRIM MURATPASA KEPEZ KONYAALTI YUREGIR SEYHAN'
  ).split(' '),
);

const COUNTRY_TOKENS = new Set(
  (
    'TR TUR TU TURKIYE TURKEY IE IRL SE SWE GB GBR UK US USA TXUS NL NLD DE DEU ' +
    'LU LUX EU SG SGP FR FRA ES ESP IT ITA CH CHE AT AUT'
  ).split(' '),
);

/** Legal-form suffixes worth dropping from the tail. */
const LEGAL_TOKENS = new Set(['LTD', 'STI', 'AS', 'SAN', 'TIC', 'VE', 'STI.']);

function isPureDigits(token: string): boolean {
  return /^\d+$/.test(token);
}

/** Reference hashes: 6+ alphanumerics containing at least one digit. */
function isReferenceToken(token: string): boolean {
  return token.length >= 6 && /\d/.test(token) && /^[A-Z0-9]+$/.test(token);
}

/** Store/terminal numbers: 2+ digits with an optional short letter tail.
 *  A single digit is usually part of the name ("KAFE 9"). */
function isStoreNumber(token: string): boolean {
  return /^\d{2,}[A-Z]{0,2}$/.test(token);
}

export function normalizeMerchant(rawDescription: string): string {
  // '?' shows up where the PDF font lost a Turkish İ ("?STANBUL").
  const folded = foldTurkish(rawDescription.replace(/\?/g, 'I'));

  // Punctuation -> space, collapse.
  let tokens = folded
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  if (tokens.length === 0) return '';

  // Strip reference hashes and long digit runs anywhere.
  const cleaned = tokens.filter(
    (t) => !isReferenceToken(t) && !(isPureDigits(t) && t.length >= 3),
  );
  if (cleaned.length > 0) tokens = cleaned;

  // Leading terminal ids ("6905 ANKARA CANKAYA ODT").
  while (tokens.length > 1 && isPureDigits(tokens[0])) tokens.shift();

  // Trailing countries, cities, store numbers, legal suffixes — repeatedly.
  let changed = true;
  while (changed && tokens.length > 1) {
    changed = false;
    const last = tokens[tokens.length - 1];
    if (
      COUNTRY_TOKENS.has(last) ||
      CITY_TOKENS.has(last) ||
      LEGAL_TOKENS.has(last) ||
      isStoreNumber(last)
    ) {
      tokens.pop();
      changed = true;
    }
  }

  // tokens is non-empty here (the strip loops always leave at least one).
  return tokens.join(' ').trim();
}
