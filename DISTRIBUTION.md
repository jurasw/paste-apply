# Jak udostępnić rozszerzenie innym użytkownikom

## Opcja 1: Chrome Web Store (Rekomendowane)

### Krok 1: Przygotowanie pakietu

1. Utwórz folder z pakietem rozszerzenia:
   ```bash
   # Uruchom skrypt pakowania (jeśli istnieje)
   npm run package
   
   # LUB ręcznie:
   # Utwórz folder "paste-apply-dist"
   # Skopiuj wszystkie pliki oprócz node_modules, .git, itp.
   ```

2. Sprawdź, czy wszystkie pliki są na miejscu:
   - manifest.json
   - background.js
   - content.js
   - popup.html, popup.js, popup.css
   - icons/ (wszystkie ikony)
   - pdf.min.js, pdf.worker.min.js
   - Wszystkie inne pliki .js

### Krok 2: Utworzenie konta deweloperskiego

1. Przejdź do [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Zaloguj się kontem Google
3. Zapłać jednorazową opłatę $5 (tylko raz, na zawsze)
4. Zaakceptuj umowę deweloperską

### Krok 3: Publikacja

1. W Developer Dashboard kliknij "Nowy element"
2. Wybierz "Rozszerzenie Chrome"
3. Prześlij plik ZIP z pakietem rozszerzenia
4. Wypełnij informacje:
   - **Nazwa**: paste apply - Job Application Auto-Fill
   - **Opis**: Automatycznie wypełnia formularze aplikacji o pracę
   - **Kategoria**: Productivity
   - **Ikona**: Wybierz icon128.png
   - **Zrzuty ekranu**: Dodaj 1-5 zrzutów ekranu rozszerzenia w działaniu
   - **Promocja**: Opcjonalnie, większy obrazek promocyjny

5. Dodaj szczegóły:
   - **Privacy Policy URL**: (wymagane) Utwórz stronę z polityką prywatności
   - **Website**: (opcjonalne) Twoja strona
   - **Support Email**: Twój email

6. Prześlij do weryfikacji:
   - Kliknij "Prześlij do weryfikacji"
   - Czas weryfikacji: zwykle 1-3 dni robocze

### Krok 4: Po weryfikacji

- Rozszerzenie będzie dostępne publicznie
- Będziesz mógł śledzić statystyki pobrań
- Możesz aktualizować wersje

## Opcja 2: Udostępnienie pliku .crx (Dla zaawansowanych użytkowników)

### Krok 1: Pakowanie rozszerzenia

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz "Tryb dewelopera"
3. Kliknij "Spakuj rozszerzenie"
4. Wybierz folder z rozszerzeniem
5. Chrome utworzy plik .crx i .pem (klucz prywatny)

### Krok 2: Udostępnienie

1. Umieść plik .crx na swojej stronie/Google Drive/Dropbox
2. Użytkownicy muszą:
   - Pobrać plik .crx
   - Przeciągnąć go do `chrome://extensions/`
   - Potwierdzić instalację

**UWAGA**: Chrome może blokować instalację .crx z zewnętrznych źródeł. Użytkownicy muszą włączyć tryb dewelopera.

## Opcja 3: GitHub Releases (Dla programistów)

1. Utwórz repozytorium na GitHub
2. Dodaj pliki rozszerzenia
3. Utwórz Release:
   - Przejdź do "Releases" → "Create a new release"
   - Dodaj tag wersji (np. v1.0.0)
   - Dodaj opis
   - Załącz plik ZIP z pakietem rozszerzenia
4. Użytkownicy mogą:
   - Pobrać ZIP
   - Rozpakować
   - Załadować jako "Load unpacked" w Chrome

## Wymagane pliki do publikacji

- ✅ manifest.json
- ✅ background.js
- ✅ content.js
- ✅ popup.html, popup.js, popup.css
- ✅ icons/ (wszystkie ikony)
- ✅ pdf.min.js, pdf.worker.min.js
- ✅ Wszystkie pliki .js z funkcjonalnością

## Polityka prywatności (Wymagana dla Chrome Web Store)

Utwórz prostą stronę HTML z polityką prywatności zawierającą:

- Jakie dane są zbierane (tylko lokalnie w Chrome)
- Jak dane są używane (tylko do wypełniania formularzy)
- Czy dane są udostępniane (NIE - wszystko lokalnie)
- Link do kontaktu

Przykład: "To rozszerzenie przechowuje wszystkie dane lokalnie w przeglądarce Chrome. Żadne dane nie są wysyłane na zewnętrzne serwery."

## Aktualizacje

Po opublikowaniu, aby zaktualizować rozszerzenie:

1. Zaktualizuj wersję w manifest.json
2. Utwórz nowy pakiet ZIP
3. W Developer Dashboard kliknij "Upload Updated Package"
4. Prześlij nowy plik ZIP
5. Opcjonalnie dodaj notatki o zmianach

## Najlepsze praktyki

1. **Testuj przed publikacją**: Sprawdź rozszerzenie na różnych stronach
2. **Dobre zrzuty ekranu**: Pokaż rozszerzenie w działaniu
3. **Jasny opis**: Wyjaśnij, co robi rozszerzenie
4. **Odpowiadaj na recenzje**: Użytkownicy docenią wsparcie
5. **Regularne aktualizacje**: Naprawiaj błędy i dodawaj funkcje

