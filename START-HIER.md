# Harvest Tycoon — GitHub downloadpakket

## 1. Upload naar GitHub
Pak de ZIP uit. Open https://github.com/floris-adbacklog/harvest-tycoon en kies Add file > Upload files. Upload de INHOUD van de map harvest-tycoon, niet de ZIP en niet de bovenliggende map. package.json, vercel.json en pnpm-lock.yaml moeten direct in de repository staan. Behoud alle submappen. Bij veel bestanden: upload in meerdere rondes of gebruik GitHub Desktop (dit neemt ook verborgen bestanden mee). Commit de upload. De art-assets zijn bedoeld voor deze game, niet om los als assetpack te publiceren; houd de repository private.

## 2. Supabase
Doelproject: jnmdirvidffzxukbdmij.
Schakel Anonymous Sign-ins in bij Authentication.
Als player_stats nog niet bestaat: plak supabase/player_stats.sql in SQL Editor en voer het volledige script eenmaal uit. Verwacht: Success. No rows returned.
Als je het eerder gegeven script al met succes uitvoerde, sla deze stap over. Bij een fout of afwijkend bestaand schema: stop en deel de fout; verwijder geen bestaande tabel.
Het script gebruikt currency DEFAULT 0 en level DEFAULT 1. De game stuurt daarna het actuele lokale saldo (een nieuwe farm begint met 180 munten). Dit verandert de database-default niet.

## 3. Vercel
Importeer de GitHub-repository als nieuw Vercel-project. vercel.json bevat de instellingen:
- Framework: Other
- Install: pnpm install --frozen-lockfile
- Build: pnpm run build:static
- Output: dist-static
- Node.js: 22.x of een nieuwere ondersteunde versie
Voeg voor Deploy beide Environment Variables toe:
VITE_SUPABASE_URL = de Project URL uit het Supabase Connect-venster
VITE_SUPABASE_ANON_KEY = de publieke publishable key (sb_publishable_...) of publieke anon key
Gebruik nooit een service_role-, secret- of managementsleutel. Stel deze waarden in Vercel in; zet geen ingevuld .env-bestand op GitHub.
Na wijzigen van deze waarden moet je opnieuw deployen: ze worden tijdens het bouwen opgenomen.

## 4. Controleren
Open de game en kies een gebruikersnaam. Controleer in Supabase Table Editor dat je rij verschijnt. Oogst/verkoop, wacht minstens vier seconden en controleer currency en level. Herlaad: dezelfde player_id moet behouden blijven.
Open een ander browserprofiel of incognitovenster, kies een andere naam en bekijk de ranglijst: beide spelers moeten zichtbaar zijn.
Controleer daarna met de tweede spelerssessie dat een update van de eerste rij niets wijzigt. Gebruik hiervoor een clienttest met de sessie van speler B, niet de SQL Editor als beheerder. Deze live beveiligingstest is nog niet uitgevoerd; alleen een werkende ranglijst bewijst RLS niet.

## Opgeslagen voortgang
De volledige farm blijft in localStorage. Alleen player_id, username, currency, level en updated_at staan in Supabase. Een anonieme identiteit blijft in dezelfde browser; wissen van browsergegevens of een ander apparaat maakt een nieuwe identiteit.
Een nieuw Vercel-adres heeft aparte browseropslag. De eerdere farm op de Sites-URL verhuist NIET automatisch mee. Gebruik de oorspronkelijke site voor je bestaande save totdat export/import is geregeld.
Optionele e-maillinking in de interface vereist extra Supabase-instellingen (email provider, manual identity linking en toegestane /play.html-redirect); dit is niet nodig voor anoniem spelen.

## Status van dit pakket
Dit is een export van de bestaande game. Er is niets naar GitHub geüpload of naar Vercel gepubliceerd. Supabase-instellingen en live sessietests zijn niet uitgevoerd. De bestaande Sites-game is niet gewijzigd.
De app/ en overige frameworkbestanden zijn bewaard uit de oorspronkelijke code. Gebruik voor deze verhuizing uitsluitend build:static; de oude Sites-serverroute wordt niet ingezet.
