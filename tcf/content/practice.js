// Practice bank for the four TCF skills.
// Listening scripts are read aloud by your browser's French voice, so you hear
// them before you see the text. Levels: A1, A2, B1, B2.
window.LISTENING = [
  { id: "l1", level: "A1", title: "At the bakery", script: "Bonjour madame. Je voudrais une baguette et deux croissants, s'il vous plaît. — Voilà. Ça fait trois euros cinquante. — Merci, bonne journée !",
    qs: [
      { q: "What does the customer buy?", o: ["One baguette and two croissants", "Two baguettes and one croissant", "Three croissants", "A cake"], a: 0 },
      { q: "How much does it cost?", o: ["€2.50", "€3.50", "€5.30", "€13.50"], a: 1 },
    ]},
  { id: "l2", level: "A1", title: "Introducing yourself", script: "Bonjour, je m'appelle Nadia. J'ai trente-deux ans. Je suis infirmière et j'habite à Laval avec mon mari et mes deux filles. Le week-end, j'aime faire de la randonnée.",
    qs: [
      { q: "How old is Nadia?", o: ["22", "23", "32", "42"], a: 2 },
      { q: "What is her job?", o: ["Doctor", "Teacher", "Nurse", "Engineer"], a: 2 },
      { q: "What does she like doing at weekends?", o: ["Swimming", "Hiking", "Cooking", "Reading"], a: 1 },
    ]},
  { id: "l3", level: "A1", title: "Train station announcement", script: "Mesdames et messieurs, le train numéro 4512 à destination de Québec partira de la voie 3 à 14 h 25. Merci de votre attention.",
    qs: [
      { q: "Where is the train going?", o: ["Montreal", "Quebec", "Ottawa", "Toronto"], a: 1 },
      { q: "From which platform?", o: ["2", "3", "13", "4"], a: 1 },
      { q: "At what time?", o: ["2:25 p.m.", "4:25 p.m.", "12:25 p.m.", "2:52 p.m."], a: 0 },
    ]},
  { id: "l4", level: "A2", title: "A phone message", script: "Salut Marc, c'est Julie. Je t'appelle parce que je ne peux pas venir au cinéma ce soir, j'ai trop de travail. On peut y aller samedi après-midi, si tu veux ? Rappelle-moi. Bisous !",
    qs: [
      { q: "Why is Julie calling?", o: ["To book tickets", "To cancel tonight's plan", "To invite Marc to dinner", "To ask for help at work"], a: 1 },
      { q: "What does she suggest?", o: ["Sunday morning", "Saturday afternoon", "Tonight later", "Next week"], a: 1 },
    ]},
  { id: "l5", level: "A2", title: "Weather forecast", script: "Demain, sur la région de Montréal, il fera froid le matin avec des températures autour de moins dix degrés. L'après-midi, la neige arrivera par l'ouest. Prudence sur les routes en soirée.",
    qs: [
      { q: "What will the temperature be in the morning?", o: ["About 10°C", "About -10°C", "About -2°C", "About 0°C"], a: 1 },
      { q: "What arrives in the afternoon?", o: ["Rain", "Sun", "Snow", "Wind"], a: 2 },
      { q: "What is the advice?", o: ["Stay home all day", "Be careful on the roads in the evening", "Take the metro", "Wear sunglasses"], a: 1 },
    ]},
  { id: "l6", level: "A2", title: "At the doctor's", script: "— Qu'est-ce qui ne va pas ? — J'ai mal à la gorge depuis trois jours et j'ai un peu de fièvre. — Je vais vous donner des médicaments. Prenez-les deux fois par jour pendant une semaine, et buvez beaucoup d'eau.",
    qs: [
      { q: "What is the problem?", o: ["Back pain for a week", "Sore throat for three days", "Headache since yesterday", "A broken arm"], a: 1 },
      { q: "How often should the patient take the medicine?", o: ["Once a day", "Twice a day", "Three times a day", "Only at night"], a: 1 },
    ]},
  { id: "l7", level: "B1", title: "Job interview", script: "Pourquoi souhaitez-vous travailler chez nous ? — J'ai cinq ans d'expérience dans la gestion de projets et votre entreprise est reconnue pour l'innovation. De plus, j'aimerais m'installer au Québec avec ma famille, et ce poste correspond parfaitement à mes compétences.",
    qs: [
      { q: "How much experience does the candidate have?", o: ["Two years", "Five years", "Ten years", "None"], a: 1 },
      { q: "Which reason does the candidate NOT give?", o: ["The company is known for innovation", "The job matches their skills", "The salary is very high", "They want to settle in Quebec"], a: 2 },
    ]},
  { id: "l8", level: "B1", title: "Radio: city news", script: "La mairie a annoncé hier la création de vingt kilomètres de nouvelles pistes cyclables d'ici la fin de l'année. L'objectif est de réduire la circulation automobile dans le centre-ville. Certains commerçants, cependant, craignent de perdre des places de stationnement.",
    qs: [
      { q: "What did the town hall announce?", o: ["New parking lots", "20 km of new bike lanes", "A new metro line", "Free buses"], a: 1 },
      { q: "What is the goal?", o: ["Reduce car traffic downtown", "Attract tourists", "Build more shops", "Lower taxes"], a: 0 },
      { q: "Who is worried, and why?", o: ["Cyclists, about safety", "Shopkeepers, about losing parking", "Drivers, about fuel prices", "Residents, about noise"], a: 1 },
    ]},
  { id: "l9", level: "B1", title: "Renting an apartment", script: "Bonjour, j'appelle pour l'annonce de l'appartement rue Saint-Denis. Est-ce qu'il est toujours disponible ? — Oui, il est libre à partir du premier juillet. Le loyer est de mille deux cents dollars par mois, chauffage inclus, mais l'électricité n'est pas comprise.",
    qs: [
      { q: "When is the apartment available?", o: ["June 1st", "July 1st", "Right now", "September 1st"], a: 1 },
      { q: "What is included in the rent?", o: ["Electricity", "Heating", "Internet", "Nothing"], a: 1 },
      { q: "How much is the rent?", o: ["$1,020", "$1,200", "$2,100", "$12,000"], a: 1 },
    ]},
  { id: "l10", level: "B2", title: "Debate: remote work", script: "Selon une étude récente, près de quarante pour cent des employés canadiens travaillent au moins un jour par semaine à domicile. Si la majorité d'entre eux affirment être plus productifs, les spécialistes soulignent néanmoins un risque d'isolement social et une frontière de plus en plus floue entre vie professionnelle et vie privée.",
    qs: [
      { q: "What proportion works from home at least one day a week?", o: ["About 14%", "About 40%", "About 60%", "Almost everyone"], a: 1 },
      { q: "What do most employees say?", o: ["They feel lonely", "They are more productive", "They want to return to the office", "They earn less"], a: 1 },
      { q: "What risk do specialists mention?", o: ["Lower salaries", "Social isolation and blurred work-life limits", "More traffic", "Less vacation"], a: 1 },
    ]},
  { id: "l11", level: "B2", title: "Science report", script: "Des chercheurs de l'Université Laval ont démontré que dormir moins de six heures par nuit pendant une période prolongée augmenterait significativement le risque de maladies cardiovasculaires. Ils recommandent donc de considérer le sommeil comme un pilier de la santé, au même titre que l'alimentation et l'activité physique.",
    qs: [
      { q: "What did the researchers study?", o: ["Diet and sport", "The effects of short sleep", "University stress", "Heart surgery"], a: 1 },
      { q: "Why is the conditional 'augmenterait' used?", o: ["It's a certain fact", "It's a reported finding, presented with caution", "It's a future plan", "It's a question"], a: 1 },
      { q: "What is the recommendation?", o: ["Sleep is as important as diet and exercise", "Sleep less and exercise more", "Avoid coffee", "See a doctor every month"], a: 0 },
    ]},
  { id: "l12", level: "B2", title: "Cultural interview", script: "Ce qui m'a le plus frappée en arrivant à Montréal, ce n'est pas tant le froid que la chaleur des gens. Bien sûr, il a fallu m'adapter à l'accent québécois et à certaines expressions, mais au bout de quelques mois, je me sentais déjà chez moi.",
    qs: [
      { q: "What struck the speaker most?", o: ["The cold", "The warmth of the people", "The prices", "The architecture"], a: 1 },
      { q: "What did she have to adapt to?", o: ["The food", "The Quebec accent and expressions", "Driving in snow", "Working hours"], a: 1 },
      { q: "How did she feel after a few months?", o: ["Homesick", "At home", "Still lost", "Ready to leave"], a: 1 },
    ]},
];

