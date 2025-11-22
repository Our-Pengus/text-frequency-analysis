@echo off
cd C:/emsdk
call emsdk_env.bat >nul 2>&1
cd /d "%~dp0"
cd wasm
emcc text_frequency.cpp -std=c++17 -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS=["ccall","cwrap"] -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME=createModule --bind -o ../js/text_frequency.js
cd ..
echo Build complete
