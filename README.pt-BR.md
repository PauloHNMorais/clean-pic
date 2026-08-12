_[Read in English](README.md)_

# CleanPic

**App publicado:** [clean-pic.vercel.app](https://clean-pic.vercel.app)

Ferramenta web para ajustar imagens em lote: envie JPEG, PNG, WebP, GIF, AVIF ou SVG, depois corte espaços vazios, redimensione, troque a cor, remova o fundo e exporte como PNG, SVG ou ICO — com ajuste global ou individual por imagem — e baixe tudo em um `.zip`.

Requisitos e regras de negócio completos em [APP.md](APP.md). Decisões técnicas e convenções do projeto em [CLAUDE.md](CLAUDE.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) — front-end e back-end na mesma aplicação
- [sharp](https://sharp.pixelplumbing.com) — decodificação, trim, resize, recoloração e remoção de fundo
- [potrace](https://github.com/tooolbox/node-potrace) — vetorização para SVG
- [archiver](https://github.com/archiverjs/node-archiver) — geração do `.zip`
- [react-dropzone](https://react-dropzone.js.org) — upload com drag-and-drop
- Tailwind CSS

## Estrutura

```
src/
  app/
    page.tsx              tela principal
    layout.tsx
    api/process/route.ts  recebe imagens + configs, processa e devolve o .zip
  components/
    ImageUploader.tsx      upload, grid de preview, ajustes global/individual, download
    AdjustmentControls.tsx formulário de ajustes (formato de saída, trim, resize, cor, remoção de fundo)
  lib/
    image/
      config.ts            tipos de config e validação
      validation.ts         validação de upload (formato, quantidade, tamanho)
      trim.ts / resize.ts / recolor.ts / svg.ts / ico.ts / removeBackground.ts   operações de imagem (sharp/potrace)
      process.ts            orquestra as operações acima por imagem
      *.test.ts              testes unitários, ao lado do código que testam
    uploadWithProgress.ts   upload via XHR com progresso real
```

Cada operação de imagem é uma função pura e isolada em `lib/image/`, sem lógica de UI misturada, com um `*.test.ts` ao lado (rodar com `npm test`).

## Como rodar localmente

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Outros comandos:

```bash
npm run build   # build de produção
npm run start   # roda o build de produção
npm run lint    # eslint
npm test        # testes unitários (vitest)
npx tsc --noEmit  # checagem de tipos
```

## Limites atuais

- 1 a 100 imagens por lote
- Formatos de entrada aceitos: JPEG, PNG, WebP, GIF, AVIF, SVG
- 1 MB por arquivo, 4 MB no total do lote (compatível com o limite de corpo de requisição da Vercel gratuita)
- Conversão para SVG assume ícones de cor única em estilo outline — não é indicada para fotos ou imagens com gradiente/múltiplas cores
- Remoção de fundo é por cor (chroma key), não segmentação por IA — funciona bem em fundo sólido/quase sólido, não em foto com fundo complexo
- Saída em .ico não passa de 256×256 (limite do próprio formato) — resultados maiores são reduzidos automaticamente, mantendo a proporção

Detalhes de cada limite e o porquê estão no [APP.md](APP.md).
