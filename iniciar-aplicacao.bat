@echo off
title Iniciando Controle de Ordens de Serviço
cd /d %~dp0

echo Verificando se o Node.js está instalado...
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js não encontrado. Baixando e instalando...
    powershell -Command "Invoke-WebRequest https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi -OutFile node.msi"
    msiexec /i node.msi /passive
    del node.msi
    echo Aguarde alguns segundos e reinicie este script se necessário.
    pause
    exit
)

echo Node.js encontrado com sucesso.
echo Instalando dependências do projeto...
call npm install express xlsx cors

echo Iniciando o servidor Node.js...
start http://localhost:3000
node server.js
pause
