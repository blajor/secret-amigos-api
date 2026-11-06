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

test('German language resolves and formats details without changing host amounts', () => {
  assert.equal(resolveLanguage('de'), 'de');
  assert.equal(normalizeEventLanguage({ language: 'de' }).language, 'de');
  assert.equal(resolveLanguage('de-DE'), 'en');
  assert.equal(resolveLanguage('xx'), 'en');
  assert.deepEqual(formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Berlin'
  }, 'de'), {
    datetime: 'am 24. Dezember 2026',
    amountTxt: 'Geschenkbudget: 20 € bis 40 €',
    location: 'Ort: Berlin'
  });
  assert.equal(formatEventDetails({ datetime: '2026-01-01T18:00:00.000Z' }, 'de').datetime,
    'am 1. Januar 2026');
  assert.equal(formatEventDetails({ amount: { min: '20 €' } }, 'de').amountTxt,
    'Geschenkbudget: ab 20 €');
  assert.equal(formatEventDetails({ amount: { max: '40 €' } }, 'de').amountTxt,
    'Geschenkbudget: bis 40 €');
});

test('German email templates render details and confirmation and cancellation links', () => {
  const details = formatEventDetails({
    datetime: '2026-12-24T18:00:00.000Z',
    amount: { min: '20 €', max: '40 €' },
    location: 'Berlin'
  }, 'de');
  const values = {
    toname: 'Lena', eventname: 'Wichteln mit Freunden',
    friendname: 'Max', friendsurname: 'Müller',
    custommessage: 'Bis bald!', serverurl: 'https://example.test',
    token: 'token-123', ...details
  };
  for (const file of ['mail_de.html', 'text_de.txt']) {
    const rendered = Handlebars.compile(fs.readFileSync(path.join(views, file), 'utf8'))(values);
    assert.ok(rendered.includes('Wichteln mit Freunden'));
    assert.ok(rendered.includes('am 24. Dezember 2026'));
    assert.ok(rendered.includes('Ort: Berlin'));
    assert.ok(rendered.includes('20 € bis 40 €'));
    assert.ok(rendered.includes('/de/confirm/token-123'));
    assert.ok(rendered.includes('/de/unsubscribe/token-123'));
    assert.ok(!rendered.includes('{{#if'));
  }
});

test('German pages render and every page offers a German language link', () => {
  const values = {
    toname: 'Lena', eventname: 'Wichteln mit Freunden',
    friendname: 'Max', friendsurname: 'Müller',
    datetime: 'am 24. Dezember 2026', location: 'Ort: Berlin',
    amountTxt: 'Geschenkbudget: 20 € bis 40 €', custommessage: 'Bis bald!',
    serverurl: 'https://example.test', token: 'token-123'
  };
  const confirmation = Handlebars.compile(fs.readFileSync(path.join(views, 'conf_de.html'), 'utf8'))(values);
  assert.ok(confirmation.includes('<html lang="de">'));
  assert.ok(confirmation.includes('Deine Teilnahme an der Wichtelrunde'));
  assert.ok(confirmation.includes('am 24. Dezember 2026'));
  assert.ok(confirmation.includes('Ort: Berlin'));
  assert.ok(confirmation.includes('20 € bis 40 €'));
  const cancellation = Handlebars.compile(fs.readFileSync(path.join(views, 'unsub_de.html'), 'utf8'))(values);
  assert.ok(cancellation.includes('<html lang="de">'));
  assert.ok(cancellation.includes('Du nimmst nicht mehr'));
  assert.ok(cancellation.includes('/de/confirm/token-123'));
  for (const kind of ['conf', 'unsub']) {
    const action = kind === 'conf' ? 'confirm' : 'unsubscribe';
    for (const language of ['en', 'es', 'fr', 'pt', 'it', 'de']) {
      const source = fs.readFileSync(path.join(views, `${kind}_${language}.html`), 'utf8');
      assert.ok(source.includes('Deutsch'));
      assert.ok(source.includes(`/de/${action}/{{token}}`));
    }
    const rendered = kind === 'conf' ? confirmation : cancellation;
    for (const language of ['en', 'es', 'fr', 'pt', 'it', 'de']) {
      assert.ok(rendered.includes(`/${language}/${action}/token-123`));
    }
  }
});

test('German confirmation and unsubscribe routes are available', async (t) => {
  const app = express(); const routed = [];
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
  for (const action of ['confirm', 'unsubscribe']) {
    const response = await fetch(`${base}/de/${action}/token-123`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('<html lang="de">'));
  }
  assert.deepEqual(routed, [
    ['confirm', 'de', 'token-123'],
    ['unsubscribe', 'de', 'token-123']
  ]);
});

test('dashboard includes German event counts', () => {
  assert.equal(getEventLanguageStats({ de: 7 }).eventsDe, 7);
  assert.equal(getEventLanguageStats({}).eventsDe, 0);
  const html = fs.readFileSync(path.join(views, 'dashboard.html'), 'utf8');
  assert.ok(html.includes('German'));
  assert.ok(html.includes('{{eventsDe}}'));
});
