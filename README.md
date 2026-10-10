# Quiz

Et simpelt quiz-spil i browseren med 5 kategorier og 10 spørgsmål i hver (sværhedsgrad medium):

- 🌍 Geografi
- 🏛️ Historie
- 🔬 Natur & Videnskab
- ⚽ Sport
- 🎬 Kultur & Underholdning

## Sådan spiller du

Åbn `index.html` i en browser – der er ingen afhængigheder eller build-trin.

Vælg en kategori, og besvar de 10 spørgsmål. Spørgsmål og svarmuligheder blandes hver gang,
og du får med det samme at vide, om du svarede rigtigt. Til sidst vises din score.

## Tilføj eller ret spørgsmål

Alle spørgsmål ligger i `questions.js`. Det første svar i `answers` er altid det korrekte –
rækkefølgen blandes automatisk, når spørgsmålet vises.

## 🎤 Musikquiz: Hiphop fra 90'erne & 00'erne

`musik.html` er en musikquiz, hvor numrene afspilles direkte fra Spotify. Du hører et stykke af et
hiphop-nummer og skal gætte **kunstneren**, **titlen** eller **årstallet**. Jo hurtigere du svarer,
jo flere point (op til 1000 pr. nummer, 30 sekunder pr. spørgsmål). Vælg 90'erne, 00'erne eller begge,
og spil 10, 15 eller 20 numre. Bagefter får du "dagens playliste" med links til Spotify.

### Opsætning (én gang)

1. Opret en app på [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   og vælg **Web API** og **Web Playback SDK**.
2. Tilføj sidens adresse som **Redirect URI** – fx `http://127.0.0.1:8000/musik.html`
   eller din GitHub Pages-adresse, fx `https://<bruger>.github.io/quiz/musik.html`.
   (Spotify tillader ikke `localhost` – brug `127.0.0.1` eller https.)
3. Tilføj de Spotify-konti, der skal spille, under **User Management** (krævet mens appen er i udviklingstilstand).
4. Indsæt dit Client ID i appen – eller sæt det fast i `SPOTIFY_CLIENT_ID` øverst i `musik.js`.

Kør lokalt med fx `python3 -m http.server 8000` og åbn `http://127.0.0.1:8000/musik.html`.
Siden kan **ikke** åbnes direkte som fil, fordi Spotify-login kræver http(s).

### Afspilning

- **Denne browser** – spiller direkte i siden (kræver Spotify Premium, virker ikke i mobilbrowsere).
- **Dine Spotify-enheder** – telefon, højttaler, TV osv. styres via Spotify Connect (kræver Premium).
  Perfekt til fest – læg bare telefonen med skærmen nedad 😉
- **Spotify-afspiller i siden** – virker uden Premium. Uden login på open.spotify.com spiller Spotify
  typisk kun et 30 sekunders uddrag.

### Tilføj sange

Sangene ligger i `musik-songs.js` med kunstner, titel og årstal. Spotify-numrene findes automatisk
via søgning (og huskes i browseren). Rammer søgningen forkert, kan du angive en egen `query`.
