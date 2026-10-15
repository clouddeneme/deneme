# SIFIRDAN v2 · Çekim Senaryosu

**29 Ekim 2026 · Cumhuriyet'in 103. yılı · Kocaeli**
45 saniye · 1920×1080 · 30 fps (1350 kare) · tamamı kodla üretilir (Three.js + GLSL + Web Audio)

---

## 1. Fikir

> **Karanlıktan aydınlığa, sıfırdan 103 yıla.**

Video tek bir günün ışığıyla akar. 1923'ün şafağında, bir terminal imlecinin karanlığında başlar. Güneş, Cumhuriyet'in ilanıyla doğar. Sabah ışığında ülke kurulur, gün ışığında Kocaeli'de kâğıt üretilir ve üzerine Cumhuriyet'in sözü yazılır. Gün batımında İzmit Saat Kulesi 103 yılı sayar. Mavi saatte sokaklar fener alayıyla dolar, insanların fenerleri yukarıdan bakınca ay-yıldızı ve 103'ü oluşturur. Video bir bayram tebriğiyle biter.

**Üç kural:**
1. **Tek plan.** Kesme ve siyaha kararma yok. Her sahne bir öncekinin içinden doğar: rakam kora, kor haritaya, harita kâğıda, kâğıt saat kadranına, kule fener alayına dönüşür. Bütün geçişler kamera hareketiyle kurgulanır (bkz. bölüm 5).
2. **Hiç geri kararmaz.** Işık sürekli artar. En karanlık an ilk 3 saniyedir, ondan sonra gökyüzü hep aydınlıktır.
3. **Kocaeli omurgadır, tebrik herkesedir.** Uçuş Kocaeli'den başlar, Kocaeli'ye döner, kâğıt Kocaeli'de doğar, final İzmit Saat Kulesi'nde geçer. Kapanış tebriği ise genel olur, yer adı içermez.

---

## 2. Görsel dil

### Renk akışı (ışık yolculuğu)

| Bölüm | Süre | Gökyüzü / zemin | Vurgu |
|---|---|---|---|
| Şafak öncesi | 0:00–0:04 | Lacivert → mor (`#1C2048 → #463E78`) | Sıcak kor turuncusu `#FFB46E` |
| Gün doğumu | 0:04–0:10 | Ufukta turuncu-pembe, üstte mavi | Güneş altını `#FFDCA0` |
| Sabah | 0:10–0:20 | Açık gök mavisi `#78B4EB`, denizler `#4F8FC0` | Kara kum-altın `#E8C482`, Kocaeli kırmızısı `#E30A17` |
| Gün ışığı | 0:20–0:31 | Krem, güneş ışığı `#FFF6E4` | Mürekkep `#1D1A17` |
| Gün batımı | 0:31–0:40 | Mor → pembe → turuncu (`#4659AA → #EB786E → #FFBE78`) | Kule kremi `#E6D8B8`, bayrak `#E30A17` |
| Mavi saat | 0:38–0:45 | Derin mavi `#14286E → #3250A0`, asla siyah değil | Fener sarısı `#FFC864`, bayrak kırmızısı |

### Tipografi
- **Ana cümleler:** Cormorant Garamond 600 (zarif serif). Karanlık sahnelerde fildişi ve hafif gölgeli, aydınlık sahnelerde mürekkep rengi ve gölgesiz.
- **Tarih satırları:** IBM Plex Mono, büyük harf ve geniş aralıklı (ör. `28 HAZİRAN 1921 · KOCAELİ`). Önce altın bir çizgi uzar, sonra yazı belirir.
- **Yıllar:** Bodoni Moda (sayaçta ve "103"te).
- **Kural:** Ekranda aynı anda en fazla iki satır yazı olur ve her yazı en az 1,5 saniye okunur.

### Kamera dili
- 35 mm lens (dikey görüş açısı 35°), sahne sahne 28–50 mm arası değişir.
- Hareketler her zaman yumuşak başlayıp yumuşak biter. Duraklarda kamera hiç tam durmaz, hep hafifçe kayar.
- Harita bölümünde bir drone gibi alçak irtifa uçuşu: yatışlar, pikeler, takip çekimleri.

---

## 3. Müzik

