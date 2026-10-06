@echo off
rem Inicia el simulador y lo abre en el navegador.
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias. Verifica que Node.js este instalado.
    pause
    exit /b 1
  )
)

echo Iniciando el simulador. Para detenerlo, cierra esta ventana o presiona Ctrl+C.
call npm run dev -- --open
pause
