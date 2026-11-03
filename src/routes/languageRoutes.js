const LANGUAGES = ['en', 'es', 'fr', 'pt'];

function registerLanguageRoutes(app, { getQueryData, unsubscribeParticipant, confirmParticipant }) {
  for (const language of LANGUAGES) {
    app.get('/' + language + '/unsubscribe/:queryToken', (req, res) => {
      getQueryData(req.params.queryToken, (err, queryObject) => {
        if (err) return res.json({ error: err });
        unsubscribeParticipant(queryObject, language, req.ip, (error, html) => {
          if (error) return res.json({ error });
          res.send(html);
        });
      });
    });

    app.get('/' + language + '/confirm/:queryToken', (req, res) => {
      getQueryData(req.params.queryToken, (err, queryObject) => {
        if (err) return res.json({ error: err });
        confirmParticipant(queryObject, language, req.ip, (error, html) => {
          if (error) return res.json({ error });
          res.send(html);
        });
      });
    });
  }
}

module.exports = { LANGUAGES, registerLanguageRoutes };
