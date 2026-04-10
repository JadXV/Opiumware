#!/bin/bash

clear

LATEST_VER=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/JadXV/Opiumware/releases/latest | sed 's|.*/tag/||')
echo "Latest version determined to be: $LATEST_VER"
echo ""

OPIUMWARE_URL="https://github.com/JadXV/Opiumware/releases/download/$LATEST_VER/OpiumwareCompressed.zip"
TMP_ZIP="/tmp/OpiumwareCompressed.zip"

if [ -d "/Applications/Opiumware.app" ]; then
  echo "Opiumware is already installed."
  echo "Updating / Reinstalling Opiumware..."
  rm -rf /Applications/Opiumware.app
fi

echo "Cleaning up temporary files..."
rm -rf /tmp/OpiumwareCompressed.zip /tmp/Opiumware.app

echo "Downloading Opiumware..."
curl -fsSL "$OPIUMWARE_URL" -o "$TMP_ZIP" || {
  echo "Failed to download Opiumware"
  exit 1
}

echo "Unzipping Opiumware..."
unzip -o -q "$TMP_ZIP" -d /tmp || {
  echo "Failed to unzip Opiumware"
  exit 1
}

echo "Installing Opiumware..."
mv "/tmp/Opiumware.app" "/Applications" || {
  echo "Failed to move Opiumware to Applications"
  exit 1
}

xattr -rd com.apple.quarantine /Applications/Opiumware.app

rm -f "$TMP_ZIP"
rm -rf /tmp/__MACOSX

echo ""
echo "Opiumware installed successfully!"
echo "You can now find Opiumware in your Applications folder."

open /Applications/Opiumware.app
