#!/bin/bash
set -e

echo "Installing Rust targets for Universal macOS..."
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

echo "Installing Node dependencies..."
npm install

echo "Building Universal macOS bundle..."
npx tauri build --target universal-apple-darwin

echo ""
echo "Done. Bundle is in: src-tauri/target/universal-apple-darwin/release/bundle/"
