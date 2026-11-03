function getEventLanguageStats(languageCounts = {}) {
  return {
    eventsEs: languageCounts.es ?? 0,
    eventsEn: languageCounts.en ?? 0,
    eventsFr: languageCounts.fr ?? 0
  };
}

module.exports = { getEventLanguageStats };
