"""Présentation automatique et recette commentée du site Kanivo.

Le programme prend la main : il ouvre le navigateur en plein écran, déplace votre vrai
curseur comme le ferait une personne, fait défiler la page, s'arrête pour lire et
présente chaque section. Il teste lui-même chaque fonction (compteurs, frise, téléphone,
simulateur, carte au clavier, module Signal, menu, accessibilité, version mobile) en
cochant une liste de recette à l'écran. Une voix française (Windows) explique tout ce qui
se passe. À la fin, il vous propose de prendre la main : missions vérifiées en direct
puis quiz.

    python visite/guide.py                 site en ligne (GitHub Pages)
    python visite/guide.py --local         serveur de dev (npm run dev, port 5173)
    python visite/guide.py --a-vous        passe directement aux missions et au quiz
    python visite/guide.py --help          toutes les options
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import shutil
import subprocess
import sys
import queue
import tempfile
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import Page, sync_playwright
except ImportError:
    sys.exit("Playwright manque. Installez-le avec :  pip install -r visite/requirements.txt")

ICI = Path(__file__).resolve().parent
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SITE_EN_LIGNE = "https://pethuelelie-glitch.github.io/kanivo/"
SITE_LOCAL = "http://localhost:5173/"


def log(message: str) -> None:
    print(message, flush=True)


def sans_balises(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


def milliers(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def nombre(texte: str) -> int:
    chiffres = re.sub(r"\D", "", texte)
    return int(chiffres) if chiffres else 0


# --------------------------------------------------------------------------- voix

class VoixNeuronale:
    """Voix neuronale Microsoft (paquet edge-tts, internet requis), jouée par le lecteur audio de Windows.

    Un fil prépare la phrase suivante pendant que l'autre lit la phrase en cours : pas de blanc entre les phrases.
    """

    def __init__(self, nom: str = "fr-FR-DeniseNeural") -> None:
        import ctypes
        import edge_tts  # noqa: F401  (vérifie la présence du paquet)
        self.nom = nom
        self.winmm = ctypes.windll.winmm
        self.dossier = Path(tempfile.mkdtemp(prefix="kanivo-voix-"))
        self.textes: queue.Queue = queue.Queue()
        self.sons: queue.Queue = queue.Queue()
        self.restant = 0
        self.verrou = threading.Lock()
        self.n = 0
        # Essai dans un fil à part : la boucle asyncio du fil principal est déjà prise par Playwright.
        essai: list[bool] = []
        fil = threading.Thread(target=lambda: essai.append(self._fabriquer("Bonjour.", self.dossier / "essai.mp3")))
        fil.start()
        fil.join(20)
        if not (essai and essai[0]):
            raise RuntimeError("synthèse indisponible")
        threading.Thread(target=self._preparer, daemon=True).start()
        threading.Thread(target=self._jouer, daemon=True).start()

    def _fabriquer(self, texte: str, chemin: Path) -> bool:
        import asyncio
        import edge_tts

        async def go() -> bytes:
            c = edge_tts.Communicate(texte, self.nom, rate="+4%")
            return b"".join([m["data"] async for m in c.stream() if m["type"] == "audio"])
        try:
            data = asyncio.run(asyncio.wait_for(go(), 15))
        except Exception:  # réseau coupé, service indisponible…
            return False
        chemin.write_bytes(data)
        return bool(data)

    def _preparer(self) -> None:
        while True:
            texte = self.textes.get()
            self.n += 1
            chemin = self.dossier / f"p{self.n}.mp3"
            self.sons.put(chemin if self._fabriquer(texte, chemin) else None)

    def _jouer(self) -> None:
        mci = self.winmm.mciSendStringW
        while True:
            chemin = self.sons.get()
            if chemin:
                alias = f"kv{chemin.stem}"
                if mci(f'open "{chemin}" type mpegvideo alias {alias}', None, 0, None) == 0:
                    mci(f"play {alias} wait", None, 0, None)
                    mci(f"close {alias}", None, 0, None)
                chemin.unlink(missing_ok=True)
            with self.verrou:
                self.restant -= 1

    def dire(self, texte: str) -> None:
        with self.verrou:
            self.restant += 1
        self.textes.put(texte)

    def parle(self) -> bool:
        return self.restant > 0


class Voix:
    """Narration à voix haute.

    Par ordre de préférence : voix neuronale (edge-tts), voix du navigateur (Web Speech), puis voix
    Windows via un processus PowerShell (System.Speech) qui lit les phrases à la suite.
    """

    PRONONCIATION = [("*700#", "étoile sept cents dièse"), ("→", ""), ("·", ","), ("n°", "numéro"),
                     ("SaaS", "sasse"), ("API", "a p i"), ("USSD", "u s s d"), ("ONPC", "o n p c"),
                     ("ANAGED", "anaguède"), ("SODEXAM", "sodexame"), ("1er", "premier")]

    def __init__(self, mode: str = "auto", debit: int = 1) -> None:
        self.mode = mode
        self.debit = debit
        self.page: Page | None = None
        self.nom: str | None = None       # voix du navigateur choisie
        self.neuro: VoixNeuronale | None = None
        self.proc: subprocess.Popen | None = None
        self.envoyees = 0
        self.finies = 0

    # -- branchement
    def brancher(self, page: Page) -> None:
        if self.mode == "aucune":
            return
        if self.mode in ("auto", "neuronale") and sys.platform == "win32":
            try:
                self.neuro = VoixNeuronale()
                log(f"  Voix neuronale : {self.neuro.nom}")
                return
            except ImportError:
                log("  (voix neuronale : installez edge-tts pour une voix plus naturelle)")
            except Exception:
                log("  (voix neuronale indisponible, pas d'internet ?) : voix locale à la place")
        if self.mode in ("auto", "navigateur") and self._voix_navigateur(page):
            return
        if self.mode in ("auto", "windows"):
            self._voix_windows()
        if not self.active:
            log("  ⚠ Aucune voix française trouvée : narration en texte seulement.")

    def _voix_navigateur(self, page: Page) -> bool:
        voix: list[str] = []
        for _ in range(20):
            voix = page.evaluate("() => window.__kg ? __kg.voices() : []")
            if voix:
                break
            time.sleep(0.25)
        if not voix:
            return False
        rang = lambda n: (("Natural" in n) * 4 + ("France" in n or "fr-FR" in n) * 2
                          + ("Denise" in n or "Vivienne" in n or "Henri" in n))
        self.nom = max(voix, key=rang)
        self.page = page
        log(f"  Voix du navigateur : {self.nom}")
        return True

    def _voix_windows(self) -> None:
        if not (sys.platform == "win32" and shutil.which("powershell")):
            return
        script = (
            "[Console]::InputEncoding=[Text.Encoding]::UTF8;"
            "Add-Type -AssemblyName System.Speech;"
            "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
            "$v=$s.GetInstalledVoices()|?{$_.VoiceInfo.Culture.Name -like 'fr-*'}|select -First 1;"
            "if(-not $v){[Console]::Out.WriteLine('AUCUNE');exit};"
            f"$s.SelectVoice($v.VoiceInfo.Name);$s.Rate={self.debit};$s.Volume=100;$s.SetOutputToDefaultAudioDevice();"
            "[Console]::Out.WriteLine('PRET:'+$v.VoiceInfo.Name);"
            "while(($l=[Console]::In.ReadLine()) -ne $null){if($l){$s.Speak($l)};[Console]::Out.WriteLine('FIN')}")
        try:
            self.proc = subprocess.Popen(["powershell", "-NoProfile", "-Command", script],
                                         stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                         stderr=subprocess.DEVNULL)
        except OSError:
            return
        assert self.proc.stdout
        premiere = self.proc.stdout.readline().decode("utf-8", "ignore").strip()
        if not premiere.startswith("PRET"):
            self.proc = None
            return
        log(f"  Voix Windows : {premiere[5:]}")
        threading.Thread(target=self._ecouter, daemon=True).start()

    def _ecouter(self) -> None:
        assert self.proc and self.proc.stdout
        for ligne in self.proc.stdout:
            if ligne.strip() == b"FIN":
                self.finies += 1

    # -- usage
    @property
    def active(self) -> bool:
        return self.neuro is not None or self.nom is not None or (self.proc is not None and self.proc.poll() is None)

    def dire(self, texte: str) -> None:
        texte = sans_balises(texte)
        for a, b in self.PRONONCIATION:
            texte = texte.replace(a, b)
        if self.neuro:
            self.neuro.dire(texte)
            return
        if self.nom and self.page:
            try:
                self.page.evaluate("([t, n]) => window.__kg && __kg.speak(t, n)", [texte, self.nom])
            except PlaywrightError:
                pass
            return
        if self.proc and self.proc.poll() is None:
            try:
                assert self.proc.stdin
                self.proc.stdin.write((texte + "\n").encode("utf-8"))
                self.proc.stdin.flush()
                self.envoyees += 1
            except OSError:
                self.proc = None

    def parle(self) -> bool:
        if self.neuro:
            return self.neuro.parle()
        if self.nom and self.page:
            try:
                return bool(self.page.evaluate("() => !!window.__kg && __kg.speaking()"))
            except PlaywrightError:
                return False
        return self.proc is not None and self.proc.poll() is None and self.finies < self.envoyees

    def attendre(self, delai: float = 60) -> None:
        fin = time.time() + delai
        while self.parle() and time.time() < fin:
            time.sleep(0.1)

    def fermer(self) -> None:
        if self.proc:
            self.proc.kill()
            self.proc = None


# --------------------------------------------------------------------------- vraie souris

class SourisReelle:
    """Déplace le vrai curseur Windows en même temps que la souris du navigateur."""

    def __init__(self, active: bool) -> None:
        self.ok = False
        self.user32 = None
        if not (active and sys.platform == "win32"):
            return
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except (AttributeError, OSError):
            ctypes.windll.user32.SetProcessDPIAware()
        self.user32 = ctypes.windll.user32
        self.ox = self.oy = 0.0
        self.dpr = 1.0

    def calibrer(self, page: Page) -> bool:
        """Repère la position de la page à l'écran, puis vérifie que la page reçoit bien le curseur."""
        if not self.user32:
            return False
        g = page.evaluate("({sx: screenX, sy: screenY, ow: outerWidth, oh: outerHeight,"
                          " iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio})")
        bord = max(0.0, (g["ow"] - g["iw"]) / 2)
        self.ox = g["sx"] + bord
        self.oy = g["sy"] + max(0.0, g["oh"] - g["ih"] - bord)
        self.dpr = g["dpr"]
        self.ok = True
        for fx, fy in [(0.35, 0.55), (0.65, 0.45)]:
            x, y = g["iw"] * fx, g["ih"] * fy
            page.evaluate("window.__kgReal = null")
            self.placer(x, y)
            time.sleep(0.3)
            recu = page.evaluate("window.__kgReal")
            if not recu or abs(recu["x"] - x) > 12 or abs(recu["y"] - y) > 12:
                self.ok = False
                return False
        return True

    def placer(self, x: float, y: float) -> None:
        if self.ok and self.user32:
            self.user32.SetCursorPos(int((self.ox + x) * self.dpr), int((self.oy + y) * self.dpr))


