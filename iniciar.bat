@echo off
REM Atualiza tudo e inicia o jogo em http://localhost:3333 (duplo clique).
REM Seguro: nunca sobrescreve o .env nem apaga dados (migracoes aditivas, seed so faz upsert).
cd /d "%~dp0"
title O Confronto - iniciando
echo [0/6] Fechando o servidor antigo (porta 3333), se estiver aberto...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3333 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
findstr /b /c:"DEV_QUICK_LOGIN=" .env >nul 2>&1 || (echo.>>.env & echo DEV_QUICK_LOGIN=1>>.env & echo   Adicionei DEV_QUICK_LOGIN=1 ao .env ^(entrada Mestre, so neste computador^).)
echo [1/6] Instalando dependencias...
call npm install || goto erro
echo [2/6] Gerando o cliente do banco...
call npm run generate || goto erro
echo [3/6] Aplicando migracoes novas...
call npm run db:deploy || goto erro
echo [3b] Baixando sprites novos do TibiaWiki (se falhar, segue sem eles)...
call node scripts/import-icons.mjs --verified-sources scripts/sprites-novos.json --limit 400
if errorlevel 1 echo   Aviso: nao consegui baixar os sprites agora; o jogo usa os que ja existem.
echo [4/6] Atualizando catalogo (seed)...
call npm run seed || goto erro
echo [5/6] Login master...
call npx tsx backend/prisma/create-master.ts || goto erro
echo [6/6] Construindo o site...
call npm run build || goto erro
echo.
echo Abrindo http://localhost:3333 em alguns segundos. Para parar o jogo, feche esta janela (ou Ctrl+C).
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3333"
call npm run dev
pause
exit /b 0
:erro
echo.
echo Algo falhou. Copie a mensagem acima e me envie.
pause
exit /b 1
