# Disco da Vez

Produto e regras em [`PRODUCT.md`](PRODUCT.md); sistema visual em [`DESIGN.md`](DESIGN.md); setup em [`README.md`](README.md).
Textos da interface em português do Brasil.

## Regras fixas

- **Ouvir no Spotify / YouTube Music** (`src/lib/listen.ts`): achou o álbum no app, o botão abre a página do álbum; não achou,
  abre a busca com o título do álbum e o nome do artista (`open.spotify.com/search/<termo>`, sem nada depois do termo, e
  `music.youtube.com/search?q=<termo>`). Não mude isso; `src/lib/listen.test.ts` trava a regra. Se um teste dali quebrar, a mudança está errada.
- **Avisos no celular**: o service worker (`public/sw.js`) sempre mostra o aviso dentro do `waitUntil`. Push sem notificação
  faz o Safari/iOS cancelar a inscrição.

## Checagens

`npm test`, `npm run lint` e `npm run build` antes de subir.
