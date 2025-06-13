import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfiguracaoAPI } from '@/types';
import { inicializarBancoDados } from '@/lib/supabase';
import { salvarConfiguracaoAPI, carregarEstadoApp } from '@/lib/localStorage';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ConfiguracaoAPIProps {
  onConfiguracao: (configurado: boolean) => void;
}

export function ConfiguracaoAPIForm({ onConfiguracao }: ConfiguracaoAPIProps) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [config, setConfig] = useState<ConfiguracaoAPI>({
    supabaseUrl: '',
    supabaseKey: '',
    openaiKey: '',
  });

  useEffect(() => {
    const estadoApp = carregarEstadoApp();
    if (estadoApp.configurado) {
      setConfig(estadoApp.configuracaoAPI);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    try {
      // Validar campos obrigatórios
      if (!config.supabaseUrl || !config.supabaseKey || !config.openaiKey) {
        throw new Error('Todos os campos são obrigatórios');
      }

      // Validar formato da URL do Supabase
      if (!config.supabaseUrl.startsWith('https://') || !config.supabaseUrl.includes('.supabase.co')) {
        throw new Error('URL do Supabase inválida. Deve ser no formato https://seu-projeto.supabase.co');
      }

      // Validar chaves
      if (config.supabaseKey.length < 20) {
        throw new Error('Chave do Supabase parece inválida. Verifique se você está usando a Service Role Key.');
      }

      if (config.openaiKey.length < 20) {
        throw new Error('Chave da OpenAI parece inválida. Verifique se você está usando uma chave válida.');
      }

      try {
        // Inicializar o banco de dados no Supabase
        const resultado = await inicializarBancoDados(config);
        
        // Verificar se a configuração manual é necessária
        if (!resultado.sucesso && resultado.configuracaoManualNecessaria) {
          console.log('Configuração manual necessária:', resultado.mensagem);
          
          // Salvar a configuração mesmo assim para que o usuário não precise digitar novamente
          salvarConfiguracaoAPI(config);
          // Abrir diálogo com instruções
          setDialogoAberto(true);
          setCarregando(false); // Importante parar o carregamento
          return; // Interromper o fluxo aqui
        }
      } catch (dbError: unknown) {
        console.error('Erro ao inicializar banco de dados:', dbError);
        throw new Error('Não foi possível conectar ao Supabase. Verifique suas credenciais.');
      }

      // Salvar configuração
      salvarConfiguracaoAPI(config);
      
      toast({
        title: 'Configuração salva',
        description: 'Suas chaves de API foram salvas com sucesso.',
      });

      // Notificar o componente pai que a configuração foi concluída
      onConfiguracao(true);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro ao salvar configuração',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Configuração da API</CardTitle>
          <CardDescription>
            Configure suas chaves de API para começar a usar o sistema de embeddings.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl">URL do Supabase</Label>
              <Input
                id="supabaseUrl"
                name="supabaseUrl"
                placeholder="https://seu-projeto.supabase.co"
                value={config.supabaseUrl}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabaseKey">Chave do Supabase</Label>
              <Input
                id="supabaseKey"
                name="supabaseKey"
                type="password"
                placeholder="sua-chave-service-role-do-supabase"
                value={config.supabaseKey}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Use a chave Service Role do seu projeto Supabase.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openaiKey">Chave da OpenAI</Label>
              <Input
                id="openaiKey"
                name="openaiKey"
                type="password"
                placeholder="sua-chave-da-openai"
                value={config.openaiKey}
                onChange={handleChange}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={carregando}>
              {carregando ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Dialog open={dialogoAberto} onOpenChange={setDialogoAberto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração Manual do Supabase</DialogTitle>
            <DialogDescription>
              Para usar este aplicativo, você precisa configurar o Supabase manualmente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <h3 className="text-md font-medium">1. Acesse o SQL Editor do Supabase</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Faça login no seu dashboard do Supabase e acesse a seção &ldquo;SQL Editor&rdquo;.
              </p>
            </div>
            
            <div>
              <h3 className="text-md font-medium">2. Execute o seguinte código SQL</h3>
              <div className="relative bg-muted rounded-md mt-2">
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      const sqlCode = `-- Habilitar a extensão pgvector para trabalhar com vetores de embedding
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
$$;`;
                      navigator.clipboard.writeText(sqlCode);
                      toast({
                        title: "Código copiado!",
                        description: "Cole no SQL Editor do Supabase",
                        duration: 3000,
                      });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <div className="p-2 overflow-auto max-h-[250px]">
                  <pre className="text-xs">
{`-- Habilitar a extensão pgvector para trabalhar com vetores de embedding
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
$$;`}
                  </pre>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium">3. Volte para o aplicativo</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Depois de executar o SQL com sucesso, clique no botão abaixo.
              </p>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button onClick={() => {
              setDialogoAberto(false);
              onConfiguracao(true); // Consideramos configurado para que o usuário possa usar o app
            }}>
              Entendi, já configurei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}