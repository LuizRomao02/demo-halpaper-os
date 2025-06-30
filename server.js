// server.js
require('dotenv').config(); 

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs'); // ✅ <- ADICIONE ESTA LINHA

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Inserir nova ordem
app.post('/salvar', async (req, res) => {
  const { error } = await supabase.from('ordens_servico').insert([req.body]);
  if (error) {
    console.error(error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
  res.json({ sucesso: true });
});

app.patch('/atualizar-pendencia/:id', async (req, res) => {
  const senha = req.headers['x-btn-password'];
  const senhaCorreta = process.env.BTN_PASSWORD;

  if (senha !== senhaCorreta) {
    return res.status(401).json({ sucesso: false, mensagem: 'Senha incorreta.' });
  }

  const { pendencia } = req.body;

  const { error: updateError } = await supabase
    .from('ordens_servico')
    .update({ pendencia })
    .eq('id', req.params.id);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar pendência.' });
  }

  res.json({ sucesso: true });
});

// Listar todas as ordens
app.get('/listar', async (req, res) => {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }

  res.json({ dados: data });
});

// Remover por ID
app.delete('/remover/:id', async (req, res) => {
  const senha = req.headers['x-btn-password'];
  const senhaCorreta = process.env.BTN_PASSWORD;

  if (senha !== senhaCorreta) {
    return res.status(401).json({ sucesso: false, mensagem: 'Senha incorreta.' });
  }

  const { error } = await supabase
    .from('ordens_servico')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    console.error(error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }

  res.json({ sucesso: true });
});


// Download Backup
app.get('/exportar', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ordens de Serviço');

  // Cabeçalhos
  worksheet.columns = [
    { header: 'ID OS', key: 'id', width: 10 },
    { header: 'Data', key: 'data', width: 15 },
    { header: 'Setor', key: 'setor', width: 20 },
    { header: 'Solicitante', key: 'solicitante', width: 20 },
    { header: 'Equipamento', key: 'equipamento', width: 20 },
    { header: 'Motivo', key: 'motivo', width: 25 },
    { header: 'Recebido', key: 'recebido', width: 20 },
    { header: 'Nome', key: 'nome', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 15 },
    { header: 'Descrição', key: 'descricao', width: 30 },
    { header: 'Material', key: 'material', width: 25 },
    { header: 'Mão de Obra', key: 'mao', width: 20 },
    { header: 'Tempo Previsto', key: 'tempo_previsto', width: 18 },
    { header: 'Tempo Utilizado', key: 'tempo_utilizado', width: 18 },
    { header: 'Finalização', key: 'finalizacao', width: 15 },
    { header: 'Assinatura', key: 'assinatura', width: 20 },
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF388E3C' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // 🔄 Buscar dados do Supabase
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }

  // Adicionar linhas
  data.forEach(row => worksheet.addRow(row));

  worksheet.autoFilter = {
    from: 'A1',
    to: 'P1'
  };

  worksheet.eachRow({ includeEmpty: false }, row => {
    row.height = 20;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="ordens-servico-formatado.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

// Rodar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

