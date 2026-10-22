# Ideen für eine öffentliche Version

Grobe Gedanken, noch nichts davon ist umgesetzt. Die Kochabstimmung bleibt
vorerst, wie sie ist: privat, für kurze Abstimmungen, Rezepte werden direkt in
`rezepte.json` gepflegt.

Wird daraus eine öffentliche Abstimmungsseite, sollte dafür wahrscheinlich ein
**eigenes, neues Repo** begonnen werden, statt dieses hier umzubauen.

## Runden und Links

- Den Rundenlink (`?raum=...`) beibehalten, aber klären, was beim
  Wiederverwenden eines alten Links passiert.
- Variante A: Hinweis „Diese Abstimmung ist abgelaufen“ mit Knopf, um eine
  neue Runde mit denselben Einstellungen zu erzeugen.
- Variante B (bevorzugt): Wer eine neue Runde als Nachfolger anlegt, verknüpft
  sie mit der alten; der alte Link leitet dann automatisch auf die neue weiter.

## Grundsatzentscheidung: privat oder skalierbar

- **Privat:** keine Gedanken über Zugriff, Konsistenz und Speicherung nötig.
- **Öffentlich:** mehrere Nutzer erstellen unabhängig voneinander eigene
  Abstimmungen. Dann braucht es Antworten auf:
  - Zugriff: Wer darf eine Abstimmung anlegen, bearbeiten, löschen?
  - Konsistenz: Was passiert, wenn mehrere gleichzeitig bearbeiten?
  - Speicherung: Datenbank-Regeln, Grenzen, Missbrauchsschutz.

## Alte Abstimmungen

- Sollen abgeschlossene Abstimmungen überhaupt gespeichert werden?
- Falls ja: wie lange, und wer kann sie sehen?

## Mehr als Kochrezepte

- Öffentlich wäre eine allgemeine Abstimmungsseite sinnvoll, nicht nur für
  Rezepte (Filme, Ausflugsziele, Termine …).
- Einträge im Web-Editor direkt auf der Seite anlegen und bearbeiten, statt
  eine JSON-Datei zu pflegen.
