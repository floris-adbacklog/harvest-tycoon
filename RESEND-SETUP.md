# Resend instellen voor de e-mails van Harvest Tycoon

Supabase verstuurt de bevestigingsmail (na registreren) en de mail "wachtwoord vergeten". Standaard gebeurt dat via Supabase zelf: maximaal een paar mails per uur, vaak in de spam, en met een onbekend afzendadres. Dat kost je nieuwe spelers. Met Resend gaan die mails vanuit je eigen domein, komen ze veel vaker aan en kun je het volume opschalen.

**Er verandert niets in de code.** Alles hieronder doe je in de dashboards van Resend, je DNS-provider en Supabase. De bestanden in `supabase/email-templates/` zijn de mails zelf.

## Waar laat ik de Resend-secret (API key)?

**Op één plek: in het Supabase-dashboard, in het veld "Password" van de SMTP-instellingen.** Zie stap 3.

| Waar | Mag de key daar? |
|---|---|
| Supabase → Authentication → Emails → SMTP Settings → **Password** | **Ja, alleen hier** |
| GitHub (ook niet in een `.env`-bestand dat wordt meegecommit) | Nee |
| Vercel-omgevingsvariabelen | Nee, niet nodig |
| Een variabele met `VITE_` ervoor | **Nooit.** Die komen in de publieke website-code terecht, en iedereen kan ze lezen |
| Chat (ook niet met mij), e-mail of screenshots | Nee |

Je ziet de key maar één keer, direct na het aanmaken in Resend. Plak hem meteen in Supabase. Raak je hem kwijt, maak dan een nieuwe aan en verwijder de oude in Resend.

Later, als je zelf mails vanuit een edge function wilt sturen (bijvoorbeeld een welkomstmail), dan gaat de key in het Supabase-dashboard onder **Edge Functions → Secrets** (naam `RESEND_API_KEY`). Dat is nu niet nodig.

## Stap 1. Domein toevoegen in Resend
1. Maak een account op resend.com en ga naar **Domains → Add Domain**.
2. Vul `harvesttycoon.com` in (of liever een subdomein zoals `mail.harvesttycoon.com`, dan blijft je gewone mail buiten schot). Kies een regio dicht bij je spelers, bijvoorbeeld EU.
3. Resend toont een aantal DNS-records (SPF, DKIM en optioneel DMARC). Voeg die toe bij de plek waar je DNS beheert (waar je domein staat: Vercel, TransIP, Cloudflare, enz.). Kopieer type, naam en waarde precies over.
4. Klik in Resend op **Verify**. Dat kan een paar minuten tot een uur duren.

## Stap 2. API key aanmaken
1. Resend → **API Keys → Create API Key**.
2. Naam: `supabase-auth`. Permission: **Sending access**. Domain: alleen je domein.
3. Kopieer de key (begint met `re_`). Je ziet hem straks niet meer.

## Stap 3. SMTP instellen in Supabase
Supabase-dashboard → je project → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:

| Veld | Waarde |
|---|---|
| Sender email | `noreply@harvesttycoon.com` (of `noreply@mail.harvesttycoon.com` als je een subdomein gebruikt; moet bij het geverifieerde domein horen) |
| Sender name | `Harvest Tycoon` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | **de API key uit stap 2** |

Sla op.

## Stap 4. De mails opmaken
Supabase → **Authentication → Emails → Templates**:
- **Confirm signup**: subject `Confirm your email and start your farm`. Plak de inhoud van `supabase/email-templates/confirm-signup.html` in het bericht.
- **Reset password**: subject `Choose a new password for Harvest Tycoon`. Plak `supabase/email-templates/reset-password.html`.

Laat `{{ .ConfirmationURL }}` staan, Supabase vult die zelf in.

## Stap 5. Instellingen die hierbij horen
- **Authentication → URL Configuration**
  - Site URL: `https://www.harvesttycoon.com`
  - Redirect URLs: voeg `https://www.harvesttycoon.com/play.html` **en** `https://harvesttycoon.com/play.html` toe (de site kan op beide adressen worden geopend). De registratie- en wachtwoord-mails sturen mensen hiernaartoe.
- **Authentication → Rate Limits**: met eigen SMTP mag het aantal mails per uur hoger. Zet het op iets als 100 zolang je start, zodat een drukke dag geen spelers blokkeert.
- **Authentication → Providers → Email**: laat "Confirm email" voorlopig aan. Het spel opent na de bevestiging automatisch de boerderij als de speler op hetzelfde apparaat klikt.

## Stap 6. Testen
1. Open de site in een privévenster en registreer met een adres dat je nog niet gebruikte.
2. Controleer: mail binnen een halve minuut, niet in de spam, afzender "Harvest Tycoon", knop opent de boerderij.
3. Test ook "Forgot your password?" op het inlogtabblad: mail komt aan, knop opent het formulier "Choose a new password", daarna opent de boerderij.
4. Zit de mail toch in de spam? Controleer in Resend of het domein "Verified" is en of DMARC is toegevoegd. Wacht daarna een paar uur.

## Meten
In Tag Manager komen nu deze events voorbij (allemaal anoniem: nooit een e-mailadres of spelersnaam): `auth_view`, `auth_mode`, `auth_field_start`, `auth_submit`, `auth_error` (met `reason`), `auth_confirmation_sent`, `auth_resend`, `auth_email_confirmed`, `auth_login` (met `after_signup`), `auth_reset_sent`, `auth_password_changed`, `auth_link_error` en het bestaande `sign_up`. Elk event heeft een `device` (mobile, tablet of desktop). Vergelijk `sign_up` met `auth_email_confirmed`: het verschil is het aantal spelers dat de mail nooit opent.
