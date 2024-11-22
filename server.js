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

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
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

// Ruta para optener informacion del inventario segun la busqueda
app.get('/api/inventario', (req, res) => {
  const searchTerm = req.query.search || ''; // Obtén el término de búsqueda de los parámetros de la URL
  
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
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE Lote.codigo LIKE ? OR Productos.nombre LIKE ?;
  `;

  // Pasa el término de búsqueda para que busque en ambas columnas
  db.query(sql, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
    if (err) {
      return res.status(500).send('Error al obtener inventario');
    }
    res.json(results);
  });
});
/* ---------------------------------------------------------------------------------------------------------------------------------------- */
//Ruta para realizar cambios en el inventario
// Ruta para actualizar un lote específico (actualizar el idProductos y cantidadLote)
app.put('/api/lotes/:codigoLote', (req, res) => {
  const codigoLote = req.params.codigoLote;
  const { idProductos, cantidadLote } = req.body;

  const sql = `
    UPDATE Lote
    SET idProductos = ?, cantidad = ?
    WHERE codigo = ?;
  `;

  db.query(sql, [idProductos, cantidadLote, codigoLote], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al actualizar el lote.' });
    }
    res.json({ success: true, message: 'Lote actualizado exitosamente.' });
  });
});

// Ruta para eliminar un lote específico
app.delete('/api/lotes/:codigoLote', (req, res) => {
  const codigoLote = req.params.codigoLote;

  const sql = 'DELETE FROM Lote WHERE codigo = ?';

  db.query(sql, [codigoLote], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al eliminar el lote.' });
    }
    res.json({ success: true, message: 'Lote eliminado exitosamente.' });
  });
});

// Ruta para obtener el ID de un producto dado su nombre
app.get('/api/productos/id/:nombre', (req, res) => {
  const nombreProducto = req.params.nombre;

  const sql = 'SELECT id FROM Productos WHERE nombre = ?';

  db.query(sql, [nombreProducto], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener el ID del producto.' });
    }
    if (results.length > 0) {
      res.json({ id: results[0].id });
    } else {
      res.status(404).json({ message: 'Producto no encontrado.' });
    }
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener lotes próximos a vencer en 3 
app.get('/api/productos/por_vencer', (req, res) => {
  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto,
      Productos.diasParaVencimiento AS diasParaVencimiento,
      (Productos.diasParaVencimiento - DATEDIFF(CURDATE(), Lote.fechaEntrada)) AS diasRestantes
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE 
      (Productos.diasParaVencimiento - DATEDIFF(CURDATE(), Lote.fechaEntrada)) BETWEEN 0 AND 3;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos por vencer.' });
    }
    res.json(results);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener productos por acabarse
app.get('/api/productos/por_acabarse', (req, res) => {
  const cantidadMinima = 10; // Define el umbral de cantidad baja

  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE Lote.cantidad <= ?;
  `;

  db.query(sql, [cantidadMinima], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos por acabarse.' });
    }
    res.json(results);
  });
});

// Ruta para obtener productos por acabarse con búsqueda
app.get('/api/productos/por_acabarse2', (req, res) => {
  const cantidadMinima = 10; // Define el umbral de cantidad baja
  const searchTerm = req.query.search || ''; // Término de búsqueda opcional

  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE Lote.cantidad <= ? 
      AND (Productos.nombre LIKE ? OR Usuario.nombre LIKE ?);
  `;

  // Pasa los parámetros al query
  db.query(sql, [cantidadMinima, `%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos por acabarse.' });
    }
    res.json(results);
  });
});


/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener productos ya expirados
app.get('/api/productos/expirados', (req, res) => {
  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto,
      Productos.diasParaVencimiento AS diasParaVencimiento,
      DATEDIFF(CURDATE(), Lote.fechaEntrada) - Productos.diasParaVencimiento AS diasDesdeVencimiento
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE DATEDIFF(CURDATE(), Lote.fechaEntrada) > Productos.diasParaVencimiento;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos expirados.' });
    }
    res.json(results);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener los 5 productos recientemente añadidos
app.get('/api/productos/recientes', (req, res) => {
  const sql = 'SELECT * FROM Productos ORDER BY id DESC LIMIT 5';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos recientes.' });
    }
    res.json(results);
  });
});

