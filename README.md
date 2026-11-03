# NBA para TV (módulo do TizenBrew)

Abre https://topstreamer.site/nba/lakers na TV pelo TizenBrew com navegação pelo controle: setas movem o foco, OK clica, Voltar volta,
Play/Pause controla o vídeo da página.

## Publicar (uma vez)

1. Crie um repositório **público** no GitHub chamado `tv-nba` (github.com/new), sem README.
2. Nesta pasta, no terminal:

```
git init
git add .
git commit -m "Módulo do TizenBrew para NBA"
git branch -M main
git remote add origin https://github.com/kevinlucascamargo/tv-nba.git
git push -u origin main
```

## Adicionar na TV

1. Abra o **TizenBrew** na TV.
2. Aperte o botão **verde** (ou vá em Module Manager) → **Add Module**.
3. Digite `gh/kevinlucascamargo/tv-nba` e confirme.
4. O módulo aparece na lista do TizenBrew: OK abre o site.

Mudou o `navegacao_tv.js`? Rode o criar_app_tv.py de novo com --publicar: ele envia e limpa o cache do jsDelivr.
