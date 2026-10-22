# Kanivo — Rapport d'analyse

> **Problème :** chaque saison des pluies, Abidjan compte ses morts. Ce n'est pas seulement la pluie qui tue. Ce sont des caniveaux bouchés que personne ne voit, des alertes qui n'arrivent pas jusqu'aux quartiers et des familles qui reviennent vivre sur des pentes déjà évacuées.
>
> **Proposition :** *Kanivo*, une plateforme citoyenne et prédictive qui relie trois boucles aujourd'hui séparées : **voir** (signalement des caniveaux obstrués), **prioriser** (score de risque hyperlocal pour orienter le curage) et **prévenir** (alerte « dernier kilomètre » en SMS, vocal et WhatsApp, en langues locales).

*Rapport rédigé le 22 octobre 2026. Tous les chiffres sont datés et sourcés en fin de document. Les estimations propres à Kanivo sont signalées comme telles.*

---

## 1. Le problème en chiffres

| Indicateur | Valeur | Source |
|---|---|---|
| Morts annoncés après les pluies du 28-29 juin 2026 | **59** (dont ~20 à Attécoubé) | Gouvernement, Conseil des ministres du 1er juillet 2026 [1] |
| Morts lors des pluies du 13 au 22 juin 2024 | **24** + 2 disparus | ONPC, juin 2024 [2] |
| Morts dans la nuit du 18 au 19 juin 2018 | **18** | Presse internationale, juin 2018 [3] |
| Bâtiments résidentiels endommagés (juin 2018) | **~1 140** | Banque mondiale / GFDRR, PDNA [4] |
| Part du district exposée aux inondations et glissements de terrain | **> 26 %** | GFDRR City Scan [5] |
| Routes principales / écoles / hôpitaux en zone inondable | **22 % / 23 % / 18 %** | GFDRR City Scan [5] |
| Perte probable (période de retour de 100 ans), toutes inondations, Côte d'Ivoire | **≈ 443 M$** (modélisée) | UNDRR, profil de risque [6] |
| Déchets solides produits chaque jour à Abidjan | **≈ 5 000 t** | Ministre de l'Hydraulique, de l'Assainissement et de la Salubrité, mars 2026 [7] |
| Écart historique entre production et collecte | 5 000 t produites contre 3 000 t collectées par jour | ANASUR 2016, repris par ONU-Habitat [8] |
| Population du District autonome d'Abidjan | **6 321 017** (RGPH 2021), soit 21,5 % du pays | INS, RGPH 2021 [9] |
| Pluies extrêmes en grande saison (mai à juillet) | **> 200 mm en moins de 24 h** possibles | DG Trésor (FASEP vigilance météo) [10] |
| Abonnements mobiles actifs (oct. 2025) | **49,7 M**, soit 151 % de la population | DataReportal 2026 [11] |

**Lecture :** le pays dispose d'un parc mobile massif, d'un réseau de pluviomètres et d'investissements lourds en infrastructures. Pourtant, le bilan humain ne baisse pas. Le maillon manquant n'est pas la donnée météo : c'est la **coordination de terrain**, avant et pendant la pluie.

---

## 2. Analyse des causes

### 2.1 Arbre des causes

1. **Le drainage est saturé ou obstrué.**
   - Les caniveaux sont bouchés par les déchets, les sédiments et les constructions. La Banque mondiale cite explicitement *« drains clogged by sedimentation, solid waste and construction »* [4].
   - Il manque environ 2 000 t de collecte par jour (estimation 2016) [8]. Les déchets non collectés finissent dans les caniveaux.
   - Le curage est surtout réactif : il intervient après l'inondation, au lieu de précéder la saison.
2. **L'urbanisation a dépassé la planification.**
   - La population du district a plus que doublé depuis 2001, alors que la planification urbaine n'a pas suivi [5].
   - Des bassins d'orage et des talwegs sont occupés par des habitations [2].
3. **Des habitants restent ou reviennent dans les zones à risque.**
   - En 2026, des familles avaient « recolonisé » des sites dont elles avaient été déplacées, notamment à Attécoubé [1].
   - Les causes sont la pression foncière, le manque d'alternatives de relogement et une perception du risque émoussée.
4. **L'alerte n'atteint pas le dernier kilomètre.**
   - La chaîne SODEXAM → CICG → communes → population passe surtout par WhatsApp et des relais bénévoles [12].
   - Les messages sont génériques (« fortes pluies sur Abidjan »), pas assez localisés ni actionnables.
   - La barrière de la langue et de l'alphabétisation pèse : une partie des habitants des quartiers précaires ne lit pas le français.

