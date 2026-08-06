# Descrição

PNG Any é uma ferramenta web pra ajustar imagens PNG

# Requisitos Funcionais

- O usuário faz upload de imagens PNG
- A ferramenta dá as seguintes opções marcáveis (com opção pra ajuste individual ou global):
  - Transformar em SVG
  - Cortar espaços vazios em volta do PNG
  - Redimensionar (com altura e largura escolhidas)
  - Alterar a cor de saída (aplica em PNG e em SVG; mantém o modelo de cor única já usado hoje, apenas troca a cor pela escolhida em vez de manter a original)
  - Remover fundo (por cor + tolerância — não é segmentação por IA, é indicado pra fundo sólido/quase sólido tipo still de produto, não recorta bem foto com fundo complexo). Detecta a cor de fundo automaticamente por padrão (a partir dos cantos da própria imagem), mas permite escolher a cor manualmente
- O usuário faz download dos arquivos ajustados em formato zip

# Requisitos Não Funcionais

- Deve ser ferramenta web com interface
- Nextjs, como front-end e back-end

# Regras de Negócio

- Deve deixar escolher entre 1 e 50 imagens
- A conversão para SVG é voltada para ícones de cor única em estilo "outline" (contorno). Fotos, gradientes ou imagens com múltiplas cores não têm boa fidelidade nesse processo e ficam fora do escopo garantido
- Cada arquivo tem limite de 1 MB (proteção contra uso excessivo de memória/CPU no processamento)
- O lote inteiro (soma de todos os arquivos numa mesma requisição) tem limite de 4 MB — esse é o limite que realmente importa pra caber no corpo de requisição de 4,5 MB da Vercel gratuita; o limite por arquivo sozinho não garante isso quando há muitos arquivos pequenos
- Largura e altura de redimensionamento devem ser números inteiros entre 1 e 10000 px