window.READING = [
  { id: "r1", level: "A1", title: "A notice", text: "PISCINE MUNICIPALE\nHoraires : du lundi au vendredi, de 7 h à 21 h. Samedi et dimanche : de 9 h à 18 h.\nLe bonnet de bain est obligatoire.\nFermée le 25 décembre et le 1er janvier.",
    qs: [
      { q: "When does the pool open on Saturday?", o: ["7 a.m.", "9 a.m.", "6 p.m.", "9 p.m."], a: 1 },
      { q: "What is compulsory?", o: ["A towel", "A swimming cap", "A membership card", "Sandals"], a: 1 },
    ]},
  { id: "r2", level: "A1", title: "A text message", text: "Coucou Léa ! Je suis en retard, mon bus n'est pas arrivé. Je serai au café à 18 h 30 au lieu de 18 h. Commande un thé pour moi, s'il te plaît. Bises, Amina",
    qs: [
      { q: "Why is Amina late?", o: ["She missed her alarm", "Her bus didn't come", "She is working", "She is ill"], a: 1 },
      { q: "What should Léa do?", o: ["Wait outside", "Order a tea for Amina", "Call Amina", "Go home"], a: 1 },
    ]},
  { id: "r3", level: "A2", title: "Job advert", text: "Restaurant Le Saint-Laurent recherche un serveur ou une serveuse à temps partiel (20 heures par semaine), principalement le soir et le week-end. Expérience souhaitée mais non obligatoire. Français et anglais exigés. Envoyez votre CV à emplois@lesaintlaurent.ca avant le 15 mars.",
    qs: [
      { q: "What kind of job is it?", o: ["Full-time cook", "Part-time waiter/waitress", "Weekend cleaner", "Manager"], a: 1 },
      { q: "Is experience required?", o: ["Yes, compulsory", "Preferred but not compulsory", "No, it's not wanted", "The text doesn't say"], a: 1 },
      { q: "Which languages are required?", o: ["French only", "English only", "French and English", "Any language"], a: 2 },
    ]},
  { id: "r4", level: "A2", title: "An email from a landlord", text: "Bonjour Monsieur Haddad,\nJe vous informe que des travaux de peinture auront lieu dans l'immeuble du 3 au 7 juin. Pendant cette période, l'ascenseur sera hors service. Nous nous excusons pour la gêne occasionnée.\nCordialement,\nLa gestion de l'immeuble",
    qs: [
      { q: "What will happen from June 3 to 7?", o: ["Electricity cuts", "Painting work", "A party", "Water cuts"], a: 1 },
      { q: "What won't work during this time?", o: ["The heating", "The elevator", "The doors", "The internet"], a: 1 },
    ]},
  { id: "r5", level: "B1", title: "Article: urban gardens", text: "À Montréal, les jardins communautaires connaissent un succès grandissant. On en compte aujourd'hui près d'une centaine. Pour une somme modique, les habitants peuvent louer une petite parcelle et cultiver leurs propres légumes. Au-delà de l'aspect économique, ces espaces favorisent les rencontres entre voisins de cultures différentes. Le seul problème : les listes d'attente, qui peuvent dépasser deux ans dans certains quartiers.",
    qs: [
      { q: "How many community gardens are there?", o: ["About 10", "About 100", "About 1,000", "Two"], a: 1 },
      { q: "Besides saving money, what is a benefit?", o: ["Meeting neighbours from different cultures", "Selling vegetables", "Free housing", "Sports activities"], a: 0 },
      { q: "What is the main problem?", o: ["High prices", "Long waiting lists", "Bad weather", "Noise"], a: 1 },
    ]},
  { id: "r6", level: "B1", title: "Opinion letter", text: "Madame la Rédactrice,\nJe lis avec inquiétude que la bibliothèque de notre quartier pourrait fermer faute de budget. Pour beaucoup de familles, c'est le seul endroit où les enfants peuvent faire leurs devoirs au calme et accéder gratuitement à Internet. Fermer ce lieu serait une grave erreur. Je propose plutôt de réduire les heures d'ouverture le matin, quand la fréquentation est faible.",
    qs: [
      { q: "What is the writer worried about?", o: ["A new tax", "The possible closure of the library", "Noisy children", "Internet prices"], a: 1 },
      { q: "What does the writer suggest?", o: ["Closing the library", "Charging for Internet", "Reducing morning opening hours", "Building a new school"], a: 2 },
      { q: "What is the writer's tone?", o: ["Enthusiastic", "Concerned but constructive", "Indifferent", "Humorous"], a: 1 },
    ]},
  { id: "r7", level: "B2", title: "Article: fast fashion", text: "La « mode rapide » repose sur un principe simple : proposer en permanence de nouvelles collections à bas prix. Si ce modèle a démocratisé l'accès aux vêtements, son coût environnemental est considérable. L'industrie textile serait responsable d'environ 10 % des émissions mondiales de gaz à effet de serre. Face à ce constat, de plus en plus de consommateurs se tournent vers la seconde main, tandis que certains gouvernements envisagent de taxer les articles les moins durables.",
    qs: [
      { q: "What is the principle of fast fashion?", o: ["High-quality clothes that last", "Constant new collections at low prices", "Only second-hand clothes", "Local production"], a: 1 },
      { q: "What positive effect is mentioned?", o: ["It made clothes accessible to more people", "It reduced pollution", "It created taxes", "It improved quality"], a: 0 },
      { q: "'serait responsable' suggests the figure is…", o: ["certain and official", "an estimate reported with caution", "false", "a future goal"], a: 1 },
      { q: "Which reaction is mentioned?", o: ["Banning all clothes shops", "Buying second-hand", "Making clothes at home", "Boycotting cotton"], a: 1 },
    ]},
  { id: "r8", level: "B2", title: "Essay extract: screens and children", text: "Faut-il interdire les écrans aux enfants de moins de six ans ? Certes, une exposition excessive peut nuire au développement du langage et au sommeil. Toutefois, une interdiction totale paraît irréaliste dans une société où le numérique est omniprésent. Plutôt que d'interdire, il semblerait plus judicieux d'accompagner les enfants, en limitant la durée d'utilisation et en privilégiant des contenus éducatifs regardés en famille.",
    qs: [
      { q: "What is the author's position?", o: ["Ban screens completely", "Screens have no risks", "Supervise and limit rather than ban", "Children should have their own phones"], a: 2 },
      { q: "Which risk is mentioned?", o: ["Obesity", "Language development and sleep", "Bad grades in math", "Violence"], a: 1 },
      { q: "'Certes… Toutefois…' introduces…", o: ["two examples", "a concession then a counter-argument", "a conclusion", "a list of causes"], a: 1 },
    ]},
];

