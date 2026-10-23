# CopyLab

> Extensão de navegador que lê exames laboratoriais em PDF e copia os resultados abreviados
> (ex.: `EX. LAB 15/10/2026: HB 8.5 | HT 26.4 | GLIC 92`) com um clique, pronta para colar na prescrição ou no prontuário.

**Autor:** Vinícius Nathan – MED UVV · **Versão:** 0.9.1 · **Licença:** [CopyLab – uso livre com atribuição, sem fins comerciais](LICENSE)

## O que faz

* Lê o PDF aberto na aba atual e extrai os resultados dos exames.
* Converte para abreviações editáveis (Hb, Ht, Leuco, Plaq, Glic, Cr, TSH, EAS, UROC, EPF…).
* Resume urina rotina, urocultura (com antibiograma) e parasitológico de fezes.
* Copia o texto para a área de transferência e mostra de onde veio cada valor, para conferência.
* Laudos testados: **Hermes Pardini, Pretti, Prestlab e Diagnóstico do Brasil**.
* Se o leitor de PDF não funcionar no seu navegador, use **"Colar texto do PDF"** (Ctrl+A, Ctrl+C no PDF e Ctrl+V na extensão).

## Privacidade

Tudo roda **localmente no seu navegador**. A extensão não envia PDFs nem dados de pacientes para nenhum servidor.
Mesmo assim, **não publique laudos reais** (nem prints) em issues, fóruns ou neste repositório.

## Instalação

1. Baixe o arquivo `.zip` na aba **Releases** (ou em **Code → Download ZIP**) e descompacte.
2. Abra a página de extensões: `chrome://extensions`, `edge://extensions` ou `cent://extensions`.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e escolha a pasta `extensao-exames`.
5. Para PDFs salvos no computador (`file://`), abra os **Detalhes** da extensão e ative **Permitir acesso a URLs de arquivo**.
6. Abra o laudo, clique no ícone do CopyLab e use **Ctrl+V** onde quiser colar.

Em **Opções** é possível editar o dicionário de abreviações e o separador entre resultados.

## Compatibilidade

|Versão|Manifest|Navegadores|
|-|-|-|
|0.9.1 (esta)|V2|Chromium 86+ (Cent Browser 4.x, Chrome/Edge antigos)|
|0.9.0|V3|Chrome/Edge atuais|

O Chrome está descontinuando extensões em manifest V2; em navegadores modernos prefira a 0.9.0.

## Aviso médico

O CopyLab é uma ferramenta de apoio e **não é dispositivo médico**. Ele pode errar ou não reconhecer um exame.
**Confira sempre o resultado com o laudo original** antes de usar em prontuário ou prescrição.

## Licença e autoria

Você pode **usar gratuitamente** e **compartilhar sem modificações, com os créditos**. Não é permitido vender, remover
os créditos, apresentar como de sua autoria nem publicar versões modificadas sem autorização por escrito.
Leia o texto completo em [LICENSE](LICENSE). O PDF.js incluído segue a Apache 2.0 ([NOTICE.md](NOTICE.md)).

Ao compartilhar, indique: *"CopyLab, de Vinícius Nathan – MED UVV"* e o link deste repositório.

## Contato e contribuições

Sugestões e relatos de erro: abra uma **Issue** (sem dados de pacientes).
Para pedir autorização de uso diferente do previsto na licença: perfil do autor em https://github.com/viniciusnathanadv-eng/

viniciusnathanadv@gmail.com 

@viniciusnathancp

© 2026 Vinícius Nathan – MED UVV. Todos os direitos reservados, exceto os concedidos na licença.

