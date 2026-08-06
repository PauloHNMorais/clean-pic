# Descrição

CleanPic é uma ferramenta web pra ajustar imagens

# Requisitos Funcionais

- O usuário faz upload de imagens em qualquer formato suportado (JPEG, PNG, WebP, GIF, AVIF)
- A ferramenta dá as seguintes opções marcáveis (com opção pra ajuste individual ou global):
  - Escolher o formato de saída: PNG, SVG ou ICO
  - Cortar espaços vazios em volta da imagem
  - Redimensionar (com altura e largura escolhidas)
  - Alterar a cor de saída (aplica em PNG e em SVG; mantém o modelo de cor única já usado hoje, apenas troca a cor pela escolhida em vez de manter a original)
  - Remover fundo (por cor + tolerância — não é segmentação por IA, é indicado pra fundo sólido/quase sólido tipo still de produto, não recorta bem foto com fundo complexo). Detecta a cor de fundo automaticamente por padrão (a partir dos cantos da própria imagem), mas permite escolher a cor manualmente
- O usuário faz download dos arquivos ajustados em formato zip

# Requisitos Não Funcionais

- Deve ser ferramenta web com interface
- Nextjs, como front-end e back-end

# Regras de Negócio

- Deve deixar escolher entre 1 e 50 imagens
- Formatos de entrada aceitos: JPEG, PNG, WebP, GIF, AVIF. TIFF não entra apesar de suportado no processamento porque o navegador não exibe preview dele; SVG não entra porque foge do modelo de pixel bruto usado no resto do pipeline
- A conversão para SVG é voltada para ícones de cor única em estilo "outline" (contorno). Fotos, gradientes ou imagens com múltiplas cores não têm boa fidelidade nesse processo e ficam fora do escopo garantido — isso vale pra qualquer formato de entrada, não só PNG
- Cada arquivo tem limite de 1 MB (proteção contra uso excessivo de memória/CPU no processamento)
- O lote inteiro (soma de todos os arquivos numa mesma requisição) tem limite de 4 MB — esse é o limite que realmente importa pra caber no corpo de requisição de 4,5 MB da Vercel gratuita; o limite por arquivo sozinho não garante isso quando há muitos arquivos pequenos
- Largura e altura de redimensionamento devem ser números inteiros entre 1 e 10000 px
- Saída em .ico não suporta mais que 256×256 (limite do próprio formato) — se o resultado final passar disso, é reduzido automaticamente mantendo a proporção
