#!/bin/bash

echo "This builder is intended for me (JadXV) to build Opiumware for installation, if you are just trying to use Opiumware normally, run install.sh instead."
npx electron-builder build --mac --x64 --arm64 \
    -c.mac.identity=null \
    -c.mac.target=zip \
    -c.productName="Opiumware"

mv dist/mac/Opiumware.app ../Opiumware-x86_64.app

mv dist/mac-arm64/Opiumware.app ../Opiumware-ARM64.app

mkdir ../OpiumwareCompressed
cp -R ../Opiumware-ARM64.app ../Opiumware-x86_64.app ../OpiumwareCompressed/
ditto -c -k --sequesterRsrc --keepParent ../OpiumwareCompressed ../OpiumwareCompressed.zip

rm -rf ../OpiumwareCompressed
rm -rf ../Opiumware-x86_64.app ../Opiumware-ARM64.app
rm -rf dist

echo "Build complete."
