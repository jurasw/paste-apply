#!/bin/bash

# Skrypt do pakowania rozszerzenia Chrome

EXTENSION_NAME="paste-apply"
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
OUTPUT_DIR="${EXTENSION_NAME}-v${VERSION}"
ZIP_FILE="${EXTENSION_NAME}-v${VERSION}.zip"

echo "📦 Pakowanie rozszerzenia ${EXTENSION_NAME} wersja ${VERSION}..."

# Utwórz folder wyjściowy
mkdir -p "$OUTPUT_DIR"

# Skopiuj wymagane pliki
echo "📋 Kopiowanie plików..."

# Pliki główne
cp manifest.json "$OUTPUT_DIR/"
cp background.js "$OUTPUT_DIR/"
cp content.js "$OUTPUT_DIR/"
cp content-button.js "$OUTPUT_DIR/" 2>/dev/null || true
cp content-field-finder.js "$OUTPUT_DIR/" 2>/dev/null || true
cp content-field-matcher.js "$OUTPUT_DIR/" 2>/dev/null || true
cp content-form-filler.js "$OUTPUT_DIR/" 2>/dev/null || true
cp popup.html "$OUTPUT_DIR/"
cp popup.js "$OUTPUT_DIR/"
cp popup.css "$OUTPUT_DIR/"
cp popup-form-filler.js "$OUTPUT_DIR/" 2>/dev/null || true
cp popup-resume-parser.js "$OUTPUT_DIR/" 2>/dev/null || true
cp popup-utils.js "$OUTPUT_DIR/" 2>/dev/null || true
cp pdf.min.js "$OUTPUT_DIR/"
cp pdf.worker.min.js "$OUTPUT_DIR/"

# Folder z ikonami
if [ -d "icons" ]; then
    cp -r icons "$OUTPUT_DIR/"
fi

# Usuń niepotrzebne pliki (jeśli istnieją)
cd "$OUTPUT_DIR"
rm -f package.json
rm -f README.md
rm -f DISTRIBUTION.md
rm -f package-extension.sh
rm -f .gitignore
rm -rf node_modules 2>/dev/null || true
rm -rf .git 2>/dev/null || true
cd ..

# Utwórz plik ZIP
echo "🗜️  Tworzenie pliku ZIP..."
zip -r "$ZIP_FILE" "$OUTPUT_DIR" -x "*.DS_Store" "*.git*" "node_modules/*"

# Wyświetl informacje
echo ""
echo "✅ Gotowe!"
echo "📁 Folder: $OUTPUT_DIR"
echo "📦 Plik ZIP: $ZIP_FILE"
echo ""
echo "Następne kroki:"
echo "1. Przetestuj rozszerzenie z folderu: $OUTPUT_DIR"
echo "2. Jeśli wszystko działa, użyj pliku ZIP do publikacji: $ZIP_FILE"
echo "3. Przejdź do Chrome Web Store Developer Dashboard"
echo "4. Prześlij plik ZIP"

