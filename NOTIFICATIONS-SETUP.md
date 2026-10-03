# Meldingen instellen: sleutels en geheimen

De code en de database voor meldingen staan klaar. Er ontbreken nog **drie soorten geheimen**, die alleen jij kunt aanmaken. Zolang die niet zijn ingesteld, blijft het blok "Reminders" in Settings verborgen en verstuurt de uurtaak niets.

## Waar laat ik welke sleutel?

Alles komt op **één plek**: het Supabase-dashboard onder **Edge Functions → Secrets**
(https://supabase.com/dashboard/project/jnmdirvidffzxukbdmij/functions/secrets).

| Naam van het geheim | Wat het is | Hoe je eraan komt |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Publieke sleutel van je meldingen. Mag iedereen zien, de site haalt hem zelf op. | Stap 1 |
| `VAPID_PRIVATE_KEY` | Geheime sleutel waarmee jouw server meldingen ondertekent. **Nooit delen.** | Stap 1 |
| `VAPID_SUBJECT` | Een contactadres voor de pushdiensten van Apple en Google, in de vorm `mailto:jouw@adres.nl`. Vul een echt adres in van jou. | Zelf invullen |
| `RESEND_API_KEY` | Sleutel voor de dagelijkse e-mail. Alleen nodig als je die wilt. | Stap 2 |
| `MAIL_FROM` | Optioneel. Afzender van de e-mail. Standaard `Harvest Tycoon <noreply@harvesttycoon.com>`. | Zelf invullen |

**Niet** in GitHub, niet in Vercel, niet in een `.env`-bestand, nooit in een variabele met `VITE_` ervoor (dat komt in de publieke code terecht), en niet in de chat.

## Stap 1: het sleutelpaar voor push (VAPID)

VAPID is het sleutelpaar waarmee je server bewijst dat een melding echt van jouw game komt. Je maakt het één keer aan, op je eigen computer, gratis en zonder account. Open Terminal en voer uit:

```bash
npx web-push generate-vapid-keys
```

Je krijgt twee lange teksten:

```
Public Key:
B....
Private Key:
x....
```

Kopieer de **Public Key** naar het geheim `VAPID_PUBLIC_KEY` en de **Private Key** naar `VAPID_PRIVATE_KEY` in het Supabase-dashboard (knop **Add new secret**). Vul daarbij ook `VAPID_SUBJECT` in, bijvoorbeeld `mailto:jouw@adres.nl`.

De private key zie je in Terminal en die verdwijnt als je het venster sluit. Bewaar hem als je wilt in je wachtwoordmanager. Raak je hem kwijt, maak dan een nieuw paar aan en zet beide sleutels opnieuw; alle spelers moeten dan hun meldingen één keer opnieuw aanzetten.

## Stap 2: Resend-sleutel voor de dagelijkse e-mail (optioneel)

1. Resend → **API Keys → Create API Key**.
2. Naam `notify`, rechten **Sending access**, alleen voor je domein `harvesttycoon.com`.
3. Kopieer de key (begint met `re_`, je ziet hem maar één keer) naar het geheim `RESEND_API_KEY`.

Dit is een aparte sleutel naast die van de aanmeld-mails. Zo kun je er een intrekken zonder de ander te raken. Zonder dit geheim verschijnt het e-mailgedeelte niet in Settings.

## Stap 3: controleren

Open dit adres in je browser (na een minuut of twee, zodat de nieuwe geheimen actief zijn):

https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/notify-hourly?config

Je moet iets zien als `{"enabled":true,"push":true,"email":true,"vapidPublicKey":"B..."}`. Staat er `false`, wacht dan even of laat het me weten, dan zet ik de functie opnieuw neer.

## Stap 4: de uurplanning aanzetten

Zeg tegen mij dat de geheimen erin staan. Dan voer ik `supabase/notifications-cron.sql` uit: dat zet `pg_cron` en `pg_net` aan en plant de taak elk uur op :05. Dit doe ik pas als de geheimen erin staan.

## Wat spelers zien

Zodra de config `enabled` is, verschijnt in Settings het blok **Reminders**. Alles staat uit. Een speler zet zelf meldingen aan op zijn apparaat (op een iPhone eerst de app op het beginscherm zetten), kiest wat hij wil, en kan een testmelding sturen.

## Meldingen in de Android-app (OneSignal, oktober 2026)

In de Android-app komen de meldingen via OneSignal in plaats van via de browser. Dezelfde herinneringen, dezelfde schakelaars,
dezelfde stille uren en limieten. Wat jij doet, in deze volgorde (elke stap is los veilig: zonder de volgende gebeurt er niets):

1. **Database:** voer `supabase/app-push.sql` uit in de SQL-editor. Het maakt de tabel `app_push_devices` en de functies
   `app_push_save` en `app_push_forget`, en past drie triggers aan vanaf hun live versie (privéberichten, de Crew, aankoopmeldingen
   voor de admin). Staat een regel live anders dan verwacht, dan stopt het hele bestand zonder iets half te doen; laat het me dan weten.
2. **Edge Function:** zet `notify-hourly` opnieuw neer (met de nieuwe `onesignal.js`).
3. **Geheim:** in **Edge Functions → Secrets** het geheim `ONESIGNAL_REST_API_KEY` met de **App API key** uit OneSignal
   (Settings → Keys & IDs). Nooit in de code, de chat of GitHub. De App ID (`1d8ca7c0-fca0-48a9-b55e-e87b85802fad`) is openbaar en staat al in de code.
4. **Controleren:** `…/functions/v1/notify-hourly?config` geeft dan ook `"appPush":true`. Pas dan zie je in de app de knop
   **Turn on notifications** in Settings, en vraagt de app de speler om toestemming (alleen na een tik).

Zonder het geheim stuurt de functie niets naar de app en blijft de app zoals nu (alleen de dagelijkse e-mail).
