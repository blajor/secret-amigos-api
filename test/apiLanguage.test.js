const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Handlebars = require('handlebars');
const { validationResult } = require('express-validator');

const { formatEventDetails, normalizeEventLanguage, resolveLanguage } = require('../utils/localization');
const { getEventLanguageStats } = require('../utils/dashboardStats');
const { registerLanguageRoutes } = require('../src/routes/languageRoutes');
const { resultsValidation } = require('../src/validators/results');

const root = path.join(__dirname, '..');

test('resolves only en, es, fr, and pt and stores the resolved event language', () => {
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('es'), 'es');
  assert.equal(resolveLanguage('fr'), 'fr');
  assert.equal(resolveLanguage('pt'), 'pt');
  assert.equal(resolveLanguage('fr-FR'), 'en');
  assert.equal(resolveLanguage('pt-BR'), 'en');
  assert.equal(resolveLanguage(''), 'en');

  const event = { language: 'fr-FR', name: 'Échange' };
  const normalized = normalizeEventLanguage(event);
  assert.equal(normalized.language, 'en');
  assert.equal(event.language, 'fr-FR');
  assert.equal(normalizeEventLanguage({ language: 'pt' }).language, 'pt');
});

test('formats French date, gift budget, and location', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Paris'
  }, 'fr');

  assert.deepEqual(details, {
    datetime: 'le 24 décembre 2026',
    amountTxt: 'Budget cadeau : entre 20 € et 40 €',
    location: 'Lieu : Paris'
  });
  assert.equal(formatEventDetails({ amount: { min: '15 €' } }, 'fr').amountTxt,
    'Budget cadeau : au moins 15 €');
  assert.equal(formatEventDetails({ amount: { max: '50 €' } }, 'fr').amountTxt,
    'Budget cadeau : jusqu’à 50 €');
});

test('formats Brazilian Portuguese date, gift budget, and location', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: 'R$ 20', max: 'R$ 40' },
    location: 'São Paulo'
  }, 'pt');

  assert.deepEqual(details, {
    datetime: '24 de dezembro de 2026',
    amountTxt: 'Sugestão de valor para o presente: de R$ 20 a R$ 40',
    location: 'Local: São Paulo'
  });
  assert.equal(formatEventDetails({ amount: { min: 'R$ 15' } }, 'pt').amountTxt,
    'Sugestão de valor para o presente: a partir de R$ 15');
  assert.equal(formatEventDetails({ amount: { max: 'R$ 50' } }, 'pt').amountTxt,
    'Sugestão de valor para o presente: até R$ 50');
});

test('keeps existing English and Spanish event formatting', () => {
  const event = {
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20', max: '40' },
    location: 'Madrid'
  };
  assert.deepEqual(formatEventDetails(event, 'en'), {
    datetime: 'on December 24, 2026',
    amountTxt: 'The suggested gift price is between 20 and 40',
    location: 'Location: Madrid'
  });
  assert.deepEqual(formatEventDetails(event, 'es'), {
    datetime: 'el Diciembre 24, 2026',
    amountTxt: 'El precio sugerido del regalo es entre 20 y 40',
    location: 'Ubicación: Madrid'
  });
});

test('French mail templates render event details and French action links', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Paris'
  }, 'fr');
  const values = {
    toname: 'Camille',
    eventname: 'Échange de cadeaux',
    datetime: details.datetime,
    location: details.location,
    friendname: 'Alex',
    friendsurname: 'Martin',
    amountTxt: details.amountTxt,
    custommessage: 'À bientôt !',
    serverurl: 'https://example.test',
    token: 'token-123'
  };

  for (const file of ['mail_fr.html', 'text_fr.txt']) {
    const source = fs.readFileSync(path.join(root, 'templates/views', file), 'utf8');
    const rendered = Handlebars.compile(source)(values);
    assert.ok(rendered.includes('Échange de cadeaux'));
    assert.ok(rendered.includes('le 24 décembre 2026'));
    assert.ok(rendered.includes('Lieu : Paris'));
    assert.ok(rendered.includes('20 € et 40 €'));
    assert.ok(rendered.includes('fr/confirm/token-123'));
    assert.ok(rendered.includes('fr/unsubscribe/token-123'));
  }
});

