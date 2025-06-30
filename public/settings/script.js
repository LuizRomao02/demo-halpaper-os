// settings/script.js

let currentPage = 1;
const rowsPerPage = 20;
let allData = [], filteredData = [];
let currentModalId = null;

// Formata ISO “YYYY-MM-DDTHH:mm:ss” para “DD/MM/YYYY” sem fuso
function formatarDataBR(iso) {
  if (!iso) return '';
  const [datePart] = iso.split('T');
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  document.getElementById('btnFilter').addEventListener('click', filtrar);
  document.getElementById('btnClear').addEventListener('click', limparFiltros);
});

async function fetchData() {
  try {
    const res = await fetch('/listar');
    const json = await res.json();
    allData = json.dados || [];
    filteredData = [...allData];
    renderTable();
  } catch (e) {
    alert('Erro ao carregar dados.');
    console.error(e);
  }
}

function renderTable() {
  const tbody = document.querySelector('#os-table tbody');
  tbody.innerHTML = '';
  const start = (currentPage - 1) * rowsPerPage;
  const page = filteredData.slice(start, start + rowsPerPage);

  page.forEach(row => {
    const tr = document.createElement('tr');
    // Apenas campos principais
    ['id','data','setor','solicitante','equipamento','pendencia'].forEach(key => {
      const td = document.createElement('td');
      td.textContent = key === 'data'
        ? formatarDataBR(row[key])
        : (row[key] || '');
      tr.appendChild(td);
    });

    // Ações
    const tdA = document.createElement('td');
    tdA.className = 'acoes';
    tdA.innerHTML = `
      <button class="editar" onclick="openModal(${row.id})">🔍</button>
      <button class="excluir" onclick="removerOrdem(${row.id})">✖</button>
    `;
    tr.appendChild(tdA);
    tbody.appendChild(tr);
  });

  document.getElementById('page-indicator').textContent =
    `Página ${currentPage} de ${Math.ceil(filteredData.length / rowsPerPage)}`;
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}
function nextPage() {
  if (currentPage < Math.ceil(filteredData.length / rowsPerPage)) {
    currentPage++;
    renderTable();
  }
}

async function adicionarOrdem() {
  const campos = [
    'data','setor','solicitante','equipamento','motivo','recebido',
    'nome','tipo','descricao','material','mao','tempo_previsto',
    'tempo_utilizado','finalizacao','pendencia','assinatura'
  ];
  const ordem = {};
  campos.forEach(id => ordem[id] = document.getElementById(id).value);
  if (campos.some(id => !ordem[id])) {
    return alert('Preencha todos os campos.');
  }

  const res = await fetch('/salvar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ordem)
  });
  const j = await res.json();
  if (j.sucesso) {
    alert('Ordem salva!');
    document.getElementById('os-form').reset();
    fetchData();
  } else {
    alert('Erro ao salvar OS.');
  }
}

async function removerOrdem(id) {
  const pwd = prompt('Senha para remover:');
  if (!pwd) return;
  const res = await fetch(`/remover/${id}`, {
    method: 'DELETE',
    headers: { 'x-btn-password': pwd }
  });
  const j = await res.json();
  if (j.sucesso) fetchData();
  else alert(j.mensagem || 'Erro ao remover OS.');
}

function openModal(id) {
  const row = allData.find(r => r.id === id);
  if (!row) return;
  currentModalId = id;
  const grid = document.querySelector('.detalhes-grid');
  grid.innerHTML = Object.entries(row).map(([k,v]) => {
    const label = k === 'mao'
      ? 'Mão de Obra'
      : k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    const val = (k === 'data' || k === 'finalizacao')
      ? formatarDataBR(v)
      : (v || '');
    return `<div><label>${label}:</label><p>${val}</p></div>`;
  }).join('');
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentModalId = null;
}