# --------------------------------------------------------------------------- humain

class Humain:
    """Souris, molette et clavier pilotés avec les hésitations d'une vraie personne."""

    def __init__(self, page: Page, voix: Voix, vitesse: float, reelle: SourisReelle) -> None:
        self.page = page
        self.voix = voix
        self.vitesse = vitesse
        self.reelle = reelle
        self.x, self.y = 640.0, 420.0

    def pause(self, a: float, b: float | None = None) -> None:
        time.sleep(random.uniform(a, b if b is not None else a) / self.vitesse)

    def _poser(self, x: float, y: float) -> None:
        self.page.mouse.move(x, y)
        self.reelle.placer(x, y)

    def bouger(self, x: float, y: float, lent: float = 1.0) -> None:
        """Trajet en courbe de Bézier, accélération puis freinage, léger tremblement."""
        x0, y0 = self.x, self.y
        dist = math.hypot(x - x0, y - y0)
        if dist < 2:
            return
        n = max(12, min(80, int(dist / random.uniform(12, 20) * lent)))
        nx, ny = -(y - y0) / dist, (x - x0) / dist
        c1 = random.uniform(-0.25, 0.25) * dist
        c2 = random.uniform(-0.18, 0.18) * dist
        p1 = (x0 + (x - x0) * 0.3 + nx * c1, y0 + (y - y0) * 0.3 + ny * c1)
        p2 = (x0 + (x - x0) * 0.75 + nx * c2, y0 + (y - y0) * 0.75 + ny * c2)
        for i in range(1, n + 1):
            t = i / n
            t = t * t * (3 - 2 * t)
            u = 1 - t
            px = u**3 * x0 + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * x
            py = u**3 * y0 + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * y
            if i < n:
                px += random.uniform(-0.8, 0.8)
                py += random.uniform(-0.8, 0.8)
            self._poser(px, py)
            time.sleep(random.uniform(0.007, 0.016) * lent / self.vitesse)
        self.x, self.y = x, y

    def boite(self, selecteur: str) -> dict | None:
        return self.page.evaluate(
            """s => { const e = document.querySelector(s); if (!e) return null;
                     const r = e.getBoundingClientRect();
                     return { x: r.left, y: r.top, w: r.width, h: r.height, vh: innerHeight, vw: innerWidth } }""",
            selecteur)

    @staticmethod
    def point_dans(b: dict) -> tuple[float, float]:
        return (b["x"] + b["w"] * random.uniform(0.3, 0.7), b["y"] + b["h"] * random.uniform(0.35, 0.65))

    def _eviter(self, x: float, y: float) -> None:
        if self.page.evaluate("([x, y]) => window.__kg && __kg.avoid(x, y)", [x, y]):
            self.pause(0.5)

    def survoler(self, selecteur: str, lent: float = 1.3) -> None:
        b = self.boite(selecteur)
        if b and 0 < b["y"] + b["h"] / 2 < b["vh"]:
            x, y = self.point_dans(b)
            self._eviter(x, y)
            self.bouger(x, y, lent)

    def accessible(self, x: float, y: float, selecteur: str) -> bool:
        """Vrai si l'élément visé est bien celui qui recevra le clic (rien ne le recouvre)."""
        return self.page.evaluate(
            """([x, y, s]) => { const e = document.elementFromPoint(x, y), t = document.querySelector(s);
                                return !!e && !!t && (e === t || t.contains(e)) }""", [x, y, selecteur])

    def cliquer(self, selecteur: str) -> None:
        self.voir(selecteur)
        b = self.boite(selecteur)
        if not b:
            raise RuntimeError(f"Élément introuvable : {selecteur}")
        x, y = self.point_dans(b)
        self._eviter(x, y)
        for _ in range(4):
            if self.accessible(x, y, selecteur):
                break
            self.pause(0.4)
            self._eviter(x, y)
            b = self.boite(selecteur) or b
            x, y = self.point_dans(b)
        self.bouger(x, y)
        self.pause(0.2, 0.45)
        self.page.mouse.down()
        time.sleep(random.uniform(0.05, 0.12))
        self.page.mouse.up()
        self.pause(0.2, 0.4)

    def choisir(self, selecteur: str, valeur: str) -> None:
        """Pointe une liste déroulante puis choisit l'option (le menu natif reste fermé, plus fiable)."""
        self.voir(selecteur)
        self.survoler(selecteur, lent=1.0)
        self.pause(0.3, 0.5)
        self.page.select_option(selecteur, valeur)
        self.pause(0.4, 0.7)

    def regler(self, selecteur: str, valeur: int) -> None:
        """Attrape le curseur d'un <input type=range>, le glisse, puis ajuste aux flèches du clavier."""
        self.voir(selecteur)
        info = self.page.evaluate(
            """s => { const e = document.querySelector(s); const r = e.getBoundingClientRect();
                     return { x: r.left, y: r.top, w: r.width, h: r.height, min: +e.min, max: +e.max, v: +e.value } }""",
            selecteur)
        utile = info["w"] - 18

        def px(v: float) -> float:
            return info["x"] + 9 + (v - info["min"]) / (info["max"] - info["min"]) * utile

        cy = info["y"] + info["h"] / 2
        self._eviter(px(valeur), cy)
        self.bouger(px(info["v"]), cy)
        self.pause(0.25, 0.4)
        self.page.mouse.down()
        self.bouger(px(valeur) + random.uniform(-4, 4), cy + random.uniform(-2, 2), lent=3.0)
        self.page.mouse.up()
        for _ in range(40):
            v = int(self.page.eval_on_selector(selecteur, "e => +e.value"))
            if v == valeur:
                break
            self.page.keyboard.press("ArrowRight" if v < valeur else "ArrowLeft")
            self.pause(0.08, 0.16)

    def molette(self, delta: float, rythme: float = 1.0) -> None:
        sens = 1 if delta > 0 else -1
        reste = abs(delta)
        while reste > 0:
            pas = min(reste, random.uniform(80, 170) / rythme)
            self.page.mouse.wheel(0, sens * pas)
            reste -= pas
            time.sleep(random.uniform(0.04, 0.1) * rythme / self.vitesse)
            if random.random() < 0.05:
                self.pause(0.3, 0.8)

    def immobile(self, delai: float = 4.0) -> None:
        """Attend que le défilement doux (Lenis) soit arrivé."""
        dernier, stable, fin = None, 0, time.time() + delai
        while time.time() < fin:
            y = self.page.evaluate("scrollY")
            stable = stable + 1 if dernier is not None and abs(y - dernier) < 1 else 0
            if stable >= 3:
                return
            dernier = y
            time.sleep(0.08)

    def suivre_defilement(self) -> None:
        """Après un clic sur un lien interne : attend que le défilement animé démarre, puis qu'il s'arrête."""
        y0, fin = self.page.evaluate("scrollY"), time.time() + 1.5
        while time.time() < fin and abs(self.page.evaluate("scrollY") - y0) < 2:
            time.sleep(0.05)
        self.immobile(6.0)

    def aller(self, selecteur: str, alignement: float = 0.15, rythme: float = 1.0) -> None:
        """Défile à la molette jusqu'à placer l'élément à `alignement` × hauteur de fenêtre."""
        b = self.boite("body")
        if b:
            self.bouger(b["vw"] * random.uniform(0.45, 0.6), b["vh"] * random.uniform(0.45, 0.6), lent=1.5)
        for _ in range(4):
            delta = self.page.evaluate(
                """([s, a]) => { const e = document.querySelector(s); if (!e) return 0;
                                return e.getBoundingClientRect().top - innerHeight * a }""",
                [selecteur, alignement])
            if abs(delta) < 40:
                return
            self.molette(delta, rythme)
            self.immobile()

    def voir(self, selecteur: str) -> None:
        b = self.boite(selecteur)
        if b and (b["y"] < 80 or b["y"] + b["h"] > b["vh"] - 40):
            self.aller(selecteur, 0.35)

    def flaner(self, secondes: float, autour: str | None = None) -> None:
        """Laisse passer le temps de lecture (et la voix), en promenant parfois la souris sur le texte lu."""
        fin = time.time() + secondes / self.vitesse
        while time.time() < fin or self.voix.parle():
            if autour and random.random() < 0.3:
                self.survoler(autour, lent=2.2)
            time.sleep(random.uniform(0.3, 0.8))


