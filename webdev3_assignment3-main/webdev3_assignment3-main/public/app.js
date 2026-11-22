const API = '/api/products';
const CATEGORIES = ['Electronics', 'Apparel', 'Furniture', 'Stationery', 'Grocery'];
const PAGE_SIZE = 10;

const $ = (selector) => document.querySelector(selector);
const money = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const count = (value) => Number(value).toLocaleString('en-IN');

const state = { page: 1, totalPages: 1, editingId: null, stockProduct: null, deleteProduct: null, requestId: 0 };

// Builds DOM nodes with textContent, so product data is never parsed as HTML.
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

async function request(url, options = {}) {
  const config = { ...options };
  if (options.body) {
    config.headers = { 'Content-Type': 'application/json' };
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new Error('Could not reach the server');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.fields = data.errors;
    throw error;
  }
  return data;
}

let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}

function stockStatus(product) {
  if (product.quantity === 0) return el('span', { className: 'status-out', textContent: 'Out of stock' });
  if (product.quantity <= product.reorderLevel) return el('span', { className: 'status-low', textContent: 'Low stock' });
  return el('span', { className: 'muted', textContent: 'In stock' });
}

const cell = (text, className = '') => el('td', { textContent: text, className });

function productCell(product) {
  return el(
    'td',
    {},
    el('span', { className: 'product-name', textContent: product.name }),
    el('span', { className: 'sku', textContent: product.sku })
  );
}

function actionButton(label, onClick, className = '') {
  const button = el('button', { type: 'button', textContent: label, className });
  button.addEventListener('click', onClick);
  return button;
}

function emptyRow(columns, text) {
  const td = el('td', { className: 'empty', colSpan: columns, textContent: text });
  return el('tr', {}, td);
}

/* Products */

function currentQuery() {
  const params = new URLSearchParams({ page: state.page, limit: PAGE_SIZE });
  for (const [key, value] of new FormData($('#filters'))) {
    if (value.trim()) params.set(key, value.trim());
  }
  return params;
}

async function loadProducts() {
  const id = ++state.requestId;
  const errorNode = $('#filter-error');

  try {
    const data = await request(`${API}?${currentQuery()}`);
    if (id !== state.requestId) return;

    // Deleting the last row on a page can leave us past the end.
    if (data.totalPages > 0 && state.page > data.totalPages) {
      state.page = data.totalPages;
      return loadProducts();
    }

    errorNode.hidden = true;
    state.totalPages = data.totalPages || 1;
    $('#product-total').textContent = count(data.total);
    $('#product-rows').replaceChildren(
      ...(data.products.length
        ? data.products.map((product) => el(
          'tr',
          {},
          productCell(product),
          cell(product.category),
          cell(money(product.price), 'num'),
          cell(count(product.quantity), 'num'),
          cell(money(product.stockValue), 'num'),
          el('td', {}, stockStatus(product)),
          el(
            'td',
            {},
            el(
              'div',
              { className: 'row-actions' },
              actionButton('Stock', () => openStock(product)),
              actionButton('Edit', () => openEdit(product)),
              actionButton('Delete', () => openDelete(product), 'delete')
            )
          )
        ))
        : [emptyRow(7, 'No products found')])
    );
    $('#page-info').textContent = `Page ${data.page} of ${state.totalPages}`;
    $('#prev').disabled = data.page <= 1;
    $('#next').disabled = data.page >= state.totalPages;
  } catch (error) {
    if (id !== state.requestId) return;
    const details = error.fields ? Object.values(error.fields).join('. ') : error.message;
    errorNode.textContent = details;
    errorNode.hidden = false;
  }
}

/* Reports */

async function loadLowStock() {
  try {
    const { count: total, lowStockItems } = await request(`${API}/low-stock`);
    $('#low-total').textContent = count(total);
    $('#low-rows').replaceChildren(
      ...(lowStockItems.length
        ? lowStockItems.map((product) => el(
          'tr',
          {},
          productCell(product),
          cell(product.supplier),
          cell(count(product.quantity), `num ${product.quantity === 0 ? 'status-out' : 'status-low'}`),
          cell(count(product.reorderLevel), 'num'),
          cell(count(product.reorderLevel - product.quantity), 'num'),
          el('td', {}, el('div', { className: 'row-actions' }, actionButton('Restock', () => openStock(product))))
        ))
        : [emptyRow(6, 'All products are above their reorder level')])
    );
  } catch (error) {
    $('#low-rows').replaceChildren(emptyRow(6, error.message));
  }
}

async function loadSummary() {
  try {
    const { summary } = await request(`${API}/summary`);
    $('#summary-rows').replaceChildren(
      ...(summary.length
        ? summary.map((row) => el(
          'tr',
          {},
          cell(row._id),
          cell(count(row.totalItems), 'num'),
          cell(count(row.totalQuantity), 'num'),
          cell(money(row.avgPrice), 'num'),
          cell(money(row.totalStockValue), 'num')
        ))
        : [emptyRow(5, 'No products yet')])
    );

    const totals = summary.reduce((sum, row) => ({
      items: sum.items + row.totalItems,
      quantity: sum.quantity + row.totalQuantity,
      value: sum.value + row.totalStockValue,
    }), { items: 0, quantity: 0, value: 0 });

    $('#summary-total').replaceChildren(
      ...(summary.length
        ? [el(
          'tr',
          {},
          cell('Total'),
          cell(count(totals.items), 'num'),
          cell(count(totals.quantity), 'num'),
          cell('', 'num'),
          cell(money(totals.value), 'num')
        )]
        : [])
    );
  } catch (error) {
    $('#summary-rows').replaceChildren(emptyRow(5, error.message));
    $('#summary-total').replaceChildren();
  }
}