### 2.2 Cartographie des acteurs

| Acteur | Rôle | Ce qui lui manque |
|---|---|---|
| **SODEXAM** (météo) | Prévision, vigilance, 53 stations pluviométriques [13] | Un canal de diffusion fin, quartier par quartier |
| **ONPC** (Protection civile) | Zones à risque, secours, évacuation | Une vision temps réel du terrain, avec des retours citoyens |
| **ANAGED** (Gestion des déchets) | Collecte, pré-collecte, curage | Une priorisation fondée sur le risque, et des preuves d'intervention |
| **Ministère de l'Assainissement / de la Salubrité** | Politique, grands travaux (Gourou, PAACA) | Des indicateurs de performance par bassin versant |
| **District et 13 communes** | Salubrité de proximité, brigades | Des outils numériques et le suivi des équipes |
| **Bailleurs** (Banque mondiale, BAD, AFD) | Financent les infrastructures (315 M$ Banque mondiale [14], PAACA de 48,4 M€ BAD [15]) | Une mesure d'impact et l'entretien des ouvrages après livraison |
| **Opérateurs télécoms** (Orange, MTN, Moov) | Couverture mobile, SMS, *cell broadcast* | Un cadre et des contenus d'alerte prêts à diffuser |
| **Citoyens, chefs de quartier, associations de jeunes** | Premiers témoins et premiers secours | Un moyen simple de signaler et d'être entendus |

### 2.3 L'existant et ses limites

| Dispositif | Ce qu'il apporte | Pourquoi ça ne suffit pas |
|---|---|---|
| Grands travaux de drainage (Gourou, BAD 2017-2020 ; PAACA 2021-2026 : 16,15 km de canaux) [15][16] | Capacité hydraulique accrue | Un ouvrage neuf bouché par les déchets perd sa capacité en une saison. **L'entretien n'est pas piloté par la donnée.** |
| Vigilance météo SODEXAM, VIGICLIMM, capteurs HD Rain (2021-2022) [10][17] | Bonne connaissance des précipitations | La donnée s'arrête au niveau institutionnel. **Pas de message hyperlocal et actionnable.** |
| Diffusion des alertes via WhatsApp et relais bénévoles [12] | Rapide et gratuite | Hétérogène et non traçable. **On ne sait pas qui a reçu l'alerte, ni qui a agi.** |
| Opérations de déguerpissement | Retirent des personnes du danger | Sans suivi ni accompagnement, **les sites sont réoccupés** [1] |

**Diagnostic :** les acteurs travaillent en silos. **Personne ne relie l'état réel des caniveaux, la pluie prévue et les personnes exposées.** C'est précisément ce que permet le numérique.

---

## 3. La solution : Kanivo

> *Kanivo* vient de « caniveau », écrit comme on le prononce à Abidjan. Le nom dit l'ambition : rendre visible l'infrastructure invisible.

### 3.1 Les quatre modules

| Module | Pour qui | Ce qu'il fait |
|---|---|---|
| **1. Signal** (WhatsApp, USSD `*700#`, application légère) | Citoyens, chefs de quartier, brigades | Signalement d'un caniveau obstrué en 20 secondes : photo, position GPS, gravité. Un modèle de vision estime le taux d'obstruction et détecte les doublons. Le signaleur reçoit un retour (« pris en charge », « curé ») avec photo avant/après. |
| **2. Carte de risque** (score hyperlocal) | ANAGED, communes, ONPC | Score par îlot de 250 m, actualisé toutes les heures : `risque = pluie prévue (SODEXAM) × obstruction des caniveaux × pente et topographie × densité de population exposée`. |
| **3. Curage priorisé** (tableau de bord et appli terrain) | ANAGED, brigades communales, prestataires | Ordres de mission générés selon le risque, tournées optimisées, preuve d'intervention (photo géolocalisée et horodatée), indicateurs par commune. Paiement des prestataires indexé sur le résultat. |
| **4. Alerte dernier kilomètre** | Habitants des zones à risque | Alertes géociblées 6 à 24 h avant l'épisode : SMS, message vocal en **dioula, baoulé, nouchi** et français, WhatsApp, *cell broadcast*. Chaque alerte donne **une action concrète** (« quittez la zone, refuge : EPP Mossikro 2 ») et un accusé de réception (« tapez 1 si vous êtes en sécurité »). |

### 3.2 Leviers d'adoption

