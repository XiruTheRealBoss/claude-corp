# Claude Corp

Cada projeto aberto no Claude Code vira um prédio 3D (Three.js, câmera livre) com bonecos 2D. Cada funcionário tem sua mesinha; times dividem uma mesa sobre um tapete da equipe, e os bonecos digitam, piscam, vão ao café e visitam colegas. Precisa de internet para carregar o Three.js do CDN. Lá dentro funciona uma empresa: o CEO (a sessão principal) contrata agentes por cargo, cada um com o boneco do Claude e um acessório da função (lápis = artista, lupa = pesquisador, notebook = dev, prancheta = gerente, escudo = QA, megafone = marketing, lâmpada = criativo, régua = arquiteto, pincel = designer, coroa e gravata = CEO). Cada andar é um departamento/fase: brainstorming → pesquisa → planejamento → protótipo → desenvolvimento → qualidade → lançamento.

Quando alguém tem uma dúvida (pedido de permissão, AskUserQuestion, Claude esperando você), chega uma notificação no Windows e a câmera dá zoom nesse funcionário.

## Uso

1. Uma vez: `node install.js` (adiciona os hooks em `~/.claude/settings.json`, com backup em `settings.json.bak-claude-corp`).
2. Abra o app: `abrir.cmd` (ou `node server.js` e acesse http://localhost:4747). Clique em **Ativar notificações**.
3. Abra o Claude Code em qualquer projeto. Sessões novas abertas com o app ligado entram no **modo empresa** (`protocolo.md` vira instrução do CEO: nome da empresa em `.corp/empresa.json`, um documento por fase em `.corp/`, agentes contratados com `[Cargo]` na descrição). Com o app fechado, o Claude Code funciona normalmente.

Remover: `node install.js remove`.

- `node core.js` roda o autoteste da lógica. `node demo.js` manda uma empresa de mentira para o app.
- Para depurar os eventos crus, crie um arquivo vazio chamado `debug` nesta pasta (o hook passa a anotar neles); apague para desligar.
- Estado da cidade fica em `state.json`. "Demolir prédio" no painel apaga um prédio.

## Aviso

Projeto de fã, não oficial e sem afiliação com a Anthropic. "Claude" e o mascote pertencem à Anthropic.

Os hooks mandam os eventos só para `127.0.0.1` (o seu próprio PC). Nada sai da máquina. O estado da cidade, com caminhos e pedidos, fica em `state.json`, que o git ignora.