- **Tonalite:** Re majör. Baştan umutlu, giderek coşkulu. Minör yalnızca ilk 3 saniyede gölge olarak var.
- **Tempo:** 120 BPM. Bir ölçü 2 saniye, bütün kesme ve durak noktaları ölçü başlarına denk gelir.
- **Enstrümanlar** (hepsi kodla sentezlenir): saat tıkırtısı, yaylı pad, pizzicato benzeri pluck, piyano, bakır ses, çan, büyük davul, zil, bando trampeti ve uzaktan kalabalık uğultusu.
- **Motif:** Dört notalık bir "Cumhuriyet motifi": **Re – La – Si – La**. Önce piyanoda tek başına (kâğıt sahnesi), sonra bakırda ve tam orkestrada (final) duyulur.

| Süre | Müzik |
|---|---|
| 0:00–0:04 | Saat tıkırtısı (saniyede 1) ve klavye tıkları. Altta derinden bir pad. |
| 0:04 | Patlama: davul ve yükselen bir hışırtı. Pad açılıyor. |
| 0:07–0:10 | Güneş doğarken Re majör akoru tüm genişliğiyle açılıyor. |
| 0:08–0:20 | Pluck ostinatosu (sekizlikler), her 2 saniyede bir davul vuruşu ve akor değişimi: D – A – Bm – G – D – A |
| 0:20–0:31 | Ritim çekiliyor. Kâğıt makinesinin ritmi düşük bir tıkırtıyla sürüyor. Mürekkep yazarken piyanoda motif çalıyor. |
| 0:31–0:36 | Kadranda yıllar akarken tıkırtılar hızlanıp bir vızıltıya dönüşüyor. Gerilim akoru: A. |
| 0:36 | Doruk: Re majör, tam orkestra, bakırda motif, zil. |
| 0:38–0:44 | Bando: trampet ve davul yürüyüş ritmi, uzaktan kalabalığın uğultusu. Bakırda motif son kez ve tam haliyle. |
| 0:44,6 | Son "tik". Yankı. |

---

## 4. Çekim çekim senaryo

### PLAN 1 · İmleç (0:00–0:04,0)
**Işık:** Şafak öncesi. Lacivert-mor bir gökyüzü degradesi, ufukta çok hafif bir pembelik. Simsiyah değil.
**Görüntü:**
- 0:00,0 Ekranın ortasında fildişi bir imleç yanıp sönüyor.
- 0:00,6 – 0:02,8 Imleç harf harf yazıyor: **`29.10.1923`** (IBM Plex Mono, 150 px). Her tuşta küçük bir ışık titreşimi var.
- 0:03,0 – 0:04,0 Rakamlar ısınıp kor turuncusuna dönüyor, kenarlarından kıvılcımlar kopuyor.

**Kamera:** Sabit, ama 4 saniyede %3 içeri kayıyor.
**Ses:** Saniyede bir tıkırtı (tik/tak), klavye tıkları, altta Re-La boşluk akoru.

### PLAN 2 · Kor ve düşüş (0:04,0–0:08,0)
**Görüntü:**
- 0:04,0 Rakamlar 30.000 kora dönüşüp patlıyor.
- 0:04,2 – 0:06,5 **Kamera korların içine dalıyor.** Kıvılcımlar kameranın yanından geçiyor, objektif ileri ve aşağı dönüyor. 90°'lik bir pike: ekranın altında, uzakta karanlık bir zemin beliriyor.
- 0:06,5 – 0:08,0 Kameranın takip ettiği "kahraman kor" **Kocaeli'ye** düşüyor. **Türkiye'nin kıyı çizgisi** oradan başlayarak iki yöne doğru yanıyor, bütün ülkeyi çevreliyor. Diğer korlar ülkenin içine yerleşiyor. Komşu ülkeler soluk kum renginde, denizler mavi beliriyor.
- 0:07,0 **Güneş doğuyor.** Ufkun doğusunda (Kafkaslar yönünde) güneş yükseliyor, ilk ışık haritanın üzerinden yayılıyor.

**Kamera:** Dalıştan yatay uçuşa geçiş. Haritanın 1,5 birim üzerinde, ufka 20° bakan alçak bir açıyla batıya, Kocaeli'ye doğru dönüyor.
**Yazı:** 0:05,0 – 0:06,8 ortada küçük harflerle: *"Yorgun bir ülke. Ve bir karar."*
**Ses:** Patlamada davul, hışırtı. 0:07'de Re majör açılıyor.

