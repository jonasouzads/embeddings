import OpenAI from 'openai';
import { ConfiguracaoAPI } from '@/types';

// Função para limpar marcações de texto antes da vetorização
export const limparTexto = (texto: string): string => {
  // Remover marcações markdown
  let textoLimpo = texto
    // Remover cabeçalhos markdown
    .replace(/#{1,6}\s+/g, '')
    // Remover negrito e itálico
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remover listas
    .replace(/^\s*[\*\-\+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remover links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // Remover código inline e blocos de código
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Remover tags HTML
    .replace(/<[^>]*>/g, '');

  // Normalizar espaços e quebras de linha
  textoLimpo = textoLimpo
    .replace(/\s+/g, ' ')
    .trim();

  return textoLimpo;
};

// Função para criar um cliente OpenAI com a chave de API fornecida
export const criarClienteOpenAI = (config: ConfiguracaoAPI) => {
  return new OpenAI({
    apiKey: config.openaiKey,
    dangerouslyAllowBrowser: true, // Permitir uso no navegador já que o usuário fornece sua própria chave
  });
};

// Função para gerar embedding para um texto usando a API da OpenAI
export const gerarEmbedding = async (config: ConfiguracaoAPI, texto: string) => {
  const openai = criarClienteOpenAI(config);
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texto,
    encoding_format: "float",
  });

  return response.data[0].embedding;
};

// Função para gerar perguntas e respostas automaticamente para um chunk de texto
export const gerarPerguntasRespostas = async (
  config: ConfiguracaoAPI, 
  texto: string,
  numeroPerguntas: number = 3
): Promise<Array<{pergunta: string, resposta: string}>> => {
  const openai = criarClienteOpenAI(config);
  
  try {
    // Prompt para gerar perguntas e respostas relevantes para o texto
    const prompt = `Analise o seguinte texto e gere ${numeroPerguntas} perguntas relevantes com suas respectivas respostas. 

Texto: "${texto}"

Gere apenas perguntas que podem ser respondidas diretamente com informações contidas no texto. Para cada pergunta, fornecer uma resposta concisa baseada exclusivamente no texto fornecido. Formato:

Pergunta 1: [Pergunta]
Resposta 1: [Resposta]

Pergunta 2: [Pergunta]
Resposta 2: [Resposta]

Pergunta 3: [Pergunta]
Resposta 3: [Resposta]`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const content = completion.choices[0].message.content;
    
    if (!content) {
      return [];
    }
    
    // Processar o resultado para extrair perguntas e respostas
    const pairsQA: Array<{pergunta: string, resposta: string}> = [];
    const regex = /Pergunta (\d+): (.+)\nResposta \1: (.+)/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      pairsQA.push({
        pergunta: match[2].trim(),
        resposta: match[3].trim()
      });
    }
    
    return pairsQA;
  } catch (error) {
    console.error('Erro ao gerar perguntas e respostas:', error);
    return [];
  }
};

// Função para dividir textos longos em chunks para processamento com sobreposição
export const dividirTextoEmChunks = (texto: string, tamanhoMaximo: number = 1000, sobreposicao: number = 200): string[] => {
  if (texto.length <= tamanhoMaximo) {
    return [texto];
  }
  
  // Dividir o texto em parágrafos
  const paragrafos = texto.split('\n\n');
  const chunks: string[] = [];
  let chunkAtual = '';
  let ultimoConteudo = ''; // Para armazenar o conteúdo de sobreposição
  
  for (const paragrafo of paragrafos) {
    // Se adicionar este parágrafo exceder o tamanho máximo, salvar o chunk atual e começar um novo
    if (chunkAtual.length + paragrafo.length > tamanhoMaximo) {
      if (chunkAtual.length > 0) {
        chunks.push(chunkAtual);
        
        // Extrair a parte final do chunk atual para sobreposição
        if (chunkAtual.length > sobreposicao) {
          ultimoConteudo = chunkAtual.substring(chunkAtual.length - sobreposicao);
        } else {
          ultimoConteudo = chunkAtual;
        }
        
        // Iniciar o próximo chunk com o conteúdo de sobreposição
        chunkAtual = ultimoConteudo;
      }
      
      // Se o parágrafo for maior que o tamanho máximo, dividi-lo em partes menores
      if (paragrafo.length > tamanhoMaximo - sobreposicao) {
        let inicio = 0;
        while (inicio < paragrafo.length) {
          const fim = Math.min(inicio + tamanhoMaximo - ultimoConteudo.length, paragrafo.length);
          const parte = paragrafo.substring(inicio, fim);
          
          // Adicionar a parte ao chunk atual ou criar um novo chunk
          if (chunkAtual.length + parte.length <= tamanhoMaximo) {
            if (chunkAtual.length > 0) chunkAtual += '\n\n';
            chunkAtual += parte;
          } else {
            chunks.push(chunkAtual);
            
            // Extrair a parte final para sobreposição
            if (chunkAtual.length > sobreposicao) {
              ultimoConteudo = chunkAtual.substring(chunkAtual.length - sobreposicao);
            } else {
              ultimoConteudo = chunkAtual;
            }
            
            chunkAtual = ultimoConteudo + '\n\n' + parte;
          }
          
          inicio = fim - sobreposicao; // Sobrepor com a parte anterior
          if (inicio < 0) inicio = 0;
        }
      } else {
        // Adicionar o parágrafo ao chunk atual
        if (chunkAtual.length > 0) chunkAtual += '\n\n';
        chunkAtual += paragrafo;
      }
    } else {
      // Adicionar um separador se não for o primeiro parágrafo no chunk
      if (chunkAtual.length > 0) {
        chunkAtual += '\n\n';
      }
      chunkAtual += paragrafo;
    }
  }
  
  // Adicionar o último chunk se houver conteúdo
  if (chunkAtual.length > 0) {
    chunks.push(chunkAtual);
  }
  
  return chunks;
};
