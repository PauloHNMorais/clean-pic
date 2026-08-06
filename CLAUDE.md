# CleanPic

Ferramenta web para ajuste em lote de imagens (JPEG, PNG, WebP, GIF, AVIF na entrada — PNG, SVG ou ICO na saída: cortar espaços vazios, redimensionar, trocar cor, remover fundo) com download em zip. Ver [APP.md](APP.md) para os requisitos completos.

## Stack

- **Next.js** (App Router) — front-end e back-end na mesma aplicação
- **sharp** — redimensionamento e corte de espaços vazios/transparentes (trim)
- **potrace** (ou equivalente) — vetorização PNG → SVG (traçado de contornos; funciona bem em imagens tipo ícone/silhueta com poucas cores, não em fotos/gradientes)
- **archiver** ou **jszip** — geração do arquivo zip para download
- **react-dropzone** — upload múltiplo com drag-and-drop
- **Tailwind CSS** — estilização

## Fases do projeto

1. **Upload e listagem** — upload múltiplo (1–50 imagens), validação de tipo/quantidade, preview em lista/grid
2. **Configuração de ajustes** — UI para marcar as 3 opções (SVG, trim, resize), com alternância entre modo global e ajuste individual por imagem
3. **Processamento no back-end** — rota Next.js que recebe imagens + configs, aplica trim/resize/conversão PNG→SVG e já devolve o `.zip` (uma rota HTTP só tem uma resposta; zipar ali é o jeito natural de retornar múltiplos arquivos processados)
4. **Empacotamento e download** — wiring do front-end: botão que monta o `FormData`, chama a rota, aciona o download do `.zip` no navegador e exibe erros (gerais ou por imagem)
5. **Validações e regras de negócio** — limite de 1–50 imagens, tratamento de erros (formato inválido, falha na conversão SVG, etc.)
6. **Polimento** — feedback de progresso durante processamento em lote, tratamento de casos extremos (imagem sem transparência para o trim, dimensões inválidas no resize)

## Entrada multi-formato, saída PNG/SVG/ICO

Entrada aceita: JPEG, PNG, WebP, GIF, AVIF — lista em `ACCEPTED_MIME_TYPES` (`validation.ts`), validada tanto no dropzone do cliente quanto na rota (defesa em profundidade). Ficaram de fora:
- **TIFF**: `sharp` decodifica, mas navegador não exibe em `<img>` — entraria como upload aceito e preview quebrado. Não vale a complexidade de um fallback só pra isso.
- **SVG**: rasterizar SVG de entrada não-confiável é superfície de ataque own (parsing de XML), e o pipeline inteiro (trim/resize/recolor/remove-bg) é construído em cima de pixel bruto, não vetor.

Saída é uma escolha explícita (`AdjustmentConfig.outputFormat: "png" | "svg" | "ico"`, era um `toSvg: boolean` antes de aceitar múltiplos formatos de entrada — fazia sentido como boolean quando "não-SVG" só podia significar "continua PNG"; deixou de fazer sentido implícito quando o formato de entrada passou a variar). A extensão do arquivo de saída já vinha do `processed.extension` no `route.ts`, não do nome do arquivo original — não precisou de mudança nenhuma ali pra suportar entrada multi-formato nem a saída ICO.

### Saída ICO (`ico.ts`)

Sem dependência nova — o formato ICO moderno permite embutir um PNG completo por entrada (suportado desde o Vista), então o encoder é só um header binário pequeno (`ICONDIR` + `ICONDIRENTRY`, ~22 bytes) na frente do PNG que o resto do pipeline já produz. Sempre gera **uma única entrada** (não é um bundle multi-resolução tipo favicon.ico com 16/32/48px juntos) — mantém o modelo "uma config resolvida → um arquivo de saída" do resto do app; gerar múltiplos tamanhos exigiria reprocessar a imagem várias vezes com resizes diferentes por config, o que quebra esse modelo.

Restrição real do formato: `ICONDIRENTRY` codifica largura/altura em 1 byte cada (0 = 256), então nada maior que 256×256 cabe. Em vez de validar isso na UI e obrigar o usuário a lembrar de ajustar o resize também, o encoder reduz automaticamente (mantendo proporção, sem upscale) qualquer imagem que chegue maior que isso — testado com fonte 512×512 sem resize (foi pra 256×256) e com resize explícito 500×300 pedido junto com ICO (foi pra 256×154, proporção preservada). A UI mostra um aviso quando `resize` + `outputFormat: "ico"` juntos passariam de 256px, pra não ser uma surpresa silenciosa.

## Conversão para SVG

Escopo assumido (ver [APP.md](APP.md)): ícones de cor única em estilo outline sobre fundo transparente (de qualquer formato de entrada suportado). Fotos e imagens com múltiplas cores/gradientes não têm boa fidelidade com essa abordagem e ficam fora de escopo.

