# Valdora Idle — protótipo

Vertical slice local de um idle RPG medieval para navegador. A proposta é validar o loop de caçada automática, drops, equipamento, enchant e Coliseu antes de investir em backend, multiplayer ou RMT.

## Como executar

Você pode abrir `index.html` diretamente no navegador. Para evitar restrições locais de alguns navegadores, também pode servir a pasta com Python:

```powershell
cd prototypes\valdora-idle
python -m http.server 8088
```

Depois acesse `http://localhost:8088`.

## O que já funciona

- Combate automático com dano, crítico, regeneração após cada abate e derrota sem punição.
- Experiência, níveis, ouro e progressão persistente via `localStorage`.
- Drops com quatro raridades e atributos escalados por área/nível.
- Inventário, comparação, equipamento e venda de itens.
- Enchant até +10 com custo e chance progressivos.
- Três regiões desbloqueadas por nível.
- Coliseu assíncrono simulado e pontos de honra.
- Missões de onboarding.
- Recompensas offline de até oito horas.
- Layout responsivo para desktop e celular.

## Escopo deliberadamente excluído

Backend, contas, economia entre jogadores, chat, guildas, pagamentos, RMT, anti-cheat e multiplayer real. Esses sistemas só fariam sentido depois de validar retenção e interesse pelo loop principal.

## Assets gerados

Os três PNGs em `assets/` foram criados com a ferramenta integrada de geração de imagens usando prompts de pixel art medieval original. Nenhum asset ou nome de franquia existente é utilizado.
