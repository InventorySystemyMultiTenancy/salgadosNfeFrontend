import { useEffect, useState } from "react";
import * as productService from "../../services/product.service";
import { IconUtensils } from "../../components/icons";
import { FilterBar, SearchFilter, SelectFilter } from "../../components/Filters";
import { matchesSearch } from "../../utils/filters";

const EMPTY_FILTERS = { q: "", category: "", stock: "", photo: "" };

function stockStatus(product) {
  if (product.stockQuantity <= 0) return "zero";
  if (product.minStockAlert != null && product.stockQuantity <= product.minStockAlert) return "low";
  return "ok";
}

const emptyForm = { name: "", category: "", price: "", stockQuantity: "", ncm: "", cfop: "", minStockAlert: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
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

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      stockQuantity: product.stockQuantity,
      ncm: product.ncm ?? "",
      cfop: product.cfop ?? "",
      minStockAlert: product.minStockAlert ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
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
      (!filters.photo || (filters.photo === "with") === Boolean(product.imageUrl)),
  );

  return (
    <div className="page">
      <h1>Cadastro de Produtos</h1>

      <form className="product-form" onSubmit={handleSubmit}>
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
        </div>
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
        <div className="form-row">
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
          {editingId && (
            <button type="button" className="secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

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
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>R$ {Number(product.price).toFixed(2)}</td>
                  <td>
                    {product.stockQuantity}
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