Abordagem:
- **Binarizar pelo canal alfa**, não por luminância — como a imagem é de cor única com fundo transparente, o alfa é uma máscara mais confiável que threshold de cor
- **potrace** para o traçado de contorno; ajustar `alphamax` para suavizar curvas e evitar serrilhado causado por anti-aliasing nas bordas do PNG original
- **Formas com buraco** (outline vazado, ex. um círculo vazado vira um anel) dependem da regra de preenchimento even-odd do potrace — validar visualmente que a topologia (buracos) é preservada
- Potrace traça a **área preenchida**, não gera `stroke-width` — um traço de N px de espessura vira um contorno duplo (borda externa + interna). Aceitável como padrão; só considerar extração de esqueleto/stroke se a fidelidade do traço não for satisfatória
- Resolução baixa de origem (ícones de 16–32px) tende a gerar vetor "blocado" — documentar como limitação conhecida, não tentar compensar via lógica extra
- Antes de integrar a lib no pipeline, validar com um teste manual (CLI do potrace) em 5–10 PNGs reais representativos (formas simples, com buraco, traço fino, traço grosso) para confirmar que o resultado é aceitável

Implementado em `src/lib/image/svg.ts`: lê a imagem (qualquer formato de entrada aceito) via `sharp`, gera um bitmap binário (preto/branco) a partir do canal alfa, extrai a cor de preenchimento do primeiro pixel opaco encontrado (em vez de assumir preto) e passa esse bitmap pro `potrace.trace`. Quando `resize` também está marcado, o SVG resultante recebe `width`/`height` sobrescritos (mantendo o `viewBox` original) em vez de rasterizar-redimensionar-vetorizar — como é vetor, isso escala sem perda.

### Cor de saída customizável (`outputColor`)

Mantém o modelo de cor única (não é segmentação multi-cor — isso foi avaliado e descartado por enquanto por exigir clustering de cor, múltiplas passadas de potrace por imagem e um passo extra de detecção sincronizado entre cliente e servidor; ver decisão registrada na conversa). `AdjustmentConfig.outputColor: string | null` — quando definido, sobrescreve a cor de saída em vez de usar a original:
- **SVG**: `convertToSvg` recebe `colorOverride` e usa em vez da cor auto-detectada (a detecção ainda roda, só é ignorada quando há override — sem ganho real em pular, mesmo loop de varredura do alfa).
- **PNG**: `src/lib/image/recolor.ts` (`recolorImage`) substitui o RGB de todo pixel pela cor escolhida, preservando o alfa original de cada pixel (então bordas com anti-aliasing continuam suaves, só muda o matiz).
- Validado em `isValidAdjustmentConfig` via regex de hex (`#rrggbb`).

### Remoção de fundo por cor (`removeBackground`)

Chroma key, não segmentação por IA — bom pra fundo sólido/quase sólido (still de produto), não pra foto com fundo complexo (ver avaliação registrada na conversa). Implementado em `src/lib/image/removeBackground.ts`, roda **antes do trim** no `process.ts` (senão o trim não teria o que cortar — ele depende da transparência recém-criada).

- `AdjustmentConfig.removeBackground: { color: string | null; tolerance: number } | null`. `color: null` = detectar automaticamente a cada imagem (não dá pra fazer isso uma vez só no "global", porque cada imagem do lote pode ter uma cor de fundo diferente — por isso a detecção roda no servidor, por imagem, em vez de uma vez só no cliente)
- **Detecção automática**: média dos 4 pixels de canto da imagem. Simples e previsível, mais robusto que 1 pixel só (evita ruído de anti-aliasing bem no canto), sem ir longe demais com histograma/moda da borda inteira
- **Distância de cor**: `max(|Δr|, |Δg|, |Δb|)` (Chebyshev, não euclidiana) — mais barato e fácil de raciocinar sobre o threshold
- **Sem corte binário**: usa uma faixa de transição (85%–100% do threshold de tolerância) onde o alfa é reduzido gradualmente em vez de zerado de uma vez — evita borda serrilhada, principalmente em foto. O alfa original de cada pixel é multiplicado pelo fator de remoção (não sobrescrito), preservando transparência pré-existente
- **Composição com SVG**: funciona sem nenhum código extra — como a conversão SVG já lê o canal alfa (`flattenByAlpha`), o alfa criado pela remoção de fundo alimenta o traçado diretamente. Testado: fundo branco removido + trim + SVG produz o path certo com a cor do sujeito preservada

## Notas técnicas

