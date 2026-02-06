import { Link } from "react-router-dom";
import styles from "./Guia.module.css";

export default function Guia() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Guía de uso</h1>
      <p className={styles.intro}>
        Pasos para usar la aplicación: workspace → tablas → datos → agente → chat.
      </p>

      <ol className={styles.steps}>
        <li className={styles.step}>
          <strong>Seleccionar o crear un workspace</strong>
          <p>
            Ve a <Link to="/">Inicio</Link> o a <Link to="/workspaces">Workspaces</Link>.
            Si no tienes ninguno, créalo en Workspaces (nombre y color). Luego haz clic en una tarjeta
            para <strong>seleccionar</strong> el workspace con el que quieres trabajar. En la barra
            lateral verás siempre <em>Estás en: [nombre del workspace]</em>. Para cambiar de
            workspace, pulsa &quot;Cambiar workspace&quot; y elige otro en Inicio.
          </p>
        </li>
        <li className={styles.step}>
          <strong>Crear tablas</strong>
          <p>
            Con un workspace seleccionado, ve a <Link to="/tables">Tablas</Link>. Escribe el nombre
            de la tabla y pulsa &quot;Crear tabla&quot;. Puedes crear varias (clientes, productos, etc.).
          </p>
        </li>
        <li className={styles.step}>
          <strong>Añadir datos a las tablas</strong>
          <p>
            En Tablas, selecciona una tabla en la lista de la izquierda. Verás la sección
            &quot;Añadir fila (JSON)&quot;. Escribe un objeto en JSON, por ejemplo:{" "}
            <code>{"{\"nombre\": \"Ejemplo\", \"cantidad\": 10}"}</code> y pulsa &quot;Añadir fila&quot;.
            Las columnas se crean automáticamente según las claves que uses. Repite para más filas.
          </p>
        </li>
        <li className={styles.step}>
          <strong>Crear un agente y vincular tablas</strong>
          <p>
            Ve a <Link to="/agents">Agentes</Link>. Rellena nombre, descripción (opcional), elige el
            <strong> modelo de IA</strong> (p. ej. GPT-4o Mini o GPT-4o) y marca las tablas que ese
            agente podrá consultar y modificar. Pulsa &quot;Crear agente&quot;. En cada tarjeta verás
            el modelo y el número de tablas vinculadas.
          </p>
        </li>
        <li className={styles.step}>
          <strong>Usar el chat con el agente</strong>
          <p>
            Ve a <Link to="/chat">Chat</Link>. Elige un agente en el desplegable. Escribe mensajes
            en lenguaje natural; el agente usará la IA que configuraste y las tablas vinculadas para
            responder, consultar datos, añadir filas, etc., según lo que pidas.
          </p>
        </li>
      </ol>

      <section className={styles.resumen}>
        <h2 className={styles.subtitle}>Resumen rápido</h2>
        <ul>
          <li><strong>Workspace:</strong> entorno aislado (tablas, agentes y chat propios).</li>
          <li><strong>Tablas:</strong> se crean por nombre; las filas se añaden con JSON.</li>
          <li><strong>Agentes:</strong> tienen un modelo de IA y tablas vinculadas; responden en el chat.</li>
          <li><strong>Chat:</strong> eliges un agente y conversas; él usa sus tablas y la IA configurada.</li>
        </ul>
      </section>
    </div>
  );
}