// Writing: TCF Canada Expression écrite (3 tasks, 60 minutes in total).
window.WRITING = [
  { id: "w1", task: 1, level: "A2", min: 60, max: 120, prompt: "Vous venez d'emménager dans un nouvel appartement. Écrivez un message à votre ami(e) pour l'inviter à une petite fête. Précisez la date, l'heure, l'adresse et ce qu'il/elle doit apporter.",
    en: "You've just moved into a new apartment. Write a message inviting your friend to a small party: date, time, address and what to bring.",
    model: "Salut Sophie !\nJ'ai enfin déménagé ! Mon nouvel appartement est petit mais très lumineux. Pour fêter ça, j'organise une petite soirée samedi 14 septembre à partir de 19 h. L'adresse : 25, rue des Érables, appartement 3, à Laval. Il y aura des amis du travail et mes voisins. Est-ce que tu pourrais apporter un dessert ? Je m'occupe des boissons et du repas. Réponds-moi avant jeudi, s'il te plaît.\nÀ samedi, j'espère !\nKarim" },
  { id: "w2", task: 1, level: "A2", min: 60, max: 120, prompt: "Vous ne pouvez pas aller au travail demain. Écrivez un courriel à votre responsable pour l'informer, expliquer pourquoi et proposer une solution.",
    en: "You can't go to work tomorrow. Email your manager: inform, explain why, propose a solution.",
    model: "Bonjour Madame Tremblay,\nJe vous écris pour vous informer que je ne pourrai pas venir au bureau demain, mardi. Mon fils est malade et je dois l'emmener chez le médecin le matin. Je pourrai cependant travailler à distance l'après-midi et répondre aux courriels urgents. Je vous propose aussi de déplacer notre réunion à mercredi 10 h.\nJe vous remercie de votre compréhension.\nCordialement,\nYasmine Benali" },
  { id: "w3", task: 1, level: "A2", min: 60, max: 120, prompt: "Vous avez vu une annonce pour un cours de cuisine. Écrivez un message pour demander des informations (prix, horaires, niveau, matériel).",
    en: "You saw an ad for a cooking class. Write asking for information (price, schedule, level, equipment)." },
  { id: "w4", task: 1, level: "A2", min: 60, max: 120, prompt: "Votre voisin fait souvent du bruit le soir. Écrivez-lui un message poli pour expliquer le problème et proposer une solution.",
    en: "Your neighbour is often noisy in the evening. Write a polite message explaining the problem and proposing a solution." },
  { id: "w5", task: 2, level: "B1", min: 120, max: 150, prompt: "Vous écrivez un article pour le blog de votre ville : racontez votre premier hiver au Canada (ou un souvenir de voyage marquant). Décrivez ce qui s'est passé et ce que vous avez ressenti.",
    en: "Write a blog article: tell about your first winter in Canada (or a memorable trip). Describe what happened and how you felt.",
    model: "Mon premier hiver à Montréal\nJe suis arrivé à Montréal en décembre 2024. Je me souviens très bien du premier matin : il faisait moins vingt degrés et la ville était complètement blanche. J'étais à la fois émerveillé et un peu inquiet, car je n'avais jamais vu autant de neige ! Mes voisins m'ont tout de suite conseillé d'acheter un vrai manteau et des bottes chaudes. Le week-end suivant, ils m'ont emmené patiner au parc La Fontaine. Au début, je tombais tout le temps, mais tout le monde riait avec moi. Ce jour-là, j'ai compris que l'hiver québécois n'est pas seulement une saison difficile : c'est aussi un moment de partage. Aujourd'hui, j'attends la première neige avec impatience. Mon conseil aux nouveaux arrivants : sortez, même quand il fait froid !" },
  { id: "w6", task: 2, level: "B1", min: 120, max: 150, prompt: "Pour le journal de votre entreprise, présentez une activité que vous pratiquez pendant votre temps libre et expliquez pourquoi vous la recommandez à vos collègues.",
    en: "For your company newsletter, present a free-time activity you do and explain why you recommend it." },
  { id: "w7", task: 2, level: "B1", min: 120, max: 150, prompt: "Sur un forum, une personne demande des conseils pour apprendre une langue étrangère. Partagez votre expérience et donnez vos conseils.",
    en: "On a forum, someone asks for advice on learning a foreign language. Share your experience and give advice." },
  { id: "w8", task: 3, level: "B2", min: 120, max: 180, prompt: "Document 1 : « Le télétravail améliore la qualité de vie : moins de transport, plus de temps en famille. »\nDocument 2 : « Le télétravail isole les salariés et nuit à l'esprit d'équipe. »\nPartie 1 (40–60 mots) : résumez les deux points de vue. Partie 2 (80–120 mots) : donnez votre opinion argumentée.",
    en: "Two documents on remote work (for / against). Part 1: summarise both views (40–60 words). Part 2: give your argued opinion (80–120 words).",
    model: "Ces deux documents abordent le télétravail. Le premier affirme qu'il améliore la qualité de vie, car il réduit les trajets et laisse plus de temps pour la famille. Le second, au contraire, estime qu'il isole les employés et affaiblit l'esprit d'équipe.\n\nÀ mon avis, le télétravail est une bonne solution, à condition de ne pas l'imposer à temps plein. D'abord, il permet d'économiser du temps et de l'argent : par exemple, je gagnais deux heures par jour quand je travaillais à la maison. De plus, il réduit la pollution liée aux transports. Certes, le risque d'isolement existe, mais il peut être limité par des journées obligatoires au bureau. En conclusion, un modèle hybride me semble le meilleur équilibre." },
  { id: "w9", task: 3, level: "B2", min: 120, max: 180, prompt: "Document 1 : « Les réseaux sociaux permettent de rester en contact avec ses proches partout dans le monde. »\nDocument 2 : « Les réseaux sociaux créent de la dépendance et diffusent de fausses informations. »\nPartie 1 : résumez. Partie 2 : votre opinion.",
    en: "Social media: keeps people connected vs creates addiction and fake news. Summarise, then give your opinion." },
  { id: "w10", task: 3, level: "B2", min: 120, max: 180, prompt: "Document 1 : « Vivre en ville offre plus d'emplois, de services et de loisirs. »\nDocument 2 : « La vie à la campagne est plus calme, moins chère et meilleure pour la santé. »\nPartie 1 : résumez. Partie 2 : votre opinion.",
    en: "City life vs country life. Summarise both documents, then give your opinion." },
  { id: "w11", task: 3, level: "B2", min: 120, max: 180, prompt: "Document 1 : « Les voitures électriques sont l'avenir et protègent l'environnement. »\nDocument 2 : « Les voitures électriques sont trop chères et leurs batteries polluent. »\nPartie 1 : résumez. Partie 2 : votre opinion.",
    en: "Electric cars: the future vs too expensive and batteries pollute. Summarise, then give your opinion." },
];