const loaders = { products: loadProducts, 'low-stock': loadLowStock, summary: loadSummary };

function activeView() {
  return $('.tab[aria-current="page"]').dataset.view;
}

function refresh() {
  return loaders[activeView()]();
}

function showView(view) {
  document.querySelectorAll('.tab').forEach((tab) => {
    if (tab.dataset.view === view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  Object.keys(loaders).forEach((key) => { $(`#${key}`).hidden = key !== view; });
  refresh();
}

/* Dialogs */

function clearErrors(form) {
  form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
  const formError = form.querySelector('[data-form-error]');
  formError.textContent = '';
  formError.hidden = true;
}

function showErrors(form, error) {
  let placed = false;
  for (const [field, message] of Object.entries(error.fields || {})) {
    const slot = form.querySelector(`[data-error="${field}"]`);
    if (!slot) continue;
    slot.textContent = message;
    form.elements[field]?.setAttribute('aria-invalid', 'true');
    placed = true;
  }
  if (!placed) {
    const formError = form.querySelector('[data-form-error]');
    formError.textContent = error.message;
    formError.hidden = false;
  }
}

async function submitWith(form, action) {
  const submit = form.querySelector('[type="submit"]');
  clearErrors(form);
  submit.disabled = true;
  try {
    await action();
  } catch (error) {
    showErrors(form, error);
  } finally {
    submit.disabled = false;
  }
}

function openAdd() {
  const form = $('#product-form');
  state.editingId = null;
  form.reset();
  clearErrors(form);
  $('#product-dialog-title').textContent = 'Add product';
  $('#product-dialog').showModal();
}

function openEdit(product) {
  const form = $('#product-form');
  state.editingId = product.id;
  clearErrors(form);
  ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'].forEach((field) => {
    form.elements[field].value = product[field];
  });
  $('#product-dialog-title').textContent = 'Edit product';
  $('#product-dialog').showModal();
}

function openStock(product) {
  const form = $('#stock-form');
  state.stockProduct = product;
  form.reset();
  clearErrors(form);
  $('#stock-product').textContent = `${product.name} · ${count(product.quantity)} in stock`;
  $('#stock-dialog').showModal();
  form.elements.units.focus();
}

function openDelete(product) {
  const form = $('#delete-form');
  state.deleteProduct = product;
  clearErrors(form);
  $('#delete-product').textContent = `${product.name} (${product.sku}) will be permanently removed.`;
  $('#delete-dialog').showModal();
}

function readProductForm(form) {
  const values = Object.fromEntries(new FormData(form));
  const toNumber = (text) => (text.trim() === '' ? undefined : Number(text));
  return {
    name: values.name,
    sku: values.sku,
    category: values.category,
    supplier: values.supplier,
    price: toNumber(values.price),
    quantity: toNumber(values.quantity),
    reorderLevel: toNumber(values.reorderLevel),
  };
}

$('#product-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  submitWith(form, async () => {
    const body = readProductForm(form);
    if (state.editingId) {
      await request(`${API}/${state.editingId}`, { method: 'PUT', body });
      toast('Product updated');
    } else {
      await request(API, { method: 'POST', body });
      state.page = 1;
      toast('Product added');
    }
    $('#product-dialog').close();
    await refresh();
  });
});

$('#stock-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  submitWith(form, async () => {
    const units = Number(form.elements.units.value);
    if (!Number.isInteger(units) || units < 1) throw new Error('Enter a whole number of units');
    const change = units * Number(form.elements.direction.value);
    await request(`${API}/${state.stockProduct.id}/stock`, { method: 'PATCH', body: { change } });
    $('#stock-dialog').close();
    toast('Stock updated');
    await refresh();
  });
});

$('#delete-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  submitWith(form, async () => {
    await request(`${API}/${state.deleteProduct.id}`, { method: 'DELETE' });
    $('#delete-dialog').close();
    toast('Product deleted');
    await refresh();
  });
});

/* Events */

let searchTimer;
function applyFilters() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.page = 1;
    loadProducts();
  }, 250);
}

$('#filters').addEventListener('input', applyFilters);
$('#filters').addEventListener('submit', (event) => event.preventDefault());
$('#add-product').addEventListener('click', openAdd);
$('#prev').addEventListener('click', () => { state.page -= 1; loadProducts(); });
$('#next').addEventListener('click', () => { state.page += 1; loadProducts(); });
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => showView(tab.dataset.view));
});
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

for (const select of [$('#filters [name="category"]'), $('#product-form [name="category"]')]) {
  select.append(...CATEGORIES.map((name) => el('option', { value: name, textContent: name })));
}

loadProducts();
