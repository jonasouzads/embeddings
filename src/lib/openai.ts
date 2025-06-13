import OpenAI from 'openai';
import { ConfiguracaoAPI } from '@/types';

// Função para criar um cliente OpenAI com a chave de API fornecida
export const criarClienteOpenAI = (config: ConfiguracaoAPI) => {
  return new OpenAI({
    apiKey: config.openaiKey,
    dangerouslyAllowBrowser: true, // Permitir uso no navegador já que o usuário fornece sua própria chave
  });
};

// Função para gerar embedding para um texto
export const gerarEmbedding = async (config: ConfiguracaoAPI, texto: string): Promise<number[]> => {
  const openai = criarClienteOpenAI(config);
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texto,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    throw new Error('Falha ao gerar embedding. Verifique sua chave de API da OpenAI.');
  }
};

// Função para dividir textos longos em chunks para processamento
export const dividirTextoEmChunks = (texto: string, tamanhoMaximo: number = 8000): string[] => {
  if (texto.length <= tamanhoMaximo) {
    return [texto];
  }
  
  // Dividir o texto em parágrafos
  const paragrafos = texto.split('\n\n');
  const chunks: string[] = [];
  let chunkAtual = '';
  
  for (const paragrafo of paragrafos) {
    // Se adicionar este parágrafo exceder o tamanho máximo, salvar o chunk atual e começar um novo
    if (chunkAtual.length + paragrafo.length > tamanhoMaximo) {
      if (chunkAtual.length > 0) {
        chunks.push(chunkAtual);
        chunkAtual = '';
      }
      
      // Se o parágrafo for maior que o tamanho máximo, dividi-lo em partes menores
      if (paragrafo.length > tamanhoMaximo) {
        const partesParágrafo = [];
        for (let i = 0; i < paragrafo.length; i += tamanhoMaximo) {
          partesParágrafo.push(paragrafo.substring(i, i + tamanhoMaximo));
        }
        chunks.push(...partesParágrafo);
      } else {
        chunkAtual = paragrafo;
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
