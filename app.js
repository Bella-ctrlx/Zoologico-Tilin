const FIREBASE_BASE_URL = "https://zoologico-tilines-rest-default-rtdb.firebaseio.com/"; 
const RECURSO = "animales"; // Nombre del nodo principal en Firebase
const URL_COMPLETA = `${FIREBASE_BASE_URL}/${RECURSO}.json`;


// Referencias para el CRUD
const formulario = document.getElementById('formulario-animales');
const listaAnimalesContenedor = document.getElementById('lista-animales');

// Referencias para el Dashboard
const totalAnimalesElemento = document.getElementById('total-animales');
const animalesCriticosElemento = document.getElementById('animales-criticos');


/** * Función auxiliar para convertir el objeto de objetos de Firebase
 * en un array de objetos, incluyendo el ID único de Firebase.

 * @param {object} firebaseData - El objeto JSON retornado por la API de Firebase.
 * @returns {Array} Un array de objetos con la propiedad 'id' añadida.
 */
const transformarDatos = (firebaseData) => {
    if (!firebaseData) return [];
    
    // Object.keys obtiene todos los IDs únicos (claves) de Firebase
    return Object.keys(firebaseData).map(id => ({
        id, // Añade el ID de Firebase como una propiedad
        ...firebaseData[id] // Desestructura el resto de los datos
    }));
};

/** ----------------------------------------------
 * OPERACIÓN READ (GET) - Consulta de todos los registros
  */
async function obtenerAnimales() {
    listaAnimalesContenedor.innerHTML = '<p class="col-12">Cargando datos del inventario...</p>'; // Mostrar mensaje de carga
    try {
        const respuesta = await fetch(URL_COMPLETA, {
            method: 'GET'
        });

        if (!respuesta.ok) {
            throw new Error(`Error al cargar datos: ${respuesta.status}`);
        }
        
        const datosFirebase = await respuesta.json();
        const animalesArray = transformarDatos(datosFirebase);
        
        console.log('Datos de animales obtenidos:', animalesArray);
        
        // 1. Mostrar el listado
        renderizarLista(animalesArray);
        
        // 2. Actualizar las métricas
        actualizarDashboard(animalesArray);

    } catch (error) {
        console.error('Error en la operación GET:', error);
        listaAnimalesContenedor.innerHTML = `<p class="col-12 error">Error al conectar con la base de datos: ${error.message}</p>`;
    }
}

/** ----------------------------------------------
 * Funciones de Renderizado
 * ---------------------------------------------- */

