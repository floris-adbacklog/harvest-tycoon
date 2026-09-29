// Writes the two Supabase Auth email templates (sign-up confirmation and password reset) with the texts in every game language,
// plus their subject lines (29 Sep 2026). Supabase renders them with Go templates: the account's game language is
// .Data.language (user_metadata, saved by farm-api when the game loads and at sign-up); anything else is English.
// Run `node scripts/email-templates.mjs`, then paste each file and its subject into Supabase, Authentication, Emails.
// Only a small, safe part of Go templates is used: printf, eq, if / else if / end and variables, so a missing language never
// breaks a mail. tests/email-templates.test.mjs renders every language with a stand-in for exactly that part.
import {writeFileSync} from 'node:fs';
const NB='\u00a0';
const COPY={
 en:'Button not working? Copy this link into your browser:',nl:'Werkt de knop niet? Kopieer deze link naar je browser:',
 de:'Der Button funktioniert nicht? Kopiere diesen Link in deinen Browser:',es:'¿El botón no funciona? Copia este enlace en tu navegador:',
 fr:`Le bouton ne marche pas${NB}? Copie ce lien dans ton navigateur${NB}:`,pt:'O botão não funciona? Copie este link no seu navegador:',
 id:'Tombol tidak berfungsi? Salin tautan ini ke browsermu:',tr:'Düğme çalışmıyor mu? Bu bağlantıyı tarayıcına kopyala:',
 hu:'Nem működik a gomb? Másold be ezt a linket a böngésződbe:',ru:'Кнопка не работает? Скопируй эту ссылку в браузер:',
 uk:'Кнопка не працює? Скопіюй це посилання в браузер:',cs:'Tlačítko nefunguje? Zkopíruj tento odkaz do prohlížeče:',
 hi:'बटन काम नहीं कर रहा? यह लिंक अपने ब्राउज़र में कॉपी करें:',ja:'ボタンが使えない場合は、このリンクをブラウザにコピーしてください：'
};
const TAG={
 en:'A little farm. A world of possibilities.',nl:'Een kleine boerderij. Een wereld aan mogelijkheden.',de:'Ein kleiner Hof. Eine Welt voller Möglichkeiten.',
 es:'Una pequeña granja. Un mundo de posibilidades.',fr:'Une petite ferme. Un monde de possibilités.',pt:'Uma pequena fazenda. Um mundo de possibilidades.',
 id:'Kebun kecil. Dunia penuh kemungkinan.',tr:'Küçük bir çiftlik. Olasılıklarla dolu bir dünya.',hu:'Egy kis farm. Egy világnyi lehetőség.',
 ru:'Маленькая ферма. Целый мир возможностей.',uk:'Маленька ферма. Цілий світ можливостей.',cs:'Malá farma. Svět plný možností.',
 hi:'एक छोटा फ़ार्म। संभावनाओं की पूरी दुनिया।',ja:'小さな農場。可能性に満ちた世界。'
};
export const TEMPLATES={
 'confirm-signup':{
  en:{subject:'Confirm your email for Harvest Tycoon',title:'Welcome to the valley!',pre:'One tap and your farm is ready.',intro:'Thanks for signing up. Confirm your email address and your farm opens right away: a patch of land, a few seeds and a first harvest waiting for you.',button:'Confirm and start my farm',foot:'You received this email because someone signed up for Harvest Tycoon with this address. If that was not you, you can safely ignore it.'},
  nl:{subject:'Bevestig je e-mailadres voor Harvest Tycoon',title:'Welkom in de vallei!',pre:'Eén tik en je boerderij staat klaar.',intro:'Bedankt voor je aanmelding. Bevestig je e-mailadres en je boerderij gaat meteen open: een lapje grond, een paar zaadjes en een eerste oogst die op je wacht.',button:'Bevestig en start mijn boerderij',foot:'Je krijgt deze e-mail omdat iemand zich met dit adres heeft aangemeld bij Harvest Tycoon. Was jij dat niet? Dan kun je deze e-mail gerust negeren.'},
  de:{subject:'Bestätige deine E-Mail-Adresse für Harvest Tycoon',title:'Willkommen im Tal!',pre:'Ein Tipp, und dein Hof ist bereit.',intro:'Danke für deine Anmeldung. Bestätige deine E-Mail-Adresse, und dein Hof öffnet sich sofort: ein Stück Land, ein paar Samen und eine erste Ernte, die auf dich wartet.',button:'Bestätigen und meinen Hof starten',foot:'Du bekommst diese E-Mail, weil sich jemand mit dieser Adresse bei Harvest Tycoon angemeldet hat. Warst du das nicht, kannst du sie einfach ignorieren.'},
  es:{subject:'Confirma tu correo para Harvest Tycoon',title:'¡Te damos la bienvenida al valle!',pre:'Un toque y tu granja está lista.',intro:'Gracias por registrarte. Confirma tu correo y tu granja se abre al instante: un trozo de tierra, unas semillas y una primera cosecha esperándote.',button:'Confirmar y empezar mi granja',foot:'Recibes este correo porque alguien se registró en Harvest Tycoon con esta dirección. Si no fuiste tú, puedes ignorarlo sin problema.'},
  fr:{subject:'Confirme ton adresse e-mail pour Harvest Tycoon',title:`Bienvenue dans la vallée${NB}!`,pre:'Un geste et ta ferme est prête.',intro:`Merci pour ton inscription. Confirme ton adresse e-mail et ta ferme s’ouvre aussitôt${NB}: un lopin de terre, quelques graines et une première récolte qui t’attend.`,button:'Confirmer et lancer ma ferme',foot:'Tu reçois cet e-mail parce que quelqu’un s’est inscrit à Harvest Tycoon avec cette adresse. Si ce n’était pas toi, tu peux l’ignorer sans souci.'},
  pt:{subject:'Confirme seu e-mail para o Harvest Tycoon',title:'Boas-vindas ao vale!',pre:'Um toque e sua fazenda está pronta.',intro:'Obrigado por se cadastrar. Confirme seu e-mail e sua fazenda abre na hora: um pedaço de terra, algumas sementes e uma primeira colheita esperando por você.',button:'Confirmar e começar minha fazenda',foot:'Você recebeu este e-mail porque alguém se cadastrou no Harvest Tycoon com este endereço. Se não foi você, pode ignorá-lo tranquilamente.'},
  id:{subject:'Konfirmasi emailmu untuk Harvest Tycoon',title:'Selamat datang di lembah!',pre:'Sekali ketuk, kebunmu siap.',intro:'Terima kasih sudah mendaftar. Konfirmasi alamat emailmu dan kebunmu langsung terbuka: sepetak tanah, beberapa benih, dan panen pertama yang menunggumu.',button:'Konfirmasi dan mulai kebunku',foot:'Kamu menerima email ini karena seseorang mendaftar di Harvest Tycoon dengan alamat ini. Jika itu bukan kamu, abaikan saja.'},
  tr:{subject:'Harvest Tycoon için e-postanı onayla',title:'Vadiye hoş geldin!',pre:'Tek dokunuşla çiftliğin hazır.',intro:'Kaydolduğun için teşekkürler. E-posta adresini onayla, çiftliğin hemen açılsın: bir parça toprak, birkaç tohum ve seni bekleyen ilk hasat.',button:'Onayla ve çiftliğimi başlat',foot:'Bu e-postayı, biri bu adresle Harvest Tycoon’a kaydolduğu için alıyorsun. Bu sen değilsen, gönül rahatlığıyla görmezden gelebilirsin.'},
  hu:{subject:'Erősítsd meg az e-mail-címed a Harvest Tycoonhoz',title:'Üdv a völgyben!',pre:'Egy koppintás, és kész a farmod.',intro:'Köszönjük, hogy regisztráltál. Erősítsd meg az e-mail-címed, és a farmod azonnal megnyílik: egy darab föld, néhány mag és egy első termés vár rád.',button:'Megerősítés és a farmom indítása',foot:'Azért kapod ezt az e-mailt, mert valaki ezzel a címmel regisztrált a Harvest Tycoonba. Ha nem te voltál, nyugodtan hagyd figyelmen kívül.'},
  ru:{subject:'Подтверди почту для Harvest Tycoon',title:'Добро пожаловать в долину!',pre:'Одно касание, и ферма готова.',intro:'Спасибо за регистрацию. Подтверди адрес почты, и ферма сразу откроется: клочок земли, немного семян и первый урожай уже ждут тебя.',button:'Подтвердить и начать',foot:'Это письмо пришло, потому что кто-то зарегистрировался в Harvest Tycoon с этим адресом. Если это был не ты, просто не обращай на него внимания.'},
  uk:{subject:'Підтверди пошту для Harvest Tycoon',title:'Ласкаво просимо до долини!',pre:'Один дотик, і ферма готова.',intro:'Дякуємо за реєстрацію. Підтверди адресу пошти, і ферма одразу відкриється: клапоть землі, трохи насіння й перший урожай уже чекають на тебе.',button:'Підтвердити й почати',foot:'Цей лист надійшов, бо хтось зареєструвався в Harvest Tycoon з цією адресою. Якщо це був не ти, просто не зважай на нього.'},
  cs:{subject:'Potvrď svůj e-mail pro Harvest Tycoon',title:'Vítej v údolí!',pre:'Jedno klepnutí a farma je připravená.',intro:'Díky za registraci. Potvrď svou e-mailovou adresu a farma se hned otevře: kousek půdy, pár semínek a první sklizeň, která na tebe čeká.',button:'Potvrdit a spustit moji farmu',foot:'Tento e-mail ti přišel, protože se někdo s touto adresou zaregistroval do Harvest Tycoon. Pokud to nebyl tvůj požadavek, můžeš ho klidně ignorovat.'},
  hi:{subject:'Harvest Tycoon के लिए अपना ईमेल पक्का करें',title:'घाटी में आपका स्वागत है!',pre:'एक टैप और आपका फ़ार्म तैयार।',intro:'साइन अप करने के लिए धन्यवाद। अपना ईमेल पता पक्का करें और आपका फ़ार्म तुरंत खुल जाएगा: ज़मीन का एक टुकड़ा, कुछ बीज और पहली फसल आपका इंतज़ार कर रही है।',button:'पक्का करें और मेरा फ़ार्म शुरू करें',foot:'आपको यह ईमेल इसलिए मिला है क्योंकि किसी ने इस पते से Harvest Tycoon पर साइन अप किया है। अगर वह आप नहीं थे, तो इसे आराम से अनदेखा कर दें।'},
  ja:{subject:'Harvest Tycoonのメールアドレス確認',title:'谷へようこそ！',pre:'タップひとつで農場の準備ができます。',intro:'ご登録ありがとうございます。メールアドレスを確認すると、すぐに農場が開きます。小さな土地と少しの種、そして最初の収穫があなたを待っています。',button:'確認して農場を始める',foot:'このアドレスでHarvest Tycoonに登録があったため、このメールをお送りしています。心当たりがない場合は、このメールを無視してください。'}
 },
 'reset-password':{
  en:{subject:'Reset your Harvest Tycoon password',title:'Choose a new password',pre:'Choose a new password for your farm.',intro:'We received a request to reset the password for your Harvest Tycoon account. Tap the button to choose a new one. Your farm and progress stay exactly as you left them.',button:'Choose a new password',foot:'If you did not ask for this, ignore this email: your password stays the same. The link works once and expires after a while.'},
  nl:{subject:'Stel je Harvest Tycoon-wachtwoord opnieuw in',title:'Kies een nieuw wachtwoord',pre:'Kies een nieuw wachtwoord voor je boerderij.',intro:'We kregen een verzoek om het wachtwoord van je Harvest Tycoon-account opnieuw in te stellen. Tik op de knop om een nieuw wachtwoord te kiezen. Je boerderij en voortgang blijven precies zoals je ze achterliet.',button:'Kies een nieuw wachtwoord',foot:'Heb je hier niet om gevraagd? Negeer deze e-mail dan: je wachtwoord blijft hetzelfde. De link werkt één keer en verloopt na een tijdje.'},
  de:{subject:'Setze dein Harvest-Tycoon-Passwort zurück',title:'Wähle ein neues Passwort',pre:'Wähle ein neues Passwort für deinen Hof.',intro:'Wir haben eine Anfrage erhalten, das Passwort deines Harvest-Tycoon-Kontos zurückzusetzen. Tippe auf den Button, um ein neues zu wählen. Dein Hof und dein Fortschritt bleiben genau so, wie du sie verlassen hast.',button:'Neues Passwort wählen',foot:'Wenn du das nicht angefordert hast, ignoriere diese E-Mail: Dein Passwort bleibt gleich. Der Link funktioniert einmal und läuft nach einer Weile ab.'},
  es:{subject:'Restablece tu contraseña de Harvest Tycoon',title:'Elige una contraseña nueva',pre:'Elige una contraseña nueva para tu granja.',intro:'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Harvest Tycoon. Toca el botón para elegir una nueva. Tu granja y tu progreso se quedan tal como los dejaste.',button:'Elegir una contraseña nueva',foot:'Si no lo pediste, ignora este correo: tu contraseña no cambia. El enlace funciona una vez y caduca al cabo de un rato.'},
  fr:{subject:'Réinitialise ton mot de passe Harvest Tycoon',title:'Choisis un nouveau mot de passe',pre:'Choisis un nouveau mot de passe pour ta ferme.',intro:'Nous avons reçu une demande de réinitialisation du mot de passe de ton compte Harvest Tycoon. Touche le bouton pour en choisir un nouveau. Ta ferme et ta progression restent exactement comme tu les as laissées.',button:'Choisir un nouveau mot de passe',foot:`Si tu n’as rien demandé, ignore cet e-mail${NB}: ton mot de passe ne change pas. Le lien fonctionne une fois et expire au bout d’un moment.`},
  pt:{subject:'Redefina sua senha do Harvest Tycoon',title:'Escolha uma nova senha',pre:'Escolha uma nova senha para sua fazenda.',intro:'Recebemos um pedido para redefinir a senha da sua conta do Harvest Tycoon. Toque no botão para escolher uma nova. Sua fazenda e seu progresso continuam exatamente como você deixou.',button:'Escolher uma nova senha',foot:'Se você não pediu isso, ignore este e-mail: sua senha continua a mesma. O link funciona uma vez e expira depois de um tempo.'},
  id:{subject:'Atur ulang kata sandi Harvest Tycoon-mu',title:'Pilih kata sandi baru',pre:'Pilih kata sandi baru untuk kebunmu.',intro:'Kami menerima permintaan untuk mengatur ulang kata sandi akun Harvest Tycoon-mu. Ketuk tombol untuk memilih yang baru. Kebun dan progresmu tetap seperti saat kamu tinggalkan.',button:'Pilih kata sandi baru',foot:'Jika kamu tidak memintanya, abaikan email ini: kata sandimu tetap sama. Tautan ini hanya berlaku sekali dan kedaluwarsa setelah beberapa waktu.'},
  tr:{subject:'Harvest Tycoon şifreni sıfırla',title:'Yeni bir şifre seç',pre:'Çiftliğin için yeni bir şifre seç.',intro:'Harvest Tycoon hesabının şifresini sıfırlama isteği aldık. Yenisini seçmek için düğmeye dokun. Çiftliğin ve ilerlemen bıraktığın gibi kalır.',button:'Yeni şifre seç',foot:'Bunu sen istemediysen bu e-postayı görmezden gel: şifren aynı kalır. Bağlantı bir kez çalışır ve bir süre sonra geçerliliğini yitirir.'},
  hu:{subject:'Állítsd vissza a Harvest Tycoon-jelszavadat',title:'Válassz új jelszót',pre:'Válassz új jelszót a farmodhoz.',intro:'Kérést kaptunk a Harvest Tycoon-fiókod jelszavának visszaállítására. Koppints a gombra, és válassz újat. A farmod és a haladásod pontosan úgy marad, ahogy hagytad.',button:'Új jelszó választása',foot:'Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt: a jelszavad nem változik. A link egyszer használható, és egy idő után lejár.'},
  ru:{subject:'Сброс пароля Harvest Tycoon',title:'Выбери новый пароль',pre:'Выбери новый пароль для своей фермы.',intro:'Мы получили запрос на сброс пароля для твоего аккаунта Harvest Tycoon. Нажми на кнопку, чтобы выбрать новый. Ферма и весь прогресс останутся в точности как были.',button:'Выбрать новый пароль',foot:'Если это был не ты, просто не обращай внимания на это письмо: пароль останется прежним. Ссылка работает один раз и через некоторое время перестаёт действовать.'},
  uk:{subject:'Скидання пароля Harvest Tycoon',title:'Обери новий пароль',pre:'Обери новий пароль для своєї ферми.',intro:'Ми отримали запит на скидання пароля до твого облікового запису Harvest Tycoon. Натисни кнопку, щоб обрати новий. Ферма й увесь прогрес залишаться такими, як були.',button:'Обрати новий пароль',foot:'Якщо це був не ти, просто не зважай на цей лист: пароль не зміниться. Посилання працює один раз і згодом перестає діяти.'},
  cs:{subject:'Obnov si heslo k Harvest Tycoon',title:'Zvol si nové heslo',pre:'Zvol si nové heslo ke své farmě.',intro:'Dostali jsme žádost o obnovení hesla k tvému účtu Harvest Tycoon. Klepni na tlačítko a zvol si nové. Tvoje farma i postup zůstanou beze změny.',button:'Zvolit nové heslo',foot:'Pokud to nebyl tvůj požadavek, tento e-mail ignoruj: heslo zůstane stejné. Odkaz funguje jednou a po čase vyprší.'},
  hi:{subject:'अपना Harvest Tycoon पासवर्ड रीसेट करें',title:'नया पासवर्ड चुनें',pre:'अपने फ़ार्म के लिए नया पासवर्ड चुनें।',intro:'हमें आपके Harvest Tycoon खाते का पासवर्ड रीसेट करने का अनुरोध मिला है। नया पासवर्ड चुनने के लिए बटन दबाएँ। आपका फ़ार्म और आपकी प्रगति बिल्कुल वैसी ही रहेगी जैसी आपने छोड़ी थी।',button:'नया पासवर्ड चुनें',foot:'अगर आपने यह नहीं माँगा था, तो इस ईमेल को अनदेखा करें: आपका पासवर्ड वही रहेगा। लिंक एक बार काम करता है और कुछ समय बाद खत्म हो जाता है।'},
  ja:{subject:'Harvest Tycoonのパスワード再設定',title:'新しいパスワードを設定',pre:'農場の新しいパスワードを設定してください。',intro:'Harvest Tycoonアカウントのパスワード再設定のリクエストを受け付けました。ボタンをタップして新しいパスワードを設定してください。農場と進行状況はそのまま残ります。',button:'新しいパスワードを設定',foot:'心当たりがない場合は、このメールを無視してください。パスワードは変わりません。リンクは1回だけ有効で、しばらくすると期限切れになります。'}
 }
};
const FIELDS=['title','pre','intro','button','copy','foot','tag'];
const q=text=>{if(/["\\`{}]/.test(text))throw Error(`Not allowed in a template string: ${text}`);return `"${text}"`;};
// The language code and each text as Go template variables: English first, then one block that overrides them per language.
function variables(texts){
 const all=code=>({...texts[code],copy:COPY[code],tag:TAG[code]});
 const set=(code,op)=>FIELDS.map(f=>`{{- $${f} ${op} ${q(all(code)[f])} -}}`).join('\n');
 const others=Object.keys(texts).filter(code=>code!=='en');
 return `{{- $l := printf "%v" .Data.language -}}\n{{- $lang := "en" -}}\n${set('en',':=')}\n`
  +others.map((code,i)=>`{{- ${i?'else if':'if'} eq $l "${code}" -}}\n{{- $lang = "${code}" -}}\n${set(code,'=')}\n`).join('')+'{{- end -}}\n';
}
export function subjectLine(texts){
 const others=Object.keys(texts).filter(code=>code!=='en');
 return `{{ $l := printf "%v" .Data.language }}`+others.map((code,i)=>`{{ ${i?'else if':'if'} eq $l "${code}" }}${texts[code].subject}`).join('')+`{{ else }}${texts.en.subject}{{ end }}`;
}
export function templateHtml(texts){
 return `${variables(texts)}<!doctype html>
<html lang="{{ $lang }}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ $title }}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3e8e0;">{{ $pre }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
   <tr><td align="center" style="padding:28px 28px 0;">
    <img src="https://www.harvesttycoon.com/assets/harvest-tycoon-logo.png" width="150" height="150" alt="Harvest Tycoon" style="display:block;border:0;width:150px;height:auto;">
   </td></tr>
   <tr><td style="padding:8px 32px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#3d3923;">
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;color:#3d3923;">{{ $title }}</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5d573f;">{{ $intro }}</p>
   </td></tr>
   <tr><td align="center" style="padding:0 32px 8px;">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#685e3f;color:#fffdf0;text-decoration:none;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;padding:15px 30px;border-radius:12px;border-bottom:3px solid #494125;">{{ $button }}</a>
   </td></tr>
   <tr><td style="padding:22px 32px 30px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#857d70;">
    <p style="margin:0 0 10px;">{{ $copy }}<br><a href="{{ .ConfirmationURL }}" style="color:#5b5336;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
    <p style="margin:0;">{{ $foot }}</p>
   </td></tr>
  </table>
  <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#8e8374;margin:16px 0 0;">Harvest Tycoon &middot; {{ $tag }}</p>
 </td></tr>
</table>
</body></html>
`;
}
if(import.meta.url===`file://${process.argv[1]}`){
 let subjects='Subjects for Supabase, Authentication, Emails (paste each line into the Subject field of its template):\n\n';
 for(const [name,texts] of Object.entries(TEMPLATES)){
  writeFileSync(new URL(`../supabase/email-templates/${name}.html`,import.meta.url),templateHtml(texts));
  subjects+=`${name}:\n${subjectLine(texts)}\n\n`;
 }
 writeFileSync(new URL('../supabase/email-templates/subjects.txt',import.meta.url),subjects);
 console.log('Wrote supabase/email-templates: confirm-signup.html, reset-password.html, subjects.txt');
}
