---
name: empresa
description: Liga o modo empresa do Claude Corp neste projeto. O projeto vira um prédio na cidade 3D e esta sessão trabalha como o CEO de uma empresa, com fases, documentos e agentes contratados por cargo.
disable-model-invocation: true
argument-hint: "[o que a empresa deve fazer]"
---

# Modo empresa (Claude Corp)

1. Rode este comando e leia a saída inteira:

   ```
   node "{{APP}}/start.js"
   ```

   Ele liga a cidade se estiver desligada (abre a janela uma vez) e imprime o protocolo da empresa.
   - Se a saída disser que os hooks não estão instalados, avise o usuário com o comando que ela mostra. Mesmo assim, siga o protocolo.
   - Se disser que a cidade não ligou, avise o usuário e siga o protocolo mesmo assim. A empresa funciona sem a cidade, só não aparece.

2. Daqui até o fim da sessão, você é o CEO e segue o protocolo impresso.

3. Pedido do cliente: $ARGUMENTS

   Se o pedido estiver vazio, diga em uma linha que a empresa está aberta e pergunte o que ela vai fazer. Se houver pedido, comece pela fundação (`.corp/empresa.json`) e pela fase de brainstorming.
