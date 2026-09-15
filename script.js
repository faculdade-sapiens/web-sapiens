// Menu responsivo
const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav');

menuToggle.addEventListener('click', () => {
  nav.style.display = nav.style.display === 'block' ? 'none' : 'block';
});

// Exemplo de notificação de pedido
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    alert('Pedido registrado com sucesso!');
  });
});
