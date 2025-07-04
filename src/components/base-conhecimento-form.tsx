import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ConfiguracaoAPI } from '@/types';
import { gerarEmbedding, dividirTextoEmChunks, limparTexto, gerarPerguntasRespostas } from '@/lib/openai';
import { salvarBaseConhecimento, atualizarBaseConhecimento } from '@/lib/supabase';

interface BaseConhecimentoFormProps {
  configuracaoAPI: ConfiguracaoAPI;
  baseId?: string;
  tituloInicial?: string;
  conteudoInicial?: string;
  onSucesso: () => void;
  onCancelar: () => void;
}

export function BaseConhecimentoForm({
  configuracaoAPI,
  baseId,
  tituloInicial = '',
  conteudoInicial = '',
  onSucesso,
  onCancelar,
}: BaseConhecimentoFormProps) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(false);
  const [titulo, setTitulo] = useState(tituloInicial);
  const [conteudo, setConteudo] = useState(conteudoInicial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);

    try {
      // Validar campos
      if (!titulo.trim() || !conteudo.trim()) {
        throw new Error('Título e conteúdo são obrigatórios');
      }

      // Dividir o conteúdo em chunks com sobreposição (1000 caracteres ~= 400 tokens, 200 caracteres ~= 50 tokens de sobreposição)
      const chunks = dividirTextoEmChunks(conteudo, 1000, 200);
      
      // Para atualização, processamos de forma similar à criação para garantir que todos os metadados sejam atualizados
      if (baseId) {
        // Limpar o texto antes de gerar o embedding
        const textoLimpo = limparTexto(conteudo);
        
        // Gerar embedding para o conteúdo limpo
        const embedding = await gerarEmbedding(configuracaoAPI, textoLimpo);
        
        // Gerar perguntas e respostas automaticamente para o conteúdo atualizado
        let perguntasRespostas: Array<{pergunta: string, resposta: string}> = [];
        try {
          perguntasRespostas = await gerarPerguntasRespostas(configuracaoAPI, textoLimpo);
          console.log(`Geradas ${perguntasRespostas.length} perguntas para o documento atualizado`);
        } catch (qaError) {
          console.error('Erro ao gerar perguntas para o documento atualizado:', qaError);
          // Continua o processamento mesmo se falhar a geração de perguntas
        }
        
        // Formatar o conteúdo para exibição ao usuário
        let conteudoFormatado = `### Texto Vetorizado

${textoLimpo}

### Perguntas e Respostas Geradas

`;
        
        if (perguntasRespostas.length > 0) {
          perguntasRespostas.forEach((qa, index) => {
            conteudoFormatado += `**Pergunta ${index + 1}:** ${qa.pergunta}\n**Resposta ${index + 1}:** ${qa.resposta}\n\n`;
          });
        } else {
          conteudoFormatado += "Nenhuma pergunta gerada para este documento.\n";
        }
        
        // Atualizar no Supabase com os novos metadados
        await atualizarBaseConhecimento(
          configuracaoAPI, 
          baseId, 
          titulo, 
          conteudoFormatado, // Conteúdo formatado para exibição
          embedding,
          {
            textoLimpo: textoLimpo, // Armazenar o texto limpo atualizado
            perguntasRespostas: perguntasRespostas, // Armazenar perguntas e respostas atualizadas
            dataAtualizacao: new Date().toISOString()
          }
        );
        
        toast({
          title: 'Base de conhecimento atualizada',
          description: 'A base de conhecimento foi atualizada com sucesso, incluindo embeddings e perguntas/respostas.',
        });
      } else {
        // Para novos documentos, processamos cada chunk separadamente
        let successCount = 0;
        
        // Processar cada chunk
        for (let i = 0; i < chunks.length; i++) {
          try {
            // Limpar o texto do chunk antes de gerar o embedding
            const textoLimpo = limparTexto(chunks[i]);
            
            // Gerar embedding para o chunk limpo
            const embedding = await gerarEmbedding(configuracaoAPI, textoLimpo);
            
            // Gerar perguntas e respostas automaticamente para este chunk
            let perguntasRespostas: Array<{pergunta: string, resposta: string}> = [];
            try {
              perguntasRespostas = await gerarPerguntasRespostas(configuracaoAPI, textoLimpo);
              console.log(`Geradas ${perguntasRespostas.length} perguntas para o chunk ${i+1}/${chunks.length}`);
            } catch (qaError) {
              console.error(`Erro ao gerar perguntas para o chunk ${i+1}/${chunks.length}:`, qaError);
              // Continua o processamento mesmo se falhar a geração de perguntas
            }
            
            // Formatar o conteúdo para exibição ao usuário, mostrando apenas o texto vetorizado e as perguntas/respostas
            let conteudoFormatado = `### Texto Vetorizado (Chunk ${i+1}/${chunks.length})

${textoLimpo}

### Perguntas e Respostas Geradas

`;
            
            if (perguntasRespostas.length > 0) {
              perguntasRespostas.forEach((qa, index) => {
                conteudoFormatado += `**Pergunta ${index + 1}:** ${qa.pergunta}\n**Resposta ${index + 1}:** ${qa.resposta}\n\n`;
              });
            } else {
              conteudoFormatado += "Nenhuma pergunta gerada para este chunk.\n";
            }
            
            // Salvar chunk como documento separado, com metadados adicionais
            await salvarBaseConhecimento(
              configuracaoAPI, 
              titulo, 
              conteudoFormatado, // Conteúdo formatado para exibição
              embedding,  // Embedding do texto limpo
              // Adicionar metadados para rastrear chunks e incluir perguntas/respostas
              {
                chunkIndex: i,
                totalChunks: chunks.length,
                isFirstChunk: i === 0,
                documentoOriginal: titulo,
                textoLimpo: textoLimpo, // Armazenar o texto limpo para referência
                perguntasRespostas: perguntasRespostas // Armazenar perguntas e respostas geradas
              }
            );
            
            successCount++;
          } catch (chunkError) {
            console.error(`Erro ao processar chunk ${i+1}/${chunks.length}:`, chunkError);
          }
        }
        
        if (successCount === 0) {
          throw new Error('Falha ao processar todos os chunks do documento');
        }
        
        toast({
          title: 'Base de conhecimento criada',
          description: `${successCount} de ${chunks.length} chunks processados e salvos com sucesso.`,
        });
      }

      // Notificar o componente pai sobre o sucesso
      onSucesso();
    } catch (error) {
      console.error('Erro ao salvar base de conhecimento:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{baseId ? 'Editar' : 'Nova'} Base de Conhecimento</CardTitle>
        <CardDescription>
          {baseId
            ? 'Edite os detalhes da base de conhecimento existente.'
            : 'Adicione uma nova base de conhecimento para gerar embeddings.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da base de conhecimento"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conteudo">Conteúdo</Label>
            <Textarea
              id="conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Insira o texto da base de conhecimento aqui..."
              className="min-h-[200px]"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={carregando}>
            {carregando ? 'Processando...' : baseId ? 'Atualizar' : 'Salvar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