// Speaking: TCF Canada Expression orale (3 tasks, about 12 minutes).
window.SPEAKING = [
  { id: "s1", task: 1, prep: 0, time: 120, prompt: "Présentez-vous : votre nom, votre pays, votre famille, votre travail, vos loisirs et vos projets.",
    en: "Introduce yourself: name, country, family, job, hobbies, plans. (Guided interview, 2 minutes, no preparation.)",
    model: "Bonjour, je m'appelle Ahmed, j'ai trente-quatre ans et je viens d'Égypte. J'habite au Caire avec ma femme et mes deux enfants. Je suis comptable dans une entreprise internationale depuis huit ans. Pendant mon temps libre, j'aime jouer au football et lire des romans. J'apprends le français parce que nous avons le projet d'immigrer au Canada, probablement à Montréal. J'aimerais continuer à travailler dans la finance et faire découvrir l'hiver canadien à mes enfants !" },
  { id: "s2", task: 1, prep: 0, time: 120, prompt: "Parlez de votre journée typique et de votre ville.", en: "Talk about your typical day and your city." },
  { id: "s3", task: 2, prep: 120, time: 330, prompt: "Vous voulez vous inscrire dans une salle de sport. Posez des questions à l'employé (l'examinateur) pour obtenir des informations : prix, horaires, cours, équipement…",
    en: "You want to join a gym. Ask the employee (examiner) questions: price, hours, classes, equipment… (2 min prep, 5 min 30 talk.)",
    model: "Bonjour, je voudrais quelques informations sur votre salle. Quels sont vos horaires d'ouverture ? Est-ce que vous êtes ouverts le dimanche ? Combien coûte l'abonnement mensuel ? Y a-t-il une réduction si je m'inscris pour un an ? Quels cours collectifs proposez-vous, par exemple du yoga ou de la natation ? Est-ce qu'il faut réserver les cours à l'avance ? Y a-t-il un coach pour les débutants ? Est-ce que je peux faire une séance d'essai gratuite ? Merci beaucoup, je vais réfléchir." },
  { id: "s4", task: 2, prep: 120, time: 330, prompt: "Vous cherchez un appartement à louer. Vous appelez le propriétaire (l'examinateur). Posez-lui des questions.", en: "You're looking to rent an apartment. Ask the landlord questions." },
  { id: "s5", task: 2, prep: 120, time: 330, prompt: "Un collègue (l'examinateur) revient d'un voyage au Québec. Posez-lui des questions sur son séjour.", en: "A colleague is back from a trip to Quebec. Ask about the stay." },
  { id: "s6", task: 2, prep: 120, time: 330, prompt: "Vous voulez inscrire votre enfant dans une école de langues. Posez des questions à la secrétaire.", en: "You want to enrol your child in a language school. Ask the secretary questions." },
  { id: "s7", task: 3, prep: 0, time: 270, prompt: "« Le télétravail devrait devenir la norme. » Êtes-vous d'accord ? Justifiez votre opinion.",
    en: "'Remote work should become the norm.' Do you agree? Justify. (4 min 30, no preparation.)",
    model: "À mon avis, le télétravail ne devrait pas devenir la norme absolue, mais une option. D'un côté, il présente de vrais avantages : on gagne du temps de transport, on pollue moins et on peut mieux organiser sa vie familiale. Par exemple, mon frère travaille à la maison trois jours par semaine et il est beaucoup moins stressé. D'un autre côté, travailler seul tous les jours peut isoler et rendre la communication plus difficile. Certains métiers, comme infirmier ou cuisinier, sont d'ailleurs impossibles à distance. C'est pourquoi je pense qu'un modèle hybride est la meilleure solution : deux ou trois jours au bureau, le reste à la maison. En conclusion, il faut laisser le choix aux entreprises et aux employés." },
  { id: "s8", task: 3, prep: 0, time: 270, prompt: "« Les enfants passent trop de temps devant les écrans. » Qu'en pensez-vous ?", en: "'Children spend too much time in front of screens.' What do you think?" },
  { id: "s9", task: 3, prep: 0, time: 270, prompt: "« Il vaut mieux vivre à la campagne qu'en ville. » Donnez votre opinion.", en: "'It's better to live in the countryside than in the city.' Your opinion." },
  { id: "s10", task: 3, prep: 0, time: 270, prompt: "« Fumer devrait être interdit dans tous les lieux publics, même dans la rue. » Êtes-vous d'accord ?", en: "'Smoking should be banned in all public places, even in the street.' Do you agree?" },
  { id: "s11", task: 3, prep: 0, time: 270, prompt: "« Les hommes et les femmes ont aujourd'hui les mêmes chances au travail. » Qu'en pensez-vous ?", en: "'Men and women now have equal opportunities at work.' What do you think?" },
  { id: "s12", task: 3, prep: 0, time: 270, prompt: "« Apprendre une deuxième langue devrait être obligatoire dès l'école primaire. » Êtes-vous d'accord ?", en: "'Learning a second language should be compulsory from primary school.' Do you agree?" },
  { id: "s13", task: 3, prep: 0, time: 270, prompt: "« Les voyages forment la jeunesse. » Êtes-vous d'accord ?", en: "'Travel educates young people.' Do you agree?" },
  { id: "s14", task: 3, prep: 0, time: 270, prompt: "« Le sport à l'école est aussi important que les mathématiques. » Qu'en pensez-vous ?", en: "'Sport at school is as important as maths.' What do you think?" },
];