# --------------------------------------------------------------------------- missions et quiz

@dataclass
class Mission:
    titre: str
    consigne: str
    verifie: str          # expression JS vraie quand la mission est accomplie
    cible: str            # élément mis en surbrillance par « Montre-moi »
    indice: str
    bravo: str            # expression JS qui renvoie le message de réussite


MISSIONS = [
    Mission(
        "Faites pleuvoir fort",
        "Déclenchez une <b>pluie extrême</b> d'au moins 200 mm sur Abidjan.",
        "+document.querySelector('#rain').value >= 200",
        '[data-rain="210"]',
        "Cliquez sur la pastille « Extrême · 210 mm », ou glissez le curseur « Pluie sur 24 h » vers la droite.",
        "`Pluie réglée sur ${document.querySelector('#rain').value} mm : ${document.querySelector('[data-kpi=red]').textContent} communes passent en alerte rouge.`",
    ),
    Mission(
        "Activez Kanivo",
        "Comparez avec le scénario où <b>Kanivo</b> est déployé.",
        "document.querySelector('[data-mode=avec]').getAttribute('aria-pressed') === 'true'",
        '[data-mode="avec"]',
        "Le bouton « Avec Kanivo » est en haut des réglages du simulateur.",
        "`Avec Kanivo, ${document.querySelector('[data-kpi=safe]').textContent} habitants sont mis à l'abri à temps.`",
    ),
    Mission(
        "Zéro alerte rouge",
        "Toujours sous pluie extrême, réglez le simulateur pour qu'<b>aucune commune</b> ne reste en alerte rouge.",
        "+document.querySelector('#rain').value >= 200 && document.querySelector('[data-kpi=red]').textContent.trim() === '0'",
        "#curage",
        "Ce sont les caniveaux bouchés qui aggravent la pluie : poussez le curseur « Points critiques curés » jusqu'au bout.",
        "'Il fallait curer 100 % des points critiques : à 80 %, Abobo et Attécoubé restent en rouge.'",
    ),
    Mission(
        "Trouvez la commune prioritaire",
        "Sur la carte, cliquez sur la commune qui arrive <b>en tête des priorités</b> de curage et d'alerte.",
        """(() => { const h = document.querySelector('[data-detail] h4');
                    const f = document.querySelector('[data-priority] li span');
                    return !!h && !!f && h.textContent.trim() === f.textContent.trim() })()""",
        "[data-priority]",
        "La liste « Priorités de curage et d'alerte » donne le nom : cherchez-le sur la carte et cliquez sur son cercle.",
        "`Exact : ${document.querySelector('[data-detail] h4').textContent} est la priorité numéro 1 dans ce scénario.`",
    ),
    Mission(
        "Signalez un caniveau",
        "Avec le module Signal, signalez un caniveau <b>totalement obstrué</b> à <b>Abobo</b>.",
        """(() => { const m = document.querySelector('[data-r-msg]').textContent;
                    return m.includes('Abobo') && m.includes('90 %') })()""",
        "[data-report]",
        "Choisissez « Abobo », puis « Totalement obstrué, déborde », et cliquez sur « Signaler ».",
        "document.querySelector('[data-r-msg]').textContent",
    ),
]

