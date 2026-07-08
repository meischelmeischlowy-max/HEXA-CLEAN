# HEXA AGENT — zasady pracy

Projekt: HEXA CLEAN / HEXA OS CRM
Ścieżka projektu: C:\Users\User1\Desktop\hexa-clean
Język rozmowy z użytkownikiem: polski
Język UI aplikacji: niemiecki

## Główna zasada

Nie robimy chaosu. Dashboard ma prowadzić użytkownika przez pracę, a nie pokazywać bazę danych.

System ma usprawniać działanie:
Lead → Wycena → Oferta → Link dla klienta → Upload zdjęć → Akceptacja/Odrzucenie → Faktura → Płatność

## Aktualny priorytet

Dashboard UX Cleanup / Workflow Simplification.

Problem:
- za dużo podobnych informacji,
- za dużo dużych przycisków,
- za dużo logów, ID, metadata i technicznych pól,
- użytkownik nie wie gdzie kliknąć,
- automatyzacja wygląda jak panel techniczny.

Cel:
- prosta nawigacja,
- mniej duplikatów,
- jeden główny następny krok,
- techniczne rzeczy schowane w System / Technik,
- logi i metadata nie na głównym widoku pracy.

## Zasady kodowania

1. Najpierw podać dokładną komendę PowerShell / VS Code do otwarcia pliku.
2. Potem podać pełną zawartość całego pliku do podmiany.
3. Nie podawać instrukcji typu „znajdź i wstaw”.
4. Nie podawać samych fragmentów, jeżeli użytkownik ma wkleić kod.
5. Dla ścieżek z [id] używać cudzysłowu albo `code --%`.
6. Jedna komenda PowerShell na linię.
7. Bez średników w PowerShell.
8. UI aplikacji zawsze po niemiecku.
9. Rozmowa i wyjaśnienia po polsku.
10. Nie robić `npm run build` po każdej małej zmianie.
11. Build dopiero po zakończeniu logicznej paczki.
12. Po paczce raport: co zrobiono, jak działa, pliki, co zostało.

## Czego nie robić teraz

- nie ruszać email sending,
- nie ruszać Redis/global rate-limit,
- nie ruszać faktur/płatności logicznie bez potrzeby,
- nie robić bajerów wizualnych,
- nie przebudowywać wszystkiego naraz,
- nie dodawać nowych technicznych paneli,
- nie pokazywać tokenPrefix/publicOfferLinkId/metadata/raw IDs w głównym UI.

## Aktualny stan

Zrobione:
- QuickOffer → CRM
- AI Chatbox → CRM
- Public endpoint hardening
- Persistent public security logs
- Security Center
- Offer Workflow Automation v1
- Quote / Offer creation cleanup
- Secure public offer link workflow
- Public customer upload MVP zaczął się
- Dashboard layout/menu został uproszczony

Następny kierunek:
1. Uprościć `src/app/dashboard/page.tsx` jako Cockpit / Arbeitszentrale.
2. Uprościć `src/app/dashboard/quotes/[id]/page.tsx`.
3. Potem analogicznie estimates, customers, orders.

## Styl odpowiedzi agenta

Agent ma odpowiadać krótko i praktycznie.

Jeśli użytkownik prosi o kod:
- podaj komendę otwarcia pliku,
- podaj cały plik,
- nie dawaj teorii.

Jeśli brakuje pliku:
- poproś o wklejenie aktualnego pliku,
- nie zgaduj dużych struktur.

Jeśli widzisz ryzyko:
- powiedz konkretnie, co może się zepsuć.

## Najważniejszy cel UX

Dashboard ma odpowiadać na pytania:

1. Co przyszło?
2. Co wymaga uwagi?
3. Co czeka na klienta?
4. Co jest gotowe do faktury?
5. Co mam kliknąć teraz?

Nie pokazywać wszystkiego naraz.