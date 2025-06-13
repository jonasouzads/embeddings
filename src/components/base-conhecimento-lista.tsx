import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { ConfiguracaoAPI, BaseConhecimento } from '@/types';
import { listarBasesConhecimento, excluirBaseConhecimento } from '@/lib/supabase';

// Interface para o documento armazenado no Supabase
interface DocumentoSupabase {
  id: string;
  content: string;
  metadata: {
    titulo?: string;
    dataCriacao?: string;
    dataAtualizacao?: string;
    [key: string]: unknown;
  };
  embedding?: number[];
}

interface BaseConhecimentoListaProps {
  configuracaoAPI: ConfiguracaoAPI;
  onEditar: (base: BaseConhecimento) => void;
  onAtualizar: () => void;
}

export function BaseConhecimentoLista({
  configuracaoAPI,
  onEditar,
  onAtualizar,
}: BaseConhecimentoListaProps) {
  const { toast } = useToast();
  const [bases, setBases] = useState<BaseConhecimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [baseParaExcluir, setBaseParaExcluir] = useState<BaseConhecimento | null>(null);

  // Carregar bases de conhecimento
  const carregarBases = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      // Verificar se as credenciais foram configuradas corretamente
      if (!configuracaoAPI?.supabaseUrl || !configuracaoAPI?.supabaseKey) {
        throw new Error('Configuração do Supabase incompleta. Verifique a URL e a chave do Supabase.');
      }
      
      const basesData = await listarBasesConhecimento(configuracaoAPI);
      
      // Converter os dados da tabela documents para o formato da interface BaseConhecimento
      const basesFormatadas: BaseConhecimento[] = basesData?.map((doc: DocumentoSupabase) => ({
        id: doc.id,
        titulo: doc.metadata?.titulo || 'Sem título',
        conteudo: doc.content,
        dataCriacao: doc.metadata?.dataCriacao || new Date().toISOString(),
        dataAtualizacao: doc.metadata?.dataAtualizacao || doc.metadata?.dataCriacao || new Date().toISOString(),
      })) || [];
      
      setBases(basesFormatadas);
    } catch (error) {
      console.error('Erro ao carregar bases de conhecimento:', error);
      setErro(error instanceof Error ? error.message : 'Não foi possível carregar as bases de conhecimento. Verifique sua conexão e configurações.');
    } finally {
      setCarregando(false);
    }
  }, [configuracaoAPI]);

  // Carregar bases ao montar o componente
  useEffect(() => {
    carregarBases();
  }, [configuracaoAPI, carregarBases]);

  // Função para confirmar exclusão
  const confirmarExclusao = (base: BaseConhecimento) => {
    setBaseParaExcluir(base);
  };

  // Função para excluir base de conhecimento
  const excluirBase = async () => {
    if (!baseParaExcluir) return;
    
    try {
      await excluirBaseConhecimento(configuracaoAPI, baseParaExcluir.id);
      
      toast({
        title: 'Base excluída',
        description: `A base "${baseParaExcluir.titulo}" foi excluída com sucesso.`,
      });
      
      // Atualizar lista
      carregarBases();
      onAtualizar();
    } catch (error) {
      console.error('Erro ao excluir base de conhecimento:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a base de conhecimento.',
        variant: 'destructive',
      });
    } finally {
      setBaseParaExcluir(null);
    }
  };

  // Formatar data
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Bases de Conhecimento</CardTitle>
            <CardDescription>
              Gerencie suas bases de conhecimento e embeddings.
            </CardDescription>
          </div>
          <Button onClick={carregarBases} variant="outline" disabled={carregando}>
            {carregando ? 'Carregando...' : 'Atualizar'}
          </Button>
        </CardHeader>
        <CardContent>
          {erro && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {bases.length === 0 && !carregando ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma base de conhecimento encontrada. Adicione uma nova base para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bases.map((base) => (
                  <TableRow key={base.id}>
                    <TableCell className="font-medium">{base.titulo}</TableCell>
                    <TableCell>{formatarData(base.dataCriacao)}</TableCell>
                    <TableCell>{formatarData(base.dataAtualizacao)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => onEditar(base)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmarExclusao(base)}>
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={!!baseParaExcluir} onOpenChange={(open) => !open && setBaseParaExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a base de conhecimento &ldquo;{baseParaExcluir?.titulo}&rdquo;?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaseParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={excluirBase}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