test('French confirmation and unsubscribe pages render and language links exist on all pages', () => {
  const values = {
    eventname: 'Échange de cadeaux',
    datetime: 'le 24 décembre 2026',
    location: 'Lieu : Paris',
    friendname: 'Alex',
    friendsurname: 'Martin',
    amountTxt: 'Budget cadeau : entre 20 € et 40 €',
    custommessage: 'À bientôt !',
    serverurl: 'https://example.test',
    token: 'token-123'
  };

  const confirmSource = fs.readFileSync(path.join(root, 'templates/views/conf_fr.html'), 'utf8');
  const confirmation = Handlebars.compile(confirmSource)(values);
  assert.ok(confirmation.includes('<html lang="fr">'));
  assert.ok(confirmation.includes('English'));
  assert.ok(confirmation.includes('Español'));
  assert.ok(confirmation.includes('Français'));
  assert.ok(confirmation.includes('Português'));
  assert.ok(confirmation.includes('pt/confirm/token-123'));
  assert.ok(confirmation.includes('en/confirm/token-123'));
  assert.ok(confirmation.includes('es/confirm/token-123'));
  assert.ok(confirmation.includes('Échange de cadeaux'));
  assert.ok(confirmation.includes('le 24 décembre 2026'));
  assert.ok(confirmation.includes('Lieu : Paris'));
  assert.ok(confirmation.includes('entre 20 € et 40 €'));

  const unsubscribeSource = fs.readFileSync(path.join(root, 'templates/views/unsub_fr.html'), 'utf8');
  const unsubscribe = Handlebars.compile(unsubscribeSource)(values);
  assert.ok(unsubscribe.includes('<html lang="fr">'));
  assert.ok(unsubscribe.includes('English'));
  assert.ok(unsubscribe.includes('Español'));
  assert.ok(unsubscribe.includes('Français'));
  assert.ok(unsubscribe.includes('Português'));
  assert.ok(unsubscribe.includes('pt/unsubscribe/token-123'));
  assert.ok(unsubscribe.includes('en/unsubscribe/token-123'));
  assert.ok(unsubscribe.includes('es/unsubscribe/token-123'));
  assert.ok(unsubscribe.includes('fr/confirm/token-123'));
  assert.ok(unsubscribe.includes('Échange de cadeaux'));
  assert.ok(unsubscribe.includes('Votre désinscription de l’événement'));

  for (const file of ['conf_en.html', 'conf_es.html', 'conf_fr.html', 'unsub_en.html', 'unsub_es.html', 'unsub_fr.html']) {
    const source = fs.readFileSync(path.join(root, 'templates/views', file), 'utf8');
    assert.ok(source.includes('Português'));
    assert.ok(source.includes('/pt/'));
  }
});

test('Portuguese mail templates render Brazilian event details and action links', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: 'R$ 20', max: 'R$ 40' },
    location: 'São Paulo'
  }, 'pt');
  const values = {
    toname: 'Camila',
    eventname: 'Amigo secreto da família',
    datetime: details.datetime,
    location: details.location,
    friendname: 'Alex',
    friendsurname: 'Silva',
    amountTxt: details.amountTxt,
    custommessage: 'Nos vemos em breve!',
    serverurl: 'https://example.test',
    token: 'token-123'
  };

  for (const file of ['mail_pt.html', 'text_pt.txt']) {
    const source = fs.readFileSync(path.join(root, 'templates/views', file), 'utf8');
    const rendered = Handlebars.compile(source)(values);
    assert.ok(rendered.includes('Amigo secreto da família'));
    assert.ok(rendered.includes('24 de dezembro de 2026'));
    assert.ok(rendered.includes('Local: São Paulo'));
    assert.ok(rendered.includes('de R$ 20 a R$ 40'));
    assert.ok(rendered.includes('pt/confirm/token-123'));
    assert.ok(rendered.includes('pt/unsubscribe/token-123'));
  }
});

