// 30 spørgsmål til Hiphop-duellen (dansk & amerikansk hiphop, 80'erne–00'erne).
// Felter:
//   track   – Spotify track-id (det der står efter /track/ i et Spotify-link)
//   artist / title / year – facit, vises når svaret afsløres
//   country – "dk" eller "us"
//   decade  – "80" | "90" | "00"
//   q       – spørgsmålet
//   options – 4 svarmuligheder. Den FØRSTE er altid den rigtige (rækkefølgen blandes i spillet)
//   fact    – lille fun fact der vises efter svaret
const DUEL_QUESTIONS = [
  // ---------- 80'erne ----------
  {
    track: "32X0tTPXoWYNld9y1RRbFI", artist: "Grandmaster Flash & The Furious Five", title: "The Message", year: 1982,
    country: "us", decade: "80",
    q: "Hvem står bag dette nummer?",
    options: ["Grandmaster Flash & The Furious Five", "The Sugarhill Gang", "Kurtis Blow", "Whodini"],
    fact: "“Don't push me 'cause I'm close to the edge” – et af de første rapnumre med en samfundskritisk tekst.",
  },
  {
    track: "4FupIlegZgvXUuK79qcoKW", artist: "Afrika Bambaataa & The Soulsonic Force", title: "Planet Rock", year: 1982,
    country: "us", decade: "80",
    q: "Melodien i “Planet Rock” er lånt fra hvilken tysk elektronisk gruppe?",
    options: ["Kraftwerk", "Tangerine Dream", "Depeche Mode", "Can"],
    fact: "Melodien kommer fra Kraftwerks “Trans-Europe Express”, og rytmen bygger på “Numbers”.",
  },
  {
    track: "6qUEOWqOzu1rLPUPQ1ECpx", artist: "Run-DMC feat. Aerosmith", title: "Walk This Way", year: 1986,
    country: "us", decade: "80",
    q: "Hvilket rockband er med på dette nummer?",
    options: ["Aerosmith", "Bon Jovi", "Guns N' Roses", "Def Leppard"],
    fact: "Samarbejdet genoplivede Aerosmiths karriere og bragte hiphop ind på MTV.",
  },
  {
    track: "6jBCehpNMkwFVF3dz4nLIW", artist: "Run-DMC", title: "It's Tricky", year: 1986,
    country: "us", decade: "80",
    q: "Hvad hedder nummeret?",
    options: ["It's Tricky", "My Adidas", "King of Rock", "Peter Piper"],
    fact: "Alle fire svarmuligheder er Run-DMC-numre – “It's Tricky” og “My Adidas” er begge fra albummet Raising Hell.",
  },
  {
    track: "2OvyGP2JLi2zKc7ch7HCWf", artist: "Salt-N-Pepa", title: "Push It", year: 1987,
    country: "us", decade: "80",
    q: "Hvem står bag dette nummer?",
    options: ["Salt-N-Pepa", "TLC", "Queen Latifah", "MC Lyte"],
    fact: "“Push It” startede som B-side, men blev gruppens store gennembrud. (Versionen her er en genindspilning.)",
  },
  {
    track: "0gFB5H3pHN13ERt2FyMuWi", artist: "Rob Base & DJ E-Z Rock", title: "It Takes Two", year: 1988,
    country: "us", decade: "80",
    q: "Hvad hedder nummeret?",
    options: ["It Takes Two", "Bust a Move", "Wild Thing", "The Humpty Dance"],
    fact: "Nummeret sampler Lyn Collins' “Think (About It)” – det berømte “Woo! Yeah!”.",
  },
  {
    track: "4vEWRakctkzouRwOeR6BRQ", artist: "DJ Jazzy Jeff & The Fresh Prince", title: "Parents Just Don't Understand", year: 1988,
    country: "us", decade: "80",
    q: "Rapperen “The Fresh Prince” er i dag bedre kendt som…?",
    options: ["Will Smith", "Ice Cube", "LL Cool J", "Ice-T"],
    fact: "Nummeret vandt den allerførste Grammy for bedste rapnummer i 1989.",
  },
  {
    track: "4QOTOTJsJjgrAf0BgnfaRF", artist: "MC Einar", title: "Jul det' cool", year: 1988,
    country: "dk", decade: "80",
    q: "Hvem står bag denne danske julerap-klassiker?",
    options: ["MC Einar", "Rockers By Choice", "Østkyst Hustlers", "Den Gale Pose"],
    fact: "MC Einar var en af de første danske rapgrupper, der fik et stort hit på dansk.",
  },
  {
    track: "584g3KN2si78uGlRAWDDnW", artist: "MC Einar", title: "Mette Medium", year: 1988,
    country: "dk", decade: "80",
    q: "Hvad hedder nummeret?",
    options: ["Mette Medium", "Lise Lækker", "Hanne Hårdkogt", "Dorthe Dobbeltdækker"],
    fact: "Nummeret kom oprindeligt på MC Einars debutalbum “Og såd'n noget!” – her i en genindspilning.",
  },

  // ---------- 90'erne ----------
  {
    track: "1gSDTZHemEViEBiXysrlo0", artist: "A Tribe Called Quest", title: "Can I Kick It?", year: 1990,
    country: "us", decade: "90",
    q: "Basslinjen i “Can I Kick It?” er samplet fra hvilken Lou Reed-sang?",
    options: ["Walk on the Wild Side", "Perfect Day", "Satellite of Love", "Vicious"],
    fact: "“Can I kick it? – Yes, you can!” er et af hiphoppens mest kendte call-and-response omkvæd.",
  },
  {
    track: "6JymsaWDHk2Yj4e0yNBIFH", artist: "House of Pain", title: "Jump Around", year: 1992,
    country: "us", decade: "90",
    q: "Hvad hedder nummeret?",
    options: ["Jump Around", "Jump", "Jump On It", "Jump to It"],
    fact: "Den hylende lyd i introen er et af de mest omdiskuterede samples i hiphop.",
  },
  {
    track: "1oTHteQbmJw15rPxPVXUTv", artist: "Cypress Hill", title: "Insane in the Brain", year: 1993,
    country: "us", decade: "90",
    q: "Hvem står bag dette nummer?",
    options: ["Cypress Hill", "House of Pain", "Beastie Boys", "Naughty by Nature"],
    fact: "B-Real's nasale stemme gjorde Cypress Hill let genkendelige – nummeret er fra albummet Black Sunday.",
  },
  {
    track: "39QBkWKnap8wRSW4WB9OK0", artist: "Snoop Doggy Dogg", title: "Gin and Juice", year: 1994,
    country: "us", decade: "90",
    q: "Hvilket debutalbum er “Gin and Juice” fra?",
    options: ["Doggystyle", "The Chronic", "Tha Doggfather", "Death Row Greatest Hits"],
    fact: "Doggystyle (1993) blev produceret af Dr. Dre og gik direkte ind som nr. 1 i USA.",
  },
  {
    track: "119c93MHjrDLJTApCVGpvx", artist: "Wu-Tang Clan", title: "C.R.E.A.M.", year: 1994,
    country: "us", decade: "90",
    q: "Hvad står C.R.E.A.M. for?",
    options: ["Cash Rules Everything Around Me", "Crime Rules Every American Mind", "Cops Run Everywhere After Midnight", "Cash Rich Enemies Are Mad"],
    fact: "Nummeret er fra debutalbummet Enter the Wu-Tang (36 Chambers) og er produceret af RZA.",
  },
  {
    track: "2AP7m2dBb8ULTx4Gc1rdMc", artist: "The Notorious B.I.G.", title: "Juicy", year: 1994,
    country: "us", decade: "90",
    q: "Hvem står bag dette nummer?",
    options: ["The Notorious B.I.G.", "2Pac", "Nas", "Jay-Z"],
    fact: "“It was all a dream…” – Juicy sampler Mtumes “Juicy Fruit”.",
  },
  {
    track: "1DIXPcTDzTj8ZMHt3PDt8p", artist: "Coolio feat. L.V.", title: "Gangsta's Paradise", year: 1995,
    country: "us", decade: "90",
    q: "Hvilken film var “Gangsta's Paradise” lavet til?",
    options: ["Dangerous Minds", "Boyz n the Hood", "Menace II Society", "Friday"],
    fact: "Nummeret bygger på Stevie Wonders “Pastime Paradise” og blev årets bedst sælgende single i USA i 1995.",
  },
  {
    track: "5ioHUTWy0l5ACpS7QyGwCe", artist: "Østkyst Hustlers", title: "Han får for lidt", year: 1995,
    country: "dk", decade: "90",
    q: "Hvem står bag dette nummer?",
    options: ["Østkyst Hustlers", "Den Gale Pose", "Malk de Koijn", "Humleridderne"],
    fact: "Nummeret er fra albummet “Fuld af løgn” – Bossy Bo, Jazzy H og Glenn Rapgeneral.",
  },
  {
    track: "3vZO25GdYuqFrR1kzZADnp", artist: "Fugees", title: "Ready or Not", year: 1996,
    country: "us", decade: "90",
    q: "Hvilken sangerinde var med i Fugees?",
    options: ["Lauryn Hill", "Mary J. Blige", "Erykah Badu", "Missy Elliott"],
    fact: "Ready or Not er fra The Score – et af de bedst sælgende hiphopalbum nogensinde.",
  },
  {
    track: "33IpShLgnCLtlefaQpQUQ4", artist: "Den Gale Pose", title: "København, København", year: null,
    country: "dk", decade: "90",
    q: "Hvad hedder nummeret?",
    options: ["København, København", "Nørrebro by Night", "Vesterbro Vibes", "Hovedstaden kalder"],
    fact: "Nummeret er fra Den Gale Poses debutalbum “Definitionen af en stodder”.",
  },
  {
    track: "0weAUscowxeqDtpCgtbpgp", artist: "Will Smith", title: "Gettin' Jiggy wit It", year: 1997,
    country: "us", decade: "90",
    q: "Hvem står bag dette nummer?",
    options: ["Will Smith", "Puff Daddy", "Mase", "LL Cool J"],
    fact: "Fra soloalbummet Big Willie Style – nummeret sampler Sister Sledges “He's the Greatest Dancer”.",
  },
  {
    track: "2IA8Nv0tF9bVbnVyQOjxYG", artist: "Jokeren feat. Knox & Düreforsøg", title: "Gigolo Jesus", year: 1999,
    country: "dk", decade: "90",
    q: "Jokeren var med i hvilken dansk rapgruppe, før han gik solo?",
    options: ["Den Gale Pose", "Østkyst Hustlers", "Malk de Koijn", "Bikstok Røgsystem"],
    fact: "“Gigolo Jesus” er fra Jokerens solodebut “Alpha Han”.",
  },

  // ---------- 00'erne ----------
  {
    track: "0I3q5fE6wg7LIfHGngUTnV", artist: "OutKast", title: "Ms. Jackson", year: 2000,
    country: "us", decade: "00",
    q: "Hvad hedder nummeret?",
    options: ["Ms. Jackson", "Roses", "So Fresh, So Clean", "B.O.B."],
    fact: "“I'm sorry Ms. Jackson – I am for real!” – fra albummet Stankonia.",
  },
  {
    track: "6zsk6uF3MxfIeHPlubKBvR", artist: "Missy Elliott", title: "Get Ur Freak On", year: 2001,
    country: "us", decade: "00",
    q: "Hvilken producer stod bag beatet?",
    options: ["Timbaland", "Pharrell Williams", "Dr. Dre", "Kanye West"],
    fact: "Beatet bygger på et indisk-inspireret tumbi-riff – meget anderledes end alt andet i radioen i 2001.",
  },
  {
    track: "2vtL2eJg63cWBJvBU3iBhP", artist: "Malk de Koijn", title: "Vi tager fuglen på dig", year: 2002,
    country: "dk", decade: "00",
    q: "Hvem står bag dette nummer?",
    options: ["Malk de Koijn", "Bikstok Røgsystem", "Suspekt", "L.O.C."],
    fact: "Fra albummet Sneglzilla – Malk de Koijn består af Tue Track, Blæs Bukki og Gee.",
  },
  {
    track: "7xWiCG3N7tFgPTNGVYQoq8", artist: "Nik & Jay", title: "Hot!", year: 2002,
    country: "dk", decade: "00",
    q: "Hvad hedder nummeret?",
    options: ["Hot!", "En dag tilbage", "Elsker hende mere", "Lækker"],
    fact: "“Hot!” var med på duoens debutalbum og gjorde Nik & Jay landskendte.",
  },
  {
    track: "7mze3mJmu79AJu8SnS37pS", artist: "Outlandish", title: "Aicha", year: 2003,
    country: "dk", decade: "00",
    q: "“Aicha” er en coverversion – hvem sang den oprindeligt?",
    options: ["Khaled", "Cheb Mami", "Rachid Taha", "Faudel"],
    fact: "Khaleds original er fra 1996. Outlandish' version blev et kæmpehit i hele Europa.",
  },
  {
    track: "2PpruBYCo4H7WOBJ7Q2EwM", artist: "OutKast", title: "Hey Ya!", year: 2003,
    country: "us", decade: "00",
    q: "Hvilket OutKast-medlem står bag “Hey Ya!”?",
    options: ["André 3000", "Big Boi", "Sleepy Brown", "CeeLo Green"],
    fact: "“Shake it like a Polaroid picture!” – fra André 3000's halvdel af dobbeltalbummet The Love Below.",
  },
  {
    track: "1h1cjkVo4FEYPOeuPTgU9I", artist: "L.O.C.", title: "Frk. Escobar", year: null,
    country: "dk", decade: "00",
    q: "Hvad hedder nummeret?",
    options: ["Frk. Escobar", "Hr. Montana", "Fru Corleone", "Frk. Medellín"],
    fact: "Bag L.O.C. står rapperen Liam O'Connor.",
  },
  {
    track: "0CAJdthKDdRjB2h8YOguN6", artist: "T.I.", title: "What You Know", year: 2006,
    country: "us", decade: "00",
    q: "Hvem står bag dette nummer?",
    options: ["T.I.", "Ludacris", "Young Jeezy", "Lil Jon"],
    fact: "Fra albummet King – nummeret vandt en Grammy for bedste solo-rapnummer.",
  },
  {
    track: "2hj4INbCeEhiYsuBgAoNc8", artist: "Natasja", title: "Op med ho'det", year: 2007,
    country: "dk", decade: "00",
    q: "Hvem står bag dette nummer?",
    options: ["Natasja", "Ida Corr", "Medina", "Karen"],
    fact: "Natasja er også kendt for kæmpehittet “Calabria” sammen med Enur.",
  },
];
