#!/bin/bash

# Skrypt do pakowania rozszerzenia Chrome

EXTENSION_NAME="paste-apply"
VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
DIST_DIR="dist"
OUTPUT_DIR="${DIST_DIR}/${EXTENSION_NAME}-v${VERSION}"
ZIP_FILE="${DIST_DIR}/${EXTENSION_NAME}-v${VERSION}.zip"

echo "📦 Pakowanie rozszerzenia ${EXTENSION_NAME} wersja ${VERSION}..."

# Utwórz folder wyjściowy
mkdir -p "$OUTPUT_DIR"

# Skopiuj wymagane pliki
echo "📋 Kopiowanie plików..."

# Manifest
cp manifest.json "$OUTPUT_DIR/"

# Katalog src
if [ -d "src" ]; then
    cp -r src "$OUTPUT_DIR/"
fi

# Usuń niepotrzebne pliki (jeśli istnieją)
cd "$OUTPUT_DIR"
rm -f package.json
rm -f README.md
rm -f PRIVACY_POLICY.md
rm -f DISTRIBUTION.md
rm -rf scripts 2>/dev/null || true
rm -rf screenshots 2>/dev/null || true
rm -rf node_modules 2>/dev/null || true
rm -rf .git 2>/dev/null || true
cd ../..

# Utwórz plik ZIP
echo "🗜️  Tworzenie pliku ZIP..."
cd "$DIST_DIR"
zip -r "${EXTENSION_NAME}-v${VERSION}.zip" "${EXTENSION_NAME}-v${VERSION}" -x "*.DS_Store" "*.git*" "node_modules/*"
cd ..

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

