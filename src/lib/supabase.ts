import { createClient } from '@supabase/supabase-js';
import { ConfiguracaoAPI } from '@/types';

// Função para criar um cliente Supabase com as credenciais fornecidas
export const criarClienteSupabase = (config: ConfiguracaoAPI) => {
  if (!config?.supabaseUrl || !config?.supabaseKey) {
    throw new Error('supabaseUrl e supabaseKey são obrigatórios para criar o cliente Supabase');
  }
  return createClient(config.supabaseUrl, config.supabaseKey);
};

// Função para inicializar o banco de dados com a tabela necessária para embeddings
export const inicializarBancoDados = async (config: ConfiguracaoAPI) => {
  try {
    const supabase = criarClienteSupabase(config);
    
    // Verificar a conexão com o Supabase usando uma operação simples
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      throw new Error(`Erro de autenticação no Supabase: ${authError.message}`);
    }
    
    // Verificar se a tabela documents existe (padrão LangChain)
    const { error: tableError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    // Se a tabela não existir, podemos assumir que precisamos criar tudo
    // Caso contrário, assumimos que já está tudo configurado
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('Tabela documents não existe, tentando criar...');
      
      // Informar o usuário que ele precisa configurar o Supabase manualmente
      console.warn('ATENÇÃO: Configuração inicial do Supabase necessária.');
      console.warn('Você precisará executar alguns comandos SQL no editor do Supabase.');
      console.warn('Um diálogo com instruções detalhadas será exibido.');
      
      // Em vez de lançar um erro, retornar um status indicando que a configuração manual é necessária
      return { 
        sucesso: false, 
        configuracaoManualNecessaria: true,
        mensagem: 'A tabela documents não existe. Siga as instruções no diálogo para configurar seu Supabase.'
      };
    }
    
    return { sucesso: true };
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

// Função para salvar uma base de conhecimento
export const salvarBaseConhecimento = async (
  config: ConfiguracaoAPI,
  titulo: string,
  conteudo: string,
  embedding: number[],
  metadadosAdicionais?: Record<string, any>
) => {
  try {
    console.log(`salvarBaseConhecimento: Iniciando salvamento para "${titulo}"`);
    console.log(`salvarBaseConhecimento: Tamanho do conteúdo: ${conteudo.length} caracteres`);
    console.log(`salvarBaseConhecimento: Dimensão do embedding: ${embedding.length}`);
    
    // Validar parâmetros
    if (!titulo || titulo.trim() === '') {
      throw new Error('O título não pode estar vazio');
    }
    
    if (!conteudo || conteudo.trim() === '') {
      throw new Error('O conteúdo não pode estar vazio');
    }
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`Embedding inválido: ${JSON.stringify(embedding).substring(0, 100)}...`);
    }
    
    // Verificar tamanho do embedding (deve ser 1536 para OpenAI)
    if (embedding.length !== 1536) {
      console.warn(`Aviso: O embedding tem ${embedding.length} dimensões, mas o esperado é 1536.`);
    }
    
    const supabase = criarClienteSupabase(config);
    
    // Metadados base que sempre existirão
    const metadados = { 
      titulo, 
      dataCriacao: new Date().toISOString(), 
      dataAtualizacao: new Date().toISOString(),
      ...metadadosAdicionais // Adicionar metadados dinâmicos se fornecidos
    };
    
    console.log('salvarBaseConhecimento: Enviando dados para o Supabase...');
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          content: conteudo,
          metadata: metadados,
          embedding
        }
      ])
      .select();
      
    if (error) {
      console.error('ERRO ao salvar no Supabase:', error);
      throw error;
    }
    
    console.log(`salvarBaseConhecimento: Dados salvos com sucesso, ID: ${data?.[0]?.id || 'N/A'}`);
    return data;
  } catch (error: unknown) {
    const dbError = error as Error;
    console.error('ERRO CRÍTICO ao salvar base de conhecimento:', dbError);
    console.error('Detalhes do erro:', JSON.stringify(dbError, null, 2));
    throw new Error(`Falha ao salvar no Supabase: ${dbError.message || 'Erro desconhecido no banco de dados'}`);
  }
};

// Função para listar todas as bases de conhecimento
export const listarBasesConhecimento = async (config: ConfiguracaoAPI) => {
  const supabase = criarClienteSupabase(config);
  
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('id', { ascending: false });
    
  if (error) throw error;
  return data;
};

// Função para atualizar uma base de conhecimento
export const atualizarBaseConhecimento = async (
  config: ConfiguracaoAPI,
  id: string,
  titulo: string,
  conteudo: string,
  embedding: number[],
  metadadosAdicionais?: Record<string, any>
) => {
  const supabase = criarClienteSupabase(config);
  
  // Primeiro, obter o documento atual para preservar os metadados existentes
  const { data: existingDoc, error: fetchError } = await supabase
    .from('documents')
    .select('metadata')
    .eq('id', id)
    .single();
    
  if (fetchError) throw fetchError;
  
  // Atualizar os metadados mantendo outros campos que possam existir
  const updatedMetadata = {
    ...existingDoc?.metadata,
    titulo,
    dataAtualizacao: new Date().toISOString(),
    ...metadadosAdicionais // Adicionar metadados dinâmicos se fornecidos
  };
  
  const { data, error } = await supabase
    .from('documents')
    .update({
      content: conteudo,
      metadata: updatedMetadata,
      embedding
    })
    .eq('id', id)
    .select();
    
  if (error) throw error;
  return data;
};

// Função para excluir uma base de conhecimento
export const excluirBaseConhecimento = async (
  config: ConfiguracaoAPI,
  id: string
) => {
  const supabase = criarClienteSupabase(config);
  
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return { sucesso: true };
};

// SQL para criar as funções necessárias no Supabase (compatível com LangChain)
export const sqlInicializacao = `
-- Habilitar a extensão pgvector para trabalhar com vetores de embedding
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela para armazenar seus documentos (compatível com LangChain)
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT, -- corresponde a Document.pageContent
  metadata JSONB, -- corresponde a Document.metadata
  embedding VECTOR(1536) -- 1536 funciona para embeddings da OpenAI
);

-- Criar função para buscar documentos
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_count INT DEFAULT NULL,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;
