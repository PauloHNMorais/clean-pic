*[Read in English](README.md)*

# PNG Any

Ferramenta web para ajustar PNGs em lote: converter para SVG, cortar espaços vazios (trim), redimensionar e trocar a cor de saída — com ajuste global ou individual por imagem — e baixar tudo em um `.zip`.

Requisitos e regras de negócio completos em [APP.md](APP.md). Decisões técnicas e convenções do projeto em [CLAUDE.md](CLAUDE.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) — front-end e back-end na mesma aplicação
- [sharp](https://sharp.pixelplumbing.com) — trim, resize e recoloração de PNG
- [potrace](https://github.com/tooolbox/node-potrace) — vetorização PNG → SVG
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
    AdjustmentControls.tsx formulário de ajustes (SVG, trim, resize, cor de saída)
  lib/
    image/
      config.ts            tipos de config e validação
      validation.ts         validação de upload (tipo, quantidade, tamanho)
      trim.ts / resize.ts / recolor.ts / svg.ts   operações de imagem (sharp/potrace)
      process.ts            orquestra as operações acima por imagem
    uploadWithProgress.ts   upload via XHR com progresso real
```

Cada operação de imagem é uma função pura e isolada em `lib/image/`, sem lógica de UI misturada.

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
npx tsc --noEmit  # checagem de tipos
```

## Limites atuais

- 1 a 50 imagens por lote
- 1 MB por arquivo, 4 MB no total do lote (compatível com o limite de corpo de requisição da Vercel gratuita)
- Conversão para SVG assume ícones de cor única em estilo outline — não é indicada para fotos ou imagens com gradiente/múltiplas cores

Detalhes de cada limite e o porquê estão no [APP.md](APP.md).