async function adicionarPendenciaModal() {
  if (!currentModalId) return;
  const nova = prompt('Descreva a nova pendência:');
  if (!nova) return;
  const pwd = prompt('Senha para atualizar:');
  if (!pwd) return;

  const res = await fetch(`/atualizar-pendencia/${currentModalId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-btn-password': pwd
    },
    body: JSON.stringify({ pendencia: nova })
  });
  const j = await res.json();
  if (j.sucesso) {
    alert('Pendência atualizada!');
    closeModal();
    fetchData();
  } else {
    alert(j.mensagem || 'Erro ao atualizar pendência.');
  }
}

function imprimirOrdemModal() {
  if (!currentModalId) return;
  const row = allData.find(r => r.id === currentModalId);
  if (!row) return;

  const labels = {
    id: 'ID OS',
    data: 'Data',
    setor: 'Setor',
    solicitante: 'Solicitante',
    equipamento: 'Equipamento',
    motivo: 'Motivo',
    recebido: 'Recebido Por',
    nome: 'Executor',
    tipo: 'Tipo',
    descricao: 'Descrição',
    material: 'Material',
    mao: 'Mão de Obra',
    tempo_previsto: 'Tempo Previsto (h)',
    tempo_utilizado: 'Tempo Utilizado (h)',
    finalizacao: 'Data Final',
    pendencia: 'Pendência',
    assinatura: 'Assinatura'
  };

  const rowsHtml = Object.keys(labels).map(key => {
    let value = row[key] || '';
    if (key === 'data' || key === 'finalizacao') {
      value = formatarDataBR(row[key]);
    }
    return `
      <tr>
        <th>${labels[key]}</th>
        <td>${value}</td>
      </tr>`;
  }).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Ordem de Serviço - ${row.id}</title>
      <style>
        /* Forçar impressão de cores */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          @page { margin: 20mm; }
          body { margin:0; padding:0; }
        }
        body {
          font-family: 'Segoe UI', sans-serif;
          color: #1b1b1b;
          background: #fff;
          margin: 20px;
        }
        .logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .logo img {
          max-width: 140px;
        }
        .titulo {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          color: #004d40;
          margin-bottom: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          padding: 10px 12px;
          border: 1px solid #ccc;
          text-align: left;
          vertical-align: top;
          font-size: 14px;
        }
        th {
          background: #004d40;
          color: #fff;
          width: 30%;
          font-weight: 600;
        }
        td {
          background: #fff;
          color: #000;
        }
        tr:nth-child(even) td {
          background: #f1f8e9;
        }
        .assinaturas {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
        }
        .assinaturas div {
          width: 45%;
          text-align: center;
        }
        .assinaturas hr {
          border: none;
          border-top: 1px solid #999;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="logo">
        <img src="settings/Logo.png" alt="Logo Halpaper">
      </div>
      <div class="titulo">Ordem de Serviço</div>
      <table>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="assinaturas">
        <div>
          <hr>
          <span>Responsável Técnico</span>
        </div>
        <div>
          <hr>
          <span>Solicitante</span>
        </div>
      </div>
    </body>
    </html>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(printHtml);
  printWin.document.close();
  printWin.onload = () => printWin.print();
}

function filtrar() {
  const dateVal  = document.getElementById('filterData').value;   // “YYYY-MM-DD”
  const setorVal = document.getElementById('filterSetor').value.trim().toLowerCase();
  const execVal  = document.getElementById('filterExecutor').value.trim().toLowerCase();
  const tipoVal  = document.getElementById('filterTipo').value;

  filteredData = allData.filter(row => {
    const rowDate    = row.data ? row.data.split('T')[0] : '';
    const matchDate  = !dateVal || rowDate === dateVal;
    const matchSetor = !setorVal || row.setor.toLowerCase().includes(setorVal);
    const matchExec  = !execVal  || row.nome.toLowerCase().includes(execVal);
    const matchTipo  = !tipoVal  || row.tipo === tipoVal;
    return matchDate && matchSetor && matchExec && matchTipo;
  });

  currentPage = 1;
  renderTable();
}

function limparFiltros() {
  ['filterData','filterSetor','filterExecutor','filterTipo'].forEach(id => {
    document.getElementById(id).value = '';
  });
  filteredData = [...allData];
  currentPage = 1;
  renderTable();
}
