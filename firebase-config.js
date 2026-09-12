/* =======================================================================
   Firebase-Zugangsdaten  –  hier trägst du deine eigenen Werte ein.
   Anleitung Schritt für Schritt: siehe README.md ("Live-Abstimmung
   einschalten"). Solange hier die Platzhalter stehen, läuft die Seite
   im Einzelmodus: Abstimmen geht, aber nur auf dem eigenen Gerät.

   Diese Werte sind KEIN Geheimnis. Firebase-Web-Zugangsdaten sind dafür
   gemacht, öffentlich im Browser zu stehen – der Schutz kommt über die
   Datenbank-Regeln, nicht über diese Datei.
   ======================================================================= */

export const firebaseConfig = {
  apiKey:            "HIER_DEIN_API_KEY",
  authDomain:        "HIER_DEIN_PROJEKT.firebaseapp.com",
  databaseURL:       "https://HIER_DEIN_PROJEKT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "HIER_DEIN_PROJEKT",
  storageBucket:     "HIER_DEIN_PROJEKT.appspot.com",
  messagingSenderId: "HIER_DEINE_SENDER_ID",
  appId:             "HIER_DEINE_APP_ID"
};
