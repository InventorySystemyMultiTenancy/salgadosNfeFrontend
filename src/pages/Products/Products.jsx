import { useEffect, useState } from "react";
import * as productService from "../../services/product.service";
import { IconChevronDown, IconClose, IconPlus, IconUtensils } from "../../components/icons";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch } from "../../utils/filters";

const EMPTY_FILTERS = { q: "", category: "", stock: "", photo: "", type: "" };

// Combo não tem estoque próprio: vale quantos dá pra montar com os componentes.
const available = (product) => product.availableQuantity ?? product.stockQuantity;

function stockStatus(product) {
  if (available(product) <= 0) return "zero";
  if (product.minStockAlert != null && product.stockQuantity <= product.minStockAlert) return "low";
  return "ok";
}

const emptyForm = {
  name: "",
  category: "",
  price: "",
  stockQuantity: "",
  ncm: "",
  cfop: "",
  minStockAlert: "",
  isCombo: false,
  comboItems: [],
};
const EMPTY_COMBO_ITEM = { productId: "", quantity: "1" };

function comboSummary(product) {
  return (product.comboItems ?? []).map((item) => `${item.quantity}x ${item.component.name}`).join(" + ");
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  // O formulário só aparece ao clicar em "Novo produto" ou "Editar" — a tela abre direto na lista.
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  async function loadProducts() {
    try {
      const data = await productService.listProducts();
      setProducts(data);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao carregar produtos.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function handleChange(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function startEdit(product) {
    setError("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stockQuantity: product.stockQuantity,
      ncm: product.ncm ?? "",
      cfop: product.cfop ?? "",
      minStockAlert: product.minStockAlert ?? "",
      isCombo: Boolean(product.isCombo),
      comboItems: (product.comboItems ?? []).map((item) => ({
        productId: String(item.component.id),
        quantity: String(item.quantity),
      })),
    });
  }

  function newCombo() {
    openNew();
    setForm({ ...emptyForm, isCombo: true, category: "Combos", comboItems: [EMPTY_COMBO_ITEM] });
  }

  function updateComboItem(index, changes) {
    setForm((current) => ({
      ...current,
      comboItems: current.comboItems.map((item, i) => (i === index ? { ...item, ...changes } : item)),
    }));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      stockQuantity: Number(form.stockQuantity) || 0,
      ncm: form.ncm || null,
      cfop: form.cfop || null,
      minStockAlert: form.minStockAlert === "" ? null : Number(form.minStockAlert),
      isCombo: form.isCombo,
      ...(form.isCombo
        ? {
            stockQuantity: 0,
            minStockAlert: null,
            comboItems: form.comboItems
              .filter((item) => item.productId)
              .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) })),
          }
        : {}),
    };

    try {
      if (editingId) {
        await productService.updateProduct(editingId, payload);
      } else {
        await productService.createProduct(payload);
      }
      cancelEdit();
      await loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao salvar produto.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este produto?")) return;
    await productService.deleteProduct(id);
    await loadProducts();
  }

  async function handlePhotoChange(id, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploadingId(id);
    try {
      await productService.uploadProductImage(id, file);
      await loadProducts();
    } catch (err) {
      setUploadError(err.response?.data?.error || "Erro ao enviar a foto.");
    } finally {
      setUploadingId(null);
    }
  }

  const categories = [...new Set(products.map((product) => product.category))].sort();
  const visibleProducts = products.filter(
    (product) =>
      matchesSearch(filters.q, product.name, `#${product.id}`, String(product.id)) &&
      (!filters.category || product.category === filters.category) &&
      (!filters.stock || stockStatus(product) === filters.stock) &&
      (!filters.photo || (filters.photo === "with") === Boolean(product.imageUrl)) &&
      (!filters.type || (filters.type === "combo") === Boolean(product.isCombo)),
  );

  // Componentes possíveis de um combo: produtos normais (combo não entra dentro de combo).
  const componentOptions = products.filter((product) => !product.isCombo && product.id !== editingId);
  const comboCostReference = form.comboItems.reduce((sum, item) => {
    const component = products.find((p) => String(p.id) === item.productId);
    return sum + (component ? Number(component.price) * (Number(item.quantity) || 0) : 0);
  }, 0);

  return (
    <div className="page">
      <h1>Cadastro de Produtos</h1>

      {!formOpen && (
        <div className="page-toolbar">
          <span />
          <div className="form-actions toolbar-actions">
            <button type="button" className="secondary" onClick={newCombo}>
              <IconPlus size={15} /> Novo combo
            </button>
            <button type="button" onClick={openNew}>
              <IconPlus size={15} /> Novo produto
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <form className="product-form" onSubmit={handleSubmit}>
          <h3>
            {editingId
              ? `Editar ${form.isCombo ? "combo" : "produto"}: ${form.name}`
              : form.isCombo
                ? "Novo combo"
                : "Novo produto"}
          </h3>
          <label className="checkbox-label combo-switch">
            <input
              type="checkbox"
              checked={form.isCombo}
              onChange={(e) =>
                setForm({
                  ...form,
                  isCombo: e.target.checked,
                  comboItems: e.target.checked && form.comboItems.length === 0 ? [EMPTY_COMBO_ITEM] : form.comboItems,
                })
              }
            />
            É um combo / kit (ex: cento misto, coxinha + refri) — vender baixa o estoque dos produtos de dentro
          </label>
          <div className="form-row">
            <div>
              <label htmlFor="name">Nome</label>
              <input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>
            <div>
              <label htmlFor="category">Categoria</label>
              <input
                id="category"
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label htmlFor="price">Preço (R$)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                required
              />
            </div>
            {form.isCombo ? (
              <div>
                <label>Estoque</label>
                <p className="field-hint combo-stock-hint">
                  Combo não tem estoque próprio: o PDV mostra quantos dá pra montar com o estoque dos produtos de
                  dentro.
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="stock">Estoque</label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => handleChange("stockQuantity", e.target.value)}
                />
              </div>
            )}
          </div>

          {form.isCombo && (
            <section className="combo-editor">
              <h3>O que vai dentro do combo</h3>
              {form.comboItems.map((item, index) => (
                <div key={index} className="combo-editor-row">
                  <div className="select-wrap">
                    <select
                      aria-label="Produto do combo"
                      value={item.productId}
                      onChange={(e) => updateComboItem(index, { productId: e.target.value })}
                      required
                    >
                      <option value="">Produto...</option>
                      {componentOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <IconChevronDown />
                  </div>
                  <input
                    aria-label="Quantidade"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateComboItem(index, { quantity: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="remove-item"
                    aria-label="Remover do combo"
                    disabled={form.comboItems.length === 1}
                    onClick={() => setForm({ ...form, comboItems: form.comboItems.filter((_, i) => i !== index) })}
                  >
                    <IconClose />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="link-button"
                onClick={() => setForm({ ...form, comboItems: [...form.comboItems, EMPTY_COMBO_ITEM] })}
              >
                + Adicionar produto ao combo
              </button>
              {comboCostReference > 0 && (
                <p className="field-hint">
                  Separados, esses itens custariam R$ {comboCostReference.toFixed(2)}
                  {Number(form.price) > 0 &&
                    Number(form.price) < comboCostReference &&
                    ` — o combo sai R$ ${(comboCostReference - Number(form.price)).toFixed(2)} mais barato pro cliente`}
                  .
                </p>
              )}
            </section>
          )}
          <div className="form-row">
            <div>
              <label htmlFor="ncm">NCM</label>
              <input id="ncm" value={form.ncm} onChange={(e) => handleChange("ncm", e.target.value)} />
            </div>
            <div>
              <label htmlFor="cfop">CFOP</label>
              <input id="cfop" value={form.cfop} onChange={(e) => handleChange("cfop", e.target.value)} />
            </div>
          </div>
          <div className="form-row" hidden={form.isCombo}>
            <div>
              <label htmlFor="minStockAlert">Estoque mínimo (alerta)</label>
              <input
                id="minStockAlert"
                type="number"
                min="0"
                value={form.minStockAlert}
                onChange={(e) => handleChange("minStockAlert", e.target.value)}
              />
            </div>
            <div />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit">{editingId ? "Salvar alterações" : "Adicionar produto"}</button>
            <button type="button" className="secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {uploadError && <p className="form-error">{uploadError}</p>}

      <FilterBar
        summary={`${visibleProducts.length} de ${products.length} produto(s)`}
        canClear={JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)}
        onClear={() => setFilters(EMPTY_FILTERS)}
      >
        <SearchFilter
          value={filters.q}
          onChange={(q) => setFilters({ ...filters, q })}
          placeholder="Nome ou código do produto..."
        />
        <SelectFilter
          label="Categoria"
          value={filters.category}
          onChange={(category) => setFilters({ ...filters, category })}
          allLabel="Todas"
          options={categories.map((category) => ({ value: category, label: category }))}
        />
        <SelectFilter
          label="Estoque"
          value={filters.stock}
          onChange={(stock) => setFilters({ ...filters, stock })}
          options={[
            { value: "low", label: "Abaixo do mínimo" },
            { value: "zero", label: "Zerado" },
            { value: "ok", label: "Normal" },
          ]}
        />
        <SelectFilter
          label="Tipo"
          value={filters.type}
          onChange={(type) => setFilters({ ...filters, type })}
          options={[
            { value: "product", label: "Produtos" },
            { value: "combo", label: "Combos" },
          ]}
        />
        <SelectFilter
          label="Foto"
          value={filters.photo}
          onChange={(photo) => setFilters({ ...filters, photo })}
          options={[
            { value: "with", label: "Com foto" },
            { value: "without", label: "Sem foto" },
          ]}
        />
      </FilterBar>

      <div className="table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product) => {
              const lowStock = product.minStockAlert != null && product.stockQuantity <= product.minStockAlert;
              return (
                <tr key={product.id} className={lowStock ? "low-stock-row" : ""}>
                  <td>
                    <label className="product-photo-cell" htmlFor={`photo-${product.id}`}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" />
                      ) : (
                        <span className="product-photo-placeholder">
                          <IconUtensils size={18} />
                        </span>
                      )}
                      <span className="product-photo-label">
                        {uploadingId === product.id ? "Enviando..." : "Alterar"}
                      </span>
                    </label>
                    <input
                      id={`photo-${product.id}`}
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingId === product.id}
                      onChange={(e) => handlePhotoChange(product.id, e)}
                    />
                  </td>
                  <td>
                    {product.isCombo && <span className="combo-badge">Combo</span>}
                    {product.name}
                    {product.isCombo && <div className="field-hint">{comboSummary(product)}</div>}
                  </td>
                  <td>{product.category}</td>
                  <td>R$ {Number(product.price).toFixed(2)}</td>
                  <td>
                    {product.isCombo ? (
                      <span className="combo-stock">dá pra montar {available(product)}</span>
                    ) : (
                      product.stockQuantity
                    )}
                    {lowStock && <span className="low-stock-badge"> baixo</span>}
                  </td>
                  <td className="table-actions">
                    <button type="button" onClick={() => startEdit(product)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(product.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
