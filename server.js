const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3301;

app.use(cors());
app.use(express.json());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado a la base de datos MySQL');
});


// Ruta para obtener información del inventario
app.get('/api/inventario', (req, res) => {
  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      DATE(Lote.fechaEntrada) AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Error al obtener inventario');
    }
    res.json(results);
  });
});

// Ruta para añadir un nuevo producto
app.post('/api/products', (req, res) => {
  const { nombre, precio, diasParaVencimiento } = req.body;

  // Consulta SQL para insertar un nuevo producto
  const sql = 'INSERT INTO productos (nombre, precio, diasParaVencimiento) VALUES (?, ?, ?)';
  
  db.query(sql, [nombre, precio, diasParaVencimiento], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al añadir el producto.' });
    }
    res.json({ success: true, message: 'Producto añadido exitosamente.' });
  });
});


// Ruta para añadir un nuevo lote
app.post('/api/lotes', (req, res) => {
  const { fechaEntrada, idUsuario, idProductos, cantidad } = req.body;

  const sql = 'INSERT INTO Lote (fechaEntrada, idUsuario, idProductos, cantidad) VALUES (?, ?, ?, ?)';
  
  db.query(sql, [fechaEntrada, idUsuario, idProductos, cantidad], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al añadir el lote.' });
    }
    res.json({ success: true, message: 'Lote añadido exitosamente.' });
  });
});

// Ruta para obtener todos los productos
app.get('/api/productos', (req, res) => {
  const sql = 'SELECT * FROM Productos';
  
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Error al obtener productos.');
    }
    res.json(results);
  });
});

// Ruta para obtener todos los usuarios
app.get('/api/usuarios', (req, res) => {
  const sql = 'SELECT * FROM Usuario';
  
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).send('Error al obtener usuarios.');
    }
    res.json(results);
  });
});



// Ruta raíz para evitar el error de "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de Fruver');
});

// Manejador para rutas no existentes
app.use((req, res) => {
  res.status(404).send('Ruta no encontrada');
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});