- **Récompense du signalement :** crédit mobile money ou forfait data pour chaque signalement validé, plafonné et contrôlé contre la fraude.
- **Brigades vertes :** des jeunes de chaque quartier, formés et rémunérés à la tâche, qui vérifient les signalements et assurent le micro-curage.
- **Transparence publique :** classement des communes par « caniveaux curés avant la saison », publié chaque mois.
- **Hors-ligne d'abord :** USSD et SMS fonctionnent sans smartphone ni data. L'application web progressive fonctionne en mode dégradé.

### 3.3 Modèle économique

| Source de revenus | Payeur | Hypothèse (estimation Kanivo) |
|---|---|---|
| Licence SaaS publique (tableau de bord, carte de risque, ordres de mission) | District, ANAGED, communes | 13 communes × 3 à 6 M FCFA/an, plus un contrat district |
| Composante « résilience et entretien » des projets financés | Banque mondiale, BAD, AFD | 1 à 2 % des enveloppes d'infrastructures dédiés au suivi et à l'entretien |
| Données de risque pour l'assurance paramétrique et la micro-assurance | Assureurs, réassureurs, ARC | Accès API, au volume |
| RSE et coût du canal SMS / *cell broadcast* | Opérateurs télécoms | Diffusion d'alertes d'intérêt public gratuite ou à prix coûtant |

### 3.4 Feuille de route

| Phase | Période | Livrables | Indicateur de succès |
|---|---|---|---|
| **0. Cadrage** | Nov. 2026 – Janv. 2027 | Convention avec l'ANAGED et 2 communes pilotes (Attécoubé, Abobo), accord SODEXAM sur les données | Protocole signé |
| **1. Pilote Signal** | Févr. – Avr. 2027 | Bot WhatsApp et USSD, 100 Brigades vertes, cartographie de 100 % des caniveaux primaires des 2 communes | ≥ 5 000 signalements validés |
| **2. Avant-saison** | Avr. – Mai 2027 | Carte de risque v1, ordres de curage priorisés | ≥ 80 % des points critiques curés avant le 15 mai |
| **3. Saison des pluies** | Mai – Juil. 2027 | Alertes géociblées multilingues, accusés de réception | Délai alerte → réception < 15 min, taux de réception ≥ 70 % |
| **4. Passage à l'échelle** | 2028 | 13 communes, ouverture de l'API aux assureurs, villes secondaires (San-Pédro, Bouaké) | Baisse mesurée des victimes et des points noirs |

### 3.5 Impact visé (hypothèses à valider en pilote)

- **Vies :** réduire fortement la mortalité liée aux inondations dans les communes pilotes, grâce à l'évacuation anticipée et au curage préventif. En 2026, le gouvernement a lui-même constaté que l'évacuation avait évité des victimes là où les consignes avaient été suivies [1].
- **Infrastructures :** préserver la capacité des ouvrages déjà financés (des centaines de millions de dollars).
- **Emploi :** environ 1 300 Brigades vertes à l'échelle du district (100 par commune).
- **Gouvernance :** pour la première fois, des indicateurs publics d'entretien du drainage.

### 3.6 Risques et parades

| Risque | Probabilité | Parade |
|---|---|---|
| Faible adoption citoyenne | Moyenne | Canaux sans smartphone (USSD, SMS, vocal), récompense, relais des chefs de quartier |
| Signalements frauduleux pour la récompense | Élevée | Vérification par IA (doublons, EXIF, géofence), contrôle aléatoire par les brigades, plafonds |
| Absence de suivi après signalement, d'où une perte de confiance | Élevée | Indicateurs publics, engagement de délai, paiement des prestataires au résultat |
| Accès aux données météo | Moyenne | Convention SODEXAM, et à défaut sources ouvertes (satellite GPM/IMERG) |
| Protection des données personnelles (loi 2013-450, ARTCI) | Moyenne | Minimisation, anonymisation des signaleurs, hébergement conforme, analyse d'impact |
| Fausses alertes et lassitude | Moyenne | Seuils calibrés, niveaux d'alerte gradués, retour d'expérience après chaque épisode |
| Dépendance politique et budgétaire | Moyenne | Financement mixte (bailleurs, collectivités, assureurs), code ouvert pour garantir la réversibilité |

---

## 4. Sources

