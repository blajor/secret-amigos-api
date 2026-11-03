const SUPPORTED_LANGUAGES = new Set(['en', 'es', 'fr']);

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

function resolveLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : 'en';
}

function normalizeEventLanguage(event) {
  return { ...event, language: resolveLanguage(event.language) };
}

function formatEventDetails(event, language) {
  const resolvedLanguage = resolveLanguage(language);
  const amount = event.amount || {};
  const minimum = amount.min || '';
  const maximum = amount.max || '';
  let amountTxt = '';

  if (minimum || maximum) {
    if (resolvedLanguage === 'fr') {
      amountTxt = 'Budget cadeau : ';
      if (minimum && maximum) amountTxt += 'entre ' + minimum + ' et ' + maximum;
      else if (minimum) amountTxt += 'au moins ' + minimum;
      else amountTxt += 'jusqu’à ' + maximum;
    } else if (resolvedLanguage === 'es') {
      amountTxt = 'El precio sugerido del regalo es ';
      if (minimum && maximum) amountTxt += 'entre ' + minimum + ' y ' + maximum;
      else if (minimum) amountTxt += 'mínimo de ' + minimum;
      else amountTxt += 'máximo de ' + maximum;
    } else {
      amountTxt = 'The suggested gift price is ';
      if (minimum && maximum) amountTxt += 'between ' + minimum + ' and ' + maximum;
      else if (minimum) amountTxt += 'minimum ' + minimum;
      else amountTxt += 'maximum ' + maximum;
    }
  }

  let datetime = '';
  if (typeof event.datetime === 'string' && event.datetime.length >= 10) {
    const monthIndex = Number(event.datetime.slice(5, 7)) - 1;
    const day = event.datetime.slice(8, 10);
    const year = event.datetime.slice(0, 4);
    if (monthIndex >= 0 && monthIndex < 12) {
      if (resolvedLanguage === 'fr') {
        datetime = 'le ' + Number(day) + ' ' + MONTHS_FR[monthIndex] + ' ' + year;
      } else if (resolvedLanguage === 'es') {
        datetime = 'el ' + MONTHS_ES[monthIndex] + ' ' + day + ', ' + year;
      } else {
        datetime = 'on ' + MONTHS_EN[monthIndex] + ' ' + day + ', ' + year;
      }
    }
  }

  let location = '';
  if (event.location) {
    if (resolvedLanguage === 'fr') location = 'Lieu : ' + event.location;
    else if (resolvedLanguage === 'es') location = 'Ubicación: ' + event.location;
    else location = 'Location: ' + event.location;
  }

  return { datetime, amountTxt, location };
}

module.exports = {
  formatEventDetails,
  normalizeEventLanguage,
  resolveLanguage
};
