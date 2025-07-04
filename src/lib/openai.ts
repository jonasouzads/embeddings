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
  try {
    console.log(`gerarEmbedding: Iniciando geração de embedding para texto de ${texto.length} caracteres`);
    
    // Validar entrada
    if (!texto || texto.trim() === '') {
      throw new Error('O texto para embedding não pode estar vazio');
    }
    
    // Limitar tamanho do texto se necessário (evitar erros de token limit)
    const textoLimitado = texto.length > 8000 ? texto.substring(0, 8000) : texto;
    if (textoLimitado.length < texto.length) {
      console.warn(`gerarEmbedding: Texto truncado de ${texto.length} para 8000 caracteres para evitar limites de token`);
    }
    
    const openai = criarClienteOpenAI(config);
    
    console.log('gerarEmbedding: Enviando requisição para a API da OpenAI...');
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: textoLimitado,
      encoding_format: "float",
    });
    
    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Resposta da API não contém embedding válido');
    }
    
    const embedding = response.data[0].embedding;
    console.log(`gerarEmbedding: Embedding gerado com sucesso, dimensão: ${embedding.length}`);
    
    return embedding;
  } catch (error: unknown) {
    const apiError = error as Error;
    console.error('ERRO CRÍTICO na geração de embedding:', apiError);
    console.error('Detalhes do erro:', JSON.stringify(apiError, null, 2));
    throw new Error(`Falha ao gerar embedding: ${apiError.message || 'Erro desconhecido na API da OpenAI'}`);
  }
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
  console.log(`dividirTextoEmChunks: Iniciando divisão de texto com ${texto.length} caracteres`);
  
  // Verificação de segurança para parâmetros
  if (tamanhoMaximo <= 0) tamanhoMaximo = 1000;
  if (sobreposicao < 0) sobreposicao = 0;
  if (sobreposicao >= tamanhoMaximo) sobreposicao = Math.floor(tamanhoMaximo / 4); // 25% de sobreposição
  
  // Se o texto for menor que o tamanho máximo, retornar como um único chunk
  if (texto.length <= tamanhoMaximo) {
    console.log('dividirTextoEmChunks: Texto menor que o tamanho máximo, retornando como único chunk');
    return [texto];
  }
  
  // Abordagem simplificada e robusta: dividir o texto em chunks de tamanho fixo com sobreposição
  const chunks: string[] = [];
  let posicao = 0;
  
  // Limitar o número máximo de chunks para evitar explosão de memória
  const maxChunks = Math.ceil(texto.length / (tamanhoMaximo - sobreposicao)) * 2; // Multiplicar por 2 para ter margem de segurança
  
  while (posicao < texto.length && chunks.length < maxChunks) {
    // Calcular o fim do chunk atual
    const fim = Math.min(posicao + tamanhoMaximo, texto.length);
    
    // Extrair o chunk
    const chunk = texto.substring(posicao, fim);
    chunks.push(chunk);
    
    // Avançar para a próxima posição, considerando a sobreposição
    posicao = fim - sobreposicao;
    
    // Verificação de segurança para evitar loops infinitos
    if (posicao <= 0 || posicao >= texto.length) break;
  }
  
  console.log(`dividirTextoEmChunks: Texto dividido em ${chunks.length} chunks`);
  
  // Verificação final de segurança
  if (chunks.length >= maxChunks) {
    console.warn(`AVISO: Número máximo de chunks (${maxChunks}) atingido. O texto pode ser muito grande ou a lógica de divisão pode estar em loop.`);
  }
  
  return chunks;
};
