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
  const win = window.open();
  win.document.write(document.querySelector('.modal-content').outerHTML);
  win.document.close();
  win.print();
}

function imprimirOrdem(id) {
  openModal(id);
  setTimeout(imprimirOrdemModal, 300);
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
