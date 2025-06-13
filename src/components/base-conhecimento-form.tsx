import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ConfiguracaoAPI } from '@/types';
import { gerarEmbedding } from '@/lib/openai';
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

      // Gerar embedding para o conteúdo
      const embedding = await gerarEmbedding(configuracaoAPI, conteudo);

      // Salvar ou atualizar no Supabase
      if (baseId) {
        await atualizarBaseConhecimento(configuracaoAPI, baseId, titulo, conteudo, embedding);
        toast({
          title: 'Base de conhecimento atualizada',
          description: 'A base de conhecimento foi atualizada com sucesso.',
        });
      } else {
        await salvarBaseConhecimento(configuracaoAPI, titulo, conteudo, embedding);
        toast({
          title: 'Base de conhecimento criada',
          description: 'A base de conhecimento foi criada com sucesso.',
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
