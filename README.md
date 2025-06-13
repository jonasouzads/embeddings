# Wize Embeddings - Gerenciador de Base de Conhecimento

Um aplicativo para gerenciar bases de conhecimento utilizando embeddings com Supabase e OpenAI. Desenvolvido com Next.js, TypeScript e Shadcn UI.

## Funcionalidades

- Configuração de chaves de API (Supabase e OpenAI)
- Upload e gerenciamento de textos para base de conhecimento
- Geração automática de embeddings usando OpenAI
- Armazenamento de embeddings no Supabase usando pgvector
- Interface completa para edição e exclusão de bases de conhecimento

## Requisitos

- Node.js 18.0 ou superior
- Conta no Supabase com a extensão pgvector habilitada
- Chave de API da OpenAI

## Configuração do Supabase

Para usar este aplicativo, você precisa configurar o Supabase com a extensão pgvector e criar a tabela necessária. O esquema é compatível com LangChain, facilitando a integração com outras ferramentas como n8n. Siga os passos abaixo:

1. Acesse o [Supabase](https://supabase.com/) e crie uma conta ou faça login
2. Crie um novo projeto
3. No dashboard do seu projeto, vá para "SQL Editor"
4. Execute o seguinte código SQL:

```sql
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
```

5. Após executar o código SQL com sucesso, vá para "Project Settings" > "API" e copie a "URL" e a "service_role key" para usar no aplicativo

### Integração com LangChain

Este esquema é totalmente compatível com a biblioteca LangChain, permitindo que você use o mesmo banco de dados com outras ferramentas. Exemplo de uso com LangChain:

```typescript
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { createClient } from '@supabase/supabase-js'

const client = createClient(supabaseUrl, supabaseKey)
const vectorStore = await SupabaseVectorStore.fromTexts(
  ['Texto exemplo 1', 'Texto exemplo 2'],
  [{ id: 1 }, { id: 2 }],
  new OpenAIEmbeddings({ openAIApiKey: openaiKey }),
  {
    client,
    tableName: 'documents',
    queryName: 'match_documents',
  }
)

const resultado = await vectorStore.similaritySearch('Consulta de exemplo', 5)
```

## Executando o Projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## Uso

1. Na primeira execução, configure suas chaves de API:
   - **Supabase URL**: URL do seu projeto Supabase (ex: https://seu-projeto.supabase.co)
   - **Supabase Service Role Key**: Encontrada em Project Settings > API > Service Role Key
   - **OpenAI API Key**: Obtenha em [platform.openai.com](https://platform.openai.com/account/api-keys)

2. Se for solicitada configuração manual do Supabase, siga as instruções do diálogo para executar o SQL necessário no SQL Editor do Supabase.

3. Após a configuração, você poderá adicionar, editar e excluir bases de conhecimento.

4. Os embeddings são gerados automaticamente ao salvar uma base de conhecimento usando a API da OpenAI.

## Solução de Problemas

### Erro "A tabela documents não existe"

Este erro ocorre quando o aplicativo não consegue encontrar a tabela necessária no Supabase. Siga as instruções no diálogo para executar o SQL manualmente no SQL Editor do Supabase. O esquema SQL utilizado é compatível com LangChain.

### Erro "Permissão negada"

Verifique se você está usando a **Service Role Key** do Supabase e não a chave anônima. A Service Role Key é necessária para criar extensões e tabelas.

### Erro ao criar extensão pgvector

Em alguns planos do Supabase, você pode não ter permissão para criar extensões. Neste caso, entre em contato com o suporte do Supabase para habilitar a extensão pgvector para você.

## Tecnologias

- [Next.js 15](https://nextjs.org/) com App Router
- [TypeScript](https://www.typescriptlang.org/)
- [Shadcn UI](https://ui.shadcn.com/) para componentes de interface
- [Supabase](https://supabase.io/) para armazenamento de dados e embeddings
- [OpenAI](https://openai.com/) para geração de embeddings
