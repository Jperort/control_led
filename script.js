// Variables de comunicación

let puerto;
let lector;
let conectado = false;
let escribiendo = false;

// Elementos HTML

const btnConectar = document.getElementById("btnConectar");
const estadoConexion = document.getElementById("estadoConexion");
const mensaje = document.getElementById("mensaje");

// Todos los botones de control (encender, apagar y "todos")
const botonesControl = document.querySelectorAll(".btnControl");

// Contador de encendidos (actividad 6)
const contadores = { 1: 0, 2: 0, 3: 0 };
const estadoPrevio = { 1: false, 2: false, 3: false };


// CONECTAR ARDUINO

btnConectar.addEventListener("click", conectar);

async function conectar() {

    try {

        if (!("serial" in navigator)) {
            alert("Utiliza Google Chrome o Microsoft Edge");
            return;
        }

        // Seleccionar puerto
        puerto = await navigator.serial.requestPort();

        // Abrir comunicación
        await puerto.open({ baudRate: 9600 });

        conectado = true;

        estadoConexion.textContent = "Arduino conectado";
        mensaje.textContent = "Ya puedes controlar los LED";

        btnConectar.disabled = true;

        // Activar todos los botones de control
        botonesControl.forEach(boton => boton.disabled = false);

        // Preparar lector de datos
        const decoder = new TextDecoderStream();

        puerto.readable.pipeTo(decoder.writable)
            .catch(error => console.log(error));

        lector = decoder.readable.getReader();

        leerArduino();

    } catch (error) {

        console.error(error);
        mensaje.textContent = "Error al conectar Arduino";

    }

}


// LEER RESPUESTAS DE ARDUINO

async function leerArduino() {

    let texto = "";

    try {

        while (conectado) {

            const { value, done } = await lector.read();

            if (done) break;

            texto += value;

            const lineas = texto.split("\n");

            texto = lineas.pop();

            for (const linea of lineas) {

                const respuesta = linea.trim();

                // Arduino responde con el formato LED1:1 o LED2:0
                const coincidencia = respuesta.match(/^LED(\d):([01])$/);

                if (coincidencia) {
                    const numero = coincidencia[1];
                    const encendido = coincidencia[2] === "1";
                    mostrarEstado(numero, encendido);
                }

            }

        }

    } catch (error) {

        console.error(error);

    }

}


// ENVIAR ORDEN A ARDUINO

async function enviarOrden(orden) {

    if (!conectado || escribiendo) return;

    escribiendo = true;

    try {

        const writer = puerto.writable.getWriter();

        await writer.write(new TextEncoder().encode(orden + "\n"));

        writer.releaseLock();

    } catch (error) {

        console.error(error);
        mensaje.textContent = "Error enviando la orden";

    } finally {

        escribiendo = false;

    }

}


// Cada botón envía la orden que lleva en su atributo data-orden

botonesControl.forEach(boton => {

    boton.addEventListener("click", function () {

        enviarOrden(boton.dataset.orden);

    });

});


// ACTUALIZAR INTERFAZ

function mostrarEstado(numero, encendido) {

    const bombilla = document.getElementById("bombilla" + numero);
    const estadoLed = document.getElementById("estadoLed" + numero);

    if (!bombilla || !estadoLed) return;

    // Actividad 6: contar las veces que el LED pasa de apagado a encendido
    if (encendido && !estadoPrevio[numero]) {
        contadores[numero]++;
        document.getElementById("contador" + numero).textContent = contadores[numero];
    }
    estadoPrevio[numero] = encendido;

    if (encendido) {

        estadoLed.textContent = "LED " + numero + " ENCENDIDO";
        bombilla.classList.remove("apagado");
        bombilla.classList.add("encendido");
        mensaje.textContent = "Arduino ha encendido el LED " + numero;

    } else {

        estadoLed.textContent = "LED " + numero + " APAGADO";
        bombilla.classList.remove("encendido");
        bombilla.classList.add("apagado");
        mensaje.textContent = "Arduino ha apagado el LED " + numero;

    }

}