test('Portuguese confirmation and unsubscribe pages render and offer every language', () => {
  const values = {
    eventname: 'Amigo secreto da família',
    datetime: '24 de dezembro de 2026',
    location: 'Local: São Paulo',
    friendname: 'Alex',
    friendsurname: 'Silva',
    amountTxt: 'Sugestão de valor para o presente: de R$ 20 a R$ 40',
    custommessage: 'Nos vemos em breve!',
    serverurl: 'https://example.test',
    token: 'token-123'
  };
  const confirmation = Handlebars.compile(fs.readFileSync(path.join(root, 'templates/views/conf_pt.html'), 'utf8'))(values);
  assert.ok(confirmation.includes('<html lang="pt">'));
  assert.ok(confirmation.includes('Amigo secreto da família'));
  assert.ok(confirmation.includes('24 de dezembro de 2026'));
  assert.ok(confirmation.includes('Local: São Paulo'));
  assert.ok(confirmation.includes('de R$ 20 a R$ 40'));
  for (const language of ['en', 'es', 'fr', 'pt']) {
    assert.ok(confirmation.includes('/' + language + '/confirm/token-123'));
  }

  const unsubscribe = Handlebars.compile(fs.readFileSync(path.join(root, 'templates/views/unsub_pt.html'), 'utf8'))(values);
  assert.ok(unsubscribe.includes('<html lang="pt">'));
  assert.ok(unsubscribe.includes('Sua participação no evento'));
  assert.ok(unsubscribe.includes('pt/confirm/token-123'));
  for (const language of ['en', 'es', 'fr', 'pt']) {
    assert.ok(unsubscribe.includes('/' + language + '/unsubscribe/token-123'));
  }
});

test('English, Spanish, and French routes remain available with Portuguese routes', async (t) => {
  const app = express();
  const routed = [];
  registerLanguageRoutes(app, {
    getQueryData(token, callback) {
      callback(null, { token });
    },
    confirmParticipant(query, language, ip, callback) {
      routed.push(['confirm', language, query.token]);
      callback(null, '<html lang="' + language + '">confirmed</html>');
    },
    unsubscribeParticipant(query, language, ip, callback) {
      routed.push(['unsubscribe', language, query.token]);
      callback(null, '<html lang="' + language + '">unsubscribed</html>');
    }
  });

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const base = 'http://127.0.0.1:' + server.address().port;

  for (const language of ['en', 'es', 'fr', 'pt']) {
    const confirm = await fetch(base + '/' + language + '/confirm/test-token');
    assert.equal(confirm.status, 200);
    assert.match(await confirm.text(), new RegExp('<html lang="' + language + '">confirmed'));

    const unsubscribe = await fetch(base + '/' + language + '/unsubscribe/test-token');
    assert.equal(unsubscribe.status, 200);
    assert.match(await unsubscribe.text(), new RegExp('<html lang="' + language + '">unsubscribed'));
  }
  assert.equal(routed.length, 8);
  assert.deepEqual(routed.filter(([kind]) => kind === 'confirm').map(([, language]) => language), ['en', 'es', 'fr', 'pt']);
});

test('missing language remains a 400 response while supported languages validate', async (t) => {
  const app = express();
  app.use(express.json());
  app.post('/api/results', resultsValidation, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    res.sendStatus(204);
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const body = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Event',
    language: '',
    sendemails: true,
    participants: [
      { id: '22222222-2222-4222-8222-222222222222', name: 'A', email: 'a@example.com', sendemail: true, friendid: '33333333-3333-4333-8333-333333333333' },
      { id: '33333333-3333-4333-8333-333333333333', name: 'B', email: 'b@example.com', sendemail: true, friendid: '44444444-4444-4444-8444-444444444444' },
      { id: '44444444-4444-4444-8444-444444444444', name: 'C', email: 'c@example.com', sendemail: true, friendid: '11111111-1111-4111-8111-111111111111' }
    ]
  };
  const missing = await fetch(base + '/api/results', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  assert.equal(missing.status, 400);

  for (const language of ['en', 'es', 'fr', 'pt', 'fr-FR', 'pt-BR', 'xx']) {
    const response = await fetch(base + '/api/results', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, language })
    });
    assert.equal(response.status, 204);
  }
});

test('dashboard reports event counts for English, Spanish, French, and Portuguese', () => {
  assert.deepEqual(getEventLanguageStats({ en: 2, es: 3, fr: 4, pt: 5 }), {
    eventsEs: 3,
    eventsEn: 2,
    eventsFr: 4,
    eventsPt: 5
  });
  assert.deepEqual(getEventLanguageStats({}), {
    eventsEs: 0,
    eventsEn: 0,
    eventsFr: 0,
    eventsPt: 0
  });
  const dashboard = fs.readFileSync(path.join(root, 'templates/views/dashboard.html'), 'utf8');
  assert.ok(dashboard.includes('French'));
  assert.ok(dashboard.includes('{{eventsFr}}'));
  assert.ok(dashboard.includes('Portuguese (Brazil)'));
  assert.ok(dashboard.includes('{{eventsPt}}'));
});