- **`serverExternalPackages`** (`next.config.ts`): `potrace` e `jimp` (dependência interna do potrace) precisam estar nessa lista. Sem isso, o bundler do Next tenta empacotar o pacote e gera um erro em runtime (`Right-hand side of 'instanceof' is not callable`) por causa de checks internos de classe que quebram quando bundlados. `sharp` já é externalizado automaticamente pelo Next, não precisa ser adicionado.
- **Vulnerabilidades transitivas conhecidas** (`npm audit`): `potrace` depende de uma versão antiga do `jimp`, que por sua vez depende de `file-type` (loop infinito em parser ASF malformado) e `phin` (vazamento de headers em redirect). Sem correção disponível upstream. Risco aceito: nosso código nunca passa URLs pro potrace/jimp (só buffers PNG gerados internamente por nós), então o vetor do `phin` não é alcançável; o bug do `file-type` é específico do formato ASF (áudio), não PNG.
- **Desambiguação de nomes no zip** (`route.ts`, função `uniqueName`): usar `usedNames.size` como sufixo de retry (versão antiga) causa loop infinito quando o nome gerado colide com um arquivo cujo nome original já é literalmente `base-N.ext` — trava a requisição para sempre. Corrigido com um contador dedicado que incrementa a cada tentativa, independente do tamanho do set. Reproduzido e verificado com os arquivos `logo-2.png`, `logo.png`, `logo.png` (nessa ordem).
- **Trim sem transparência**: testado empiricamente — `sharp().trim()` em uma imagem totalmente transparente ou totalmente opaca/uniforme não lança erro, apenas não corta nada (no-op). Não precisa de tratamento especial.
- **Limite total de upload (`MAX_TOTAL_UPLOAD_BYTES`, 4 MB)**: o limite por arquivo (`MAX_FILE_SIZE_BYTES`, 1 MB) sozinho não garante compatibilidade com a Vercel — o limite real da plataforma é no **corpo inteiro da requisição** (4,5 MB, hard-coded na infra, não contornável por config de app), então um lote de muitos arquivos pequenos ainda podia estourar isso. `validateNewFiles` (cliente) e `route.ts` (servidor) agora somam o tamanho de todos os arquivos do lote e cortam em 4 MB, com margem de 0,5 MB pra overhead do multipart e o campo `configs`. Aceitação é "primeiro a caber, para no primeiro que não cabe" (mesmo padrão já usado pro limite de contagem) — não tenta encaixar um arquivo menor que viria depois de um que estourou o limite.
- **Zip Slip** (`sanitizeFileName`, `validation.ts`): `file.name` é controlado por quem chama a API — um POST feito fora do dropzone do navegador pode setar qualquer valor, incluindo `../../etc/passwd`. Como esse nome vira a entrada do `.zip` (`archive.append(file.buffer, { name })` em `route.ts`), sem sanitização isso é um Zip Slip clássico: ferramentas de descompactação sem proteção contra path traversal escreveriam fora da pasta de destino. `sanitizeFileName` pega só o último segmento do caminho (via split em `/` e `\`) e remove pontos à esquerda, eliminando `../` e nomes tipo `..`. Testado com `filename=../../../../etc/passwd` — a entrada no zip resultante foi `passwd.png`, sem nenhum componente de caminho.
- **Rate limiting** (`rateLimit.ts`): `/api/process` é público e faz processamento pesado (sharp/potrace) por até 60s (`maxDuration`), sem autenticação — um script automatizado batendo no limite de payload repetidamente geraria custo de execução na Vercel. Implementado como Map em memória, por IP (`x-forwarded-for`), 10 requisições/minuto. É proteção best-effort, não uma garantia: o Map só persiste enquanto a mesma instância serverless estiver "quente" (reseta em cold start) e cada instância conta independentemente se a Vercel escalar horizontalmente — mas já eleva o custo de abuso casual/script simples sem precisar de serviço externo (Upstash, Vercel Firewall). Testado: 10 requisições seguidas passam, a partir da 11ª (mesma janela de 60s) retorna 429.
- **Testes unitários** (`src/lib/image/*.test.ts`, `vitest.config.mts`): usei Vitest — é o que a própria documentação do Next.js recomenda pra esse stack, e como as funções em `lib/image` são Node puro (sem DOM/React), não precisou de `jsdom`/`@testing-library/react`, só o `vitest` em si (única dependência nova). Resolução do alias `@/*` via `resolve.tsconfigPaths: true` nativo do Vite — não precisou do plugin `vite-tsconfig-paths` (instalado a princípio, removido depois de confirmar que a opção nativa funciona; menos uma dependência). Config em `vitest.config.mts` (não `.ts`) pra evitar ambiguidade CJS/ESM do carregador do Vite (aviso explícito no primeiro `vitest run`).
  - `trim.ts`/`resize.ts`/`recolor.ts`/`svg.ts`/`ico.ts`/`removeBackground.ts`: testados com sharp de verdade sobre buffers PNG sintéticos pequenos (helpers em `testUtils.ts`, não é um arquivo de teste) — testar essas funções mockando o sharp destruiria o propósito, já que a lógica de manipulação de pixel *é* o que está sendo testado.
  - `process.ts`: testado com as 6 funções de operação mockadas via `vi.mock` — aqui o objetivo é validar a lógica de orquestração (ordem das chamadas, encadeamento buffer→buffer, quais funções são puladas por formato de saída) isolada da implementação de cada operação, que já tem seus próprios testes.
  - `config.ts`/`validation.ts`: lógica pura, sem I/O — inclui um teste de regressão específico pro bug já documentado de `isValidAdjustmentConfig` (early-return que pulava validação de campos declarados depois) e pro fix do Zip Slip (`sanitizeFileName` com `../` e variantes).
  - Rodar com `npm test` (`vitest run`, single-shot — não fica em modo watch).
- **Security headers** (`next.config.ts`): CSP + `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` via `headers()` — o equivalente ao que `helmet` daria de graça num app Express, mas Next.js não seta isso sozinho. CSP é estático (sem nonce): a app não tem necessidade real de dynamic rendering por request, então nonce só custaria otimização estática sem ganho de segurança proporcional aqui — segue o baseline "without nonces" documentado do próprio Next. `script-src`/`style-src` precisam de `'unsafe-inline'` porque os scripts de hidratação do Next e o `style={{width: ...}}` da barra de progresso (`ImageUploader.tsx`) não são nonce-tagged sem dynamic rendering; `img-src` precisa de `blob:` pros previews client-side (`URL.createObjectURL`). Duas relaxações **só em dev** (`isDev`, nunca em produção — verificado comparando o header em `next dev` vs `next start`): `'unsafe-eval'` (React usa `eval()` em dev pra reconstruir stack traces do servidor no console do navegador) e `connect-src ws:` (o WebSocket do Fast Refresh do Next conecta numa porta diferente da página, que o CSP trata como origem diferente — sem isso o HMR quebra silenciosamente, só percebido testando o fluxo real no navegador, não no `curl`). Testado via Playwright ponta a ponta (upload → SVG + remoção de fundo → download do zip) sem nenhuma violação de CSP no console.
- **SEO** (`layout.tsx`, `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `page.tsx`): app é uma única página estática, sem conteúdo dinâmico indexável — por isso `sitemap.ts` só lista a home, e não há necessidade de `generateMetadata` por rota. `SITE_URL` (`https://clean-pic.vercel.app`) está hard-coded em três arquivos (`layout.tsx`, `robots.ts`, `sitemap.ts`, mais o JSON-LD em `page.tsx`) em vez de centralizado — se o domínio mudar (ex.: domínio próprio), precisa atualizar nos quatro lugares; não valeu a pena uma env var pra um valor que muda raramente. `opengraph-image.tsx` gera a imagem via `next/og` `ImageResponse` (JSX/CSS, não a `logo.svg` como `<img>` — satori tem suporte instável a SVG arbitrário, então a marca é recriada como um quadrado colorido + texto, reaproveitando só a cor `#6f73d2` da logo). O `<meta name="twitter:...">` não precisou de `twitter-image.tsx` próprio — na ausência de imagem específica pro Twitter, o validador dele já cai pro `og:image`, confirmado no HTML renderizado. Indexação em si (Google Search Console, submissão do sitemap) é um passo manual fora do repositório, não automatizável por código.

## Convenções de código

- **TypeScript** em todo o projeto, sem `any` — tipar entradas/saídas das funções de processamento de imagem explicitamente
- **App Router**: lógica de servidor em Route Handlers (`app/api/**/route.ts`); Server Components por padrão, `"use client"` só onde há estado/interação
- **Processamento de imagem** isolado em módulos próprios (ex.: `lib/image/*`), sem lógica de UI misturada — cada operação (trim, resize, svg) é uma função pura testável independentemente
- **Estado de configuração por imagem**: modelar como um único objeto de config "global" mais overrides individuais por imagem, evitando duplicar os três campos (svg/trim/resize) em cada item quando o valor é herdado do global
- **Nomes em inglês** no código (variáveis, funções, componentes), comentários apenas quando o motivo não é óbvio pelo código
- **Sem otimização prematura**: processar imagens sequencialmente antes de considerar paralelismo/streaming, a menos que o volume (até 50 imagens) mostre necessidade real
- **Validação de entrada** apenas nas bordas do sistema (upload: tipo de arquivo, quantidade, dimensões do resize) — não validar internamente o que já foi garantido na entrada

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
