# 🥕 Was kochen wir heute?

Eine kleine Abstimmungsseite für unsere Kochrunde. 25 vegane Hauptgerichte,
jeder kreuzt an was ihm schmeckt, ein Favorit zählt doppelt — und am Ende
gibt es die Einkaufsliste passend auf eure Personenzahl umgerechnet.

**Seite:** https://MaxBrandner.github.io/kochabstimmung/

---

## Wie abgestimmt wird

1. Link öffnen, Vornamen eintragen.
2. Bei jedem Gericht auf **„Schmeckt mir"** — so viele wie du magst.
3. Bei genau einem Gericht auf den **Stern ★** — das ist dein Favorit und zählt doppelt.
4. Unten im **Zwischenstand** sieht jeder live, was vorne liegt.

Die Runde richtet sich nach dem Datum: Alle, die am selben Tag den Link öffnen,
stimmen automatisch in derselben Runde ab. Morgen beginnt eine neue, ohne dass
jemand etwas zurücksetzen muss.

Eine eigene Runde außer der Reihe: `?raum=irgendeinname` an den Link hängen,
zum Beispiel `.../kochabstimmung/?raum=silvester`.

---

## Live-Abstimmung einschalten (einmalig, ca. 5 Minuten)

Ohne diesen Schritt läuft die Seite im **Einzelmodus**: Abstimmen funktioniert,
aber jeder sieht nur seine eigenen Stimmen. Der Grund ist technisch —
GitHub Pages liefert nur Dateien aus und kann nichts speichern. Dafür braucht es
eine Datenbank. Firebase ist dafür kostenlos und für unsere Größenordnung
dauerhaft gratis (kein Zahlungsmittel nötig).

### 1. Projekt anlegen

1. https://console.firebase.google.com öffnen, mit Google-Konto anmelden.
2. **„Projekt erstellen"** → Name z. B. `kochabstimmung` → Weiter.
3. Google Analytics **abschalten** (brauchen wir nicht) → **Projekt erstellen**.

### 2. Datenbank anlegen

1. Links im Menü: **Erstellen → Realtime Database** (nicht „Firestore"!).
2. **„Datenbank erstellen"**.
3. Speicherort: **europe-west1 (Belgien)** — kurze Wege, EU-Recht.
4. Sicherheitsregeln: **„Im Testmodus starten"** → Aktivieren.

### 3. Regeln festlegen

Der Testmodus läuft nach 30 Tagen ab. Damit die Seite dauerhaft funktioniert,
im Reiter **„Regeln"** den Inhalt durch das hier ersetzen und **veröffentlichen**:

```json
{
  "rules": {
    "abstimmungen": {
      ".read": true,
      ".write": true
    }
  }
}
```

Das gibt ausschließlich den Bereich `abstimmungen` frei — der Rest der Datenbank
bleibt zu. Wer den Link kennt, kann mitstimmen. Für eine private Kochrunde ist
das genau richtig; etwas Schützenswertes liegt dort nicht.

### 4. Zugangsdaten holen

1. Oben links auf das **Zahnrad → Projekteinstellungen**.
2. Runterscrollen zu **„Deine Apps"** → Symbol **`</>`** (Web) anklicken.
3. Spitzname z. B. `kochabstimmung`, Firebase Hosting **nicht** ankreuzen → **App registrieren**.
4. Firebase zeigt einen Block `const firebaseConfig = { … }` — die Werte daraus brauchst du.

### 5. Werte eintragen

In der Datei [`firebase-config.js`](firebase-config.js) die Platzhalter
(`HIER_DEIN_…`) durch die Werte aus Schritt 4 ersetzen, speichern, und:

```bash
git add firebase-config.js
git commit -m "Firebase-Zugangsdaten eingetragen"
git push
```

Nach ein bis zwei Minuten steht oben rechts auf der Seite **„● Live – alle sehen dasselbe"**.
Fertig.

> Die Werte in `firebase-config.js` sind kein Geheimnis. Firebase-Web-Zugangsdaten
> gehören öffentlich in den Browser-Code; der Schutz kommt über die Regeln aus
> Schritt 3, nicht über Geheimhaltung.

---

## GitHub Pages einschalten

Falls die Seite nicht erreichbar ist:

1. Im Repo auf **Settings → Pages**.
2. **Source:** „Deploy from a branch", **Branch:** `main`, Ordner `/ (root)` → **Save**.
3. Nach ein bis zwei Minuten ist die Seite unter der oben genannten Adresse online.

---

## Was hier drin liegt

| Datei | Zweck |
|---|---|
| `index.html` | Gerüst der Seite |
| `style.css` | Gestaltung, hell und dunkel |
| `app.js` | Abstimmung, Live-Anzeige, Mengenumrechnung |
| `firebase-config.js` | **Hier trägst du deine Firebase-Werte ein** |
| `rezepte.json` | Die 25 Gerichte mit Zutaten, Bewertung und Bildlink |

### Rezepte austauschen

`rezepte.json` ist eine schlichte Liste. Ein Eintrag sieht so aus:

```json
{
  "id": "1234567890",
  "titel": "Name des Gerichts",
  "bewertung": 4.7,
  "stimmen": 128,
  "portionen": 4,
  "zeitGesamt": 35,
  "bild": "https://img.chefkoch-cdn.de/…/crop-960x640/….jpg",
  "quelle": "https://www.chefkoch.de/rezepte/…",
  "kueche": "Italienisch",
  "zutaten": [{ "menge": 250, "einheit": "g", "name": "Nudeln" }]
}
```

Einträge löschen, ergänzen oder ändern, pushen — fertig. Die Seite baut sich
daraus neu auf.

---

## Herkunft der Rezepte

Alle Gerichte, Bewertungen und Fotos stammen von **[Chefkoch.de](https://www.chefkoch.de)**.
Die Bilder werden direkt von dort geladen und nicht kopiert. Jede Karte verlinkt
auf das Originalrezept mit der vollständigen Zubereitung — die Anleitungstexte
selbst stehen bewusst nicht in diesem Repo.

Jedes der 25 Gerichte ist bei Chefkoch als **vegan** ausgezeichnet, und jede
Zutatenliste wurde zusätzlich einzeln auf tierische Bestandteile durchgesehen —
mit Ausnahmen für pflanzliche Ersatzprodukte wie Kokosmilch, Hafersahne oder
Käseersatz. Dabei sind unter anderem Rezepte mit Sauerrahm, Feta, Crème fraîche
und Worcestersauce aussortiert worden.

24 der 25 tragen bei Chefkoch außerdem die Kennzeichnung **Hauptspeise**. Die
Ausnahme ist der *Gnocchi-Salat*, der dort unter Salate läuft — mit angebratenen
Gnocchi, Zucchini und Paprika ist er als Hauptgericht trotzdem gut geeignet.
