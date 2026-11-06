const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const Handlebars = require('handlebars');

const { formatEventDetails, normalizeEventLanguage, resolveLanguage } = require('../utils/localization');
const { getEventLanguageStats } = require('../utils/dashboardStats');
const { registerLanguageRoutes } = require('../src/routes/languageRoutes');

const views = path.join(__dirname, '../templates/views');

test('Italian language resolves and formats event details without changing host amounts', () => {
  assert.equal(resolveLanguage('it'), 'it');
  assert.equal(normalizeEventLanguage({ language: 'it' }).language, 'it');
  assert.equal(resolveLanguage('it-IT'), 'en');
  assert.equal(resolveLanguage('xx'), 'en');
  assert.deepEqual(formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Roma'
  }, 'it'), {
    datetime: 'il 24 dicembre 2026',
    amountTxt: 'Budget indicativo per il regalo: da 20 € a 40 €',
    location: 'Luogo: Roma'
  });
  assert.equal(formatEventDetails({ datetime: '2026-01-01T18:00:00.000Z' }, 'it').datetime,
    'il 1° gennaio 2026');
  assert.equal(formatEventDetails({ amount: { min: '20 €' } }, 'it').amountTxt,
    'Budget indicativo per il regalo: a partire da 20 €');
  assert.equal(formatEventDetails({ amount: { max: '40 €' } }, 'it').amountTxt,
    'Budget indicativo per il regalo: fino a 40 €');
});

test('Italian invitation templates render event details and action links', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Roma'
  }, 'it');
  const values = {
    toname: 'Giulia', eventname: 'Scambio di regali',
    friendname: 'Luca', friendsurname: 'Rossi',
    custommessage: 'Ci vediamo presto!',
    serverurl: 'https://example.test', token: 'token-123',
    ...details
  };
  for (const file of ['mail_it.html', 'text_it.txt']) {
    const rendered = Handlebars.compile(fs.readFileSync(path.join(views, file), 'utf8'))(values);
    assert.ok(rendered.includes('Scambio di regali'));
    assert.ok(rendered.includes('il 24 dicembre 2026'));
    assert.ok(rendered.includes('Luogo: Roma'));
    assert.ok(rendered.includes('da 20 € a 40 €'));
    assert.ok(rendered.includes('it/confirm/token-123'));
    assert.ok(rendered.includes('it/unsubscribe/token-123'));
  }
});

test('Italian pages render and every confirmation and unsubscribe page offers Italian', () => {
  const values = {
    toname: 'Giulia', eventname: 'Scambio di regali',
    friendname: 'Luca', friendsurname: 'Rossi',
    datetime: 'il 24 dicembre 2026', location: 'Luogo: Roma',
    amountTxt: 'Budget indicativo per il regalo: da 20 € a 40 €',
    custommessage: 'Ci vediamo presto!',
    serverurl: 'https://example.test', token: 'token-123'
  };
  const confirmation = Handlebars.compile(fs.readFileSync(path.join(views, 'conf_it.html'), 'utf8'))(values);
  assert.ok(confirmation.includes('<html lang="it">'));
  assert.ok(confirmation.includes('La tua partecipazione all’evento'));
  assert.ok(confirmation.includes('il 24 dicembre 2026'));
  assert.ok(confirmation.includes('Luogo: Roma'));
  assert.ok(confirmation.includes('da 20 € a 40 €'));
  const unsubscribe = Handlebars.compile(fs.readFileSync(path.join(views, 'unsub_it.html'), 'utf8'))(values);
  assert.ok(unsubscribe.includes('<html lang="it">'));
  assert.ok(unsubscribe.includes('è stata annullata'));
  assert.ok(unsubscribe.includes('>qui</a>'));
  assert.ok(unsubscribe.includes('it/confirm/token-123'));
  for (const kind of ['conf', 'unsub']) {
    const route = kind === 'conf' ? 'confirm' : 'unsubscribe';
    for (const language of ['en', 'es', 'fr', 'pt', 'it']) {
      const source = fs.readFileSync(path.join(views, `${kind}_${language}.html`), 'utf8');
      assert.ok(source.includes('Italiano'));
      assert.ok(source.includes(`/it/${route}/{{token}}`));
    }
    const rendered = kind === 'conf' ? confirmation : unsubscribe;
    for (const language of ['en', 'es', 'fr', 'pt', 'it']) {
      assert.ok(rendered.includes(`/${language}/${route}/token-123`));
    }
  }
});

test('Italian confirmation and unsubscribe routes are available', async (t) => {
  const app = express();
  const routed = [];
  registerLanguageRoutes(app, {
    getQueryData(token, callback) { callback(null, { token }); },
    confirmParticipant(query, language, ip, callback) {
      routed.push(['confirm', language, query.token]);
      callback(null, `<html lang="${language}">confirmed</html>`);
    },
    unsubscribeParticipant(query, language, ip, callback) {
      routed.push(['unsubscribe', language, query.token]);
      callback(null, `<html lang="${language}">unsubscribed</html>`);
    }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['confirm', 'unsubscribe']) {
    const response = await fetch(`${base}/it/${route}/token-123`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('<html lang="it">'));
  }
  assert.deepEqual(routed, [
    ['confirm', 'it', 'token-123'],
    ['unsubscribe', 'it', 'token-123']
  ]);
});

test('dashboard counts Italian events and displays the row', () => {
  assert.equal(getEventLanguageStats({ it: 6 }).eventsIt, 6);
  assert.equal(getEventLanguageStats({}).eventsIt, 0);
  const dashboard = fs.readFileSync(path.join(views, 'dashboard.html'), 'utf8');
  assert.ok(dashboard.includes('Italian'));
  assert.ok(dashboard.includes('{{eventsIt}}'));
});