// Ruta para obtener los 5 lotes recientemente añadidos
app.get('/api/lotes/recientes', (req, res) => {
  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto
    FROM Lote
    JOIN Productos ON Lote.idProductos = Productos.id
    ORDER BY Lote.codigo DESC
    LIMIT 5
  `;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener lotes recientes.' });
    }
    res.json(results);
  });
});

// Ruta para obtener los 5 productos expirados más recientes
app.get('/api/productos/expirados/recientes', (req, res) => {
  const sql = `
    SELECT 
      Lote.codigo AS codigoLote,
      Lote.cantidad AS cantidadLote,
      Lote.fechaEntrada AS fechaEntrada,
      Usuario.nombre AS nombreUsuario,
      Productos.nombre AS nombreProducto,
      Productos.precio AS precioProducto,
      Productos.diasParaVencimiento AS diasParaVencimiento,
      (DATEDIFF(CURDATE(), Lote.fechaEntrada) - Productos.diasParaVencimiento) AS diasDesdeVencimiento
    FROM Lote
    JOIN Usuario ON Lote.idUsuario = Usuario.id
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE DATEDIFF(CURDATE(), Lote.fechaEntrada) > Productos.diasParaVencimiento
    ORDER BY Lote.codigo DESC
    LIMIT 5
  `;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener productos expirados.' });
    }
    res.json(results);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener productos con mayor movimiento
app.get('/api/reportes/productos_mas_movidos', (req, res) => {
  const sql = `
    SELECT 
        Productos.nombre AS nombreProducto,
        Productos.precio AS precioProducto,
        SUM(Lote.cantidad) AS totalCantidad,
        Usuario.nombre AS usuarioPrincipal
    FROM 
        Lote
    INNER JOIN 
        Productos ON Lote.idProductos = Productos.id
    LEFT JOIN 
        Usuario ON Lote.idUsuario = Usuario.id
    GROUP BY 
        Productos.id, Usuario.id
    ORDER BY 
        totalCantidad DESC
    LIMIT 5;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al generar reporte de productos más movidos.' });
    }
    res.json(results);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */
// Ruta para obtener usuarios con más lotes ingresados
app.get('/api/reportes/usuarios_mas_lotes', (req, res) => {
  const sql = `
    SELECT 
        Usuario.nombre AS nombreUsuario,
        COUNT(Lote.codigo) AS totalLotesIngresados
    FROM 
        Lote
    INNER JOIN 
        Usuario ON Lote.idUsuario = Usuario.id
    GROUP BY 
        Usuario.id
    ORDER BY 
        totalLotesIngresados DESC
    LIMIT 5;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error al generar reporte de usuarios con más lotes.' });
    }
    res.json(results);
  });
});

/* ---------------------------------------------------------------------------------------------------------------------------------------- */

app.get('/api/notificaciones', (req, res) => {
    const queries = {
      masCercano: `
    SELECT 
        Productos.nombre AS producto, 
        MIN(DATEDIFF(DATE_ADD(Lote.fechaEntrada, INTERVAL Productos.diasParaVencimiento DAY), CURDATE())) AS diasRestantes
    FROM Lote
    JOIN Productos ON Lote.idProductos = Productos.id
    WHERE DATEDIFF(DATE_ADD(Lote.fechaEntrada, INTERVAL Productos.diasParaVencimiento DAY), CURDATE()) > 0
    GROUP BY Productos.nombre
    ORDER BY diasRestantes ASC
    LIMIT 1;
  `,
    expiraHoy: `
      SELECT 
          Productos.nombre AS producto
      FROM Lote
      JOIN Productos ON Lote.idProductos = Productos.id
      WHERE DATEDIFF(CURDATE(), Lote.fechaEntrada) = Productos.diasParaVencimiento;
    `,
    lotesHoy: `
      SELECT 
          COUNT(*) AS lotesHoy 
      FROM Lote 
      WHERE DATE(Lote.fechaEntrada) = CURDATE();
    `
  };

  const results = {};
  db.query(queries.masCercano, (err, result) => {
    if (err) {
      console.error('Error en masCercano:', err);
      return res.status(500).send('Error en masCercano');
    }
    if (result[0] && result[0].producto) {
      results.masCercano = result[0];
    }

    db.query(queries.expiraHoy, (err, result) => {
      if (err) {
        console.error('Error en expiraHoy:', err);
        return res.status(500).send('Error en expiraHoy');
      }
      if (result.length > 0) {
        results.expiraHoy = result[0];
      }

      db.query(queries.lotesHoy, (err, result) => {
        if (err) {
          console.error('Error en lotesHoy:', err);
          return res.status(500).send('Error en lotesHoy');
        }
        if (result[0].lotesHoy > 0) {
          results.lotesHoy = result[0];
        }
        res.json(results);
      });
    });
  });
});



/* ---------------------------------------------------------------------------------------------------------------------------------------- */
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