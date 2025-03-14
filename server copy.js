const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);

// Configuración del pool de conexiones MySQL
const pool = mysql.createPool({
    host: "MYSQL8010.site4now.net", // o la IP de tu servidor MySQL
    user: "a94672_webcm", // tu usuario MySQL
    password: "macu20640", // tu contraseña MySQL
    database: "db_a94672_webcm", // el nombre de la base de datos
    waitForConnections: true, // Espera conexiones si no hay disponibles
    connectionLimit: 3, // Limita el número de conexiones simultáneas
    queueLimit: 0, // Número de solicitudes en espera
});

// Mantener la conexión activa con un ping periódico
setInterval(() => {
    pool.query("SELECT 1", (err, results) => {
        if (err) {
            console.error("Error al hacer ping a la base de datos:", err);
        } else {
            console.log("Conexión a la base de datos activa");
        }
    });
}, 30 * 60 * 1000); // Hacer ping cada 30 minutos

// Configuración de Socket.io con CORS
const io = new Server(server, {
    cors: {
        origin: "*", // Ajusta el origen según tus necesidades
        methods: ["GET", "POST"],
    },
});

// Evento de conexión de Socket.io
io.on("connection", (socket) => {
    console.log("🟢 Usuario conectado:", socket.id); // Esto solo se ejecuta una vez por conexión

    // Asegúrate de emitir "Usuario conectado" solo una vez
    socket.emit("userConnected", { userId: socket.id });

    // Consultar los mensajes anteriores en la base de datos
    const query = "SELECT chat.*, concat(usuarios.nombre,' ' ,usuarios.apellido) AS nombre FROM chat JOIN usuarios ON usuarios.id=chat.idusuario ORDER BY timestamp ASC LIMIT 200"; // Obtén los últimos 200 mensajes
    pool.query(query, (err, results) => {
        if (err) {
            console.error("Error al consultar los mensajes:", err);
        } else {
            // Emitir los mensajes anteriores al cliente
            socket.emit("previousMessages", results);
        }
    });

    socket.on("sendMessage", (data) => {
        console.log(data)
        const query = "INSERT INTO chat (mensaje, idusuario) VALUES (?, ?)";
        const params = [data.mensaje, data.idusuario]; // ID de usuario de ejemplo, cambia esto según tu sistema de usuarios

        pool.query(query, params, (err, result) => {
            if (err) {
                console.error("Error al insertar el mensaje:", err);
            } else {
                io.emit("message", data);
            }
        });
    });

    socket.on("disconnect", () => {
        console.log("🔴 Usuario desconectado:", socket.id);
    });
});

// Iniciar el servidor en el puerto 3002
server.listen(3002, "0.0.0.0", () => {
    console.log("🚀 Servidor corriendo en el puerto 3002");
});