### PLAN 3 · Kocaeli: kurtuluş (0:08,0–0:10,0)
**Işık:** Gün doğumu. Güneş kameranın arkasında, alçak ve turuncu. Uzun gölgeler var.
**Görüntü:** Kamera Marmara'nın üzerinden alçaktan süzülerek İzmit Körfezi'ne giriyor. Kocaeli'nin sınırı kırmızı bir ışık çizgisiyle çiziliyor, içi kırmızımsı parıltıyla doluyor.
**Kamera:** Körfez boyunca doğuya doğru, sağa hafif yatışla takip çekimi.
**Yazı:**
- `28 HAZİRAN 1921 · KOCAELİ` — **Kocaeli kurtuldu.**
- 0:09,0'da ikinci satır: `16–17 OCAK 1923 · İZMİT` — *Atatürk basına konuştu.*

**Ses:** Davul vuruşu, akor: Re.

### PLAN 4 · Ankara: Cumhuriyet (0:10,0–0:12,0)
**Görüntü:** Kamera yükselip doğuya, Ankara'ya dönüyor. 0:10,4'te Ankara'dan **altın bir ışık halkası** çıkıyor. Halka kameranın **altından** geçip bütün ülkeye yayılıyor ve geçtiği her yeri sabah ışığıyla aydınlatıyor. Gökyüzü bu anda maviye dönüyor.
**Kamera:** Ankara'ya doğru 30° pike, sonra halkanın yayılmasıyla birlikte yükselme.
**Yazı:** `29 EKİM 1923` — **Cumhuriyet ilan edildi.**
**Ses:** En güçlü davul vuruşu, akor: La. Bakırda kısa bir parlama.

### PLAN 5 · Yeni harfler (0:12,0–0:14,0)
**Görüntü:** Haritadaki ışıklar havalanıp gökyüzünde yeni alfabeyi oluşturuyor: **A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z**. Harfler iki dalga halinde kameraya doğru geliyor ve **kamera harflerin arasından geçiyor**. Yakından geçen harfler büyüyüp kameranın kenarından kayıyor.
**Kamera:** Harflere doğru hızlanan bir ileri hareket, geçiş anında hafif yatış.
**Yazı:** `1 KASIM 1928` — **Yeni harfler.**
**Ses:** Akor: Si minör. Harfler geçerken yumuşak "vuuş" sesleri.

### PLAN 6 · Demir ağlar (0:14,0–0:16,0)
**Görüntü:** Harflerin arkasından Ankara'dan doğuya uzanan bir demiryolu çiziliyor. Hattın ucunda parlak bir **ışık treni** var ve kamera onun **yanında yarışıyor**. Tren her şehre vardığında şehir yanıyor ve küçük bir etiket beliriyor: `1927 KAYSERİ` · `1930 SİVAS` · `1939 ERZURUM`. Arkada diğer hatlar (Malatya, Elazığ, Diyarbakır, Samsun) aynı anda örülüyor.
**Kamera:** Trenin sağından, 1 birim yükseklikten takip çekimi. Kamera trenle birlikte hızlanıyor.
**Yazı:** `1930'LAR` — **Demir ağlar.**
**Ses:** Akor: Sol. Pluck ritmi tren hızına kilitleniyor, tekerlek ritmi gibi.

### PLAN 7 · Kadınlar (0:16,0–0:18,0)
**Görüntü:** Kamera trenden ayrılıp yükseliyor. Altında bütün harita boyunca binlerce küçük ışık aynı anda **çiçek açar gibi** parlıyor. Gün ışığında görünsünler diye sıcak beyaz ve kırmızı tonlarda, kısa ışık patlamaları halinde.
**Kamera:** 2 saniyede 3 birimden 8 birime yükselme, aynı anda 15°'lik dönüş.
**Yazı:** `5 ARALIK 1934` — **Kadınlara seçme ve seçilme hakkı.**
**Ses:** Akor: Re. Çanlar.

### PLAN 8 · Kocaeli'ye dönüş (0:18,0–0:20,0)
**Görüntü:** Kamera batıya dönüp **Kocaeli'ye pike yapıyor.** Kocaeli il sınırı haritadan **3B bir blok olarak yükseliyor**: kırmızı kenarlı, altın yüzeyli bir ada. Bloğun üstünde ışık parçacıkları bir girdap gibi toplanıyor.
**Kamera:** Geniş bir sol dönüşle 45° pike, Kocaeli bloğunun 2 birim yakınına kadar.
**Ses:** Akor: La, yükselen hışırtı.