function renderizarLista(animales) {
    if (animales.length === 0) {
        listaAnimalesContenedor.innerHTML = '<p class="col-12">No hay animales registrados aún.</p>';
        return;
    }

    // Crea el encabezado de la tabla (o cards)
    let htmlContent = `
        <div class="col-12">
            <table>
                <thead>
                    <tr>
                        <th>ID (Firebase)</th>
                        <th>Nombre</th>
                        <th>Especie</th>
                        <th>Recinto</th>
                        <th>Salud (1-10)</th>
                        <th>Acciones (PATCH/DELETE)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Itera sobre el array de animales
    animales.forEach(animal => {
        // Usa `data-id` para guardar el ID de Firebase, fundamental para PATCH/DELETE
        const claseSalud = animal.estado_salud <= 3 ? 'text-critico' : '';
        
        htmlContent += `
            <tr data-id="${animal.id}">
                <td title="ID de Firebase">${animal.id.substring(0, 8)}...</td>
                <td>${animal.nombre}</td>
                <td>${animal.especie}</td>
                <td>${animal.id_recinto}</td>
                <td class="${claseSalud}">${animal.estado_salud}</td>
                <td>
                    <button class="btn-actualizar" data-id="${animal.id}">Actualizar (PATCH)</button>
                    <button class="btn-eliminar" data-id="${animal.id}">Eliminar (DELETE)</button>
                </td>
            </tr>
        `;
    });

    htmlContent += `</tbody></table></div>`;
    listaAnimalesContenedor.innerHTML = htmlContent;
    
    // **Importante:** Después de inyectar el HTML, añade los listeners a los nuevos botones
    agregarListenersCRUD(); 
}

function actualizarDashboard(animales) {
    const total = animales.length;
    // Filtrar animales en estado crítico (salud 1, 2 o 3)
    const criticos = animales.filter(animal => animal.estado_salud <= 3).length;
    
    totalAnimalesElemento.textContent = total;
    animalesCriticosElemento.textContent = criticos;
    
    // Opcional: Darle un estilo de alerta si hay animales críticos
    animalesCriticosElemento.style.color = criticos > 0 ? 'red' : 'inherit';
}

// Llama a la función principal al cargar la página
obtenerAnimales();


/** ----------------------------------------------
 * OPERACIÓN CREATE (POST) - Registro de un nuevo animal
  */

formulario.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar el envío clásico del formulario

    // 1. Recoger datos del formulario
    const nuevoAnimal = {
        nombre: document.getElementById('nombre').value,
        especie: document.getElementById('especie').value,
        id_recinto: document.getElementById('recinto').value,
        estado_salud: parseInt(document.getElementById('salud').value)
    };

    try {
        const respuesta = await fetch(URL_COMPLETA, {
            method: 'POST', // Verbo: POST
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoAnimal)
        });

        if (!respuesta.ok) {
            throw new Error(`Error al registrar: ${respuesta.status}`);
        }

        alert('Animal registrado con éxito (POST).');
        formulario.reset(); 
        
        // Recargar el inventario para ver el nuevo registro
        obtenerAnimales(); 

    } catch (error) {
        console.error('Error en la operación POST:', error);
        alert(`Error al registrar el animal: ${error.message}`);
    }
});

/** ----------------------------------------------
 * CRUD LISTENERS Y FUNCIONES DE ACCIÓN
 * ---------------------------------------------- */

function agregarListenersCRUD() {
    // Escucha eventos en el contenedor de la lista para delegación
    listaAnimalesContenedor.querySelectorAll('.btn-eliminar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (confirm(`¿Está seguro de eliminar el animal con ID ${id.substring(0, 8)}...?`)) {
                eliminarAnimal(id);
            }
        });
    });
    
    listaAnimalesContenedor.querySelectorAll('.btn-actualizar').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
  
            const nuevoEstadoSalud = prompt(`Ingrese el nuevo estado de salud (1-10) para el animal ID ${id.substring(0, 8)}...:`);
            
            const salud = parseInt(nuevoEstadoSalud);
            if (salud >= 1 && salud <= 10) {
                // Solo actualizamos el estado de salud en este ejemplo.
                actualizarAnimal(id, { estado_salud: salud });
            } else if (nuevoEstadoSalud !== null) {
                alert('Valor inválido. Debe ser un número entre 1 y 10.');
            }
        });
    });
}

/** ----------------------------------------------
 * OPERACIÓN DELETE - Eliminación de un registro
*/

async function eliminarAnimal(idRegistro) {
    const url = `${FIREBASE_BASE_URL}/${RECURSO}/${idRegistro}.json`;

    try {
        const respuesta = await fetch(url, {
            method: 'DELETE' // Verbo: DELETE
        });

        if (!respuesta.ok) {
            throw new Error(`Error al eliminar: ${respuesta.status}`);
        }
        
        alert('Animal eliminado con éxito (DELETE).');
        obtenerAnimales(); // Recargar la lista

    } catch (error) {
        console.error('Error en la operación DELETE:', error);
        alert(`Error al eliminar: ${error.message}`);
    }
}

/** ----------------------------------------------
 * OPERACIÓN UPDATE (PATCH) - Actualización parcial
 */

async function actualizarAnimal(idRegistro, datosActualizados) {
    const url = `${FIREBASE_BASE_URL}/${RECURSO}/${idRegistro}.json`;

    try {
        const respuesta = await fetch(url, {
            method: 'PATCH', //  Verbo: PATCH
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizados)
        });

        if (!respuesta.ok) {
            throw new Error(`Error al actualizar: ${respuesta.status}`);
        }
        
        alert('Animal actualizado con éxito (PATCH).');
        obtenerAnimales(); // Recargar la lista

    } catch (error) {
        console.error('Error en la operación PATCH:', error);
        alert(`Error al actualizar: ${error.message}`);
    }
}

