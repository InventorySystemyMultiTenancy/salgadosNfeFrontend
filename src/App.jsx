import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { SocketProvider } from "./contexts/SocketContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login/Login";
import POS from "./pages/POS/POS";
import Products from "./pages/Products/Products";
import Clients from "./pages/Billing/Clients";
import DuePanel from "./pages/Billing/DuePanel";
import Statement from "./pages/Billing/Statement";
import Kitchen from "./pages/Kitchen/Kitchen";
import Stock from "./pages/Stock/Stock";
import Users from "./pages/Users/Users";
import FiscalSettings from "./pages/Fiscal/Settings";
import FiscalOrders from "./pages/Fiscal/Orders";
import PaymentSettings from "./pages/Payments/Settings";
import Cash from "./pages/Cash/Cash";
import Reports from "./pages/Reports/Reports";
import Preorders from "./pages/Preorders/Preorders";

function HomeRoute() {
  const { user } = useAuth();

  if (user?.role === "KITCHEN") {
    return (
      <PrivateRoute roles={["KITCHEN"]}>
        <Kitchen />
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute roles={["ADMIN", "SELLER"]}>
      <POS />
    </PrivateRoute>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/produtos"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Clients />
            </PrivateRoute>
          }
        />
        <Route
          path="/cobranca"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <DuePanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes/:id/extrato"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Statement />
            </PrivateRoute>
          }
        />
        <Route
          path="/cozinha"
          element={
            <PrivateRoute roles={["ADMIN", "KITCHEN"]}>
              <Kitchen />
            </PrivateRoute>
          }
        />
        <Route
          path="/estoque"
          element={
            <PrivateRoute roles={["ADMIN", "SELLER", "KITCHEN"]}>
              <Stock />
            </PrivateRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Users />
            </PrivateRoute>
          }
        />
        <Route
          path="/fiscal/config"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <FiscalSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/fiscal/pedidos"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <FiscalOrders />
            </PrivateRoute>
          }
        />
        <Route
          path="/pagamentos/config"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <PaymentSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/caixa"
          element={
            <PrivateRoute roles={["ADMIN", "SELLER"]}>
              <Cash />
            </PrivateRoute>
          }
        />
        <Route
          path="/encomendas"
          element={
            <PrivateRoute roles={["ADMIN", "SELLER"]}>
              <Preorders />
            </PrivateRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <PrivateRoute roles={["ADMIN"]}>
              <Reports />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <CartProvider>
          <AppRoutes />
        </CartProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
