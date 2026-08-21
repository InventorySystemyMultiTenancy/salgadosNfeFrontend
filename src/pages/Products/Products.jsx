import { useEffect, useState } from "react";
import * as productService from "../../services/product.service";

const emptyForm = { name: "", category: "", price: "", stockQuantity: "", ncm: "", cfop: "", minStockAlert: "" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadProducts() {
    const data = await productService.listProducts();
    setProducts(data);
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

      <table className="product-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const lowStock =
              product.minStockAlert != null && product.stockQuantity <= product.minStockAlert;
            return (
            <tr key={product.id} className={lowStock ? "low-stock-row" : ""}>
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
  );
}