QUIZ = [
    ("Combien de morts ont causé les pluies du 28-29 juin 2026 à Abidjan ?",
     ["18", "24", "59", "120"], "59",
     "Le Gouvernement a annoncé 59 morts le 1er juillet 2026."),
    ("Quelle quantité de déchets Abidjan produit-elle chaque jour ?",
     ["500 t", "5 000 t", "50 000 t"], "5 000 t",
     "Environ 5 000 tonnes par jour, dont une partie finit dans les caniveaux."),
    ("Comment signaler un caniveau bouché sans smartphone ?",
     ["*700#", "Une appli iPhone", "Un formulaire papier"], "*700#",
     "Le code USSD *700# fonctionne sur n'importe quel téléphone."),
    ("Sous 210 mm de pluie, quel curage supprime toute alerte rouge ?",
     ["50 %", "80 %", "100 %"], "100 %",
     "À 80 %, Abobo et Attécoubé restent en rouge : il faut 100 %."),
    ("Quelles sont les deux communes pilotes ?",
     ["Plateau et Cocody", "Attécoubé et Abobo", "Yopougon et Marcory"], "Attécoubé et Abobo",
     "Le pilote démarre à Attécoubé et Abobo, parmi les plus exposées."),
]

def ouvrir_site(page: Page, url: str, essais: int = 3) -> None:
    """Charge le site et attend la carte, en réessayant si le réseau est lent."""
    for n in range(1, essais + 1):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_selector("[data-communes] .commune", state="attached", timeout=30000)
            return
        except PlaywrightError as e:
            if "closed" in str(e).lower() or n == essais:
                raise
            log(f"  Le site tarde à répondre, nouvel essai ({n + 1}/{essais})…")


JS_KPI = "k => document.querySelector(`[data-kpi=${k}]`).textContent"


# --------------------------------------------------------------------------- guide

