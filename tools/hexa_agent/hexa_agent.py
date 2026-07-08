from __future__ import annotations

from pathlib import Path
import textwrap


PROJECT_ROOT = Path(__file__).resolve().parents[2]
AGENT_DIR = Path(__file__).resolve().parent
MEMORY_FILE = AGENT_DIR / "agent_memory.md"

MAX_FILE_CHARS = 20_000


HELP_TEXT = """
HEXA Agent LOCAL — szybki pomocnik bez wolnego AI

Komendy:

help
  pokazuje pomoc

read <plik>
  wczytuje plik, np.
  read src/app/dashboard/page.tsx

files
  pokazuje wczytane pliki

clear
  czyści wczytane pliki

checkpoint
  pokazuje najważniejsze zasady HEXA

ux
  pokazuje zasady uproszczenia dashboardu

cockpit
  pokazuje dokładne zadanie dla src/app/dashboard/page.tsx

quote
  pokazuje dokładne zadanie dla src/app/dashboard/quotes/[id]/page.tsx

pack
  robi gotową paczkę: zasady + wczytane pliki + zadanie do wklejenia ChatGPT

exit
  zamyka agenta

Najlepszy tryb pracy:
1. read src/app/dashboard/page.tsx
2. cockpit
3. pack
4. wklej wynik do ChatGPT
"""


CHECKPOINT_TEXT = """
HEXA CLEAN / HEXA OS CRM — aktualne zasady

Projekt:
C:\\Users\\User1\\Desktop\\hexa-clean

Rozmowa:
- po polsku

UI aplikacji:
- po niemiecku

Kod:
- pełne pliki do podmiany
- najpierw komenda VS Code / PowerShell
- potem cały plik
- bez "znajdź i wstaw"
- ścieżki z [id] najlepiej przez: code --% ...

Build:
- nie po każdej małej zmianie
- build dopiero po zamknięciu paczki

Aktualny kierunek:
Dashboard UX Cleanup / Workflow Simplification

Nie ruszać teraz:
- email sending
- Redis/global rate-limit
- faktur/płatności logicznie bez potrzeby
- bajerów wizualnych
- przebudowy całego systemu naraz
"""


UX_RULES = """
Dashboard ma być narzędziem pracy, nie bazą danych.

Cel:
Lead → Wycena → Oferta → Link dla klienta → Upload zdjęć → Akceptacja/Odrzucenie → Faktura → Płatność

Na głównych stronach pokazujemy:
1. Co wymaga uwagi
2. Jaki jest status
3. Co jest następnym krokiem
4. Jeden główny przycisk akcji
5. Minimum powtarzanych danych

Nie pokazywać w głównym UI:
- tokenPrefix
- publicOfferLinkId
- metadata
- raw ID wszędzie
- technicznych logów
- wielkich tabel audit/security/notification w codziennej pracy
- tych samych informacji w pięciu miejscach

Techniczne dane mają być:
- na dole
- zwijane
- w "System / Technik"
- albo na osobnych stronach szczegółowych
"""


COCKPIT_TASK = """
ZADANIE: Uprościć src/app/dashboard/page.tsx jako Cockpit / Arbeitszentrale.

Cel:
Po wejściu w dashboard użytkownik ma od razu widzieć:
1. Neue Anfragen
2. Zu prüfen
3. Bereit zum Senden
4. Wartet auf Kunde
5. Angenommen / bereit für Rechnung
6. Ważne ostrzeżenia tylko jeśli naprawdę istotne

UI po niemiecku.

Nie pokazywać:
- technicznych ID
- tokenów
- metadata
- audit logów
- security logów
- surowych tabel z bazy
- powtarzających się danych

Strona ma mieć styl:
- prosty Cockpit
- krótkie sekcje
- jasny następny krok
- link do rekordu tylko tam, gdzie trzeba
- mało dużych przycisków

Wymaganie kodowe:
- podaj komendę:
  code ".\\src\\app\\dashboard\\page.tsx"
- potem pełny plik do podmiany
- nie dawaj fragmentów
"""


QUOTE_TASK = """
ZADANIE: Uprościć src/app/dashboard/quotes/[id]/page.tsx.

Cel:
Strona oferty ma pokazywać:
1. główny status oferty
2. następny krok
3. krótkie dane klienta
4. kwotę i numer oferty
5. Kunden-Uploads prosto i bez technicznych pól
6. główne akcje tylko tam, gdzie mają sens
7. techniczne szczegóły na dole jako "Technische Details" albo "Systemverlauf"

Nie pokazywać w głównym widoku:
- tokenPrefix
- publicOfferLinkId
- metadata
- raw technical IDs
- wielkich tabel logów
- duplikatów klient/zlecenie/oferta w kilku sekcjach

UI po niemiecku.

Wymaganie kodowe:
- podaj komendę:
  code --% .\\src\\app\\dashboard\\quotes\\[id]\\page.tsx
- potem pełny plik do podmiany
- nie dawaj fragmentów
"""


