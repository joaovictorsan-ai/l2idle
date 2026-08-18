# L2idle — protótipo

Vertical slice local de um idle MMORPG medieval para navegador. A proposta é validar progressão, identidade de classe, caçada automática, economia, bosses e PvP antes de investir em backend ou multiplayer real.

## Como executar

Você pode abrir `index.html` diretamente no navegador. Para evitar restrições locais de alguns navegadores, também pode servir a pasta com Python:

```powershell
cd prototypes\valdora-idle
python -m http.server 8088
```

Depois acesse `http://localhost:8088`.

## O que já funciona

- Criação de personagem com quatro linhagens e três arquétipos originais.
- Duas promoções de classe nos níveis 20 e 40, com escolhas de especialização.
- Combate automático com prioridade de alvo, poções automáticas, skill bar, mana, buffs e cargas de Éter.
- Experiência, atributos, níveis, ouro e progressão persistente via `localStorage`.
- Oito slots de equipamento em paper doll, cinco graus (D, C, B, A e S) e quatro raridades.
- Inventário, comparação, requisitos de nível, equipamentos e venda de itens.
- Enchant até +12 com pergaminhos, auras visuais, chance progressiva e risco de quebra após +4.
- Quatro regiões com regras de PvP e desbloqueios por nível.
- Mercado de consumíveis e equipamentos, com taxa influenciada pelo karma.
- Conclave assíncrono, clãs, PK/karma e guerra territorial simulada.
- Chefe mundial com arte original e drops lendários extremamente raros.
- Seis missões de apresentação dos sistemas.
- Recompensas offline de até oito horas.
- Layout responsivo para desktop e celular.
- Modo apresentação, no rodapé, para liberar rapidamente o nível 40 e os recursos da demo.

## Escopo deliberadamente excluído

Backend, contas, economia real entre jogadores, chat, pagamentos, RMT, anti-cheat e multiplayer em tempo real. Mercado, clãs, PvP, guerra e chefe mundial são simulações locais desta versão.

## Assets gerados

Os PNGs em `assets/` foram criados com a ferramenta integrada de geração de imagens usando prompts de fantasia medieval original. Nenhum nome, personagem, mapa, ícone ou asset de franquia existente é utilizado.
