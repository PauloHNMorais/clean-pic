# Descrição

PNG Any é uma ferramenta web pra ajustar imagens PNG

# Requisitos Funcionais

- O usuário faz upload de imagens PNG
- A ferramenta dá as seguintes opções marcáveis (com opção pra ajuste individual ou global):
  - Transformar em SVG
  - Cortar espaços vazios em volta do PNG
  - Redimensionar (com altura e largura escolhidas)
  - Alterar a cor de saída (aplica em PNG e em SVG; mantém o modelo de cor única já usado hoje, apenas troca a cor pela escolhida em vez de manter a original)
- O usuário faz download dos arquivos ajustados em formato zip

# Requisitos Não Funcionais

- Deve ser ferramenta web com interface
- Nextjs, como front-end e back-end

# Regras de Negócio

- Deve deixar escolher entre 1 e 50 imagens
- A conversão para SVG é voltada para ícones de cor única em estilo "outline" (contorno). Fotos, gradientes ou imagens com múltiplas cores não têm boa fidelidade nesse processo e ficam fora do escopo garantido
- Cada arquivo tem limite de 20 MB (proteção contra uso excessivo de memória/CPU no processamento)
- Largura e altura de redimensionamento devem ser números inteiros entre 1 e 10000 px