### PLAN 9 · SEKA: kâğıt doğuyor (0:20,0–0:25,0)
**Işık:** Gün ışığı. Gökyüzü açık ve krem tonlarında, güneş tepede ve yumuşak.
**Görüntü:**
- 0:20,0 Kocaeli bloğundaki ışık girdabı sıvı gibi akan bir **hamura** dönüşüyor.
- 0:20,5 Hamur iki büyük silindirin arasına giriyor. Silindirler 1930'ların kâğıt makinesi gibi pirinç halkalı ve döner.
- 0:21,0 Silindirlerden **bembeyaz, upuzun bir kâğıt şeridi** çıkıp kameraya doğru akıyor. Şerit dalgalanıyor, güneş üzerinde parlıyor, kenarlarından lifler görünüyor.
- 0:21,0 – 0:23,5 **Kamera kâğıdın üzerinde kayıyor**, şeridin akışıyla aynı yönde ve biraz daha yavaş. Kâğıt kameranın altından akıp gidiyor.
- 0:23,5 – 0:25,0 Şerit yavaşlıyor ve bir yaprak kesiliyor (keskin bir "şak" sesiyle). Yaprak havada süzülerek ekranı dolduracak şekilde kameranın önünde duruyor.

**Kamera:** 0:21'den itibaren kâğıdın 0,6 birim üzerinden, aşağı 35° bakarak kayıyor. 0:24'te kâğıda dik, kuşbakışı konuma dönüyor.
**Yazı** (0:21,5 – 0:24,5): `1936 · KOCAELİ` — **İlk yerli kâğıt.** (Bu fabrika bugünkü SEKA'nın başlangıcı.)
**Ses:** Ritim çekiliyor. Makinenin ritmini düşük, metalik tıkırtılar veriyor. Kesimde "şak". Pad: Sol majör.

### PLAN 10 · Söz (0:25,0–0:31,0)
**Görüntü:**
- Kâğıt ekranı dolduruyor. Kâğıt dokusunda lifler, hafif kabarma ve yumuşak bir güneş gölgesi var.
- 0:25,4 – 0:28,8 Görünmez bir dolma kalem yazıyor. Mürekkep önce ıslak ve parlak, sonra kuruyup matlaşıyor:
  > *Türkiye Cumhuriyeti*
  > *ilelebet payidar kalacaktır.*
- 0:29,2 Altında, mürekkep kırmızısıyla: **— MUSTAFA KEMAL ATATÜRK**
- Kâğıdın köşesinde çok küçük bir filigran: `Kocaeli · 1936`

**Kamera:** Kuşbakışı. Yazı ilerledikçe kalemi takip eden hafif bir kayma ve 6 saniyede %6 içeri hareket.
**Ses:** Piyanoda **Cumhuriyet motifi**: Re – La – Si – La. Kalem sesi çok hafif. İmzada motif çözülüyor.

### PLAN 11 · Kâğıttan kadrana (0:31,0–0:32,6)
**Işık:** Gün batımına geçiş.
**Görüntü:** Bir rüzgâr kâğıdı köşesinden kaldırıyor. Kâğıt kıvrılıp **kameranın önünden kayarak** sağa uçuyor. Arkasında, kâğıdın beyazıyla aynı tonda başka bir beyaz yüzey beliriyor: **saat kadranı**. Kadranın arkasındaki gökyüzü pembe-turuncu.
**Kamera:** Kuşbakışından yatay görüşe 90° dönüş, kâğıdın uçuşuyla eşzamanlı. Kesme yok.
**Ses:** Rüzgâr. Tıkırtılar yeniden başlıyor.

### PLAN 12 · Kadran: 103 yıl (0:32,6–0:36,4)
**Görüntü:** Roma rakamlı kadran. Akrep ve yelkovan hızlanarak dönüyor. Sağda, gökyüzünün önünde Bodoni harfleriyle bir yıl sayacı akıyor: **1923 → 2026**. Sayaç yavaş başlıyor, ortada hızlanıyor, sonda yavaşlıyor ve **2026**'da duruyor.
**Kamera:** Kadranın tam karşısında, kadran ekranın sol yarısında. 4 saniyede %8 içeri hareket.
**Yazı:** Sayaç durunca: **Cumhuriyet'in 103 yılı.**
**Ses:** Tıkırtılar akrep ve yelkovana bağlı olarak hızlanıp vızıltıya dönüşüyor. Gerilim akoru La, yükselen zil.

### PLAN 13 · Saat Kulesi ve bayrak (0:36,4–0:38,5)
**Işık:** Gün batımı. Gökyüzü mor, pembe ve turuncu. Kulenin krem taşı batı güneşiyle altın renginde parlıyor, pencerelerden sıcak ışık sızıyor.
**Görüntü:**
- 0:36,4 Kamera kadrandan geriye çekiliyor ve **İzmit Saat Kulesi**'nin tamamı ortaya çıkıyor: teras, kahverengi korkuluk, madalyonlar, saat katı, sivri külah.
- **Kulenin sağında, meydanda bir gönder** var. Gönderde büyük bir **Türk Bayrağı** dalgalanıyor. Bayrak gerçek bir kumaş simülasyonuyla hesaplanıyor: ağırlığıyla sarkıyor, rüzgârda kıvrılıyor, ucu çırpınıyor. Ölçüler 2893 sayılı Kanun'daki gibi, renk #E30A17.
- Bayrak gün batımı güneşini arkadan alıyor ve kumaşın içinden ışık süzülüyor.

**Kamera:** Kadrandan geriye doğru 12 birimlik çekilme, aynı anda sağa doğru 25°'lik bir yay: kule sol üçte birde, bayrak sağ üçte birde.
**Ses:** **Doruk.** Re majör, tam orkestra, bakırda Cumhuriyet motifi, zil, davul.

### PLAN 14 · Fener alayı (0:38,5–0:42,0)
**Işık:** Güneş batıyor, gökyüzü mavi saate dönüyor: derin mavi ve ufukta son bir turuncu çizgi. Kule ve bayrak ışıklandırmayla aydınlanıyor.
**Görüntü:**
- 0:38,5 Meydana açılan sokaklarda **fenerler** tek tek yanıyor: sıcak sarı küçük alevler ve aralarında küçük kırmızı bayraklar.
- 0:39,0 – 0:41,0 Fenerler ırmaklar gibi akarak meydana, kulenin çevresine doğru ilerliyor. Her fener hafifçe sallanıyor, yürüyen insanların ritmiyle.
- 0:40,0 Kamera yükselmeye başlıyor. Fenerler meydanda yerlerini alıyor.

**Kamera:** Kule ile bayrağın arasından yukarı ve öne doğru bir vinç hareketi, sonra kulenin üzerinden aşarak meydana bakan yüksek bir açı.
**Ses:** Bando trampeti ve davul, kalabalığın uzaktan gelen uğultusu, bakırda motif.

### PLAN 15 · Yukarıdan: ay-yıldız ve 103 (0:42,0–0:45,0)
**Görüntü:**
- 0:42,0 Kamera **tam kuşbakışına** dönüyor. Yukarıdan bakınca meydandaki fenerlerin birlikte **ay-yıldızı** oluşturduğu görülüyor. Fenerlerin oluşturduğu ay-yıldız da kanundaki oranlarla dizilmiş. Ortasında, küçücük kalmış Saat Kulesi'nin külahı görünüyor.
- 0:42,4 Ay-yıldızın yanında, yine fenerlerden **"103"**.
- 0:42,8 Ekranın alt üçte birinde:
  > **29 Ekim Cumhuriyet Bayramımız kutlu olsun.**
- 0:44,6 Son "tik". 0:44,7–0:45,0 görüntü derin maviye yumuşakça kararıyor (siyaha değil).

**Kamera:** Kuşbakışında çok yavaş bir yükselme ve 10°'lik bir dönüş. Fenerler titreşerek yaşıyor.
**Ses:** Motifin son akoru, son tik ve yankı.

---

## 5. Kamera kurgusu: akışa kendimizi kaptıralım

Bütün video **hiç durmayan tek bir kamera yolu**. Kamera hiçbir yerde tam durmuyor; sahneler kameranın içinden geçtiği yerlerdir. Her geçiş bir **hareketle** kuruluyor, kesme ya da kararma kullanılmıyor. Drone uçuşunun rotası `kamera-rotasi.png` görselinde.

| # | Geçiş | Süre | Hareket | Nasıl bağlanıyor |
|---|---|---|---|---|
| G1 | İmleç → kor | 0:03,5–0:04,5 | **İçinden geçiş (push-through)** | Kamera hızlanarak `29.10`'daki **0**'ın, yani Ekim'in sıfırının içine dalıyor: video gerçekten "sıfırdan" başlıyor. Rakamlar o anda kora dönüşüyor, kamera kıvılcımların arasından çıkıyor. |
| G2 | Kor → harita | 0:04,5–0:08,0 | **Takip + 90° pike** | Kamera bir "kahraman kor"u takip ediyor. Kor düşerken kamera aşağı dönüyor. Kor **Kocaeli'ye** düşüyor ve kıyı çizgisi oradan başlayarak bütün ülkeye yanıyor. Kamera yere yaklaşırken yatay uçuşa geçiyor. |
| G3 | Kocaeli → Ankara | 0:09,6–0:10,4 | **Yatış + tırmanış** | Körfezden çıkarken kamera sola yatıp doğuya dönüyor. Ufukta Ankara'nın ışığı beliriyor. |
| G4 | Ankara → harfler | 0:11,6–0:12,4 | **Yukarı bakış (tilt-up)** | Işık dalgası kameranın altından geçerken kamera yukarı bakıyor. Haritadan havalanan harfler kadraja giriyor ve kamera doğrudan onlara uçuyor. |
| G5 | Harfler → tren | 0:13,6–0:14,4 | **Arasından geçip pike** | Son harf kameranın yanından geçtiği anda kamera aşağı dalıyor ve demiryolunun yanına, trenin hizasına iniyor. |
| G6 | Tren → 1934 | 0:15,6–0:16,4 | **Vinç yükselişi** | Tren Erzurum'a vardığında kamera trenden ayrılıp dikey yükseliyor. Bütün ülke kadraja giriyor ve ışıklar çiçek açıyor. |
| G7 | 1934 → Kocaeli | 0:17,0–0:19,0 | **180° geniş dönüş + pike** | Kamera ufku eğerek batıya dönüyor (hafif yatış), sonra Kocaeli'ye 45° pike yapıyor. Kocaeli 3B olarak tam kameranın önünde yükseliyor. |
| G8 | Kocaeli → kâğıt makinesi | 0:19,0–0:21,0 | **Akışla birlikte dalış** | Kocaeli'deki ışık girdabı hamura dönüşüp silindirlere akıyor. Kamera akışı takip edip **iki silindirin arasından geçiyor** ve kâğıt şeridinin üzerine çıkıyor. |
| G9 | Şerit → yaprak | 0:23,5–0:25,0 | **Yükselip kuşbakışına dönüş** | Şerit yavaşlarken kamera yükselip aşağı dönüyor. Kesilen yaprak havalanıyor ve kameraya doğru gelip kadrajı tam dolduruyor. |
| G10 | Yaprak → kadran | 0:31,0–0:32,6 | **Beyazdan beyaza eşleşme** | Rüzgâr yaprağı kaldırıyor, kamera yaprağın kıvrılan beyaz yüzeyine yaklaşıyor. Ekran neredeyse tamamen beyazken kamera 90° dönüyor. Geri çekildiğinde aynı beyaz artık **saat kadranının** yüzü oluyor. |
| G11 | Kadran → kule | 0:36,4–0:38,5 | **Geri çekilme + yay (reveal)** | Kamera kadrandan uzaklaşırken sağa doğru yay çiziyor. Kule bütünüyle, yanında bayrakla ortaya çıkıyor. |
| G12 | Kule → fener alayı | 0:38,5–0:42,0 | **Vinç + kulenin üzerinden aşma** | Kamera kule ile bayrak arasından yükseliyor, külahın üzerinden geçiyor ve aşağıya, fenerlerle dolan meydana bakıyor. |
| G13 | Meydan → kuşbakışı | 0:41,0–0:42,0 | **Spiral yükseliş** | Kamera dönerek yükseliyor ve tam tepeden bakışa geçiyor. O anda fenerler ay-yıldızı oluşturmuş oluyor. |

**Hareket kuralları:**
- **Ataletli kamera:** Hız asla aniden değişmiyor, her hareket bir öncekinin hızını devralıyor. Yol, bütün ara noktalardan geçen yumuşak bir eğri (Catmull-Rom spline) olarak hesaplanıyor.
- **Drone yatışı:** Dönüşlerde ufuk dönüş yönüne doğru 6–12° eğiliyor. Dönüş bitince yavaşça düzeliyor.
- **Hız hissi:** Alçak uçuşlarda (tren, körfez, kâğıt şeridi) yerdeki detaylar kameranın yanından hızla akıyor, hafif hareket bulanıklığı ekleniyor. Yükselişlerde her şey yavaşlıyor ve nefes alıyor.
- **Lens nefesi:** Pikelerde görüş açısı 35°'ten 42°'ye açılıyor (hız hissi), duraklarda 32°'ye daralıyor.
- **Müzikle kilit:** Her geçişin en hızlı anı bir ölçü başına (2 saniyenin katlarına) denk geliyor.

---

## 6. Teknik notlar

| Konu | Yaklaşım |
|---|---|
| Gökyüzü | Zaman parametresiyle renk değiştiren bir gökyüzü kubbesi shader'ı: güneş diski, ufuk parıltısı, güneş ışınları |
| Harita | Natural Earth: Türkiye ve komşular (kara) ile denizler. Parçacıklar, kıyı çizgisi, gün ışığında gölgeli 3B harita |
| Kocaeli bloğu | İl sınırından 3B'ye yükselen bir prizma |
| Kâğıt makinesi | Silindirler, akan şerit (dalgalı yüzey shader'ı), kesilen yaprak |
| Kâğıttan kadrana geçiş | Kâğıdın beyazı ile kadranın beyazı aynı kare içinde üst üste getirilerek kesmesiz geçiş |
| Bayrak | Verlet kumaş simülasyonu (72×48 düğüm), direğe bağlı, rüzgâr ve hava direnci hesaplanıyor. Simülasyon önceden hesaplanıyor ve her kare aynı sonucu veriyor. Desen kanundaki ölçülerle analitik çiziliyor, kumaş dokusu ve dikişler var. |
| Kule | Fotoğraflara göre modellenen İzmit Saat Kulesi, gün batımı ve gece ışıklandırmasıyla |
| Fener alayı | Sokak hatları boyunca akan, hafif sallanan fener parçacıkları. Varış noktaları, kanundaki oranlarla dizilmiş ay-yıldız ve "103" biçiminde. |
| Kamera | Bütün video için tek bir spline yolu ve hedef noktası, yatış ve görüş açısı eğrileri. Hızlı geçişlerde 4 alt kareyle hareket bulanıklığı. |
| Render | 1350 kare, kare başına yaklaşık 1,6 saniye (hızlı geçişlerde daha fazla), toplam yaklaşık 45 dakika |

## 7. Tarihî doğruluk

| Bilgi | Kaynak notu |
|---|---|
| 28 Haziran 1921 · İzmit'in (Kocaeli) düşman işgalinden kurtuluşu | TBMM Genel Kurul tutanakları, her yıl anılıyor |
| 16–17 Ocak 1923 · İzmit Basın Toplantısı | Atatürk Ansiklopedisi |
| 29 Ekim 1923 · Cumhuriyet'in ilanı | |
| 1 Kasım 1928 · Harf Devrimi (1353 sayılı Kanun) | |
| 1927 Kayseri, 1930 Sivas, 1939 Erzurum · demiryolunun ulaştığı yıllar | Ulaştırma Bakanlığı verisi |
| 5 Aralık 1934 · Kadınlara milletvekili seçme ve seçilme hakkı | TBMM |
| 1936 · İzmit Kâğıt Fabrikası'nda ilk kâğıt (18 Nisan 1936), bugünkü SEKA'nın başlangıcı | SEKA Kâğıt Müzesi kaynakları |
| İzmit Saat Kulesi · 1902, proje Vedat Tek, 16,4 m | Kültür Portalı, Vikipedi |
| Fener alayı · 29 Ekim akşamları Kocaeli'de de düzenleniyor | Sözcü (Kocaeli Valiliği fener alayı haberleri) |
| "Türkiye Cumhuriyeti ilelebet payidar kalacaktır." · Mustafa Kemal Atatürk | |
| 29 Ekim 2026 = 103. yıl | |