class Guide:
    def __init__(self, page: Page, voix: Voix, vitesse: float, reelle: SourisReelle) -> None:
        self.page = page
        self.voix = voix
        self.reelle = reelle
        self.h = Humain(page, voix, vitesse, reelle)
        self.etape = 0
        self.total = 1
        self.recette: list[dict] = []
        self.erreurs_console: list[str] = []
        self.suivre_erreurs(page)

    def suivre_erreurs(self, page: Page) -> None:
        page.on("console", lambda m: m.type == "error" and self.erreurs_console.append(m.text))
        page.on("pageerror", lambda e: self.erreurs_console.append(str(e)))

    # -- parole
    def dire(self, titre: str, texte: str, kicker: str = "Présentation", lecture: float | None = None,
             autour: str | None = None, boutons: list | None = None, attendre: bool = True,
             oral: str | None = None) -> None:
        """Affiche la bulle et la fait lire à voix haute. Attend d'abord la fin de la phrase précédente."""
        self.voix.attendre()
        log(f"\n» {titre}\n  {sans_balises(texte)}")
        self.page.evaluate("o => window.__kg && __kg.say(o)", {
            "kicker": kicker, "title": titre, "text": texte,
            "progress": self.etape / self.total, "buttons": boutons or []})
        self.voix.dire(oral if oral is not None else f"{titre}. {texte}")
        if attendre:
            self.h.flaner(lecture if lecture is not None else max(2.0, len(sans_balises(texte).split()) / 3.4),
                          autour)

    def lire(self, js: str, arg=None) -> str:
        return str(self.page.evaluate(js, arg)).strip()

    def stable(self, js: str, arg=None, delai: float = 5.0) -> str:
        """Relit une valeur jusqu'à ce qu'elle ne bouge plus (compteurs et curseurs animés)."""
        valeur, identiques, fin = None, 0, time.time() + delai
        while time.time() < fin:
            v = self.lire(js, arg)
            identiques = identiques + 1 if v == valeur else 0
            valeur = v
            if identiques >= 4:
                break
            time.sleep(0.15)
        return valeur or ""

    def kpi(self, nom: str) -> int:
        return nombre(self.stable(JS_KPI, nom))

    # -- recette
    def tester(self, ident: str, libelle: str, ok: bool, detail: str = "", annoncer: bool = True) -> bool:
        self.page.evaluate("([i, l, s]) => window.__kg && __kg.check(i, l, s)", [ident, libelle, "ok" if ok else "ko"])
        self.recette.append({"test": libelle, "ok": bool(ok), "detail": detail})
        log(f"  {'✅' if ok else '❌'} {libelle}{' · ' + detail if detail else ''}")
        if annoncer:
            self.voix.attendre()
            self.voix.dire(("Test réussi. " if ok else "Attention, test échoué. ") + (detail or libelle))
        return ok

    def en_cours(self, ident: str, libelle: str) -> None:
        self.page.evaluate("([i, l]) => window.__kg && __kg.check(i, l, 'run')", [ident, libelle])

    def reponse(self) -> str | None:
        return self.page.evaluate("() => window.__kg ? __kg.take() : null")

    def attendre_reponse(self, delai: float | None = None) -> str | None:
        fin = time.time() + delai if delai else None
        while fin is None or time.time() < fin:
            r = self.reponse()
            if r is not None:
                return r
            time.sleep(0.25)
        return None

    # ------------------------------------------------------------------ prise de main
    def prise_de_main(self) -> None:
        p = self.page
        p.evaluate("() => __kg.intro('Présentation automatique', 'Kanivo prend la main',"
                   " 'Je vais piloter votre ordinateur pour vous présenter le site et tester moi-même toutes ses fonctions.'"
                   " + '<br>Lâchez la souris et le clavier, et montez le son 🔊')")
        if not self.voix.active:
            log("  ⚠ Pas de voix disponible : suivez la narration dans la bulle et dans ce terminal.")
        self.voix.dire("Bonjour. Je prends la main sur votre ordinateur. "
                       "Je vais vous présenter le site Kanivo, puis tester moi-même toutes ses fonctions, "
                       "en vous expliquant à voix haute tout ce que je fais. Lâchez la souris et le clavier.")
        self.voix.attendre()
        time.sleep(0.8)
        for n in ("3", "2", "1"):
            p.evaluate("n => __kg.count(n)", n)
            self.voix.dire(n)
            time.sleep(1.0)
        p.evaluate("() => __kg.introHide()")
        if self.reelle.calibrer(p):
            p.evaluate("() => __kg.cursor(false)")
            log("  Curseur réel synchronisé avec la page.")
        else:
            p.evaluate("() => __kg.cursor(true)")
            log("  Curseur réel non synchronisé : curseur dessiné dans la page.")
        time.sleep(0.6)

    # ------------------------------------------------------------------ présentation + recette
    def presentation(self) -> None:
        h, p = self.h, self.page
        self.total = 16
        h.bouger(p.evaluate("innerWidth") * 0.5, p.evaluate("innerHeight") * 0.45, lent=2)

        # 1. Accueil et chargement
        self.etape = 1
        self.dire("Bienvenue sur Kanivo",
                  "Le site raconte un drame : dans la nuit du 28 au 29 juin 2026, des pluies diluviennes "
                  "ont fait <b>59 morts</b> à Abidjan. Kanivo est une plateforme citoyenne pour que cela ne se reproduise pas.",
                  autour=".hero__title")
        self.dire("Premier contrôle : le chargement", "Je vérifie que la page est complète et que la carte du simulateur est prête.",
                  kicker="Recette", lecture=1)
        communes = p.evaluate("document.querySelectorAll('[data-communes] .commune').length")
        titre = p.title()
        self.tester("load", "Page chargée et carte prête", "Kanivo" in titre and communes == 13,
                    f"titre correct et {communes} communes sur la carte")
        pluie = p.evaluate("(() => { const c = document.querySelector('[data-rain]'); return !!c && c.width > 0 })()")
        self.dire("La pluie animée", "Regardez la pluie qui tombe en fond : elle est dessinée en direct et s'intensifie quand on descend.",
                  autour=".hero__lead")
        self.tester("rain", "Animation de pluie active", pluie, "la pluie est bien dessinée")
        self.dire("Je commence la visite", "Je survole le bouton principal, puis je descends à la molette, comme vous le feriez.",
                  attendre=False)
        h.survoler('.hero__cta a[href="#prototype"]')
        h.pause(0.8, 1.2)

        # 2. Constat et compteurs
        self.etape = 2
        h.aller("#constat", 0.1)
        self.dire("Le constat, en chiffres",
                  "59 morts, 26 % du district exposé aux inondations, 5 000 tonnes de déchets par jour, "
                  "6,3 millions d'habitants. Chaque chiffre porte sa source juste en dessous. "
                  "Les compteurs montent quand ils apparaissent.", attendre=False)
        for i in range(1, p.evaluate("document.querySelectorAll('#constat .stat').length") + 1):
            h.voir(f"#constat .stat:nth-child({i})")
            h.survoler(f"#constat .stat:nth-child({i})", lent=1.6)
            h.pause(0.8, 1.3)
        h.flaner(1.0, "#constat .stats")
        self.dire("Contrôle des compteurs", "Je vérifie que chaque compteur s'est arrêté sur la bonne valeur.",
                  kicker="Recette", lecture=1)
        js_bons = """[...document.querySelectorAll('[data-count]')].map(e => {
            const t = parseFloat(e.textContent.replace(/[\\s\\u202f\\u00a0]/g, '').replace(',', '.'));
            return Math.abs(t - +e.dataset.count) < 0.01 })"""
        fin = time.time() + 5
        while not all(bons := p.evaluate(js_bons)) and time.time() < fin:
            time.sleep(0.25)
        self.tester("count", "Compteurs animés justes", all(bons), f"{sum(bons)} compteurs sur {len(bons)} affichent la bonne valeur")

        # 3. Chronologie épinglée
        self.etape = 3
        h.aller("#chronologie", 0.0)
        self.dire("Trente ans de répétition",
                  "1996, 2018, 2024, 2025, 2026 : le même scénario revient. Ici la page se bloque "
                  "et la frise défile à l'horizontale pendant que je fais tourner la molette.", attendre=False)
        avant = p.evaluate("document.querySelector('[data-chrono-track]').getBoundingClientRect().left")
        course = p.evaluate("(() => { const t = document.querySelector('[data-chrono-track]'); return Math.max(0, t.scrollWidth - innerWidth) })()")
        h.molette(course * 0.6 + 200, rythme=2.4)
        h.immobile()
        apres = p.evaluate("document.querySelector('[data-chrono-track]').getBoundingClientRect().left")
        h.flaner(1.5, "[data-chrono-track]")
        self.tester("chrono", "Frise horizontale épinglée", apres < avant - 100,
                    f"la frise a glissé de {round(avant - apres)} pixels vers la gauche")
        h.aller("#causes", 0.12, rythme=2.0)

        # 4. Causes
        self.etape = 4
        self.dire("Quatre causes liées",
                  "Des caniveaux bouchés, une ville qui grandit plus vite que le plan, "
                  "des sites évacués puis réoccupés, et des alertes qui n'atteignent pas le dernier kilomètre.",
                  attendre=False)
        for i in range(1, 5):
            h.survoler(f"#causes .cause:nth-child({i}) h3", lent=1.6)
            h.pause(0.9, 1.4)
        h.flaner(0.8, "#causes")

        # 5. Silos
        self.etape = 5
        h.aller("#silos", 0.12)
        self.dire("L'angle mort",
                  "La SODEXAM connaît la pluie, l'ANAGED ses camions, l'ONPC les zones rouges, "
                  "et les habitants savent quel caniveau déborde. Personne n'assemble ces pièces : "
                  "c'est la place de Kanivo, au centre du schéma.", autour=".silos__core")

        # 6. Solution et téléphone synchronisé
        self.etape = 6
        h.aller("#solution", 0.1)
        self.dire("La solution : voir, prioriser, prévenir",
                  "Quatre modules et une seule boucle de données. Je vais descendre module par module : "
                  "surveillez le téléphone, son écran doit changer à chaque fois.", lecture=2)
        modules = [
            ("Signal", "Un caniveau bouché se signale en 20 secondes, par WhatsApp ou par le code USSD <b>*700#</b>, même sans smartphone."),
            ("Carte de risque", "Un score par îlot de 250 mètres, recalculé chaque heure à partir de la pluie prévue."),
            ("Curage priorisé", "Les brigades curent avant la pluie, là où le risque est le plus fort, et sont payées au résultat."),
            ("Alerte dernier kilomètre", "Un message en français, dioula, baoulé ou nouchi, qui dit quoi faire, avec accusé de réception."),
        ]
        synchro = []
        for i, (nom, texte) in enumerate(modules):
            h.aller(f'[data-module="{i}"]', 0.4, rythme=1.6)
            self.dire(f"Module {i + 1} · {nom}", texte, autour=f'[data-module="{i}"] h3')
            synchro.append(p.evaluate("i => document.querySelector(`[data-screen=\"${i}\"]`).classList.contains('is-active')", i))
        self.tester("phone", "Téléphone synchronisé avec les modules", all(synchro),
                    f"l'écran du téléphone a suivi {sum(synchro)} modules sur 4")

        # 7-9. Simulateur
        self.simulateur()

        # 10. Modèle, feuille de route, impact
        self.etape = 11
        h.aller("#modele", 0.1)
        self.dire("Qui paie ?",
                  "Ceux qui paient déjà le coût des inondations : les collectivités par abonnement, "
                  "les bailleurs, les assureurs grâce à une API, et les opérateurs télécoms pour diffuser les alertes.",
                  attendre=False)
        for i in range(1, 5):
            h.survoler(f"#modele .card:nth-child({i})", lent=1.5)
            h.pause(0.8, 1.2)
        h.flaner(0.8)

        self.etape = 12
        h.aller("#roadmap", 0.1)
        self.dire("Prêts avant la saison 2027",
                  "Cadrage, pilote Signal à Attécoubé et Abobo, curage avant la saison, "
                  "alertes pendant la saison, puis passage à l'échelle en 2028.", attendre=False)
        for i in range(1, 6):
            h.survoler(f"#roadmap .step:nth-child({i}) h3", lent=1.5)
            h.pause(0.7, 1.0)
        h.flaner(0.8)

        h.aller("#impact", 0.1)
        self.dire("Impact et risques",
                  "Ce que l'on mesurera, et chaque risque avec sa parade : fraude, signalements sans suite, "
                  "adoption, données personnelles, lassitude face aux alertes.", autour="#impact .risks")

        h.aller("#masterclass", 0.1)
        self.dire("Comment le projet a été fait",
                  "Recherche, analyse, deck, site et tests ont été réalisés de bout en bout, avec des sources datées.",
                  autour="#masterclass .pipeline")

        # 13. Sources et mise en page
        self.etape = 13
        h.aller("#sources", 0.1)
        self.dire("Les sources", "En bas de page, toutes les sources principales. Je vérifie qu'elles sont bien des liens sécurisés.",
                  autour=".sources", lecture=2)
        liens = p.evaluate("[...document.querySelectorAll('.sources a')].map(a => a.href)")
        self.tester("sources", "Sources citées en liens https", len(liens) >= 5 and all(l.startswith("https://") for l in liens),
                    f"{len(liens)} sources, toutes en https")
        deborde = p.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
        self.tester("overflow", "Aucun débordement horizontal", not deborde, "la page ne déborde pas sur les côtés")

        # 14. Menu
        self.etape = 14
        self.dire("Contrôle du menu", "Je teste le menu du haut : je clique sur « Prototype », la page doit remonter jusqu'au simulateur.",
                  kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer('.nav a[href="#prototype"]')
        h.suivre_defilement()
        haut = round(p.evaluate("document.querySelector('#prototype').getBoundingClientRect().top"))
        self.tester("nav", "Menu de navigation", -20 < haut < 160,
                    "le menu amène bien au simulateur" if -20 < haut < 160 else f"le simulateur est à {haut} pixels du haut")
        self.dire("Retour en haut", "Puis je clique sur le logo Kanivo pour revenir tout en haut.", kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer(".nav .brand")
        h.suivre_defilement()
        self.tester("top", "Logo : retour en haut", p.evaluate("scrollY") < 40, "le logo ramène en haut de page")

        # 15. Accessibilité clavier
        self.etape = 15
        self.dire("Accessibilité au clavier",
                  "Pour les personnes qui naviguent sans souris, j'appuie sur la touche Tabulation. "
                  "Un lien « Aller au contenu » doit apparaître.", kicker="Recette", attendre=False)
        self.voix.attendre()
        p.evaluate("document.activeElement && document.activeElement.blur()")
        p.keyboard.press("Tab")
        h.pause(1.2)
        skip = p.evaluate("""(() => { const a = document.activeElement;
            return !!a && a.classList.contains('skip') && a.getBoundingClientRect().bottom > 0 })()""")
        self.tester("skip", "Lien d'évitement au clavier", skip, "le lien Aller au contenu apparaît au premier Tab")
        h.flaner(1.0)
        p.keyboard.press("Escape")
        p.evaluate("document.activeElement && document.activeElement.blur()")

        self.tester("console", "Aucune erreur JavaScript", not self.erreurs_console,
                    "aucune erreur dans la console" if not self.erreurs_console else f"{len(self.erreurs_console)} erreurs")

    def simulateur(self) -> None:
        h, p = self.h, self.page
        self.etape = 7
        h.aller("#prototype", 0.08)
        self.dire("Le simulateur",
                  "C'est le cœur du site : on fait pleuvoir sur les 13 communes d'Abidjan et on voit le risque, "
                  "commune par commune. Je vais tester chaque réglage.", autour="#proto-title")
        h.aller("[data-sim]", 0.06)
        h.flaner(1.0)
        prio = p.evaluate("document.querySelectorAll('[data-priority] li').length")
        self.tester("sim", "Simulateur initialisé", prio == 6 and self.lire(JS_KPI, "exposed") != "—",
                    f"indicateurs calculés et {prio} communes prioritaires listées")
        rouge0 = self.kpi("red")

        self.dire("Test : pluie extrême", f"Pour l'instant, une forte pluie de 110 mm met {rouge0} communes en rouge. "
                  "Je clique sur « Extrême, 210 mm ».", kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer('[data-rain="210"]')
        h.flaner(1.6, ".kpis")
        rouge1, abri1 = self.kpi("red"), self.kpi("safe")
        self.tester("rain210", "Pluie extrême aggrave le risque",
                    rouge1 > rouge0 and self.lire("document.querySelector('[data-out=rain]').textContent") == "210 mm",
                    f"on passe de {rouge0} à {rouge1} communes en alerte rouge")

        self.dire("Test : avec Kanivo", "Je clique sur « Avec Kanivo » : 80 % des points critiques curés avant la pluie "
                  "et 75 % des habitants exposés prévenus.", kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer('[data-mode="avec"]')
        h.flaner(2.0, ".kpis")
        rouge2, abri2 = self.kpi("red"), self.kpi("safe")
        self.tester("avec", "Kanivo réduit les alertes rouges", rouge2 < rouge1 and abri2 > abri1,
                    f"il ne reste que {rouge2} communes en rouge, et {milliers(abri2)} personnes à l'abri")

        self.dire("Test : curage total", "Je glisse le curseur du curage jusqu'à 100 %. "
                  "Si tous les caniveaux critiques sont curés, plus aucune commune ne devrait être en rouge.",
                  kicker="Recette", attendre=False)
        self.voix.attendre()
        h.regler("#curage", 100)
        h.flaner(1.4, ".kpis")
        self.tester("curage", "Curseur de curage", self.kpi("red") == 0 and "100" in self.lire("document.querySelector('[data-out=curage]').textContent"),
                    "à 100 % de curage, zéro commune en rouge")

        self.dire("Test : couverture d'alerte", "Je pousse maintenant l'alerte de 75 à 95 %. "
                  "Le nombre de personnes mises à l'abri doit augmenter.", kicker="Recette", attendre=False)
        self.voix.attendre()
        abri3 = self.kpi("safe")
        h.regler("#alerte", 95)
        h.flaner(1.4, "[data-kpi='safe']")
        abri4 = self.kpi("safe")
        self.tester("alerte", "Curseur d'alerte", abri4 > abri3, f"de {milliers(abri3)} à {milliers(abri4)} personnes à l'abri")

        self.etape = 8
        self.dire("Test : la carte à la souris", "Je clique sur Abobo, la commune la plus peuplée du nord. Sa fiche doit s'afficher.",
                  kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer('[data-communes] .commune[data-id="abobo"] .core')
        h.flaner(1.5, "[data-detail]")
        nom = self.lire("document.querySelector('[data-detail] h4')?.textContent || ''")
        self.tester("map", "Fiche d'une commune au clic", nom == "Abobo", "la fiche d'Abobo s'affiche avec sa population")

        self.dire("Test : la carte au clavier", "Même chose sans souris : je place le focus sur Attécoubé et j'appuie sur Entrée.",
                  kicker="Recette", attendre=False)
        self.voix.attendre()
        p.focus('[data-communes] .commune[data-id="attecoube"]')
        h.pause(0.6)
        p.keyboard.press("Enter")
        h.flaner(1.2, "[data-detail]")
        nom = self.lire("document.querySelector('[data-detail] h4')?.textContent || ''")
        self.tester("kbd", "Carte utilisable au clavier", nom == "Attécoubé", "Attécoubé s'ouvre avec la touche Entrée")

        self.etape = 9
        self.dire("Test : le module Signal",
                  "Dernier module. Je repasse d'abord sans Kanivo, puis je signale un caniveau totalement obstrué à Bingerville. "
                  "Le risque de cette commune doit monter sur la carte.", kicker="Recette", attendre=False)
        self.voix.attendre()
        h.cliquer('[data-mode="sans"]')
        h.flaner(1.5)
        score = "document.querySelector('[data-communes] .commune[data-id=bingerville] .score').textContent"
        avant = nombre(self.stable(score))
        h.aller("[data-report]", 0.35)
        h.choisir("[data-r-commune]", "bingerville")
        h.choisir("#r-level", "0.9")
        h.cliquer("[data-report] button[type='submit']")
        h.flaner(1.0)
        msg = self.lire("document.querySelector('[data-r-msg]').textContent")
        apres = nombre(self.stable(score))
        self.dire("Signalement reçu", msg, kicker="Recette", autour="[data-r-msg]")
        self.tester("signal", "Signalement pris en compte", "Bingerville" in msg and apres > avant,
                    f"le score de Bingerville passe de {avant} à {apres} sur 100")

    # ------------------------------------------------------------------ version mobile
    def mobile(self, navigateur, url: str, init: str) -> None:
        self.etape = 16
        self.dire("Test de la version mobile",
                  "J'ouvre maintenant le site dans une fenêtre de la taille d'un téléphone, pour vérifier qu'il s'adapte.",
                  kicker="Recette")
        ctx = navigateur.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                     is_mobile=True, has_touch=True, locale="fr-FR")
        ctx.add_init_script(path=init)
        m = ctx.new_page()
        erreurs: list[str] = []
        m.on("pageerror", lambda e: erreurs.append(str(e)))
        try:
            ouvrir_site(m, url)
            m.evaluate("o => __kg.say(o)", {"kicker": "Recette mobile", "title": "Version téléphone",
                                            "text": "Je vérifie la mise en page et je teste le simulateur au doigt."})
            self.voix.dire("Version téléphone. Je vérifie la mise en page et je teste le simulateur au doigt.")
            time.sleep(2.5)
            deborde = m.evaluate("document.documentElement.scrollWidth > innerWidth + 1")
            for _ in range(12):
                m.mouse.wheel(0, 380)
                time.sleep(0.12)
            m.evaluate("document.querySelector('[data-sim]').scrollIntoView({block: 'start'})")
            time.sleep(1.5)
            m.tap('[data-rain="210"]')
            time.sleep(1.6)
            pluie = m.evaluate("+document.querySelector('#rain').value")
            m.evaluate("o => __kg.say(o)", {"kicker": "Recette mobile", "title": "Simulateur au doigt",
                                            "text": f"Pluie réglée sur {pluie} mm d'un simple toucher."})
            self.voix.attendre()
            time.sleep(1.5)
        finally:
            ctx.close()
        self.page.bring_to_front()
        self.tester("mobile", "Version mobile", not deborde and pluie == 210 and not erreurs,
                    "le site s'adapte au téléphone et le simulateur répond au toucher")

    # ------------------------------------------------------------------ bilan
    def bilan(self) -> dict:
        ok = sum(t["ok"] for t in self.recette)
        n = len(self.recette)
        echecs = [t["test"] for t in self.recette if not t["ok"]]
        self.etape = self.total
        h, p = self.h, self.page
        h.aller("#prototype", 0.06)
        texte = (f"<b>{ok} tests réussis sur {n}</b>. "
                 + ("Tout fonctionne : le site est prêt." if not echecs else "À corriger : " + ", ".join(echecs) + ".")
                 + " Et maintenant, voulez-vous essayer vous-même ?")
        self.dire("Recette terminée", texte, kicker="Bilan", attendre=False,
                  boutons=[{"label": "À vous de jouer", "value": "jouer", "main": True},
                           {"label": "Terminer", "value": "fin"}])
        return {"tests_reussis": ok, "tests": n, "recette": self.recette, "erreurs_console": self.erreurs_console}

    # ------------------------------------------------------------------ à vous de jouer
    def a_vous(self) -> dict:
        h = self.h
        self.reelle.ok = False  # on rend la souris
        ouvrir_site(self.page, self.page.url.split("#")[0])
        h.pause(1.5)
        self.page.evaluate("() => { __kg.cursor(true); __kg.checksVisible(false) }")
        self.etape, self.total = 0, len(MISSIONS) + len(QUIZ)
        self.dire("À votre tour", "J'ai remis le simulateur à zéro. Je vous y emmène, puis je vous rends la souris.",
                  kicker="À vous de jouer", lecture=2)
        h.cliquer('.nav a[href="#prototype"]')
        h.suivre_defilement()
        h.aller("[data-sim]", 0.06)
        self.page.evaluate("() => __kg.cursor(false)")

        self.dire("Vos missions",
                  f"{len(MISSIONS)} missions, puis un petit quiz. La souris est à vous : je vérifie en direct. "
                  "Si vous bloquez, cliquez sur « Montre-moi ».",
                  kicker="À vous de jouer", boutons=[{"label": "C'est parti", "value": "go", "main": True}],
                  attendre=False)
        self.attendre_reponse()

        resultats = []
        for i, m in enumerate(MISSIONS, 1):
            self.etape = i - 1
            self.dire(m.titre, m.consigne, kicker=f"Mission {i}/{len(MISSIONS)}", attendre=False,
                      boutons=[{"label": "Montre-moi", "value": "aide"}, {"label": "Passer", "value": "passer"}])
            debut, aide, statut = time.time(), False, "réussie"
            while True:
                if self.page.evaluate(m.verifie):
                    time.sleep(0.9)  # laisse finir les compteurs animés
                    if self.page.evaluate(m.verifie):
                        break
                r = self.reponse()
                if r == "aide":
                    aide = True
                    self.page.evaluate("([s, t]) => { __kg.highlight(s); __kg.hint(t) }", [m.cible, m.indice])
                    self.voix.dire(m.indice)
                    self.page.evaluate("() => __kg.buttons([{label: 'Passer', value: 'passer'}])")
                elif r == "passer":
                    statut = "passée"
                    break
                time.sleep(0.3)
            self.page.evaluate("() => __kg.highlight(null)")
            duree = round(time.time() - debut, 1)
            resultats.append({"mission": m.titre, "statut": statut, "aide": aide, "secondes": duree})
            if statut == "réussie":
                self.etape = i
                self.dire("Bravo !" if not aide else "Réussi, avec un coup de pouce", self.lire(m.bravo),
                          kicker=f"Mission {i}/{len(MISSIONS)} · {duree:.0f} s", lecture=2.5)
            else:
                log("  → mission passée")

        score = 0
        for j, (question, choix, bon, explication) in enumerate(QUIZ, 1):
            self.etape = len(MISSIONS) + j - 1
            self.dire(question, "Choisissez une réponse.", kicker=f"Quiz {j}/{len(QUIZ)}", attendre=False,
                      boutons=[{"label": c, "value": c} for c in choix], oral=question)
            r = self.attendre_reponse()
            self.page.evaluate("([a, b]) => __kg.mark(a, b)", [r, bon])
            juste = r == bon
            score += juste
            resultats.append({"question": question, "reponse": r, "juste": juste})
            self.page.evaluate("t => __kg.hint(t)", ("✅ Bonne réponse. " if juste else "❌ Pas tout à fait. ") + explication)
            self.voix.attendre()
            self.voix.dire(("Bonne réponse. " if juste else "Pas tout à fait. ") + explication)
            self.h.flaner(2.5)

        reussies = sum(1 for r in resultats if r.get("statut") == "réussie")
        self.etape = self.total
        self.dire("Séance terminée",
                  f"Missions réussies : <b>{reussies}/{len(MISSIONS)}</b>. Quiz : <b>{score}/{len(QUIZ)}</b>. "
                  "Merci d'avoir testé Kanivo ! Explorez librement, puis fermez le navigateur pour terminer.",
                  kicker="Bilan", attendre=False)
        return {"missions_reussies": reussies, "missions": len(MISSIONS), "quiz": score,
                "questions": len(QUIZ), "detail": resultats}


# --------------------------------------------------------------------------- lancement

def ouvrir_navigateur(pw, choix: str, plein_ecran: bool):
    canaux = {"auto": ["msedge", "chrome", None], "msedge": ["msedge"], "chrome": ["chrome"], "chromium": [None]}[choix]
    args = ["--start-fullscreen" if plein_ecran else "--start-maximized", "--disable-infobars",
            "--no-first-run", "--no-default-browser-check"]
    derniere = None
    for canal in canaux:
        try:
            return pw.chromium.launch(channel=canal, headless=False, args=args,
                                      ignore_default_args=["--enable-automation"])
        except PlaywrightError as e:
            derniere = e
    sys.exit(f"Impossible d'ouvrir un navigateur ({derniere}).\n"
             "Installez Edge ou Chrome, ou lancez :  python -m playwright install chromium")


def enregistrer(nom: str, donnees: dict) -> Path:
    dossier = ICI / "resultats"
    dossier.mkdir(exist_ok=True)
    fichier = dossier / f"{nom}-{datetime.now():%Y%m%d-%H%M%S}.json"
    fichier.write_text(json.dumps(donnees, ensure_ascii=False, indent=2), encoding="utf-8")
    return fichier


def main() -> None:
    p = argparse.ArgumentParser(description="Présentation automatique, recette commentée et séance de test du site Kanivo.")
    p.add_argument("--url", help=f"adresse du site (par défaut {SITE_EN_LIGNE})")
    p.add_argument("--local", action="store_true", help=f"utilise le serveur de dev {SITE_LOCAL}")
    p.add_argument("--vitesse", type=float, default=1.0, help="1 = normal, 1.5 = plus rapide, 0.7 = plus posé")
    p.add_argument("--muet", action="store_true", help="désactive la voix")
    p.add_argument("--voix", choices=["auto", "neuronale", "navigateur", "windows"], default="auto",
                   help="neuronale (edge-tts, la plus humaine), voix du navigateur ou voix Windows")
    p.add_argument("--fenetre", action="store_true", help="fenêtre agrandie au lieu du plein écran")
    p.add_argument("--souris-virtuelle", action="store_true", help="ne déplace pas le vrai curseur de Windows")
    p.add_argument("--sans-mobile", action="store_true", help="saute le test de la version mobile")
    p.add_argument("--a-vous", action="store_true", help="passe directement aux missions et au quiz")
    p.add_argument("--auto", action="store_true", help="enchaîne sans attendre de réponse et ferme à la fin")
    p.add_argument("--navigateur", choices=["auto", "msedge", "chrome", "chromium"], default="auto")
    args = p.parse_args()

    url = args.url or (SITE_LOCAL if args.local else SITE_EN_LIGNE)
    log(f"Kanivo · présentation automatique de {url}")
    voix = Voix("aucune" if args.muet else args.voix)
    reelle = SourisReelle(not args.souris_virtuelle)
    init = str(ICI / "overlay.js")

    with sync_playwright() as pw:
        navigateur = ouvrir_navigateur(pw, args.navigateur, not args.fenetre)
        contexte = navigateur.new_context(no_viewport=True, locale="fr-FR")
        contexte.add_init_script(path=init)
        page = contexte.new_page()
        guide = Guide(page, voix, max(0.2, args.vitesse), reelle)
        try:
            ouvrir_site(page, url)
            page.bring_to_front()
            # Un premier clic sur la page autorise le navigateur à parler (règle anti-lecture automatique).
            page.mouse.click(5, 5)
            voix.brancher(page)
            time.sleep(1.0)
            choix = "jouer"
            if not args.a_vous:
                guide.prise_de_main()
                guide.presentation()
                if not args.sans_mobile:
                    guide.mobile(navigateur, url, init)
                bilan = guide.bilan()
                fichier = enregistrer("recette", {"url": url, "date": datetime.now().isoformat(timespec="seconds"), **bilan})
                page.screenshot(path=str(fichier.with_suffix(".png")))
                log(f"\nRecette : {bilan['tests_reussis']}/{bilan['tests']} tests réussis  →  {fichier.relative_to(ICI.parent)}")
                choix = "fin" if args.auto else guide.attendre_reponse()
            if choix == "jouer":
                resultat = guide.a_vous()
                fichier = enregistrer("test", {"url": url, "date": datetime.now().isoformat(timespec="seconds"), **resultat})
                log(f"\nBilan : missions {resultat['missions_reussies']}/{resultat['missions']}, "
                    f"quiz {resultat['quiz']}/{resultat['questions']}  →  {fichier.relative_to(ICI.parent)}")
            else:
                guide.dire("Au revoir", "Merci de votre attention. Le site reste ouvert, fermez le navigateur pour terminer.",
                           kicker="Bilan", attendre=False)
            voix.attendre()
            if args.auto:
                return
            log("\nFermez le navigateur pour quitter.")
            page.wait_for_event("close", timeout=0)
        except PlaywrightError as e:
            if "closed" in str(e).lower() or "target" in str(e).lower():
                log("\nNavigateur fermé, fin de la présentation.")
            elif "timeout" in str(e).lower():
                log(f"\nLe site {url} ne répond pas. Vérifiez la connexion, ou lancez le site en local "
                    "(npm run dev) puis : python visite/guide.py --local")
            else:
                raise
        except KeyboardInterrupt:
            log("\nPrésentation interrompue.")
        finally:
            voix.fermer()
            try:
                navigateur.close()
            except PlaywrightError:
                pass


if __name__ == "__main__":
    main()