// Real-life speaking situations (Practical conversation level from the program).
window.SITUATIONS = [
  { id: "restaurant", title: "Restaurant", icon: "🍴", lines: ["Bonsoir, une table pour deux, s'il vous plaît.", "Qu'est-ce que vous me conseillez ?", "Je vais prendre le plat du jour.", "Est-ce que c'est épicé ?", "L'addition, s'il vous plaît.", "Est-ce que je peux payer par carte ?"] },
  { id: "airport", title: "Airport", icon: "✈️", lines: ["Où se trouve le comptoir d'enregistrement ?", "Je voudrais un siège côté hublot.", "Mon vol a été annulé, que dois-je faire ?", "Ma valise n'est pas arrivée.", "À quelle heure commence l'embarquement ?", "C'est quelle porte ?"] },
  { id: "gym", title: "Gym", icon: "🏋️", lines: ["Je voudrais m'inscrire.", "Combien coûte l'abonnement mensuel ?", "Est-ce qu'il y a des cours de yoga ?", "Où sont les vestiaires ?", "Pouvez-vous me montrer comment utiliser cette machine ?", "Est-ce que la salle est ouverte le dimanche ?"] },
  { id: "work", title: "At work", icon: "💼", lines: ["Je suis désolé(e) pour le retard.", "Pourriez-vous m'envoyer le document ?", "Je ne suis pas disponible jeudi, mais vendredi me convient.", "Est-ce qu'on peut reporter la réunion ?", "J'ai une question sur mon contrat.", "Je vais m'en occuper tout de suite."] },
  { id: "travel", title: "Travel agency", icon: "🧳", lines: ["Je voudrais réserver un voyage à Québec.", "Est-ce que le petit-déjeuner est inclus ?", "Quelles sont les dates disponibles ?", "Est-ce qu'on peut annuler sans frais ?", "Combien coûte le séjour pour deux personnes ?", "Je préfère un hôtel au centre-ville."] },
  { id: "doctor", title: "Doctor & pharmacy", icon: "🩺", lines: ["Je voudrais prendre rendez-vous avec un médecin.", "J'ai mal au dos depuis une semaine.", "Je suis allergique à la pénicilline.", "Combien de fois par jour dois-je le prendre ?", "Est-ce que j'ai besoin d'une ordonnance ?", "Avez-vous quelque chose contre la toux ?"] },
];
