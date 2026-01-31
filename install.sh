#!/bin/bash

clear

LATEST_VER=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/JadXV/Opiumware/releases/latest | sed 's|.*/tag/||')
echo "Latest version determined to be: $LATEST_VER"
echo ""

OPIUMWARE_URL="https://github.com/JadXV/Opiumware/releases/download/$LATEST_VER/OpiumwareCompressed.zip"
TMP_ZIP="/tmp/OpiumwareCompressed.zip"

ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
  ARCH_FOLDER="Opiumware-ARM64"
elif [[ "$ARCH" == "x86_64" ]]; then
  ARCH_FOLDER="Opiumware-x86_64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

if [ -d "/Applications/Opiumware.app" ]; then
  echo "Opiumware is already installed."
  echo "Updating / Reinstalling Opiumware..."
  rm -rf /Applications/Opiumware.app
fi

echo "Downloading Opiumware ($LATEST_VER)..."
curl -L "$OPIUMWARE_URL" -o "$TMP_ZIP"

echo "Extracting..."
unzip -o "$TMP_ZIP" -d /tmp/

echo "Installing..."
mv "/tmp/OpiumwareCompressed/$ARCH_FOLDER.app" /Applications/Opiumware.app

echo "Cleaning up..."
rm -rf "$TMP_ZIP" /tmp/OpiumwareCompressed

echo "Removing quarantine attribute..."
xattr -rd com.apple.quarantine /Applications/Opiumware.app 2>/dev/null

echo ""
echo "Opiumware $LATEST_VER has been installed successfully!"
echo "You can find it in your Applications folder."

# Open the app
open /Applications/Opiumware.app