1. Fratmat.info via AllAfrica, *Pluies diluviennes à Abidjan : le gouvernement annonce 59 morts*, 1er juillet 2026. <https://fr.allafrica.com/stories/202607010683.html>
2. Le360 Afrique, *Côte d'Ivoire : inondations mortelles à Abidjan, des milliers de sans-abri*, juin 2024. <https://afrique.le360.ma/societe/cote-divoire-inondations-mortelles-a-abidjan-des-milliers-de-sans-abri_2H7PG7CJ5VHCPMHUCA5SGL2544/> et AllAfrica, juin 2024. <https://fr.allafrica.com/stories/202406150043.html>
3. RTBF, *Côte d'Ivoire : 18 morts à Abidjan après des pluies torrentielles*, juin 2018. <https://www.rtbf.be/article/cote-d-ivoire-18-morts-a-abidjan-apres-des-pluies-torrentielles-9950414> et Vatican News, juin 2018. <https://www.vaticannews.va/fr/eglise/news/2018-06/cote-ivoire-inondations-abidjan-eveques-message-victimes.html>
4. Banque mondiale, *Urban Resilience and Solid Waste Management Project* (P168308), document de projet. <https://ewsdata.rightsindevelopment.org/files/documents/08/WB-P168308.pdf> et GFDRR, *PDNA Côte d'Ivoire*. <https://www.gfdrr.org/en/cote-divoire-post-disaster-needs-assessment-recovery-framework-and-technical-studies-urban>
5. GFDRR, *Results in Resilience: Informing urban resilience planning in Côte d'Ivoire*. <https://www.gfdrr.org/en/feature-story/results-resilience-informing-urban-resilience-planning-cote-divoire>
6. UNDRR, *Risk and Resilience Country Profile — Côte d'Ivoire*. <https://www.undrr.org/quick/101888>
7. AllAfrica, *Gestion des déchets à Abidjan : Amédé Kouakou inspecte les sites d'Anguédédou et de Kossihouen*, mars 2026. <https://fr.allafrica.com/stories/202603130497.html>
8. ONU-Habitat, *Profil urbain d'Abidjan* (données ANASUR 2016). <https://unhabitat.org/sites/default/files/2022/07/abidjan_fr.pdf>
9. Économie ivoirienne, *District autonome d'Abidjan* (INS, RGPH 2021). <https://economie-ivoirienne.ci/pole-competitif/district-autonome-dabidjan.html> et Abidjan.net, résultats définitifs du RGPH 2021. <https://news.abidjan.net/articles/710138/resultats-globaux-definitifs-du-rgph-2021-la-population-vivant-habituellement-sur-le-territoire-ivoirien-se-chiffre-a-29-389-150-habitants>
10. DG Trésor, *Histoire de FASEP : système de vigilance météorologique à Abidjan*, août 2022. <https://www.tresor.economie.gouv.fr/Articles/2022/08/05/histoire-de-fasep-mise-en-place-d-un-systeme-de-vigilance-meteorologique-a-abidjan>
11. Digital Mag CI, *Chiffres sur les usages du mobile et de l'Internet en Côte d'Ivoire* (DataReportal 2026). <https://digitalmag.ci/?p=37208>
12. AIP, interview sur la chaîne d'alerte (CICG, WhatsApp, secouristes bénévoles). <https://www.aip.ci/?p=10184>
13. Fratmat, *L'ONPC offre 7 postes pluviométriques automatiques à la SODEXAM*. <https://www.fratmat.info/index.php/economie/saison-des-pluies-et-prevision-des-risques-l-onpc-offre-7-postes-pluviometriques-automatiques-a-la-sodexam>
14. Banque mondiale, P168308 (financement IDA de 315 M$). Voir [4].
15. AllAfrica, *PAACA : prêt BAD de 48,4 M€*, septembre 2021. <https://fr.allafrica.com/stories/202109160681.html>
16. Koaci, *Lancement des travaux d'assainissement (bassin versant du Gourou)*, juin 2020. <https://www.koaci.com/article/2020/06/30/cote-divoire/societe/cote-divoire-lancement-jeudi-des-travaux-dassainissement-dans-des-quartiers-du-district-dabidjan_142754.html>
17. Abidjan.net, *Lancement du projet de modernisation du système de vigilance (VIGICLIMM)*, octobre 2022. <https://news.abidjan.net/articles/713739/un-projet-de-modernisation-du-systeme-de-vigilance-dalerte-et-de-services-climatiques-et-meteorologiques-lance-a-abidjan>
18. GWP Afrique de l'Ouest, *Processus SAP inondations en Côte d'Ivoire*, mai 2023. <https://www.gwp.org/globalassets/global/gwp-waf_files/vfdm_mai_2023/ci_processus_sap_inondations.pdf>

> **Limites :** les bilans humains varient selon les sources et les dates (bilans provisoires puis définitifs). Les chiffres de déchets proviennent de sources hétérogènes, de 2016 à 2026. Les hypothèses économiques et d'impact de Kanivo sont des **estimations à valider lors du pilote**, pas des résultats mesurés.
