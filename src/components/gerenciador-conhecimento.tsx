import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConfiguracaoAPI, BaseConhecimento } from '@/types';
import { BaseConhecimentoForm } from '@/components/base-conhecimento-form';
import { BaseConhecimentoLista } from '@/components/base-conhecimento-lista';

interface GerenciadorConhecimentoProps {
  configuracaoAPI: ConfiguracaoAPI;
}

export function GerenciadorConhecimento({ configuracaoAPI }: GerenciadorConhecimentoProps) {
  const [tab, setTab] = useState<string>('lista');
  const [baseParaEditar, setBaseParaEditar] = useState<BaseConhecimento | null>(null);

  // Função para lidar com a criação de uma nova base
  const iniciarNovaBse = () => {
    setBaseParaEditar(null);
    setTab('formulario');
  };

  // Função para lidar com a edição de uma base existente
  const editarBase = (base: BaseConhecimento) => {
    setBaseParaEditar(base);
    setTab('formulario');
  };

  // Função para cancelar a edição/criação
  const cancelarEdicao = () => {
    setBaseParaEditar(null);
    setTab('lista');
  };

  // Função para lidar com o sucesso na criação/edição
  const aoSalvarBase = () => {
    setBaseParaEditar(null);
    setTab('lista');
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciador de Base de Conhecimento</h2>
        {tab === 'lista' && (
          <Button onClick={iniciarNovaBse}>Nova Base de Conhecimento</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista" disabled={tab === 'formulario'}>
            Lista de Bases
          </TabsTrigger>
          <TabsTrigger value="formulario" disabled={tab === 'lista'}>
            {baseParaEditar ? 'Editar Base' : 'Nova Base'}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="lista" className="mt-4">
          <BaseConhecimentoLista 
            configuracaoAPI={configuracaoAPI} 
            onEditar={editarBase}
            onAtualizar={() => {}} 
          />
        </TabsContent>
        
        <TabsContent value="formulario" className="mt-4">
          <BaseConhecimentoForm
            configuracaoAPI={configuracaoAPI}
            baseId={baseParaEditar?.id}
            tituloInicial={baseParaEditar?.titulo}
            conteudoInicial={baseParaEditar?.conteudo}
            onSucesso={aoSalvarBase}
            onCancelar={cancelarEdicao}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
