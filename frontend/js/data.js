"use strict";
/* =========================================================
   DATA.JS — dados de exemplo (seed), copiados do prototipo
   ========================================================= */
function seedProdutos() {
  return [
    { id: 1, nome: "X-Tudo", descricao: "Hambúrguer completo com alface, tomate e molho especial", preco: 25.00, categoria: "Lanches", imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 15, estoqueMinimo: 5 },
    { id: 2, nome: "Marmita Tradicional", descricao: "Arroz, feijão, carne, farofa e salada", preco: 28.00, categoria: "Pratos", imagem: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 20, estoqueMinimo: 5 },
    { id: 3, nome: "X-Bacon", descricao: "Hambúrguer com bacon crocante e queijo cheddar", preco: 24.00, categoria: "Lanches", imagem: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 12, estoqueMinimo: 5 },
    { id: 4, nome: "Refrigerante", descricao: "Lata 350ml — Coca-Cola, Guaraná ou Fanta", preco: 6.00, categoria: "Bebidas", imagem: "https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 50, estoqueMinimo: 10 },
    { id: 5, nome: "Batata Frita", descricao: "Porção de batata frita crocante com molho", preco: 15.00, categoria: "Lanches", imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 3, estoqueMinimo: 5 },
    { id: 6, nome: "Pudim", descricao: "Pudim caseiro de leite condensado", preco: 8.00, categoria: "Sobremesas", imagem: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop&auto=format", disponivel: true, quantidade: 8, estoqueMinimo: 3 },
  ];
}
function seedClientes() {
  return [
    { id: 1, nome: "João Silva", telefone: "(69) 99123-4567", email: "joao@email.com", ultimaCompra: "12/09/2026", totalGasto: 245.00, saldoDevedor: 35.00, dataCadastro: "01/03/2026" },
    { id: 2, nome: "Maria Souza", telefone: "(69) 98765-4321", email: "maria@email.com", ultimaCompra: "10/09/2026", totalGasto: 520.00, saldoDevedor: 72.00, dataCadastro: "15/01/2026" },
    { id: 3, nome: "Carlos Lima", telefone: "(69) 99234-5678", email: "carlos@email.com", ultimaCompra: "08/09/2026", totalGasto: 180.00, saldoDevedor: 28.00, dataCadastro: "20/02/2026" },
    { id: 4, nome: "Ana Paula", telefone: "(69) 99345-6789", email: "ana@email.com", ultimaCompra: "15/09/2026", totalGasto: 95.00, saldoDevedor: 0, dataCadastro: "10/04/2026" },
    { id: 5, nome: "Pedro Mendes", telefone: "(69) 98876-5432", email: "pedro@email.com", ultimaCompra: "11/09/2026", totalGasto: 310.00, saldoDevedor: 56.00, dataCadastro: "05/05/2026" },
  ];
}
function seedPedidos() {
  return [
    { id: 1, numero: "#001", cliente: "João Silva", itens: "X-Tudo + Refri", valor: 31.00, horario: "08:32", status: "Entregue", data: "22/09/2026" },
    { id: 2, numero: "#002", cliente: "Maria Souza", itens: "2x Marmita", valor: 56.00, horario: "09:15", status: "Em preparo", data: "22/09/2026" },
    { id: 3, numero: "#003", cliente: "Carlos Lima", itens: "X-Bacon + Batata", valor: 39.00, horario: "09:45", status: "Pronto", data: "22/09/2026" },
    { id: 4, numero: "#004", cliente: "Ana Paula", itens: "Marmita + Refri", valor: 34.00, horario: "10:02", status: "Recebido", data: "22/09/2026" },
    { id: 5, numero: "#005", cliente: "Pedro Mendes", itens: "3x X-Tudo", valor: 75.00, horario: "10:30", status: "Em preparo", data: "22/09/2026" },
  ];
}
function seedFuncionarios() {
  return [
    { id: 1, nome: "Ana Souza", cargo: "Atendente", status: "Ativo", ultimoAcesso: "22/09/2026 08:15", permissoes: ["Pedidos", "Clientes"] },
    { id: 2, nome: "Carlos Lima", cargo: "Caixa", status: "Ativo", ultimoAcesso: "22/09/2026 09:00", permissoes: ["Pedidos", "Caixa"] },
    { id: 3, nome: "Pedro Alves", cargo: "Cozinha", status: "Ativo", ultimoAcesso: "21/09/2026 17:30", permissoes: ["Pedidos", "Estoque"] },
  ];
}
function seedMovimentosCaixa() {
  return [
    { id: 1, horario: "08:32", descricao: "Venda Pedido #001", tipo: "Entrada", valor: 31.00, responsavel: "Ana Souza" },
    { id: 2, horario: "09:00", descricao: "Compra de ingredientes", tipo: "Saída", valor: 85.00, responsavel: "João (Gerente)" },
    { id: 3, horario: "09:45", descricao: "Venda Pedido #003", tipo: "Entrada", valor: 39.00, responsavel: "Carlos Lima" },
    { id: 4, horario: "10:02", descricao: "Venda Pedido #004", tipo: "Entrada", valor: 34.00, responsavel: "Ana Souza" },
    { id: 5, horario: "10:30", descricao: "Pagamento de luz", tipo: "Saída", valor: 120.00, responsavel: "João (Gerente)" },
  ];
}
function seedMeusPedidosCliente() {
  return [
    { id: "d1", data: "12/09/2026", desc: "X-Tudo + Refri", valor: 35.00, status: "Entregue" },
    { id: "d2", data: "10/09/2026", desc: "Marmita", valor: 28.00, status: "Entregue" },
    { id: "d3", data: "05/09/2026", desc: "X-Bacon", valor: 32.00, status: "Entregue" },
  ];
}