class HexaAgent:
    def __init__(self) -> None:
        self.loaded_files: dict[str, str] = {}

    def resolve_path(self, raw_path: str) -> Path:
        cleaned = raw_path.strip().strip('"').strip("'")

        if not cleaned:
            raise ValueError("Brak ścieżki.")

        path = Path(cleaned)

        if not path.is_absolute():
            path = PROJECT_ROOT / path

        path = path.resolve()

        try:
            path.relative_to(PROJECT_ROOT)
        except ValueError as exc:
            raise ValueError("Agent czyta tylko pliki z projektu hexa-clean.") from exc

        return path

    def read_file(self, raw_path: str) -> str:
        path = self.resolve_path(raw_path)

        if not path.exists():
            raise FileNotFoundError(f"Nie ma pliku: {path}")

        if not path.is_file():
            raise IsADirectoryError(f"To nie jest plik: {path}")

        text = path.read_text(encoding="utf-8", errors="replace")

        if len(text) > MAX_FILE_CHARS:
            text = text[:MAX_FILE_CHARS] + "\n\n[UCIĘTO: plik jest długi]\n"

        rel_path = str(path.relative_to(PROJECT_ROOT)).replace("\\", "/")
        self.loaded_files[rel_path] = text

        return rel_path

    def files(self) -> str:
        if not self.loaded_files:
            return "Brak wczytanych plików."

        lines = ["Wczytane pliki:"]
        for path, text in self.loaded_files.items():
            lines.append(f"- {path} ({len(text)} znaków)")

        return "\n".join(lines)

    def pack(self) -> str:
        files_text = []

        for path, text in self.loaded_files.items():
            files_text.append(
                f"""
=== AKTUALNY PLIK: {path} ===
{text}
=== KONIEC PLIKU: {path} ===
"""
            )

        files_block = "\n".join(files_text).strip()

        if not files_block:
            files_block = "Brak wczytanych plików. Najpierw użyj read <plik>."

        return textwrap.dedent(
            f"""
            WKLEJ TO DO CHATGPT:

            Kontynuujemy HEXA CLEAN / HEXA OS CRM.

            {CHECKPOINT_TEXT}

            {UX_RULES}

            Wczytane aktualne pliki:

            {files_block}

            Zadanie:
            Uprość wskazany dashboard zgodnie z zasadami UX. Nie usuwaj logiki i danych. Ukryj techniczne rzeczy z głównego widoku. UI ma być po niemiecku. Odpowiedź ma zawierać najpierw komendę VS Code do otwarcia pliku, potem pełny plik do podmiany. Bez fragmentów typu "znajdź i wstaw".
            """
        ).strip()

    def repl(self) -> None:
        print("HEXA Agent LOCAL uruchomiony.")
        print("Ten agent nie używa Ollama, więc nie będzie mielił godzinę.")
        print(f"Projekt: {PROJECT_ROOT}")
        print("Wpisz help.\n")

        while True:
            try:
                command = input("hexa-agent> ").strip()
            except KeyboardInterrupt:
                print("\nZamykam.")
                return
            except EOFError:
                print("\nZamykam.")
                return

            if not command:
                continue

            lower = command.lower()

            if lower in {"exit", "quit", "q"}:
                print("Zamykam.")
                return

            if lower == "help":
                print(HELP_TEXT)
                continue

            if lower == "checkpoint":
                print(CHECKPOINT_TEXT)
                continue

            if lower == "ux":
                print(UX_RULES)
                continue

            if lower == "cockpit":
                print(COCKPIT_TASK)
                continue

            if lower == "quote":
                print(QUOTE_TASK)
                continue

            if lower == "files":
                print(self.files())
                continue

            if lower == "clear":
                self.loaded_files.clear()
                print("Wyczyszczono wczytane pliki.")
                continue

            if lower.startswith("read "):
                raw_path = command[len("read ") :].strip()

                try:
                    loaded = self.read_file(raw_path)
                    print(f"Wczytano: {loaded}")
                except Exception as exc:
                    print(f"Błąd: {exc}")

                continue

            if lower == "pack":
                print(self.pack())
                continue

            print("Nieznana komenda. Wpisz help.")


def main() -> int:
    HexaAgent().repl()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())